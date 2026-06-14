import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, aiAmmPool, aiSwapTrades } from "../../drizzle/schema";
import { eq, and, gte, desc, asc, sql } from "drizzle-orm";
import { rateLimitWrite } from "../rateLimit";
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

      const floor = floorPrice(ps);
      return {
        seeded: pool.seeded, price, change24, high24, low24, vol24Usdt: vol24,
        aiReserve: ps.aiReserve, usdtReserve: ps.usdtReserve,
        // FloorAMM 透明展示
        floor, floorPct: price > 0 ? floor / price : 0,
        reserveR: ps.reserveR, crisisFund: ps.crisisFund,
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
          const q = quoteSell(ps, aiIn, now);
          if (q.usdtOut <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          if (q.usdtOut < input.minOut) throw new TRPCError({ code: "BAD_REQUEST", message: "滑点超限,请重试" });
          if (q.viaFloor) {
            if (q.usdtOut >= ps.reserveR) throw new TRPCError({ code: "BAD_REQUEST", message: "储备暂不足,请减少数量" });
            await tx.update(aiAmmPool).set({
              reserveR: sql`${aiAmmPool.reserveR} - ${q.usdtOut}`,
              circulatingAi: sql`${aiAmmPool.circulatingAi} - ${aiIn}`,
              totalVolUsdt: sql`${aiAmmPool.totalVolUsdt} + ${q.usdtOut}`,
            }).where(eq(aiAmmPool.id, 1));
            marketPrice = floorPrice(ps);
          } else {
            if (q.grossUsdt >= ps.usdtReserve) throw new TRPCError({ code: "BAD_REQUEST", message: "超过池可付额度" });
            await tx.update(aiAmmPool).set({
              aiReserve: sql`${aiAmmPool.aiReserve} + ${aiIn}`,
              usdtReserve: sql`${aiAmmPool.usdtReserve} - ${q.grossUsdt}`,
              circulatingAi: sql`${aiAmmPool.circulatingAi} - ${aiIn}`,
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
        const spot = spotPrice(ps), peak = effectivePeak(ps, now), F = floorPrice(ps);
        const trigger = (peak > 0 && spot <= peak * 0.30) || (F > 0 && spot <= F * 1.1);
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

  adminCreditUsdt: adminProcedure
    .input(z.object({ userId: z.number(), amount: z.number().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(users).set({ usdtBalance: sql`${users.usdtBalance} + ${input.amount}` }).where(eq(users.id, input.userId));
      return { ok: true };
    }),
});
