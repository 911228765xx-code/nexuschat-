/**
 * ICO 曲线认购路由。
 * 流程: 用户下单(USDT 充值地址) → 填哈希 → 运营确认 → 按当时曲线成交、全额锁仓进质押。
 * 释放: 曲线前少后多;本金可提(进 AI 余额)或留存复投。收益: 每日结算,开方分配 + 保底平分。
 * 价格/分配数学全部走 server/ico/pricing.ts 与 rewards.ts(已单测)。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { icoConfig, icoOrders, icoPurchases, icoAccounts, icoRewardRuns, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { USDT_DEPOSIT_ADDRESS, USDT_CHAIN, grantNN } from "../token";
import { sanitizeInput } from "../utils/sanitize";
import { priceAtSold, costForTokens, tokensForBudget, quote as curveQuote, type IcoCurve } from "../ico/pricing";
import { vestedFraction, dailyEmission, distribute, type StakerStake } from "../ico/rewards";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
const n = (v: unknown) => Number(v ?? 0);

async function loadConfig(db: Db) {
  const [c] = await db.select().from(icoConfig).where(eq(icoConfig.id, 1)).limit(1);
  return c ?? null;
}
function curveOf(c: any): IcoCurve {
  return { totalTokens: n(c.totalTokens), startPrice: n(c.startPrice), endPrice: n(c.endPrice), exponent: n(c.exponent) };
}
/** 跨所有认购累计已释放本金(每笔按自身锁仓时钟) */
async function vestedPrincipal(db: Db, userId: number, c: any): Promise<number> {
  const rows = await db.select().from(icoPurchases).where(eq(icoPurchases.userId, userId));
  let vested = 0;
  for (const p of rows) {
    const months = (Date.now() - new Date(p.createdAt).getTime()) / (30 * 24 * 3600 * 1000);
    vested += n(p.tokensBought) * vestedFraction(months, n(c.vestMonths), n(c.vestCliffMonths));
  }
  return vested;
}

export const icoRouter = router({
  /** 公开:曲线状态 + 进度 + 上线价 + 充值地址 */
  config: protectedProcedure.query(async () => {
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!c) return { enabled: false } as const;
    const sold = n(c.tokensSold), total = n(c.totalTokens);
    return {
      enabled: c.status === "active",
      status: c.status,
      totalTokens: total,
      tokensSold: sold,
      soldPct: total > 0 ? sold / total : 0,
      startPrice: n(c.startPrice),
      endPrice: n(c.endPrice),
      exponent: n(c.exponent),
      listingPrice: n(c.listingPrice),
      currentPrice: priceAtSold(curveOf(c), sold),
      raisedUsdt: costForTokens(curveOf(c), 0, sold),
      perWalletCap: n(c.perWalletCap),
      vestMonths: n(c.vestMonths),
      vestCliffMonths: n(c.vestCliffMonths),
      payAddress: USDT_DEPOSIT_ADDRESS,
      payChain: USDT_CHAIN,
    };
  }),

  /** 报价:给定 USDT,按当前曲线能买多少枚 + 均价 + 成交后新价 */
  quote: protectedProcedure
    .input(z.object({ usdtAmount: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const c = db ? await loadConfig(db) : null;
      if (!c || c.status !== "active") return { tokens: 0, avgPrice: 0, priceFrom: 0, priceTo: 0 };
      const curve = curveOf(c), sold = n(c.tokensSold);
      const tokens = tokensForBudget(curve, sold, input.usdtAmount);
      const q = curveQuote(curve, sold, tokens);
      return { tokens, avgPrice: q.avgPrice, priceFrom: q.priceFrom, priceTo: q.priceTo };
    }),

  /** 下单:锁定意向(USDT + 滑点最低枚数),返回充值地址 */
  createOrder: protectedProcedure
    .input(z.object({ usdtAmount: z.number().positive().max(10_000_000), minTokens: z.number().min(0).default(0) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const c = await loadConfig(db);
      if (!c || c.status !== "active") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "认购未开始或已结束" });
      const [res]: any = await db.insert(icoOrders).values({
        userId: ctx.user.id,
        usdtAmount: String(input.usdtAmount),
        minTokens: String(input.minTokens),
        payAddress: USDT_DEPOSIT_ADDRESS || null,
        status: "pending",
      });
      return { orderId: res?.insertId ?? res?.[0]?.insertId, payAddress: USDT_DEPOSIT_ADDRESS, payChain: USDT_CHAIN, usdtAmount: input.usdtAmount };
    }),

  /** 提交链上转账哈希 */
  submitTx: protectedProcedure
    .input(z.object({ orderId: z.number(), txHash: z.string().min(6).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [o] = await db.select().from(icoOrders).where(and(eq(icoOrders.id, input.orderId), eq(icoOrders.userId, ctx.user.id))).limit(1);
      if (!o || o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单不存在或已处理" });
      await db.update(icoOrders).set({ txHash: sanitizeInput(input.txHash, 120) }).where(eq(icoOrders.id, input.orderId));
      return { ok: true };
    }),

  /** 我的订单 */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(icoOrders).where(eq(icoOrders.userId, ctx.user.id)).orderBy(desc(icoOrders.createdAt)).limit(50);
    return rows.map((o) => ({ id: o.id, usdtAmount: n(o.usdtAmount), status: o.status, txHash: o.txHash, createdAt: o.createdAt }));
  }),

  /** 我的 ICO 账户:锁仓/已释放/可提/质押中/待领收益 */
  myAccount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!db || !c) return { lockedTotal: 0, vested: 0, withdrawable: 0, withdrawn: 0, staked: 0, pendingReward: 0, claimedReward: 0, autoCompound: true };
    const [acc] = await db.select().from(icoAccounts).where(eq(icoAccounts.userId, ctx.user.id)).limit(1);
    if (!acc) return { lockedTotal: 0, vested: 0, withdrawable: 0, withdrawn: 0, staked: 0, pendingReward: 0, claimedReward: 0, autoCompound: true };
    const vested = await vestedPrincipal(db, ctx.user.id, c);
    const withdrawn = n(acc.withdrawnPrincipal);
    return {
      lockedTotal: n(acc.lockedTotal),
      vested,
      withdrawable: Math.max(0, vested - withdrawn),
      withdrawn,
      staked: n(acc.stakedBalance),
      pendingReward: n(acc.pendingReward),
      claimedReward: n(acc.claimedReward),
      autoCompound: !!acc.autoCompound,
    };
  }),

  /** 提取已释放本金(进 AI 余额) */
  withdraw: protectedProcedure
    .input(z.object({ amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const c = db ? await loadConfig(db) : null;
      if (!db || !c) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [acc] = await db.select().from(icoAccounts).where(eq(icoAccounts.userId, ctx.user.id)).limit(1);
      if (!acc) throw new TRPCError({ code: "BAD_REQUEST", message: "无认购记录" });
      const vested = await vestedPrincipal(db, ctx.user.id, c);
      const withdrawable = Math.max(0, vested - n(acc.withdrawnPrincipal));
      if (input.amount > withdrawable + 1e-8) throw new TRPCError({ code: "BAD_REQUEST", message: `可提余额不足,当前可提 ${withdrawable.toFixed(4)}` });
      const ok = await grantNN(db, ctx.user.id, input.amount, { type: "ico_withdraw", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "发放失败,请稍后再试" });
      await db.update(icoAccounts).set({
        withdrawnPrincipal: sql`${icoAccounts.withdrawnPrincipal} + ${input.amount}`,
        stakedBalance: sql`GREATEST(${icoAccounts.stakedBalance} - ${input.amount}, 0)`,
      }).where(eq(icoAccounts.userId, ctx.user.id));
      return { ok: true, withdrawn: input.amount };
    }),

  /** 领取质押收益(进 AI 余额) */
  claimRewards: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
    const [acc] = await db.select().from(icoAccounts).where(eq(icoAccounts.userId, ctx.user.id)).limit(1);
    const pending = n(acc?.pendingReward);
    if (pending <= 0) return { ok: true, claimed: 0 };
    const ok = await grantNN(db, ctx.user.id, pending, { type: "ico_reward", refType: "user", refId: ctx.user.id });
    if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "发放失败" });
    await db.update(icoAccounts).set({
      pendingReward: "0",
      claimedReward: sql`${icoAccounts.claimedReward} + ${pending}`,
    }).where(eq(icoAccounts.userId, ctx.user.id));
    return { ok: true, claimed: pending };
  }),

  /** 开关:释放本金不提则自动复投 */
  setAutoCompound: protectedProcedure
    .input(z.object({ on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      await db.insert(icoAccounts).values({ userId: ctx.user.id, autoCompound: input.on })
        .onDuplicateKeyUpdate({ set: { autoCompound: input.on } });
      return { ok: true };
    }),

  // ─── 管理员 ───────────────────────────────────────────────────────────────
  /** 配置/开关 ICO */
  adminSetConfig: adminProcedure
    .input(z.object({
      totalTokens: z.number().positive(),
      startPrice: z.number().positive(),
      endPrice: z.number().positive(),
      exponent: z.number().min(1).max(3).default(1.5),
      listingPrice: z.number().min(0).default(3),
      perWalletCap: z.number().min(0).default(0),
      rewardPoolTotal: z.number().min(0).default(0),
      rewardDays: z.number().int().min(1).default(730),
      alpha: z.number().min(0).max(1).default(0.5),
      baseShare: z.number().min(0).max(1).default(0.2),
      vestMonths: z.number().int().min(1).default(12),
      vestCliffMonths: z.number().int().min(0).default(1),
      status: z.enum(["paused", "active", "ended"]).default("paused"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const vals = {
        id: 1,
        totalTokens: String(input.totalTokens), startPrice: String(input.startPrice), endPrice: String(input.endPrice),
        exponent: String(input.exponent), listingPrice: String(input.listingPrice), perWalletCap: String(input.perWalletCap),
        rewardPoolTotal: String(input.rewardPoolTotal), rewardDays: input.rewardDays,
        alpha: String(input.alpha), baseShare: String(input.baseShare),
        vestMonths: input.vestMonths, vestCliffMonths: input.vestCliffMonths, status: input.status,
      };
      const { id: _id, ...upd } = vals;
      await db.insert(icoConfig).values(vals).onDuplicateKeyUpdate({ set: upd });
      return { ok: true };
    }),

  /** 确认订单 → 按当前曲线成交、锁仓进质押(含滑点+单钱包上限校验) */
  adminConfirmOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [o] = await db.select().from(icoOrders).where(eq(icoOrders.id, input.orderId)).limit(1);
      if (!o || o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单不存在或已处理" });
      const c = await loadConfig(db);
      if (!c || c.status !== "active") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ICO 未在进行" });
      const curve = curveOf(c), sold = n(c.tokensSold);
      const usdt = n(o.usdtAmount);
      const tokens = tokensForBudget(curve, sold, usdt);
      if (tokens <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "额度已售罄" });
      if (tokens + 1e-8 < n(o.minTokens)) throw new TRPCError({ code: "BAD_REQUEST", message: "价格已变动超出滑点保护,请用户重新下单" });
      // 单钱包上限
      if (n(c.perWalletCap) > 0) {
        const [acc0] = await db.select({ locked: icoAccounts.lockedTotal }).from(icoAccounts).where(eq(icoAccounts.userId, o.userId)).limit(1);
        if (n(acc0?.locked) + tokens > n(c.perWalletCap)) throw new TRPCError({ code: "BAD_REQUEST", message: "超过单钱包认购上限" });
      }
      const q = curveQuote(curve, sold, tokens);
      // 成交:推进售出、记流水、锁仓进质押
      await db.update(icoConfig).set({ tokensSold: sql`${icoConfig.tokensSold} + ${tokens}` }).where(eq(icoConfig.id, 1));
      const [pr]: any = await db.insert(icoPurchases).values({
        userId: o.userId, usdtAmount: String(usdt), tokensBought: String(tokens),
        priceFrom: String(q.priceFrom), priceTo: String(q.priceTo), avgPrice: String(q.avgPrice),
      });
      const purchaseId = pr?.insertId ?? pr?.[0]?.insertId ?? null;
      await db.insert(icoAccounts).values({
        userId: o.userId, lockedTotal: String(tokens), stakedBalance: String(tokens), firstPurchaseAt: new Date(),
      }).onDuplicateKeyUpdate({ set: {
        lockedTotal: sql`${icoAccounts.lockedTotal} + ${tokens}`,
        stakedBalance: sql`${icoAccounts.stakedBalance} + ${tokens}`,
      } });
      await db.update(icoOrders).set({ status: "confirmed", purchaseId, confirmedAt: new Date() }).where(eq(icoOrders.id, o.id));
      return { ok: true, tokens, avgPrice: q.avgPrice };
    }),

  /** 取消订单 */
  adminCancelOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      await db.update(icoOrders).set({ status: "cancelled" }).where(and(eq(icoOrders.id, input.orderId), eq(icoOrders.status, "pending")));
      return { ok: true };
    }),

  /** 每日质押收益结算(幂等,按 runDate)。开方分配 + 保底平分,自动复投/挂待领。 */
  adminRunRewards: adminProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [exist] = await db.select({ id: icoRewardRuns.id }).from(icoRewardRuns).where(eq(icoRewardRuns.runDate, input.date)).limit(1);
      if (exist) return { ok: true, skipped: true as const };
      const c = await loadConfig(db);
      if (!c) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "未配置 ICO" });
      const pool = n(c.rewardPoolTotal), emittedSoFar = n(c.rewardEmitted), days = n(c.rewardDays);
      // 当前是奖励第几天:已结算次数 + 1
      const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)` }).from(icoRewardRuns);
      const day = Number(cnt) + 1;
      let emission = dailyEmission(pool, days, day);
      if (emittedSoFar + emission > pool) emission = Math.max(0, pool - emittedSoFar);

      const accs = await db.select().from(icoAccounts);
      const stakers: StakerStake[] = accs.map((a) => ({ userId: a.userId, staked: n(a.stakedBalance) })).filter((s) => s.staked > 0);
      const dist = distribute(emission, stakers, n(c.alpha), n(c.baseShare));

      let totalWeight = 0;
      for (const a of accs) totalWeight += Math.pow(n(a.stakedBalance), n(c.alpha));
      for (const [userId, reward] of Array.from(dist.entries())) {
        if (reward <= 0) continue;
        const acc = accs.find((a) => a.userId === userId)!;
        if (acc.autoCompound) {
          await db.update(icoAccounts).set({ stakedBalance: sql`${icoAccounts.stakedBalance} + ${reward}` }).where(eq(icoAccounts.userId, userId));
        } else {
          await db.update(icoAccounts).set({ pendingReward: sql`${icoAccounts.pendingReward} + ${reward}` }).where(eq(icoAccounts.userId, userId));
        }
      }
      await db.update(icoConfig).set({ rewardEmitted: sql`${icoConfig.rewardEmitted} + ${emission}` }).where(eq(icoConfig.id, 1));
      await db.insert(icoRewardRuns).values({ runDate: input.date, stakers: stakers.length, totalWeight: String(totalWeight), emitted: String(emission) });
      return { ok: true, skipped: false as const, day, emission, stakers: stakers.length };
    }),
});
