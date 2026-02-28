import { z } from "zod";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { priceAlerts } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

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

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

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

      try {
        const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
        const data = await res.json() as Record<string, { usd: number; usd_24h_change: number; usd_24h_vol: number; usd_market_cap: number }>;

        return symbols.map((symbol) => {
          const id = SYMBOL_TO_ID[symbol.toUpperCase()];
          const coin = id ? data[id] : null;
          return {
            symbol: symbol.toUpperCase(),
            price: coin?.usd ?? 0,
            change: coin ? parseFloat((coin.usd_24h_change ?? 0).toFixed(2)) : 0,
            volume: coin?.usd_24h_vol ?? 0,
            marketCap: coin?.usd_market_cap ?? 0,
          };
        });
      } catch (err) {
        // Return zeros on error — frontend will show stale/mock data
        console.error("[TradingRouter] CoinGecko fetch failed:", err);
        return symbols.map((s) => ({ symbol: s, price: 0, change: 0, volume: 0, marketCap: 0 }));
      }
    }),

  // ─── Get detailed chart data for a single coin ────────────────────────────
  getChart: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        days: z.number().min(1).max(365).default(7),
      })
    )
    .query(async ({ input }) => {
      const id = SYMBOL_TO_ID[input.symbol.toUpperCase()];
      if (!id) return { prices: [], symbol: input.symbol };

      try {
        const url = `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${input.days}&interval=${input.days <= 1 ? "hourly" : "daily"}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`CoinGecko chart error: ${res.status}`);
        const data = await res.json() as { prices: [number, number][] };

        return {
          symbol: input.symbol.toUpperCase(),
          prices: data.prices.map(([timestamp, price]) => ({
            time: new Date(timestamp).toISOString(),
            price: parseFloat(price.toFixed(4)),
          })),
        };
      } catch (err) {
        console.error("[TradingRouter] CoinGecko chart fetch failed:", err);
        return { prices: [], symbol: input.symbol };
      }
    }),

  // ─── Get trending coins ────────────────────────────────────────────────────
  getTrending: publicProcedure.query(async () => {
    try {
      const url = `${COINGECKO_BASE}/search/trending`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`CoinGecko trending error: ${res.status}`);
      const data = await res.json() as { coins: { item: { id: string; symbol: string; name: string; thumb: string; price_btc: number } }[] };

      return data.coins.slice(0, 7).map((c) => ({
        id: c.item.id,
        symbol: c.item.symbol.toUpperCase(),
        name: c.item.name,
        thumb: c.item.thumb,
        priceBtc: c.item.price_btc,
      }));
    } catch (err) {
      console.error("[TradingRouter] CoinGecko trending fetch failed:", err);
      return [];
    }
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(priceAlerts)
        .set({ isActive: input.isActive })
        .where(and(eq(priceAlerts.id, input.id), eq(priceAlerts.userId, ctx.user.id)));
      return { success: true };
    }),
});
