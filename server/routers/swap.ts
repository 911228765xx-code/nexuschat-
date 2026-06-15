import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, aiAmmPool, aiSwapTrades, usdtDeposits, usdtWithdrawals, icoPurchases } from "../../drizzle/schema";
import { eq, and, gte, desc, asc, sql, inArray } from "drizzle-orm";
import { rateLimitWrite } from "../rateLimit";
import { USDT_DEPOSIT_ADDRESS, USDT_CHAIN } from "../token";
import { sanitizeInput } from "../utils/sanitize";
import {
  poolFromRow, spotPrice, floorPrice, currentThetaBps, currentSellTaxBps, effectivePeak, quoteBuy, quoteSell,
} from "../swap/floorAmm";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
const IV_MS: Record<string, number> = { "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };

async function getPool(db: Db) {
  let [p] = await db.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).limit(1);
  if (!p) {
    try { await db.insert(aiAmmPool).values({ id: 1 }); } catch { /* 并发已建 */ }
    [p] = await db.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).limit(1);
  }
  return p!;
}
function affected(r: unknown): number {
  const a = r as any;
  return a?.[0]?.affectedRows ?? a?.affectedRows ?? a?.rowsAffected ?? 0;
}
/** 可赎回供应量 = 全体用户 AI 持仓 SUM(nnBalance)。地板价 F = reserveR / 此值(对应链上 R/totalSupply)。 */
async function sumNn(d: any): Promise<number> {
  const [r] = await d.select({ s: sql<number>`COALESCE(SUM(${users.nnBalance}),0)` }).from(users);
  return Number(r?.s ?? 0);
}

export const swapRouter = router({
  // ─── 行情:现价 + 地板价 + 储备/危机金 + 当前税/θ + 24h + OHLC K线 + 最近成交 ───────
  getMarket: publicProcedure
    .input(z.object({ interval: z.enum(["15m", "1h", "4h", "1d"]).default("1h") }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const pool = await getPool(db);
      const ps = poolFromRow(pool);
      const now = Date.now();
      const price = spotPrice(ps);

      const recent = await db.select().from(aiSwapTrades).orderBy(desc(aiSwapTrades.createdAt)).limit(30);
      const trades = recent.map((t) => ({
        side: t.side, ai: Number(t.aiAmount), usdt: Number(t.usdtAmount), price: Number(t.price),
        at: t.createdAt ? t.createdAt.toISOString() : null,
      }));

      const since = new Date(now - 24 * 3600 * 1000);
      const day = await db.select({ price: aiSwapTrades.price, usdt: aiSwapTrades.usdtAmount })
        .from(aiSwapTrades).where(gte(aiSwapTrades.createdAt, since)).orderBy(asc(aiSwapTrades.createdAt));
      const dp = day.map((t) => Number(t.price)).filter((p) => p > 0);
      const vol24 = day.reduce((s, t) => s + Number(t.usdt), 0);
      const open24 = dp.length ? dp[0] : price;
      const high24 = Math.max(price, ...(dp.length ? dp : [price]));
      const low24 = Math.min(price, ...(dp.length ? dp : [price]));
      const change24 = open24 > 0 ? (price - open24) / open24 : 0;

      const ivMs = IV_MS[input?.interval ?? "1h"];
      const ct = await db.select({ price: aiSwapTrades.price, at: aiSwapTrades.createdAt })
        .from(aiSwapTrades).where(gte(aiSwapTrades.createdAt, new Date(now - ivMs * 48))).orderBy(asc(aiSwapTrades.createdAt));
      const buckets = new Map<number, { o: number; h: number; l: number; c: number }>();
      for (const t of ct) {
        const p = Number(t.price);
        if (p <= 0 || !t.at) continue;
        const b = Math.floor(t.at.getTime() / ivMs) * ivMs;
        const ex = buckets.get(b);
        if (!ex) buckets.set(b, { o: p, h: p, l: p, c: p });
        else { ex.h = Math.max(ex.h, p); ex.l = Math.min(ex.l, p); ex.c = p; }
      }
      const candles = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]).map(([t, c]) => ({ t, o: c.o, h: c.h, l: c.l, c: c.c }));

      const supply = await sumNn(db);
      const floor = floorPrice(ps, supply);
      return {
        seeded: pool.seeded, price, change24, high24, low24, vol24Usdt: vol24,
        aiReserve: ps.aiReserve, usdtReserve: ps.usdtReserve,
        // FloorAMM 透明展示
        floor, floorPct: price > 0 ? floor / price : 0,
        reserveR: ps.reserveR, crisisFund: ps.crisisFund, divPool: ps.divPool,
        dividendClaimsEnabled: pool.dividendClaimsEnabled,
        thetaBps: Math.round(currentThetaBps(ps)), sellTaxBps: currentSellTaxBps(ps, now),
        baseTaxBps: ps.baseTaxBps, maxTaxBps: ps.maxTaxBps,
        candles, trades,
      };
    }),

  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { ai: 0, usdt: 0 };
    const [u] = await db.select({ ai: users.nnBalance, usdt: users.usdtBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return { ai: Number(u?.ai ?? 0), usdt: Number(u?.usdt ?? 0) };
  }),

  // ─── 执行 swap(FloorAMM 逻辑;原子锁池行+用户行)─────────────────────────────────
  execute: protectedProcedure
    .input(z.object({ side: z.enum(["buy", "sell"]), amountIn: z.number().positive(), minOut: z.number().min(0) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await getPool(db);
      const now = Date.now();
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).for("update").limit(1);
        if (!row || !row.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "二级市场未开市" });
        const ps = poolFromRow(row);
        let out = 0, execPrice = 0, marketPrice = 0;

        if (input.side === "buy") {
          const usdtIn = input.amountIn;
          const q = quoteBuy(ps, usdtIn);
          const aiOut = Math.floor(q.aiOut);
          if (aiOut <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          if (aiOut < input.minOut) throw new TRPCError({ code: "BAD_REQUEST", message: "滑点超限,请重试" });
          if (aiOut >= ps.aiReserve) throw new TRPCError({ code: "BAD_REQUEST", message: "超过池可售库存" });
          const net = usdtIn - q.toReserve;
          await tx.update(aiAmmPool).set({
            usdtReserve: sql`${aiAmmPool.usdtReserve} + ${net}`,
            aiReserve: sql`${aiAmmPool.aiReserve} - ${aiOut}`,
            reserveR: sql`${aiAmmPool.reserveR} + ${q.toReserve}`,
            circulatingAi: sql`${aiAmmPool.circulatingAi} + ${aiOut}`,
            cumBoughtUsdt: sql`${aiAmmPool.cumBoughtUsdt} + ${usdtIn}`,
            totalVolUsdt: sql`${aiAmmPool.totalVolUsdt} + ${usdtIn}`,
          }).where(eq(aiAmmPool.id, 1));
          const r = await tx.update(users).set({
            usdtBalance: sql`${users.usdtBalance} - ${usdtIn}`,
            nnBalance: sql`${users.nnBalance} + ${aiOut}`,
          }).where(and(eq(users.id, ctx.user.id), gte(users.usdtBalance, usdtIn.toFixed(8))));
          if (affected(r) < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "USDT 余额不足" });
          out = aiOut; execPrice = usdtIn / aiOut;
          marketPrice = (ps.usdtReserve + net) / (ps.aiReserve - aiOut);
          // 买入抬价 → 可能创新高(衰减后)
          if (marketPrice > effectivePeak(ps, now)) {
            await tx.update(aiAmmPool).set({ peakPrice: marketPrice.toFixed(10), peakUpdatedAt: new Date(now) }).where(eq(aiAmmPool.id, 1));
          }
        } else {
          const aiIn = Math.floor(input.amountIn);
          if (aiIn <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          const supply = await sumNn(tx); // 地板分母 = 全体用户持仓
          const q = quoteSell(ps, aiIn, now, supply);
          if (q.usdtOut <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          if (q.usdtOut < input.minOut) throw new TRPCError({ code: "BAD_REQUEST", message: "滑点超限,请重试" });
          if (q.viaFloor) {
            if (q.usdtOut >= ps.reserveR) throw new TRPCError({ code: "BAD_REQUEST", message: "储备暂不足,请减少数量" });
            await tx.update(aiAmmPool).set({
              reserveR: sql`${aiAmmPool.reserveR} - ${q.usdtOut}`,
              circulatingAi: sql`GREATEST(${aiAmmPool.circulatingAi} - ${aiIn}, 0)`,
              totalVolUsdt: sql`${aiAmmPool.totalVolUsdt} + ${q.usdtOut}`,
            }).where(eq(aiAmmPool.id, 1));
            marketPrice = floorPrice(ps, supply);
          } else {
            if (q.grossUsdt >= ps.usdtReserve) throw new TRPCError({ code: "BAD_REQUEST", message: "超过池可付额度" });
            await tx.update(aiAmmPool).set({
              aiReserve: sql`${aiAmmPool.aiReserve} + ${aiIn}`,
              usdtReserve: sql`${aiAmmPool.usdtReserve} - ${q.grossUsdt}`,
              circulatingAi: sql`GREATEST(${aiAmmPool.circulatingAi} - ${aiIn}, 0)`,
              divPool: sql`${aiAmmPool.divPool} + ${q.baseTax.toFixed(8)}`,
              crisisFund: sql`${aiAmmPool.crisisFund} + ${q.excessTax.toFixed(8)}`,
              totalVolUsdt: sql`${aiAmmPool.totalVolUsdt} + ${q.grossUsdt}`,
            }).where(eq(aiAmmPool.id, 1));
            marketPrice = (ps.usdtReserve - q.grossUsdt) / (ps.aiReserve + aiIn);
          }
          const r = await tx.update(users).set({
            nnBalance: sql`${users.nnBalance} - ${aiIn}`,
            usdtBalance: sql`${users.usdtBalance} + ${q.usdtOut.toFixed(8)}`,
          }).where(and(eq(users.id, ctx.user.id), gte(users.nnBalance, aiIn)));
          if (affected(r) < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "AI 余额不足" });
          out = q.usdtOut; execPrice = q.usdtOut / aiIn;
        }

        await tx.insert(aiSwapTrades).values({
          userId: ctx.user.id, side: input.side,
          aiAmount: input.side === "buy" ? String(out) : String(Math.floor(input.amountIn)),
          usdtAmount: (input.side === "buy" ? input.amountIn : out).toFixed(8),
          price: marketPrice.toFixed(10),
        });
        return { ok: true, out, price: execPrice };
      });
    }),

  // ─── Admin:播种开市(募集USDT分给 AMM池 + 储备R + 危机金)+ 危机补仓 + USDT入账 ────────
  adminSeed: adminProcedure
    .input(z.object({
      aiSeed: z.number().positive(), usdtAmm: z.number().positive(),
      usdtReserveR: z.number().min(0).default(0), usdtCrisis: z.number().min(0).default(0),
      thetaStartBps: z.number().int().min(2000).max(6000).default(5200),
      thetaEndBps: z.number().int().min(2000).max(6000).default(2700),
      thetaHalfBuyUsdt: z.number().positive().default(100000),
      baseTaxBps: z.number().int().min(0).max(1000).default(500),
      maxTaxBps: z.number().int().min(500).max(5000).default(5000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const pool = await getPool(db);
      if (pool.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "已开市,不可重复播种" });
      if (input.thetaEndBps > input.thetaStartBps) throw new TRPCError({ code: "BAD_REQUEST", message: "θ end 不能大于 start" });
      if (input.maxTaxBps <= input.baseTaxBps) throw new TRPCError({ code: "BAD_REQUEST", message: "max 税须大于 base" });
      const openPrice = input.usdtAmm / input.aiSeed;
      await db.update(aiAmmPool).set({
        aiReserve: input.aiSeed.toFixed(8), usdtReserve: input.usdtAmm.toFixed(8),
        reserveR: input.usdtReserveR.toFixed(8), crisisFund: input.usdtCrisis.toFixed(8), circulatingAi: "0",
        thetaStartBps: input.thetaStartBps, thetaEndBps: input.thetaEndBps, thetaHalfBuyUsdt: input.thetaHalfBuyUsdt.toFixed(8),
        baseTaxBps: input.baseTaxBps, maxTaxBps: input.maxTaxBps,
        peakPrice: openPrice.toFixed(10), peakUpdatedAt: new Date(), seeded: true,
      }).where(eq(aiAmmPool.id, 1));
      return { ok: true, openPrice };
    }),

  // 危机补仓:深跌(现价≤峰值30% 或 ≤1.1地板)时把危机金的一部分注入储备 R(抬地板)
  adminDeployCrisis: adminProcedure
    .input(z.object({ amount: z.number().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const now = Date.now();
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).for("update").limit(1);
        if (!row || !row.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "未开市" });
        const ps = poolFromRow(row);
        const supply = await sumNn(tx);
        const spot = spotPrice(ps), peak = effectivePeak(ps, now), F = floorPrice(ps, supply);
        // 地板接近触发仅在 F<现价(地板在市价下方)才有意义;储备过厚使 F 封顶=现价时,该条恒真会误判,需排除
        const trigger = (peak > 0 && spot <= peak * 0.30) || (F > 0 && F < spot && spot <= F * 1.1);
        if (!trigger) throw new TRPCError({ code: "BAD_REQUEST", message: "未达危机触发(现价>峰值30%且>1.1地板)" });
        if (input.amount > ps.crisisFund) throw new TRPCError({ code: "BAD_REQUEST", message: "危机金不足" });
        if (input.amount > ps.crisisFund / 3 + 1e-6) throw new TRPCError({ code: "BAD_REQUEST", message: "单次≤危机金 1/3" });
        await tx.update(aiAmmPool).set({
          crisisFund: sql`${aiAmmPool.crisisFund} - ${input.amount.toFixed(8)}`,
          reserveR: sql`${aiAmmPool.reserveR} + ${input.amount.toFixed(8)}`,
        }).where(eq(aiAmmPool.id, 1));
        return { ok: true };
      });
    }),

  // ─── 底池注资:开市后**可重复**向底池加钱(解决 adminSeed 一次性、首次播种后不可再加)─────────────
  //   储备R=抬地板后备;危机金=深跌补仓弹药;AMM流动性=按现价配比加 USDT+AI,加深盘口、价格不变。
  adminTopUp: adminProcedure
    .input(z.object({
      addReserveR: z.number().min(0).max(100_000_000).default(0),
      addCrisis: z.number().min(0).max(100_000_000).default(0),
      addLiquidityUsdt: z.number().min(0).max(100_000_000).default(0), // 注资 AMM,自动按现价配比补 AI 保持价格不变
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      if (input.addReserveR + input.addCrisis + input.addLiquidityUsdt <= 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "未填任何注资项" });
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).for("update").limit(1);
        if (!row || !row.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "未开市,请先 adminSeed 播种" });
        const ps = poolFromRow(row);
        const set: Record<string, unknown> = {};
        if (input.addReserveR > 0) set.reserveR = sql`${aiAmmPool.reserveR} + ${input.addReserveR.toFixed(8)}`;
        if (input.addCrisis > 0) set.crisisFund = sql`${aiAmmPool.crisisFund} + ${input.addCrisis.toFixed(8)}`;
        let addAi = 0;
        if (input.addLiquidityUsdt > 0) {
          const price = spotPrice(ps);
          if (price <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "池价异常,无法配比注资" });
          addAi = input.addLiquidityUsdt / price; // dUsdt/dAi = 现价 → 价格不变,仅加深流动性(k 增大)
          set.usdtReserve = sql`${aiAmmPool.usdtReserve} + ${input.addLiquidityUsdt.toFixed(8)}`;
          set.aiReserve = sql`${aiAmmPool.aiReserve} + ${addAi.toFixed(8)}`;
        }
        await tx.update(aiAmmPool).set(set).where(eq(aiAmmPool.id, 1));
        return { ok: true, addReserveR: input.addReserveR, addCrisis: input.addCrisis, addLiquidityUsdt: input.addLiquidityUsdt, addAi };
      });
    }),

  // ─── 底池提取:把储备R/危机金的一部分撤回国库(开市后可逆,夹断不穿负;不动 AMM 流动性,避免影响盘口)──
  adminWithdrawPool: adminProcedure
    .input(z.object({
      fromReserveR: z.number().min(0).max(100_000_000).default(0),
      fromCrisis: z.number().min(0).max(100_000_000).default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      if (input.fromReserveR + input.fromCrisis <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "未填任何提取项" });
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).for("update").limit(1);
        if (!row || !row.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "未开市" });
        const ps = poolFromRow(row);
        if (input.fromReserveR > ps.reserveR + 1e-9) throw new TRPCError({ code: "BAD_REQUEST", message: "储备R不足" });
        if (input.fromCrisis > ps.crisisFund + 1e-9) throw new TRPCError({ code: "BAD_REQUEST", message: "危机金不足" });
        const set: Record<string, unknown> = {};
        if (input.fromReserveR > 0) set.reserveR = sql`GREATEST(${aiAmmPool.reserveR} - ${input.fromReserveR.toFixed(8)}, 0)`;
        if (input.fromCrisis > 0) set.crisisFund = sql`GREATEST(${aiAmmPool.crisisFund} - ${input.fromCrisis.toFixed(8)}, 0)`;
        await tx.update(aiAmmPool).set(set).where(eq(aiAmmPool.id, 1));
        return { ok: true, fromReserveR: input.fromReserveR, fromCrisis: input.fromCrisis };
      });
    }),

  adminCreditUsdt: adminProcedure
    .input(z.object({ userId: z.number(), amount: z.number().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(users).set({ usdtBalance: sql`${users.usdtBalance} + ${input.amount}` }).where(eq(users.id, input.userId));
      return { ok: true };
    }),

  // ─── USDT 出入金(充值=转账+回填哈希待确认;提现=申请即冻结余额待打款)─────────────────
  depositInfo: publicProcedure.query(() => ({ payAddress: USDT_DEPOSIT_ADDRESS, chain: USDT_CHAIN })),

  requestDeposit: protectedProcedure
    .input(z.object({ amount: z.number().positive().max(1_000_000), txHash: z.string().min(6).max(120) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const txHash = sanitizeInput(input.txHash, 120);
      // 同一链上 txHash 全局唯一:杜绝把一笔真转账拆成多条各自确认 = 凭空多入账(CF-05)
      const [dup] = await db.select({ id: usdtDeposits.id }).from(usdtDeposits).where(eq(usdtDeposits.txHash, txHash)).limit(1);
      if (dup) throw new TRPCError({ code: "BAD_REQUEST", message: "该交易哈希已提交过,请勿重复" });
      try {
        await db.insert(usdtDeposits).values({ userId: ctx.user.id, amount: input.amount.toFixed(8), txHash });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该交易哈希已提交过,请勿重复" }); // 唯一索引兜底(并发)
      }
      return { ok: true };
    }),

  requestWithdraw: protectedProcedure
    .input(z.object({ amount: z.number().positive().max(1_000_000), address: z.string().min(6).max(80) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db.transaction(async (tx) => {
        const r = await tx.update(users).set({ usdtBalance: sql`${users.usdtBalance} - ${input.amount.toFixed(8)}` })
          .where(and(eq(users.id, ctx.user.id), gte(users.usdtBalance, input.amount.toFixed(8))));
        if (affected(r) < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "USDT 余额不足" });
        await tx.insert(usdtWithdrawals).values({ userId: ctx.user.id, amount: input.amount.toFixed(8), address: sanitizeInput(input.address, 80) });
        return { ok: true };
      });
    }),

  myTransfers: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { deposits: [], withdrawals: [] };
    const [deposits, withdrawals] = await Promise.all([
      db.select().from(usdtDeposits).where(eq(usdtDeposits.userId, ctx.user.id)).orderBy(desc(usdtDeposits.createdAt)).limit(30),
      db.select().from(usdtWithdrawals).where(eq(usdtWithdrawals.userId, ctx.user.id)).orderBy(desc(usdtWithdrawals.createdAt)).limit(30),
    ]);
    return { deposits, withdrawals };
  }),

  adminListDeposits: adminProcedure
    .input(z.object({ status: z.enum(["pending", "confirmed", "rejected"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = input?.status ? [eq(usdtDeposits.status, input.status)] : [];
      return db.select().from(usdtDeposits).where(conds.length ? and(...conds) : undefined).orderBy(desc(usdtDeposits.createdAt)).limit(100);
    }),
  adminConfirmDeposit: adminProcedure
    .input(z.object({ id: z.number(), amount: z.number().positive().max(1_000_000).optional() })) // amount: admin 按链上实际到账核定;缺省=信任用户自填
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db.transaction(async (tx) => {
        const [d] = await tx.select().from(usdtDeposits).where(eq(usdtDeposits.id, input.id)).for("update").limit(1);
        if (!d || d.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "状态不可改" });
        const credit = (input.amount ?? Number(d.amount)).toFixed(8); // 按核定金额入账,并回写订单
        await tx.update(usdtDeposits).set({ status: "confirmed", confirmedAt: new Date(), amount: credit }).where(eq(usdtDeposits.id, input.id));
        await tx.update(users).set({ usdtBalance: sql`${users.usdtBalance} + ${credit}` }).where(eq(users.id, d.userId));
        return { ok: true, credited: Number(credit) };
      });
    }),
  adminRejectDeposit: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(usdtDeposits).set({ status: "rejected", confirmedAt: new Date() }).where(and(eq(usdtDeposits.id, input.id), eq(usdtDeposits.status, "pending")));
      return { ok: true };
    }),

  adminListWithdrawals: adminProcedure
    .input(z.object({ status: z.enum(["pending", "done", "rejected"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = input?.status ? [eq(usdtWithdrawals.status, input.status)] : [];
      return db.select().from(usdtWithdrawals).where(conds.length ? and(...conds) : undefined).orderBy(desc(usdtWithdrawals.createdAt)).limit(100);
    }),
  adminCompleteWithdrawal: adminProcedure
    .input(z.object({ id: z.number(), txHash: z.string().min(6).max(120) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(usdtWithdrawals).set({ status: "done", txHash: sanitizeInput(input.txHash, 120), processedAt: new Date() })
        .where(and(eq(usdtWithdrawals.id, input.id), eq(usdtWithdrawals.status, "pending")));
      return { ok: true };
    }),
  adminRejectWithdrawal: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db.transaction(async (tx) => {
        const [w] = await tx.select().from(usdtWithdrawals).where(eq(usdtWithdrawals.id, input.id)).for("update").limit(1);
        if (!w || w.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "状态不可改" });
        await tx.update(usdtWithdrawals).set({ status: "rejected", processedAt: new Date() }).where(eq(usdtWithdrawals.id, input.id));
        await tx.update(users).set({ usdtBalance: sql`${users.usdtBalance} + ${w.amount}` }).where(eq(users.id, w.userId)); // 退回冻结余额
        return { ok: true };
      });
    }),

  // ─── 分红分配(🔴 合规闸门:USDT 持币分红=Howey,默认关,律师结论后 admin 开)──────────
  adminSetDividendClaims: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await getPool(db);
      await db.update(aiAmmPool).set({ dividendClaimsEnabled: input.enabled }).where(eq(aiAmmPool.id, 1));
      return { ok: true };
    }),
  adminDistributeDividends: adminProcedure
    .input(z.object({ teamUserId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).for("update").limit(1);
        if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "池不存在" });
        if (!row.dividendClaimsEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "分红未开闸(需合规结论)" });
        const divPool = Number(row.divPool);
        if (divPool <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "无可分配分红" });
        // 基础税内部:种子0.20/核心0.24/创世0.30/技术0.26(=1.0/1.2/1.5/1.3 of 5%)
        const tierRatio: Record<number, number> = { 1: 0.20, 2: 0.24, 3: 0.30 };
        const all = await tx.select({ id: users.id, tier: users.icoTier }).from(users).where(inArray(users.icoTier, [1, 2, 3]));
        const ids = all.map((m) => m.id);
        // 权重 = ICO 认购金额(SUM icoPurchases.usdtAmount)。认购时确定,swap 二级市场买卖不计入(上线后购买不算)。
        const subs = ids.length
          ? await tx.select({ uid: icoPurchases.userId, usdt: sql<number>`COALESCE(SUM(${icoPurchases.usdtAmount}),0)` })
              .from(icoPurchases).where(inArray(icoPurchases.userId, ids)).groupBy(icoPurchases.userId)
          : [];
        const subMap = new Map(subs.map((s) => [s.uid, Number(s.usdt)]));
        const byTier: Record<number, { id: number; w: number }[]> = { 1: [], 2: [], 3: [] };
        for (const m of all) { if (m.tier && byTier[m.tier]) byTier[m.tier].push({ id: m.id, w: subMap.get(m.id) ?? 0 }); }
        let paidToPartners = 0; // 实际写入合伙人余额的总额(逐笔 toFixed 求和)
        let unclaimed = 0;      // 空档(无成员/无认购权重)的应分额 → 转危机金,避免滞留 divPool 被反复抽 tech
        const summary: { tier: number; members: number; amount: number }[] = [];
        for (const tier of [1, 2, 3]) {
          const members = byTier[tier];
          const tierAmount = divPool * tierRatio[tier];
          const totalW = members.reduce((s, m) => s + m.w, 0);
          if (totalW <= 0 || members.length === 0) { unclaimed += tierAmount; summary.push({ tier, members: members.length, amount: 0 }); continue; }
          let paid = 0;
          for (const m of members) {
            const share = Number((tierAmount * (m.w / totalW)).toFixed(8));
            if (share > 0) { await tx.update(users).set({ usdtBalance: sql`${users.usdtBalance} + ${share.toFixed(8)}` }).where(eq(users.id, m.id)); paid += share; }
          }
          paidToPartners += paid;
          summary.push({ tier, members: members.length, amount: paid });
        }
        // 技术服务费 = 本轮 divPool 的 26% → 团队(只对本轮新增 realized 税计一次;空档残额已转出,不会被反复抽)
        const tech = Number((divPool * 0.26).toFixed(8));
        await tx.update(users).set({ usdtBalance: sql`${users.usdtBalance} + ${tech.toFixed(8)}` }).where(eq(users.id, input.teamUserId));
        if (unclaimed > 1e-9) await tx.update(aiAmmPool).set({ crisisFund: sql`${aiAmmPool.crisisFund} + ${unclaimed.toFixed(8)}` }).where(eq(aiAmmPool.id, 1));
        const drained = paidToPartners + tech + unclaimed; // 从 divPool 真正扣除的总额
        await tx.update(aiAmmPool).set({ divPool: sql`GREATEST(${aiAmmPool.divPool} - ${drained.toFixed(8)}, 0)` }).where(eq(aiAmmPool.id, 1));
        return { ok: true, distributed: drained, paidToPartners, tech, unclaimedToCrisis: unclaimed, summary };
      });
    }),
});
