import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { priceAlerts, tradingPositions } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";

// CoinGecko free API - no key required
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Map symbol to CoinGecko ID
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ARB: "arbitrum",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  CAKE: "pancakeswap-token",
  MATIC: "matic-network",
  DOT: "polkadot",
};

export const tradingRouter = router({
  // ─── Get live prices for ticker symbols ──────────────────────────────────
  getPrices: publicProcedure
    .input(
      z.object({
        symbols: z.array(z.string()).min(1).max(20).default(["BTC", "ETH", "BNB", "SOL", "ARB", "LINK", "AVAX", "CAKE"]),
      }).optional()
    )
    .query(async ({ input }) => {
      const symbols = input?.symbols ?? ["BTC", "ETH", "BNB", "SOL", "ARB", "LINK", "AVAX", "CAKE"];
      const ids = symbols
        .map((s) => SYMBOL_TO_ID[s.toUpperCase()])
        .filter(Boolean)
        .join(",");

      if (!ids) {
        return symbols.map((s) => ({ symbol: s, price: 0, change: 0, volume: 0, marketCap: 0 }));
      }

      const cacheKey = `prices:${ids}`;
      const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

      const data = await cachedFetch<Record<string, { usd: number; usd_24h_change: number; usd_24h_vol: number; usd_market_cap: number }>>(
        cacheKey,
        url,
        TTL.prices,
        (res) => res.json(),
      );

      return symbols.map((symbol) => {
        const id = SYMBOL_TO_ID[symbol.toUpperCase()];
        const coin = id && data ? data[id] : null;
        return {
          symbol: symbol.toUpperCase(),
          price: coin?.usd ?? 0,
          change: coin ? parseFloat((coin.usd_24h_change ?? 0).toFixed(2)) : 0,
          volume: coin?.usd_24h_vol ?? 0,
          marketCap: coin?.usd_market_cap ?? 0,
        };
      });
    }),

  // ─── Get detailed chart data for a single coin ────────────────────────────
  getChart: publicProcedure
    .input(
      z.object({
        symbol: z.string().max(20),
        days: z.number().min(1).max(365).default(7),
      })
    )
    .query(async ({ input }) => {
      const id = SYMBOL_TO_ID[input.symbol.toUpperCase()];
      if (!id) return { prices: [], symbol: input.symbol };

      const cacheKey = `chart:${id}:${input.days}`;
      const url = `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${input.days}&interval=${input.days <= 1 ? "hourly" : "daily"}`;

      const data = await cachedFetch<{ prices: [number, number][] }>(
        cacheKey,
        url,
        TTL.chart,
        (res) => res.json(),
      );

      if (!data) return { prices: [], symbol: input.symbol };

      return {
        symbol: input.symbol.toUpperCase(),
        prices: data.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).toISOString(),
          price: parseFloat(price.toFixed(4)),
        })),
      };
    }),

  // ─── Get trending coins ────────────────────────────────────────────────────
  getTrending: publicProcedure.query(async () => {
    const cacheKey = "trending";
    const url = `${COINGECKO_BASE}/search/trending`;

    const data = await cachedFetch<{ coins: { item: { id: string; symbol: string; name: string; thumb: string; price_btc: number } }[] }>(
      cacheKey,
      url,
      TTL.trending,
      (res) => res.json(),
    );

    if (!data) return [];

    return data.coins.slice(0, 7).map((c) => ({
      id: c.item.id,
      symbol: c.item.symbol.toUpperCase(),
      name: c.item.name,
      thumb: c.item.thumb,
      priceBtc: c.item.price_btc,
    }));
  }),

  // ─── Price Alerts CRUD ─────────────────────────────────────────────────────
  createAlert: protectedProcedure
    .input(
      z.object({
        tokenSymbol: z.string().min(1).max(20),
        tokenId: z.string().min(1).max(100),
        targetPrice: z.string().min(1),
        condition: z.enum(["above", "below"]),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { id: 0, success: false };
      const [result] = await db.insert(priceAlerts).values({
        userId: ctx.user.id,
        tokenSymbol: input.tokenSymbol.toUpperCase(),
        tokenId: input.tokenId,
        targetPrice: input.targetPrice,
        condition: input.condition,
      });
      return { id: (result as any).insertId ?? 0, success: true };
    }),

  listAlerts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, ctx.user.id))
      .orderBy(desc(priceAlerts.createdAt))
      .limit(50);
    return alerts;
  }),

  deleteAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .delete(priceAlerts)
        .where(and(eq(priceAlerts.id, input.id), eq(priceAlerts.userId, ctx.user.id)));
      return { success: true };
    }),

  toggleAlert: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(priceAlerts)
        .set({ isActive: input.isActive })
        .where(and(eq(priceAlerts.id, input.id), eq(priceAlerts.userId, ctx.user.id)));
      return { success: true };
    }),

  // ─── Trading Positions CRUD ───────────────────────────────────────────────
  listPositions: protectedProcedure
    .input(z.object({ status: z.enum(["open", "closed", "all"]).default("open") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(tradingPositions.userId, ctx.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(tradingPositions.status, input.status));
      }
      return db
        .select()
        .from(tradingPositions)
        .where(and(...conditions))
        .orderBy(desc(tradingPositions.createdAt))
        .limit(100);
    }),

  openPosition: protectedProcedure
    .input(z.object({
      pair: z.string().max(30),
      side: z.enum(["long", "short"]),
      entryPrice: z.string().max(30),
      amount: z.string().max(30),
      leverage: z.number().int().min(1).max(100).default(1),
      stopLossPrice: z.string().optional(),
      takeProfitPrice: z.string().optional(),
      liquidationPrice: z.string().optional(),
      strategyName: z.string().max(100).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, id: null };
      const [result] = await db.insert(tradingPositions).values({
        userId: ctx.user.id,
        pair: input.pair,
        side: input.side,
        entryPrice: input.entryPrice,
        amount: input.amount,
        leverage: input.leverage,
        stopLossPrice: input.stopLossPrice ?? null,
        takeProfitPrice: input.takeProfitPrice ?? null,
        liquidationPrice: input.liquidationPrice ?? null,
        strategyName: input.strategyName ?? null,
        status: "open",
      });
      return { success: true, id: (result as any).insertId ?? null };
    }),

  closePosition: protectedProcedure
    .input(z.object({
      id: z.number(),
      closePrice: z.string().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Fetch position to calculate PnL
      const [pos] = await db
        .select()
        .from(tradingPositions)
        .where(and(eq(tradingPositions.id, input.id), eq(tradingPositions.userId, ctx.user.id)))
        .limit(1);

      if (!pos) return { success: false };

      let realizedPnl: string | undefined;
      const cp = input.closePrice ? parseFloat(input.closePrice) : undefined;
      if (cp !== undefined) {
        const entry = parseFloat(pos.entryPrice);
        const amt = parseFloat(pos.amount);
        const lev = pos.leverage;
        const pnl = pos.side === "long"
          ? (cp - entry) * amt * lev
          : (entry - cp) * amt * lev;
        realizedPnl = pnl.toFixed(2);
      }

      await db
        .update(tradingPositions)
        .set({
          status: "closed",
          closePrice: input.closePrice ?? undefined,
          realizedPnl,
          closedAt: new Date(),
        })
        .where(and(eq(tradingPositions.id, input.id), eq(tradingPositions.userId, ctx.user.id)));
      return { success: true, realizedPnl };
    }),

  // ─── PnL Calendar: aggregate daily PnL from closed positions ──────────
  getPnlCalendar: protectedProcedure
    .input(z.object({
      year: z.number().min(2020).max(2030),
      month: z.number().min(0).max(11), // 0-indexed like JS Date
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get first and last day of the month
      const startDate = new Date(input.year, input.month, 1);
      const endDate = new Date(input.year, input.month + 1, 0, 23, 59, 59);
      const daysInMonth = endDate.getDate();

      // Fetch all closed positions for this user in this month
      const closedPositions = await db
        .select()
        .from(tradingPositions)
        .where(
          and(
            eq(tradingPositions.userId, ctx.user.id),
            eq(tradingPositions.status, "closed"),
          )
        )
        .orderBy(desc(tradingPositions.closedAt));

      // Filter to the requested month and aggregate by day
      const dailyMap: Record<number, { pnl: number; trades: number }> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap[d] = { pnl: 0, trades: 0 };
      }

      for (const pos of closedPositions) {
        if (!pos.closedAt || !pos.realizedPnl) continue;
        const closedDate = new Date(pos.closedAt);
        if (closedDate < startDate || closedDate > endDate) continue;
        const day = closedDate.getDate();
        dailyMap[day].pnl += parseFloat(pos.realizedPnl);
        dailyMap[day].trades += 1;
      }

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return Array.from({ length: daysInMonth }, (_, i) => ({
        date: `${monthNames[input.month]} ${i + 1}`,
        day: i + 1,
        pnl: parseFloat(dailyMap[i + 1].pnl.toFixed(2)),
        trades: dailyMap[i + 1].trades,
      }));
    }),

  // ─── Market Overview (global stats + Fear & Greed) ──────────────────────
  getMarketOverview: publicProcedure.query(async () => {
    // 1. CoinGecko global data: total market cap, BTC dominance, 24h change
    const globalData = await cachedFetch<{
      data: {
        total_market_cap: Record<string, number>;
        market_cap_change_percentage_24h_usd: number;
        market_cap_percentage: Record<string, number>;
      };
    }>("global", `${COINGECKO_BASE}/global`, TTL.prices, (res) => res.json());

    // 2. Alternative.me Fear & Greed Index
    const fgData = await cachedFetch<{ data: { value: string; value_classification: string }[] }>(
      "fear-greed",
      "https://api.alternative.me/fng/?limit=1",
      TTL.prices,
      (res) => res.json(),
    );

    // 3. Get top coin prices to compute avg AI score proxy (avg 24h change)
    const topIds = ["bitcoin", "ethereum", "solana", "binancecoin", "arbitrum", "chainlink", "avalanche-2", "polkadot"];
    const pricesData = await cachedFetch<Record<string, { usd_24h_change: number }>>(
      "overview-prices",
      `${COINGECKO_BASE}/simple/price?ids=${topIds.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      TTL.prices,
      (res) => res.json(),
    );

    const g = globalData?.data;
    const totalMarketCap = g?.total_market_cap?.usd ?? 0;
    const marketCapChange24h = g?.market_cap_change_percentage_24h_usd ?? 0;
    const btcDominance = g?.market_cap_percentage?.btc ?? 0;

    const fearGreedValue = fgData?.data?.[0] ? parseInt(fgData.data[0].value, 10) : 0;
    const fearGreedLabel = fgData?.data?.[0]?.value_classification ?? "N/A";

    // Count bullish tokens (positive 24h change)
    let bullish = 0;
    let total = 0;
    const changes: number[] = [];
    if (pricesData) {
      for (const id of topIds) {
        const coin = pricesData[id];
        if (coin) {
          total++;
          if (coin.usd_24h_change > 0) bullish++;
          changes.push(coin.usd_24h_change);
        }
      }
    }
    const avg24hChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    // AI Score proxy: map fear & greed (0-100) to 1-10 scale
    const aiScoreAvg = fearGreedValue > 0 ? Math.round(fearGreedValue / 10 * 10) / 10 : 0;

    return {
      totalMarketCap,
      marketCapChange24h: Math.round(marketCapChange24h * 100) / 100,
      btcDominance: Math.round(btcDominance * 10) / 10,
      fearGreedValue,
      fearGreedLabel,
      bullish,
      total,
      avg24hChange: Math.round(avg24hChange * 100) / 100,
      aiScoreAvg,
    };
  }),
});
