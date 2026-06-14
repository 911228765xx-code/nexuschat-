import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, aiAmmPool, aiSwapTrades } from "../../drizzle/schema";
import { eq, and, gte, desc, asc, sql } from "drizzle-orm";
import { rateLimitWrite } from "../rateLimit";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const IV_MS: Record<string, number> = { "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };

/** 读取单例池(首次自动建行 id=1) */
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
  // ─── 行情:现价 + 24h + OHLC K线 + 最近成交(public)─────────────────────────────
  getMarket: publicProcedure
    .input(z.object({ interval: z.enum(["15m", "1h", "4h", "1d"]).default("1h") }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const pool = await getPool(db);
      const A = Number(pool.aiReserve), U = Number(pool.usdtReserve);
      const price = A > 0 ? U / A : 0;

      const recent = await db.select().from(aiSwapTrades).orderBy(desc(aiSwapTrades.createdAt)).limit(30);
      const trades = recent.map((t) => ({
        side: t.side, ai: Number(t.aiAmount), usdt: Number(t.usdtAmount), price: Number(t.price),
        at: t.createdAt ? t.createdAt.toISOString() : null,
      }));

      // 24h 窗口
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const day = await db.select({ price: aiSwapTrades.price, usdt: aiSwapTrades.usdtAmount })
        .from(aiSwapTrades).where(gte(aiSwapTrades.createdAt, since)).orderBy(asc(aiSwapTrades.createdAt));
      const dp = day.map((t) => Number(t.price)).filter((p) => p > 0);
      const vol24 = day.reduce((s, t) => s + Number(t.usdt), 0);
      const open24 = dp.length ? dp[0] : price;
      const high24 = Math.max(price, ...(dp.length ? dp : [price]));
      const low24 = Math.min(price, ...(dp.length ? dp : [price]));
      const change24 = open24 > 0 ? (price - open24) / open24 : 0;

      // OHLC 蜡烛(最近 48 根)
      const ivMs = IV_MS[input?.interval ?? "1h"];
      const ct = await db.select({ price: aiSwapTrades.price, at: aiSwapTrades.createdAt })
        .from(aiSwapTrades).where(gte(aiSwapTrades.createdAt, new Date(Date.now() - ivMs * 48)))
        .orderBy(asc(aiSwapTrades.createdAt));
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

      return {
        seeded: pool.seeded, price, change24, high24, low24, vol24Usdt: vol24,
        aiReserve: A, usdtReserve: U, feeBps: pool.feeBps, candles, trades,
      };
    }),

  // ─── 我的余额(AI=nnBalance,内部 USDT)─────────────────────────────────────────
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { ai: 0, usdt: 0 };
    const [u] = await db.select({ ai: users.nnBalance, usdt: users.usdtBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return { ai: Number(u?.ai ?? 0), usdt: Number(u?.usdt ?? 0) };
  }),

  // ─── 执行 swap(原子:锁池行+用户行,条件扣减防并发双花)──────────────────────────
  execute: protectedProcedure
    .input(z.object({ side: z.enum(["buy", "sell"]), amountIn: z.number().positive(), minOut: z.number().min(0) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await getPool(db); // 确保池行存在
      return db.transaction(async (tx) => {
        const [pool] = await tx.select().from(aiAmmPool).where(eq(aiAmmPool.id, 1)).for("update").limit(1);
        if (!pool || !pool.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "二级市场未开市" });
        const A = Number(pool.aiReserve), U = Number(pool.usdtReserve), fee = pool.feeBps / 1e4;
        let out = 0, price = 0;

        if (input.side === "buy") {
          const usdtIn = input.amountIn;
          const net = usdtIn * (1 - fee);
          const aiOut = Math.floor((A * net) / (U + net)); // 整数 AI(nnBalance 为整数)
          if (aiOut <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          if (aiOut < input.minOut) throw new TRPCError({ code: "BAD_REQUEST", message: "滑点超限,请重试" });
          if (aiOut >= A) throw new TRPCError({ code: "BAD_REQUEST", message: "超过池可售库存" });
          price = usdtIn / aiOut;
          await tx.update(aiAmmPool).set({
            usdtReserve: sql`${aiAmmPool.usdtReserve} + ${usdtIn}`,
            aiReserve: sql`${aiAmmPool.aiReserve} - ${aiOut}`,
            totalVolUsdt: sql`${aiAmmPool.totalVolUsdt} + ${usdtIn}`,
          }).where(eq(aiAmmPool.id, 1));
          const r = await tx.update(users).set({
            usdtBalance: sql`${users.usdtBalance} - ${usdtIn}`,
            nnBalance: sql`${users.nnBalance} + ${aiOut}`,
          }).where(and(eq(users.id, ctx.user.id), gte(users.usdtBalance, usdtIn.toFixed(8))));
          if (affected(r) < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "USDT 余额不足" });
          out = aiOut;
          await tx.insert(aiSwapTrades).values({
            userId: ctx.user.id, side: "buy", aiAmount: String(aiOut), usdtAmount: usdtIn.toFixed(8), price: price.toFixed(10),
          });
        } else {
          const aiIn = Math.floor(input.amountIn); // 整数 AI
          if (aiIn <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          const net = aiIn * (1 - fee);
          const usdtOut = (U * net) / (A + net);
          if (usdtOut <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "数量过小" });
          if (usdtOut < input.minOut) throw new TRPCError({ code: "BAD_REQUEST", message: "滑点超限,请重试" });
          if (usdtOut >= U) throw new TRPCError({ code: "BAD_REQUEST", message: "超过池可付额度" });
          price = usdtOut / aiIn;
          await tx.update(aiAmmPool).set({
            aiReserve: sql`${aiAmmPool.aiReserve} + ${aiIn}`,
            usdtReserve: sql`${aiAmmPool.usdtReserve} - ${usdtOut}`,
            totalVolUsdt: sql`${aiAmmPool.totalVolUsdt} + ${usdtOut}`,
          }).where(eq(aiAmmPool.id, 1));
          const r = await tx.update(users).set({
            nnBalance: sql`${users.nnBalance} - ${aiIn}`,
            usdtBalance: sql`${users.usdtBalance} + ${usdtOut}`,
          }).where(and(eq(users.id, ctx.user.id), gte(users.nnBalance, aiIn)));
          if (affected(r) < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "AI 余额不足" });
          out = usdtOut;
          await tx.insert(aiSwapTrades).values({
            userId: ctx.user.id, side: "sell", aiAmount: String(aiIn), usdtAmount: usdtOut.toFixed(8), price: price.toFixed(10),
          });
        }
        return { ok: true, out, price };
      });
    }),

  // ─── Admin:一次性播种开市 + 内部 USDT 入账(用户转账到官方地址后确认)────────────
  adminSeed: adminProcedure
    .input(z.object({ aiSeed: z.number().positive(), usdtSeed: z.number().positive(), feeBps: z.number().int().min(0).max(300).default(30) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const pool = await getPool(db);
      if (pool.seeded) throw new TRPCError({ code: "BAD_REQUEST", message: "已开市,不可重复播种" });
      await db.update(aiAmmPool).set({
        aiReserve: input.aiSeed.toFixed(8), usdtReserve: input.usdtSeed.toFixed(8), feeBps: input.feeBps, seeded: true,
      }).where(eq(aiAmmPool.id, 1));
      return { ok: true };
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
