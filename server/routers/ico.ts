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
import { icoConfig, icoOrders, icoPurchases, icoAccounts, icoStakeLots, icoRewardRuns, users, usdtDeposits } from "../../drizzle/schema";
import { eq, and, desc, gt, asc, inArray, sql, ne } from "drizzle-orm";
import { USDT_DEPOSIT_ADDRESS, USDT_CHAIN, grantNN } from "../token";
import { sanitizeInput } from "../utils/sanitize";
import { priceAtSold, costForTokens, tokensForBudget, quote as curveQuote, type IcoCurve } from "../ico/pricing";
import { vestedFraction, distributeAprLots, effectiveApr, type StakeLot } from "../ico/rewards";
import { deriveIcoTier, nextTierGap, ICO_TIERS } from "../ico/tiers";
import { verifyUsdtPayment } from "../ico/chainVerify";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]; // 事务句柄(与 Db 共享查询接口)
const n = (v: unknown) => Number(v ?? 0);

async function loadConfig(db: Db) {
  const [c] = await db.select().from(icoConfig).where(eq(icoConfig.id, 1)).limit(1);
  return c ?? null;
}
function curveOf(c: any): IcoCurve {
  return { totalTokens: n(c.totalTokens), startPrice: n(c.startPrice), endPrice: n(c.endPrice), exponent: n(c.exponent) };
}
/** 跨所有认购累计已释放本金(每笔按自身锁仓时钟) */
async function vestedPrincipal(db: Db | Tx, userId: number, c: any): Promise<number> {
  const rows = await db.select().from(icoPurchases).where(eq(icoPurchases.userId, userId));
  let vested = 0;
  for (const p of rows) {
    const months = (Date.now() - new Date(p.createdAt).getTime()) / (30 * 24 * 3600 * 1000);
    vested += n(p.tokensBought) * vestedFraction(months, n(c.vestMonths), n(c.vestCliffMonths));
  }
  return vested;
}

export type SettleResult = { ok: true; tokens: number; baseTokens: number; bonus: number; bonusPct: number; tierLevel: number; avgPrice: number };
/**
 * 成交一张 pending 订单(锁订单行防双确认 + 锁配置行串行化曲线防超售/重复定价)。
 * paidUsdt 给定时以它为准(链上实际到账金额),否则用订单声明金额(admin 手动确认兜底)。
 */
async function settleOrder(db: Db, orderId: number, paidUsdt?: number): Promise<SettleResult> {
  let result: SettleResult;
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(icoOrders).where(eq(icoOrders.id, orderId)).for("update").limit(1);
    if (!o || o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单不存在或已处理" });
    const [c] = await tx.select().from(icoConfig).where(eq(icoConfig.id, 1)).for("update").limit(1);
    if (!c || c.status !== "active") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ICO 未在进行" });
    const curve = curveOf(c), sold = n(c.tokensSold);
    const usdt = paidUsdt != null ? paidUsdt : n(o.usdtAmount);
    const tokens = tokensForBudget(curve, sold, usdt);
    if (tokens <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "额度已售罄" });
    if (tokens + 1e-8 < n(o.minTokens)) throw new TRPCError({ code: "BAD_REQUEST", message: "价格已变动超出滑点保护,请用户重新下单" });
    if (n(c.perWalletCap) > 0) {
      const [acc0] = await tx.select({ locked: icoAccounts.lockedTotal }).from(icoAccounts).where(eq(icoAccounts.userId, o.userId)).limit(1);
      if (n(acc0?.locked) + tokens > n(c.perWalletCap)) throw new TRPCError({ code: "BAD_REQUEST", message: "超过单钱包认购上限" });
    }
    const q = curveQuote(curve, sold, tokens);
    const [{ prevUsdt }] = await tx.select({ prevUsdt: sql<number>`COALESCE(SUM(${icoPurchases.usdtAmount}),0)` }).from(icoPurchases).where(eq(icoPurchases.userId, o.userId));
    const cumUsdt = n(prevUsdt) + usdt;
    const tier = deriveIcoTier(cumUsdt);
    const bonusPct = tier?.bonusPct ?? 0;
    const bonus = tokens * bonusPct;          // 加成代币(不走曲线、不推进售出)
    const credited = tokens + bonus;          // 实际入账(基础+加成):锁仓+质押+计龄
    await tx.update(icoConfig).set({ tokensSold: sql`${icoConfig.tokensSold} + ${tokens}` }).where(eq(icoConfig.id, 1));
    const [pr]: any = await tx.insert(icoPurchases).values({
      userId: o.userId, usdtAmount: String(usdt), tokensBought: String(credited),
      priceFrom: String(q.priceFrom), priceTo: String(q.priceTo), avgPrice: String(credited > 0 ? usdt / credited : q.avgPrice),
    });
    const purchaseId = pr?.insertId ?? pr?.[0]?.insertId ?? null;
    await tx.insert(icoAccounts).values({
      userId: o.userId, lockedTotal: String(credited), stakedBalance: String(credited), firstPurchaseAt: new Date(),
    }).onDuplicateKeyUpdate({ set: {
      lockedTotal: sql`${icoAccounts.lockedTotal} + ${credited}`,
      stakedBalance: sql`${icoAccounts.stakedBalance} + ${credited}`,
    } });
    await tx.insert(icoStakeLots).values({ userId: o.userId, amount: String(credited), stakedAt: new Date(), source: "purchase" });
    if (tier) await tx.update(users).set({ icoTier: tier.level }).where(eq(users.id, o.userId));
    await tx.update(icoOrders).set({ status: "confirmed", purchaseId, confirmedAt: new Date() }).where(eq(icoOrders.id, o.id));
    result = { ok: true, tokens: credited, baseTokens: tokens, bonus, bonusPct, tierLevel: tier?.level ?? 0, avgPrice: q.avgPrice };
  });
  return result!;
}

/** 链上核验一张已填哈希的 pending 订单 → 通过则按链上实际金额自动成交(无需 admin)。 */
async function verifyAndSettle(db: Db, order: { id: number; txHash: string | null }) {
  if (!order.txHash) return { settled: false, pending: true, reason: "未填交易哈希" };
  const v = await verifyUsdtPayment(order.txHash);
  if (v.pending) return { settled: false, pending: true, reason: v.reason };
  if (!v.ok) return { settled: false, pending: false, reason: v.reason };
  try {
    const r = await settleOrder(db, order.id, v.amount!); // 金额以链上为准
    return { settled: true, pending: false, amount: v.amount, tokens: r.tokens, tierLevel: r.tierLevel };
  } catch (e: any) {
    const msg = e?.message || "成交失败";
    if (/已处理|已确认/.test(msg)) return { settled: true, pending: false }; // 并发已成交,视为成功
    return { settled: false, pending: false, reason: msg };
  }
}

/** 每日 ICO 质押收益结算（幂等，按 runDate）。供后台手动触发 + 定时器调用。 */
export async function settleIcoRewards(date: string): Promise<
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; emitted: number; stakers: number; factor: number; poolLeft: number }
> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
  // 未配置 ICO → 安静跳过（定时器场景不报错）
  const [cfg0] = await db.select({ id: icoConfig.id }).from(icoConfig).where(eq(icoConfig.id, 1)).limit(1);
  if (!cfg0) return { ok: true, skipped: true };
  // 快路径：当日已结算直接跳过
  const [exist0] = await db.select({ id: icoRewardRuns.id }).from(icoRewardRuns).where(eq(icoRewardRuns.runDate, date)).limit(1);
  if (exist0) return { ok: true, skipped: true };
  try {
    let out: { ok: true; skipped: false; emitted: number; stakers: number; factor: number; poolLeft: number } | null = null;
    await db.transaction(async (tx) => {
      // 锁配置行，串行化 rewardEmitted 读改一致（并发结算只能一个进临界区）
      const [c] = await tx.select().from(icoConfig).where(eq(icoConfig.id, 1)).for("update").limit(1);
      if (!c) return;
      // 拿到锁后再确认一次当日未结算（防前一笔刚结算完）
      const [exist] = await tx.select({ id: icoRewardRuns.id }).from(icoRewardRuns).where(eq(icoRewardRuns.runDate, date)).limit(1);
      if (exist) return;
      const pool = n(c.rewardPoolTotal), emittedSoFar = n(c.rewardEmitted);
      const remaining = Math.max(0, pool - emittedSoFar);
      // 每笔质押批次各自计龄：新资金/复投按 aprStart 起步，沿曲线降到 aprEnd
      const now = Date.now();
      const lotRows = await tx.select().from(icoStakeLots).where(gt(icoStakeLots.amount, "0"));
      const lots: StakeLot[] = lotRows.map((l) => ({
        userId: l.userId, amount: n(l.amount),
        ageDays: (now - new Date(l.stakedAt).getTime()) / 86400000,
      }));
      const { perUser, emitted, uncapped, factor } = distributeAprLots(lots, n(c.aprStart), n(c.aprEnd), n(c.aprDeclineDays), remaining);
      const accs = await tx.select().from(icoAccounts);
      for (const [userId, reward] of Array.from(perUser.entries())) {
        if (reward <= 0) continue;
        const acc = accs.find((a) => a.userId === userId)!;
        if (acc.autoCompound) {
          await tx.update(icoAccounts).set({ stakedBalance: sql`${icoAccounts.stakedBalance} + ${reward}` }).where(eq(icoAccounts.userId, userId));
          await tx.insert(icoStakeLots).values({ userId, amount: String(reward), stakedAt: new Date(), source: "compound" });
        } else {
          await tx.update(icoAccounts).set({ pendingReward: sql`${icoAccounts.pendingReward} + ${reward}` }).where(eq(icoAccounts.userId, userId));
        }
      }
      await tx.update(icoConfig).set({ rewardEmitted: sql`${icoConfig.rewardEmitted} + ${emitted}` }).where(eq(icoConfig.id, 1));
      // 唯一 runDate：并发抢同日会抛 → 整个事务回滚，绝不双发
      await tx.insert(icoRewardRuns).values({ runDate: date, stakers: perUser.size, totalWeight: String(uncapped), emitted: String(emitted) });
      out = { ok: true, skipped: false, emitted, stakers: perUser.size, factor, poolLeft: Math.max(0, remaining - emitted) };
    });
    return out ?? { ok: true, skipped: true };
  } catch (e: any) {
    const msg = String(e?.message ?? e?.cause?.message ?? "");
    if (e?.code === "ER_DUP_ENTRY" || e?.errno === 1062 || /duplicate/i.test(msg)) return { ok: true, skipped: true };
    throw e;
  }
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
      targetApr: n(c.aprStart),     // 新资金起始年化(每笔从入场起按此起步)
      aprStart: n(c.aprStart),
      aprEnd: n(c.aprEnd),
      aprDeclineDays: n(c.aprDeclineDays),
      tiers: ICO_TIERS,             // 认购档位/徽章定义(给前端展示)
      payAddress: USDT_DEPOSIT_ADDRESS,
      payChain: USDT_CHAIN,
    };
  }),

  /** 批量取用户的合伙人等级(聊天/成员列表挂徽章用,只返回有等级的)。 */
  tiersByUsers: protectedProcedure
    .input(z.object({ userIds: z.array(z.number().int()).max(200) }))
    .query(async ({ input }) => {
      const out: Record<number, number> = {};
      if (!input.userIds.length) return out;
      const db = await getDb();
      if (!db) return out;
      const rows = await db.select({ id: users.id, t: users.icoTier }).from(users)
        .where(and(inArray(users.id, input.userIds), gt(users.icoTier, 0)));
      for (const r of rows) out[r.id] = r.t;
      return out;
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
      const txHash = sanitizeInput(input.txHash, 120);
      const [o] = await db.select().from(icoOrders).where(and(eq(icoOrders.id, input.orderId), eq(icoOrders.userId, ctx.user.id))).limit(1);
      if (!o || o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单不存在或已处理" });
      // 同一链上 txHash 全局唯一:杜绝一笔转账填到多张订单各自确认 = 凭空多发认购代币
      const [dup] = await db.select({ id: icoOrders.id }).from(icoOrders).where(and(eq(icoOrders.txHash, txHash), ne(icoOrders.id, o.id))).limit(1);
      if (dup) throw new TRPCError({ code: "BAD_REQUEST", message: "该交易哈希已用于其它订单,请勿重复" });
      // 跨路径去重(M1):同一链上 txHash 若已用于 Swap 钱包充值,禁止再拿来 ICO 认购,否则一笔钱两处入账(ICO 铸币 + 充值加余额)
      const [depDup] = await db.select({ id: usdtDeposits.id }).from(usdtDeposits).where(eq(usdtDeposits.txHash, txHash)).limit(1);
      if (depDup) throw new TRPCError({ code: "BAD_REQUEST", message: "该交易哈希已用于钱包充值,请勿重复" });
      try {
        await db.update(icoOrders).set({ txHash }).where(eq(icoOrders.id, input.orderId));
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该交易哈希已用于其它订单,请勿重复" }); // 唯一索引兜底(并发)
      }
      // 链上自动核验 → 真实付款即自动入账锁仓质押(无需 admin);未确认则返回 pending,前端轮询 verifyPayment
      return verifyAndSettle(db, { id: o.id, txHash });
    }),

  /** 轮询:重新核验一张已填哈希的 pending 订单(确认中→确认后自动到账) */
  verifyPayment: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [o] = await db.select().from(icoOrders).where(and(eq(icoOrders.id, input.orderId), eq(icoOrders.userId, ctx.user.id))).limit(1);
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      if (o.status === "confirmed") return { settled: true, pending: false };
      if (o.status !== "pending" || !o.txHash) return { settled: false, pending: false, reason: "无待核验付款" };
      return verifyAndSettle(db, { id: o.id, txHash: o.txHash });
    }),

  /** 我的订单 */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(icoOrders).where(eq(icoOrders.userId, ctx.user.id)).orderBy(desc(icoOrders.createdAt)).limit(50);
    return rows.map((o) => ({ id: o.id, usdtAmount: n(o.usdtAmount), status: o.status, txHash: o.txHash, createdAt: o.createdAt }));
  }),

  /** 我的 ICO 账户:锁仓/已释放/可提/质押中/待领收益 + 释放进度参数 */
  myAccount: protectedProcedure.query(async ({ ctx }) => {
    const empty = { lockedTotal: 0, vested: 0, vestedPct: 0, withdrawable: 0, withdrawn: 0, staked: 0, pendingReward: 0, claimedReward: 0, autoCompound: true, vestMonths: 12, vestCliffMonths: 1, monthsElapsed: 0, firstPurchaseAt: null as string | null, currentApr: 0, aprStart: 0, aprEnd: 0, subscribedUsdt: 0, tier: null as null | { level: number; key: string; name: string; badge: string; color: string; bonusPct: number }, nextTier: null as null | { name: string; gap: number } };
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!db || !c) return empty;
    const [acc] = await db.select().from(icoAccounts).where(eq(icoAccounts.userId, ctx.user.id)).limit(1);
    if (!acc) return { ...empty, vestMonths: n(c.vestMonths), vestCliffMonths: n(c.vestCliffMonths), aprStart: n(c.aprStart), aprEnd: n(c.aprEnd) };
    const vested = await vestedPrincipal(db, ctx.user.id, c);
    const withdrawn = n(acc.withdrawnPrincipal);
    const locked = n(acc.lockedTotal);
    const first = acc.firstPurchaseAt ? new Date(acc.firstPurchaseAt) : null;
    const monthsElapsed = first ? (Date.now() - first.getTime()) / (30 * 24 * 3600 * 1000) : 0;
    // 我的当前年化 = 各质押批次按年龄取年化、按数量加权平均
    const myLots = await db.select().from(icoStakeLots).where(and(eq(icoStakeLots.userId, ctx.user.id), gt(icoStakeLots.amount, "0")));
    let wsum = 0, asum = 0; const now2 = Date.now();
    for (const l of myLots) {
      const amt = n(l.amount), age = (now2 - new Date(l.stakedAt).getTime()) / 86400000;
      wsum += amt * effectiveApr(n(c.aprStart), n(c.aprEnd), n(c.aprDeclineDays), age); asum += amt;
    }
    const currentApr = asum > 0 ? wsum / asum : n(c.aprStart);
    // 认购档位/徽章:按累计认购 USDT
    const [{ usdt }] = await db.select({ usdt: sql<number>`COALESCE(SUM(${icoPurchases.usdtAmount}),0)` }).from(icoPurchases).where(eq(icoPurchases.userId, ctx.user.id));
    const subscribedUsdt = n(usdt);
    const t = deriveIcoTier(subscribedUsdt);
    const ng = nextTierGap(subscribedUsdt);
    return {
      currentApr, aprStart: n(c.aprStart), aprEnd: n(c.aprEnd),
      subscribedUsdt,
      tier: t ? { level: t.level, key: t.key, name: t.name, badge: t.badge, color: t.color, bonusPct: t.bonusPct } : null,
      nextTier: ng ? { name: ng.tier.name, gap: ng.gap } : null,
      lockedTotal: locked,
      vested,
      vestedPct: locked > 0 ? vested / locked : 0,
      withdrawable: Math.max(0, vested - withdrawn),
      withdrawn,
      staked: n(acc.stakedBalance),
      pendingReward: n(acc.pendingReward),
      claimedReward: n(acc.claimedReward),
      autoCompound: !!acc.autoCompound,
      vestMonths: n(c.vestMonths),
      vestCliffMonths: n(c.vestCliffMonths),
      monthsElapsed,
      firstPurchaseAt: first ? first.toISOString() : null,
    };
  }),

  /** 提取已释放本金(进 AI 余额) */
  withdraw: protectedProcedure
    .input(z.object({ amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const c = db ? await loadConfig(db) : null;
      if (!db || !c) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 全程一个事务 + 行锁:并发"提全部"会串行化,第二笔读到已扣账的余额 → 校验失败,杜绝双花
      await db.transaction(async (tx) => {
        const [acc] = await tx.select().from(icoAccounts).where(eq(icoAccounts.userId, ctx.user.id)).for("update").limit(1);
        if (!acc) throw new TRPCError({ code: "BAD_REQUEST", message: "无认购记录" });
        const vested = await vestedPrincipal(tx, ctx.user.id, c);
        const withdrawable = Math.max(0, vested - n(acc.withdrawnPrincipal));
        if (input.amount > withdrawable + 1e-8) throw new TRPCError({ code: "BAD_REQUEST", message: `可提余额不足,当前可提 ${withdrawable.toFixed(4)}` });
        // 先扣账,再发钱;grantNN 失败 throw → 整个事务回滚
        await tx.update(icoAccounts).set({
          withdrawnPrincipal: sql`${icoAccounts.withdrawnPrincipal} + ${input.amount}`,
          stakedBalance: sql`GREATEST(${icoAccounts.stakedBalance} - ${input.amount}, 0)`,
        }).where(eq(icoAccounts.userId, ctx.user.id));
        // FIFO 减少质押批次(老资金先出)
        let toReduce = input.amount;
        const lots = await tx.select().from(icoStakeLots)
          .where(and(eq(icoStakeLots.userId, ctx.user.id), gt(icoStakeLots.amount, "0"))).orderBy(asc(icoStakeLots.stakedAt));
        for (const lot of lots) {
          if (toReduce <= 1e-9) break;
          const amt = n(lot.amount), cut = Math.min(amt, toReduce);
          await tx.update(icoStakeLots).set({ amount: String(amt - cut) }).where(eq(icoStakeLots.id, lot.id));
          toReduce -= cut;
        }
        const ok = await grantNN(tx as unknown as Db, ctx.user.id, input.amount, { type: "ico_withdraw", refType: "user", refId: ctx.user.id });
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "发放失败,请稍后再试" });
      });
      return { ok: true, withdrawn: input.amount };
    }),

  /** 领取质押收益(进 AI 余额) */
  claimRewards: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
    let claimed = 0;
    // 事务 + 行锁:并发双领会串行化,第二次读到 pending=0 → 不重发
    await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(icoAccounts).where(eq(icoAccounts.userId, ctx.user.id)).for("update").limit(1);
      const pending = n(acc?.pendingReward);
      if (pending <= 0) return;
      // 先清账(置0+累计),再发钱;grantNN 失败 throw → 回滚
      await tx.update(icoAccounts).set({
        pendingReward: "0",
        claimedReward: sql`${icoAccounts.claimedReward} + ${pending}`,
      }).where(eq(icoAccounts.userId, ctx.user.id));
      const ok = await grantNN(tx as unknown as Db, ctx.user.id, pending, { type: "ico_reward", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "发放失败" });
      claimed = pending;
    });
    return { ok: true, claimed };
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
  /** 当前配置原始值(给管理员表单回填) + 概览 */
  adminGetConfig: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { config: null, raised: 0, rewardEmitted: 0 };
    const c = await loadConfig(db);
    if (!c) return { config: null, raised: 0, rewardEmitted: 0 };
    return {
      config: {
        totalTokens: n(c.totalTokens), tokensSold: n(c.tokensSold), startPrice: n(c.startPrice), endPrice: n(c.endPrice),
        exponent: n(c.exponent), listingPrice: n(c.listingPrice), perWalletCap: n(c.perWalletCap),
        rewardPoolTotal: n(c.rewardPoolTotal), aprStart: n(c.aprStart), aprEnd: n(c.aprEnd), aprDeclineDays: n(c.aprDeclineDays),
        vestMonths: n(c.vestMonths), vestCliffMonths: n(c.vestCliffMonths), status: c.status,
      },
      raised: costForTokens(curveOf(c), 0, n(c.tokensSold)),
      rewardEmitted: n(c.rewardEmitted),
    };
  }),

  /** 待确认订单(给管理员审核) */
  adminListOrders: adminProcedure
    .input(z.object({ status: z.enum(["pending", "confirmed", "cancelled", "all"]).default("pending") }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const st = input?.status ?? "pending";
      const rows = await db.select({ o: icoOrders, name: users.name, username: users.username })
        .from(icoOrders).leftJoin(users, eq(users.id, icoOrders.userId))
        .where(st === "all" ? sql`1=1` : eq(icoOrders.status, st))
        .orderBy(desc(icoOrders.createdAt)).limit(100);
      return rows.map((r) => ({
        id: r.o.id, userId: r.o.userId, userName: r.name ?? r.username ?? `用户${r.o.userId}`,
        usdtAmount: n(r.o.usdtAmount), minTokens: n(r.o.minTokens), txHash: r.o.txHash,
        status: r.o.status, createdAt: r.o.createdAt,
      }));
    }),

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
      aprStart: z.number().min(0).max(100).default(1),       // 起始年化(1=100%)
      aprEnd: z.number().min(0).max(100).default(1),         // 结束年化(线性降到此值)
      aprDeclineDays: z.number().int().min(1).default(365),  // 递减天数
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
        rewardPoolTotal: String(input.rewardPoolTotal),
        aprStart: String(input.aprStart), aprEnd: String(input.aprEnd), aprDeclineDays: input.aprDeclineDays,
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
      return settleOrder(db, input.orderId); // 手动确认兜底:按订单声明金额成交(自动核验走 submitTx/verifyPayment)
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

  /** 每日质押收益结算(幂等,按 runDate)。每笔批次各自计龄取年化 + 奖励池封顶 + 线性,自动复投/挂待领。 */
  adminRunRewards: adminProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input }) => settleIcoRewards(input.date)),
});
