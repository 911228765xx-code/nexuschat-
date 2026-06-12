/**
 * 合伙人计划路由：档位/认购下单/我的面板/USDT 奖励领取/运营审核。
 * 订单复用 nn_node_orders 表（tier 取 partner/super/founder，金额为档内自定义整数）。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import {
  users, nnNodeOrders, partnerBonuses, partnerPayouts,
} from "../../drizzle/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { sanitizeInput } from "../utils/sanitize";
import {
  PARTNER_TIERS, getPartnerTier, tierForStake, tierOrder, getSeatUsage, getMyEarnings,
  runPartnerSettlement, BONUS_PERIODS,
} from "../partner";
import { USDT_DEPOSIT_ADDRESS, USDT_CHAIN, createVesting } from "../token";

const MONTH_MS = 30 * 24 * 3600 * 1000;

/** 某期解锁时间：确认后第 period 个月 */
function periodUnlockAt(startAt: Date, period: number): Date {
  return new Date(startAt.getTime() + period * MONTH_MS);
}

/** 每期金额：均分取整，余数并入末期 */
function periodAmount(totalUsdt: number, periods: number, period: number): number {
  const base = Math.floor(totalUsdt / periods);
  return period === periods ? totalUsdt - base * (periods - 1) : base;
}

export const partnerRouter = router({
  // ─── 档位与席位（公开） ─────────────────────────────────────────────────────
  getTiers: publicProcedure.query(async () => {
    const db = await getDb();
    const seats = db ? await getSeatUsage(db) : {};
    return {
      tiers: PARTNER_TIERS.map((t) => ({
        ...t,
        seatsTaken: seats[t.key] ?? 0,
      })),
      payAddress: USDT_DEPOSIT_ADDRESS,
      chain: USDT_CHAIN,
      bonusPeriods: BONUS_PERIODS,
    };
  }),

  // ─── 认购下单（档内自定义金额） ──────────────────────────────────────────────
  createOrder: protectedProcedure
    .input(z.object({ tier: z.enum(["partner", "super", "founder"]), usdtAmount: z.number().int().min(3000).max(100000) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tier = getPartnerTier(input.tier);
      if (!tier) throw new TRPCError({ code: "BAD_REQUEST", message: "未知档位" });
      if (input.usdtAmount < tier.minUsdt || input.usdtAmount > tier.maxUsdt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${tier.name}认购额需在 ${tier.minUsdt.toLocaleString()}–${tier.maxUsdt.toLocaleString()} USDT 之间` });
      }
      // 席位校验（已确认身份数；运营确认时再复核一次）
      const seats = await getSeatUsage(db);
      if ((seats[tier.key] ?? 0) >= tier.seats) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${tier.name}席位已满` });
      }
      const nnAmount = input.usdtAmount * tier.nnPerUsdt;
      const [res] = await db.insert(nnNodeOrders).values({
        userId: ctx.user.id,
        tier: tier.key,
        usdtAmount: input.usdtAmount,
        nnAmount,
        payAddress: USDT_DEPOSIT_ADDRESS || null,
      }).$returningId();
      return {
        orderId: (res as any).id,
        tier: tier.key,
        usdtAmount: input.usdtAmount,
        nnAmount,
        payAddress: USDT_DEPOSIT_ADDRESS,
        chain: USDT_CHAIN,
      };
    }),

  // 回填链上转账哈希
  submitTx: protectedProcedure
    .input(z.object({ orderId: z.number(), txHash: z.string().min(6).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [o] = await db.select().from(nnNodeOrders).where(eq(nnNodeOrders.id, input.orderId)).limit(1);
      if (!o || o.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "订单不存在" });
      if (o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单状态不可修改" });
      await db.update(nnNodeOrders).set({ txHash: sanitizeInput(input.txHash, 120) }).where(eq(nnNodeOrders.id, input.orderId));
      return { ok: true };
    }),

  // ─── 我的合伙人面板 ─────────────────────────────────────────────────────────
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [u] = await db
      .select({ tier: users.partnerTier, stake: users.partnerStakeUsdt, lastSigninYmd: users.lastSigninYmd })
      .from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const tier = u?.tier ? getPartnerTier(u.tier) : null;

    const orders = await db.select().from(nnNodeOrders)
      .where(eq(nnNodeOrders.userId, ctx.user.id))
      .orderBy(desc(nnNodeOrders.createdAt)).limit(50);

    const earnings = await getMyEarnings(db, ctx.user.id);

    // USDT 奖励：逐单计算各期解锁/已领状态
    const bonuses = await db.select().from(partnerBonuses)
      .where(eq(partnerBonuses.userId, ctx.user.id)).orderBy(desc(partnerBonuses.createdAt));
    const payouts = await db.select().from(partnerPayouts)
      .where(eq(partnerPayouts.userId, ctx.user.id)).orderBy(desc(partnerPayouts.createdAt)).limit(50);
    const claimedKeys = new Set(payouts.filter((p) => p.status !== "rejected").map((p) => `${p.bonusId}:${p.period}`));
    const now = Date.now();
    const bonusList = bonuses.map((b) => {
      const periods = Array.from({ length: b.periods }, (_, i) => {
        const period = i + 1;
        const unlockAt = periodUnlockAt(b.startAt, period);
        const claimed = claimedKeys.has(`${b.id}:${period}`);
        return {
          period,
          amountUsdt: periodAmount(b.totalUsdt, b.periods, period),
          unlockAt: unlockAt.toISOString(),
          unlocked: unlockAt.getTime() <= now,
          claimed,
        };
      });
      return {
        id: b.id, orderId: b.orderId, totalUsdt: b.totalUsdt,
        claimedUsdt: b.claimedUsdt, startAt: b.startAt.toISOString(), periods,
      };
    });

    return {
      tier: tier ? { key: tier.key, name: tier.name, badge: tier.badge, feeSharePct: tier.feeSharePct, revWeight: tier.revWeight, bonusPct: tier.bonusPct } : null,
      stakeUsdt: Number(u?.stake ?? 0),
      earnings,
      bonuses: bonusList,
      payouts: payouts.map((p) => ({
        id: p.id, amountUsdt: p.amountUsdt, address: p.address, status: p.status,
        txHash: p.txHash, createdAt: p.createdAt.toISOString(),
      })),
      orders,
    };
  }),

  // ─── 领取某期 USDT 奖励 → 生成打款申请 ──────────────────────────────────────
  claimBonus: protectedProcedure
    .input(z.object({ bonusId: z.number(), period: z.number().int().min(1).max(24), address: z.string().min(10).max(120) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [b] = await db.select().from(partnerBonuses).where(eq(partnerBonuses.id, input.bonusId)).limit(1);
      if (!b || b.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "奖励不存在" });
      if (input.period > b.periods) throw new TRPCError({ code: "BAD_REQUEST", message: "期数无效" });
      if (periodUnlockAt(b.startAt, input.period).getTime() > Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该期尚未解锁" });
      }
      // 活跃门槛：近 30 天内有签到/登录
      const [u] = await db.select({ ymd: users.lastSigninYmd, lastSignedIn: users.lastSignedIn })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const lastActive = Math.max(
        u?.lastSignedIn ? u.lastSignedIn.getTime() : 0,
        u?.ymd ? new Date(`${u.ymd}T00:00:00.000Z`).getTime() : 0,
      );
      if (Date.now() - lastActive > 30 * 24 * 3600 * 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "需保持活跃（近 30 天内登录）方可领取" });
      }
      const amount = periodAmount(b.totalUsdt, b.periods, input.period);
      try {
        // 唯一索引 (bonusId, period) 防并发重复领取
        await db.insert(partnerPayouts).values({
          userId: ctx.user.id,
          bonusId: b.id,
          period: input.period,
          amountUsdt: amount,
          address: sanitizeInput(input.address, 120),
        });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该期已申请过领取" });
      }
      await db.update(partnerBonuses).set({
        claimedPeriods: sql`${partnerBonuses.claimedPeriods} + 1`,
        claimedUsdt: sql`${partnerBonuses.claimedUsdt} + ${amount}`,
      }).where(eq(partnerBonuses.id, b.id));
      return { ok: true, amountUsdt: amount };
    }),

  // ─── 运营：确认到账（发 AI 配额 + 身份 + USDT 奖励 + 赠 Pro） ────────────────
  adminConfirmOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [o] = await db.select().from(nnNodeOrders).where(eq(nnNodeOrders.id, input.orderId)).limit(1);
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      if (o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单已处理" });
      const tier = getPartnerTier(o.tier);
      if (!tier) throw new TRPCError({ code: "BAD_REQUEST", message: "非合伙人订单，请用旧节点确认入口" });

      // 1) 订单置为已确认（原子条件防并发双确认）
      const res: any = await db.update(nnNodeOrders)
        .set({ status: "confirmed", confirmedAt: new Date() })
        .where(and(eq(nnNodeOrders.id, o.id), eq(nnNodeOrders.status, "pending")));
      const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
      if (!affected) throw new TRPCError({ code: "BAD_REQUEST", message: "订单已处理" });

      // 2) AI 配额走线性归属（按"当前"档位汇率重算，防旧汇率挂单按旧价铸币）
      const nnNow = o.usdtAmount * tier.nnPerUsdt;
      if (nnNow !== o.nnAmount) {
        await db.update(nnNodeOrders).set({ nnAmount: nnNow }).where(eq(nnNodeOrders.id, o.id));
      }
      await createVesting(db, o.userId, "partner", o.id, nnNow, tier.cliffMonths, tier.durationMonths);

      // 3) 累计认购额 + 身份判定（只升不降）
      await db.update(users)
        .set({ partnerStakeUsdt: sql`${users.partnerStakeUsdt} + ${o.usdtAmount}` })
        .where(eq(users.id, o.userId));
      const [u] = await db.select({ stake: users.partnerStakeUsdt, cur: users.partnerTier, proUntil: users.proUntil })
        .from(users).where(eq(users.id, o.userId)).limit(1);
      const newTier = tierForStake(Number(u?.stake ?? 0));
      const effectiveTier = newTier && tierOrder(newTier.key) > tierOrder(u?.cur ?? null) ? newTier : (u?.cur ? getPartnerTier(u.cur) : newTier);
      if (newTier && tierOrder(newTier.key) > tierOrder(u?.cur ?? null)) {
        await db.update(users).set({ partnerTier: newTier.key }).where(eq(users.id, o.userId));
      }

      // 4) USDT 认购奖励：按"确认后档位"比例生成，6 期月度解锁
      const bonusTier = effectiveTier ?? tier;
      const bonusUsdt = Math.floor((o.usdtAmount * bonusTier.bonusPct) / 100);
      if (bonusUsdt > 0) {
        await db.insert(partnerBonuses).values({
          userId: o.userId, orderId: o.id, totalUsdt: bonusUsdt, periods: BONUS_PERIODS, startAt: new Date(),
        });
      }

      // 5) 赠送 Pro 会员（999=终身≈100年；叠加现有有效期）
      const giftMonths = bonusTier.proGiftMonths;
      if (giftMonths > 0) {
        const months = giftMonths >= 999 ? 1200 : giftMonths;
        const base = u?.proUntil && u.proUntil.getTime() > Date.now() ? u.proUntil.getTime() : Date.now();
        await db.update(users)
          .set({ proTier: "pro", proUntil: new Date(base + months * MONTH_MS) })
          .where(eq(users.id, o.userId));
      }

      return { ok: true, nnVesting: nnNow, bonusUsdt, tier: bonusTier.key };
    }),

  // 运营：取消订单
  adminCancelOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [o] = await db.select().from(nnNodeOrders).where(eq(nnNodeOrders.id, input.orderId)).limit(1);
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      if (o.status === "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "已确认订单不可取消" });
      await db.update(nnNodeOrders).set({ status: "cancelled" }).where(eq(nnNodeOrders.id, o.id));
      return { ok: true };
    }),

  // 运营：USDT 打款申请列表
  adminListPayouts: adminProcedure
    .input(z.object({ status: z.enum(["pending", "paid", "rejected"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = input?.status ? [eq(partnerPayouts.status, input.status)] : [];
      const rows = await db.select().from(partnerPayouts)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(partnerPayouts.createdAt)).limit(100);
      return rows;
    }),

  // 运营：标记打款完成 / 驳回
  adminResolvePayout: adminProcedure
    .input(z.object({ payoutId: z.number(), action: z.enum(["paid", "rejected"]), txHash: z.string().max(120).optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [p] = await db.select().from(partnerPayouts).where(eq(partnerPayouts.id, input.payoutId)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在" });
      if (p.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "已处理" });
      await db.update(partnerPayouts).set({
        status: input.action,
        txHash: input.txHash ? sanitizeInput(input.txHash, 120) : null,
        paidAt: input.action === "paid" ? new Date() : null,
      }).where(eq(partnerPayouts.id, p.id));
      // 驳回则回退奖励已领进度，允许重新申请
      if (input.action === "rejected") {
        await db.update(partnerBonuses).set({
          claimedPeriods: sql`GREATEST(${partnerBonuses.claimedPeriods} - 1, 0)`,
          claimedUsdt: sql`GREATEST(${partnerBonuses.claimedUsdt} - ${p.amountUsdt}, 0)`,
        }).where(eq(partnerBonuses.id, p.bonusId));
        // 删除驳回记录以释放 (bonusId, period) 唯一闸 → 用户可换地址重领
        await db.delete(partnerPayouts).where(eq(partnerPayouts.id, p.id));
      }
      return { ok: true };
    }),

  // 运营：手动触发一次分红结算（测试/补结）
  adminRunSettle: adminProcedure.mutation(async () => {
    const r = await runPartnerSettlement();
    return { ok: true, ...(r ?? { fee: 0, revenue: 0 }) };
  }),
});
