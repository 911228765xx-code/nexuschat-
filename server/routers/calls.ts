/**
 * Alpha 战绩系统（NP 模型 Phase 3）：
 *  - 用户发结构化 Call（标的 + 方向 + 时间窗）；系统在窗口到期后按行情自动判定对错。
 *  - 判对 → NP + 声誉 + 上战绩榜；判错 → 扣声誉。沉淀可验证的公开战绩。
 *  - 声誉反过来抬高个人产出加成（见 rankEngine.reputationBonus），形成正循环。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { calls, users, curationStakes } from "../../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { fetchTokenData } from "./research";
import { sanitizeInput } from "../utils/sanitize";
import { isReferralBound } from "../referralRewards";

/** 允许的时间窗（小时）：1天 / 3天 / 7天 / 30天 */
const HORIZONS = [24, 72, 168, 720] as const;
const DAILY_CALL_LIMIT = 5;
/** 策展质押：单笔上下限 */
const MIN_STAKE = 10;
const MAX_STAKE = 5000;

function ymdUtc(d: Date = new Date()): string { return d.toISOString().slice(0, 10); }

export const callsRouter = router({
  // ─── 发一条 Call ─────────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      tokenSymbol: z.string().min(1).max(20),
      direction: z.enum(["long", "short"]),
      horizonHours: z.number().refine((h) => (HORIZONS as readonly number[]).includes(h), "无效的时间窗"),
      note: z.string().max(280).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // C 折中：发 Call 是高价值玩法，需先绑定邀请人
      if (!(await isReferralBound(db, ctx.user.id))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "请先在任务中心绑定邀请人，再发 Call" });
      }

      // 当日限频
      const ymd = ymdUtc();
      const [{ c = 0 } = { c: 0 }] = await db
        .select({ c: count() }).from(calls)
        .where(and(eq(calls.userId, ctx.user.id), eq(calls.createdYmd, ymd)));
      if (Number(c) >= DAILY_CALL_LIMIT) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `每日最多发 ${DAILY_CALL_LIMIT} 条 Call` });
      }

      const symbol = input.tokenSymbol.trim().toUpperCase();
      const token = await fetchTokenData(symbol);
      const price = token?.price;
      if (!price || price <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "无法获取该代币价格，请确认标的" });
      }

      const resolveAt = new Date(Date.now() + input.horizonHours * 3600 * 1000);
      const [result] = await db.insert(calls).values({
        userId: ctx.user.id,
        tokenSymbol: symbol,
        direction: input.direction,
        horizonHours: input.horizonHours,
        entryPrice: String(price),
        note: input.note ? sanitizeInput(input.note, 280) : undefined,
        createdYmd: ymd,
        resolveAt,
      });
      return { callId: (result as any).insertId as number, entryPrice: price, resolveAt: resolveAt.toISOString() };
    }),

  // ─── 我的 Call 列表 ──────────────────────────────────────────────────────────
  listMine: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(calls)
        .where(eq(calls.userId, ctx.user.id))
        .orderBy(desc(calls.createdAt))
        .limit(input?.limit ?? 50);
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

      const [u] = await db.select({ np: users.npPoints }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!u || u.np < input.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "NP 余额不足" });

      await db.transaction(async (tx) => {
        await tx.update(users).set({ npPoints: sql`npPoints - ${input.amount}` }).where(eq(users.id, ctx.user.id));
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
