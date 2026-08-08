/**
 * Alpha 猜涨跌（固定赔率）：
 *  - 用 IT 猜 BTC / ETH 未来涨跌；到期按行情结算。
 *  - 押对按固定赔率 1.8 返还（含本金），押错销毁，死区内 void 退本。
 *  - 战绩榜 / 声誉仍保留。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { calls, users, curationStakes } from "../../drizzle/schema";
import { eq, and, desc, sql, count, gte } from "drizzle-orm";
import { fetchTokenData } from "./research";
import { sanitizeInput } from "../utils/sanitize";
import { isReferralBound } from "../referralRewards";
import { STAKE_ODDS, stakePayout } from "../callResolver";

/** 允许的时间窗（分钟）：15分钟 / 1小时 / 4小时 / 1天
 *  存进 horizonHours 列（历史字段名）；新建注按分钟计，旧单的 resolveAt 已算好不受影响。 */
const HORIZONS = [15, 60, 240, 1440] as const;
const BET_SYMBOLS = ["BTC", "ETH"] as const;
const DAILY_CALL_LIMIT = 5;
/** IT 下注单笔上下限 */
const MIN_STAKE = 10;
const MAX_STAKE = 5000;

function ymdUtc(d: Date = new Date()): string { return d.toISOString().slice(0, 10); }

export const callsRouter = router({
  /** 固定赔率与可选标的（前端展示用） */
  meta: publicProcedure.query(() => ({
    odds: STAKE_ODDS,
    symbols: [...BET_SYMBOLS],
    horizons: [...HORIZONS],
    minStake: MIN_STAKE,
    maxStake: MAX_STAKE,
    dailyLimit: DAILY_CALL_LIMIT,
  })),

  // ─── 用 IT 猜涨跌（主入口）────────────────────────────────────────────────
  placeBet: protectedProcedure
    .input(z.object({
      tokenSymbol: z.enum(BET_SYMBOLS),
      direction: z.enum(["long", "short"]),
      horizonHours: z.number().refine((h) => (HORIZONS as readonly number[]).includes(h), "无效的时间窗"),
      amount: z.number().int().min(MIN_STAKE).max(MAX_STAKE),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!(await isReferralBound(db, ctx.user.id))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "请先在任务中心绑定邀请人，再参与猜涨跌" });
      }

      const ymd = ymdUtc();
      const symbol = input.tokenSymbol;
      const token = await fetchTokenData(symbol);
      const price = token?.price;
      if (!price || price <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `暂时无法获取 ${symbol} 价格，请稍后重试` });
      }

      // horizonHours 字段现表示分钟（15/60/240/1440）
      const resolveAt = new Date(Date.now() + input.horizonHours * 60 * 1000);
      const potentialWin = stakePayout(input.amount, "win");

      const callId = await db.transaction(async (tx) => {
        await tx.select({ id: users.id }).from(users).where(eq(users.id, ctx.user.id)).for("update").limit(1);

        const [{ c = 0 } = { c: 0 }] = await tx
          .select({ c: count() }).from(calls)
          .where(and(eq(calls.userId, ctx.user.id), eq(calls.createdYmd, ymd)));
        if (Number(c) >= DAILY_CALL_LIMIT) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `每日最多下注 ${DAILY_CALL_LIMIT} 次` });
        }
        const [openSame] = await tx.select({ id: calls.id }).from(calls)
          .where(and(eq(calls.userId, ctx.user.id), eq(calls.tokenSymbol, symbol), eq(calls.status, "pending"))).limit(1);
        if (openSame) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `你已有未结算的 ${symbol} 下注，结算后再来` });
        }

        // 原子扣 IT
        const res = await tx.update(users)
          .set({ npPoints: sql`npPoints - ${input.amount}` })
          .where(and(eq(users.id, ctx.user.id), gte(users.npPoints, input.amount)));
        const affected = (res as any)?.[0]?.affectedRows ?? (res as any)?.affectedRows ?? 0;
        if (affected < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "IT 余额不足" });

        const [result] = await tx.insert(calls).values({
          userId: ctx.user.id,
          tokenSymbol: symbol,
          direction: input.direction,
          horizonHours: input.horizonHours,
          entryPrice: String(price),
          note: `bet:${input.amount}`,
          createdYmd: ymd,
          resolveAt,
        });
        const insertId = (result as any).insertId as number;
        // 自押：结算时按固定赔率返还（允许押自己的场）
        await tx.insert(curationStakes).values({
          stakerId: ctx.user.id,
          callId: insertId,
          amount: input.amount,
        });
        return insertId;
      });

      return {
        callId,
        entryPrice: price,
        resolveAt: resolveAt.toISOString(),
        amount: input.amount,
        odds: STAKE_ODDS,
        potentialWin,
      };
    }),

  // ─── 兼容旧客户端：免费发 Call 已关闭，引导走 placeBet ─────────────────────
  create: protectedProcedure
    .input(z.object({
      tokenSymbol: z.string().min(1).max(20),
      direction: z.enum(["long", "short"]),
      horizonHours: z.number().refine((h) => (HORIZONS as readonly number[]).includes(h), "无效的时间窗"),
      note: z.string().max(280).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async () => {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "请改用 IT 猜涨跌下注（仅 BTC / ETH，固定赔率 1.8）",
      });
    }),

  // ─── 我的下注列表 ──────────────────────────────────────────────────────────
  listMine: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: calls.id,
          tokenSymbol: calls.tokenSymbol,
          direction: calls.direction,
          horizonHours: calls.horizonHours,
          entryPrice: calls.entryPrice,
          resolvedPrice: calls.resolvedPrice,
          changeBp: calls.changeBp,
          status: calls.status,
          note: calls.note,
          createdAt: calls.createdAt,
          resolveAt: calls.resolveAt,
          resolvedAt: calls.resolvedAt,
          stakeAmount: sql<number>`(SELECT COALESCE(SUM(cs.amount),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.stakerId = ${ctx.user.id})`,
          payout: sql<number>`(SELECT COALESCE(SUM(cs.payout),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.stakerId = ${ctx.user.id})`,
        })
        .from(calls)
        .where(eq(calls.userId, ctx.user.id))
        .orderBy(desc(calls.createdAt))
        .limit(input?.limit ?? 50);
      return rows.map((r) => ({
        ...r,
        stakeAmount: Number(r.stakeAmount ?? 0),
        payout: Number(r.payout ?? 0),
        odds: STAKE_ODDS,
      }));
    }),

  // ─── 战绩榜（按胜场排序，达最低样本量才上榜）──────────────────────────────────
  leaderboard: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          userId: calls.userId,
          userName: users.name,
          avatar: users.avatar,
          wins: sql<number>`SUM(CASE WHEN ${calls.status} = 'win' THEN 1 ELSE 0 END)`,
          loses: sql<number>`SUM(CASE WHEN ${calls.status} = 'lose' THEN 1 ELSE 0 END)`,
        })
        .from(calls)
        .leftJoin(users, eq(calls.userId, users.id))
        .where(sql`${calls.status} IN ('win','lose')`)
        .groupBy(calls.userId, users.name, users.avatar)
        .having(sql`SUM(CASE WHEN ${calls.status} = 'win' THEN 1 ELSE 0 END) > 0`)
        .orderBy(desc(sql`SUM(CASE WHEN ${calls.status} = 'win' THEN 1 ELSE 0 END)`))
        .limit(input?.limit ?? 20);
      return rows.map((r) => {
        const wins = Number(r.wins ?? 0);
        const loses = Number(r.loses ?? 0);
        const total = wins + loses;
        return {
          userId: r.userId,
          userName: r.userName ?? `用户 #${r.userId}`,
          avatar: r.avatar ?? null,
          wins, loses,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        };
      });
    }),

  // ─── 我的战绩统计 ────────────────────────────────────────────────────────────
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { wins: 0, loses: 0, pending: 0, winRate: 0 };
    const rows = await db
      .select({ status: calls.status, c: count() })
      .from(calls).where(eq(calls.userId, ctx.user.id))
      .groupBy(calls.status);
    let wins = 0, loses = 0, pending = 0;
    for (const r of rows) {
      if (r.status === "win") wins = Number(r.c);
      else if (r.status === "lose") loses = Number(r.c);
      else if (r.status === "pending") pending = Number(r.c);
    }
    const total = wins + loses;
    return { wins, loses, pending, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  }),

  // ─── 广场 Call 流（待结算的公开 Call，供策展质押）──────────────────────────────
  feed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: calls.id, userId: calls.userId, userName: users.name, avatar: users.avatar,
          tokenSymbol: calls.tokenSymbol, direction: calls.direction, horizonHours: calls.horizonHours,
          entryPrice: calls.entryPrice, note: calls.note, createdAt: calls.createdAt, resolveAt: calls.resolveAt,
          stakerCount: sql<number>`(SELECT COUNT(*) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.status = 'active')`,
          totalStaked: sql<number>`(SELECT COALESCE(SUM(cs.amount),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.status = 'active')`,
          myStake: sql<number>`(SELECT COALESCE(SUM(cs.amount),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.stakerId = ${ctx.user.id})`,
        })
        .from(calls)
        .leftJoin(users, eq(calls.userId, users.id))
        .where(eq(calls.status, "pending"))
        .orderBy(desc(calls.createdAt))
        .limit(input?.limit ?? 30);
      return rows.map((r) => ({
        ...r,
        userName: r.userName ?? `用户 #${r.userId}`,
        stakerCount: Number(r.stakerCount ?? 0),
        totalStaked: Number(r.totalStaked ?? 0),
        myStake: Number(r.myStake ?? 0),
        isMine: r.userId === ctx.user.id,
      }));
    }),

  // ─── 策展质押：押某条 Call 会命中（命中 +30%，未中质押销毁）────────────────────
  stake: protectedProcedure
    .input(z.object({ callId: z.number(), amount: z.number().int().min(MIN_STAKE).max(MAX_STAKE) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // C 折中：策展质押需先绑定邀请人
      if (!(await isReferralBound(db, ctx.user.id))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "请先在任务中心绑定邀请人，再参与质押" });
      }

      const [c] = await db.select({ userId: calls.userId, status: calls.status }).from(calls).where(eq(calls.id, input.callId)).limit(1);
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Call 不存在" });
      if (c.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "该 Call 已结算，无法质押" });
      if (c.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能质押自己的 Call" });

      const [existing] = await db.select({ id: curationStakes.id }).from(curationStakes)
        .where(and(eq(curationStakes.stakerId, ctx.user.id), eq(curationStakes.callId, input.callId))).limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "你已质押过这条 Call" });

      await db.transaction(async (tx) => {
        // 原子条件扣减：余额不足则 affectedRows=0，防并发双花扣成负数
        const res = await tx.update(users)
          .set({ npPoints: sql`npPoints - ${input.amount}` })
          .where(and(eq(users.id, ctx.user.id), gte(users.npPoints, input.amount)));
        const affected = (res as any)?.[0]?.affectedRows ?? (res as any)?.affectedRows ?? 0;
        if (affected < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "IT 余额不足" });
        await tx.insert(curationStakes).values({ stakerId: ctx.user.id, callId: input.callId, amount: input.amount });
      });
      return { ok: true };
    }),

  // ─── 我的质押列表 ────────────────────────────────────────────────────────────
  myStakes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: curationStakes.id, callId: curationStakes.callId, amount: curationStakes.amount,
        status: curationStakes.status, payout: curationStakes.payout, createdAt: curationStakes.createdAt,
        tokenSymbol: calls.tokenSymbol, direction: calls.direction, callStatus: calls.status,
      })
      .from(curationStakes)
      .leftJoin(calls, eq(curationStakes.callId, calls.id))
      .where(eq(curationStakes.stakerId, ctx.user.id))
      .orderBy(desc(curationStakes.createdAt))
      .limit(50);
  }),
});
