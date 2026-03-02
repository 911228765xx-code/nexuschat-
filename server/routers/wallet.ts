import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, swapHistory } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";

// BscScan API base URL (free tier, no API key needed for basic queries)
const BSCSCAN_API = "https://api.bscscan.com/api";
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY ?? "YourApiKeyToken"; // free tier fallback

async function fetchBscScan<T>(params: Record<string, string>): Promise<T | null> {
  try {
    const url = new URL(BSCSCAN_API);
    Object.entries({ ...params, apikey: BSCSCAN_KEY }).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const walletRouter = router({
  // ─── Update wallet address ─────────────────────────────────────────────────
  updateAddress: protectedProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
        chain: z.string().default("BSC"),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(users)
        .set({ walletAddress: input.address, walletChain: input.chain })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  // ─── Get wallet profile from DB ────────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db
      .select({
        walletAddress: users.walletAddress,
        walletChain: users.walletChain,
        npPoints: users.npPoints,
        username: users.username,
        bio: users.bio,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return result[0] ?? null;
  }),

  // ─── Get BNB balance from BscScan ─────────────────────────────────────────
  getBalance: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
      })
    )
    .query(async ({ input }) => {
      const data = await fetchBscScan<{ status: string; message: string; result: string }>({
        module: "account",
        action: "balance",
        address: input.address,
        tag: "latest",
      });

      if (!data || data.status !== "1") {
        return { bnbBalance: "0", bnbBalanceFormatted: "0.0000", usdValue: null };
      }

      const bnb = Number(BigInt(data.result)) / 1e18;
      const bnbFormatted = bnb.toFixed(4);

      // Fetch BNB price in USD from CoinGecko (cached)
      let usdValue: string | null = null;
      const bnbPriceData = await cachedFetch<any>(
        "bnb-usd-price",
        "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
        TTL.prices,
        (res) => res.json(),
      );
      if (bnbPriceData?.binancecoin?.usd) {
        usdValue = (bnb * bnbPriceData.binancecoin.usd).toFixed(2);
      }

      return { bnbBalance: data.result, bnbBalanceFormatted: bnbFormatted, usdValue };
    }),

  // ─── Get BEP-20 token balances ────────────────────────────────────────────
  getTokenBalances: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
      })
    )
    .query(async ({ input }) => {
      const data = await fetchBscScan<{
        status: string;
        message: string;
        result: Array<{
          tokenName: string;
          tokenSymbol: string;
          tokenDecimal: string;
          contractAddress: string;
          balance: string;
        }>;
      }>({
        module: "account",
        action: "tokenlist",
        address: input.address,
      });

      if (!data || data.status !== "1" || !Array.isArray(data.result)) {
        return [];
      }

      return data.result
        .filter((t) => parseFloat(t.balance) > 0)
        .slice(0, 20)
        .map((t) => ({
          name: t.tokenName,
          symbol: t.tokenSymbol,
          decimals: parseInt(t.tokenDecimal, 10),
          contractAddress: t.contractAddress,
          balance: t.balance,
          balanceFormatted: (
            parseFloat(t.balance) / Math.pow(10, parseInt(t.tokenDecimal, 10))
          ).toFixed(4),
        }));
    }),

  // ─── Get swap quote from CoinGecko ──────────────────────────────────────────
  getSwapQuote: publicProcedure
    .input(
      z.object({
        fromToken: z.string(), // e.g. "BNB", "ETH", "SOL"
        toToken: z.string(),
        amount: z.number().positive(),
      })
    )
    .query(async ({ input }) => {
      // Map token symbols to CoinGecko IDs
      const COINGECKO_IDS: Record<string, string> = {
        BNB: "binancecoin",
        ETH: "ethereum",
        BTC: "bitcoin",
        SOL: "solana",
        USDT: "tether",
        USDC: "usd-coin",
        MATIC: "matic-network",
        AVAX: "avalanche-2",
        DOT: "polkadot",
        ADA: "cardano",
        LINK: "chainlink",
        UNI: "uniswap",
        AAVE: "aave",
        CAKE: "pancakeswap-token",
        ARB: "arbitrum",
        OP: "optimism",
      };

      const fromId = COINGECKO_IDS[input.fromToken.toUpperCase()];
      const toId = COINGECKO_IDS[input.toToken.toUpperCase()];

      // If either token is a stablecoin, treat its price as 1 USD
      const STABLECOINS = new Set(["USDT", "USDC", "DAI", "BUSD"]);
      const fromIsStable = STABLECOINS.has(input.fromToken.toUpperCase());
      const toIsStable = STABLECOINS.has(input.toToken.toUpperCase());

      try {
        const idsToFetch = [
          ...(fromIsStable ? [] : [fromId]),
          ...(toIsStable ? [] : [toId]),
        ].filter(Boolean);

        let fromUsd = fromIsStable ? 1 : 0;
        let toUsd = toIsStable ? 1 : 0;
        let fromChange24h = 0;
        let toChange24h = 0;

        if (idsToFetch.length > 0) {
          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(",")}&vs_currencies=usd&include_24hr_change=true`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error("CoinGecko API error");
          const data = await res.json() as Record<string, { usd: number; usd_24h_change: number }>;

          if (!fromIsStable && fromId) {
            fromUsd = data[fromId]?.usd ?? 0;
            fromChange24h = data[fromId]?.usd_24h_change ?? 0;
          }
          if (!toIsStable && toId) {
            toUsd = data[toId]?.usd ?? 0;
            toChange24h = data[toId]?.usd_24h_change ?? 0;
          }
        }

        if (fromUsd === 0 || toUsd === 0) {
          return { success: false, error: "Token price not available", quote: null };
        }

        const rate = fromUsd / toUsd;
        const toAmount = input.amount * rate;
        const slippage = 0.005; // 0.5%
        const minReceived = toAmount * (1 - slippage);
        const priceImpact = input.amount * fromUsd > 100000 ? 0.3 : 0.05; // simulate higher impact for large trades
        const networkFee = 0.8; // ~$0.80 estimated gas

        return {
          success: true,
          quote: {
            fromToken: input.fromToken.toUpperCase(),
            toToken: input.toToken.toUpperCase(),
            fromAmount: input.amount,
            toAmount: parseFloat(toAmount.toFixed(6)),
            rate: parseFloat(rate.toFixed(6)),
            fromUsdPrice: fromUsd,
            toUsdPrice: toUsd,
            fromChange24h: parseFloat(fromChange24h.toFixed(2)),
            toChange24h: parseFloat(toChange24h.toFixed(2)),
            priceImpact,
            minReceived: parseFloat(minReceived.toFixed(6)),
            networkFeeUsd: networkFee,
            source: "CoinGecko",
            updatedAt: Date.now(),
          },
          error: null,
        };
      } catch (err) {
        return { success: false, error: "Failed to fetch price data", quote: null };
      }
    }),

  // ─── Save swap to history ─────────────────────────────────────────────────
  saveSwapHistory: protectedProcedure
    .input(
      z.object({
        walletAddress: z.string(),
        fromToken: z.string().max(20),
        toToken: z.string().max(20),
        fromAmount: z.string(),
        toAmount: z.string(),
        rate: z.string(),
        dex: z.string().max(50),
        txHash: z.string().max(70),
        slippage: z.string().default("0.5"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(swapHistory).values({
        userId: ctx.user.id,
        walletAddress: input.walletAddress,
        fromToken: input.fromToken,
        toToken: input.toToken,
        fromAmount: input.fromAmount,
        toAmount: input.toAmount,
        rate: input.rate,
        dex: input.dex,
        txHash: input.txHash,
        slippage: input.slippage,
        status: "success",
      });
      return { success: true };
    }),

  // ─── Get swap history ─────────────────────────────────────────────────────
  getSwapHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(swapHistory)
        .where(eq(swapHistory.userId, ctx.user.id))
        .orderBy(desc(swapHistory.createdAt))
        .limit(input.limit);
      return rows;
    }),

  // ─── Get transaction history ───────────────────────────────────────────────
  getTransactions: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
        page: z.number().min(1).default(1),
        offset: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const data = await fetchBscScan<{
        status: string;
        message: string;
        result: Array<{
          hash: string;
          from: string;
          to: string;
          value: string;
          timeStamp: string;
          isError: string;
          gas: string;
          gasPrice: string;
        }>;
      }>({
        module: "account",
        action: "txlist",
        address: input.address,
        startblock: "0",
        endblock: "99999999",
        page: input.page.toString(),
        offset: input.offset.toString(),
        sort: "desc",
      });

      if (!data || data.status !== "1" || !Array.isArray(data.result)) {
        return [];
      }

      return data.result.map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        valueFormatted: (parseFloat(tx.value) / 1e18).toFixed(6),
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        isError: tx.isError === "1",
        isIncoming: tx.to.toLowerCase() === input.address.toLowerCase(),
        gasUsed: tx.gas,
        gasPrice: tx.gasPrice,
      }));
    }),
});
