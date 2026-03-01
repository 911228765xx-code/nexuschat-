import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
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

  // ─── Get transaction history (BNB + BEP-20 token transfers) ─────────────
  getTransactions: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
        page: z.number().min(1).default(1),
        offset: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      // Fetch BNB native transactions
      const bnbTxPromise = fetchBscScan<{
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

      // Fetch BEP-20 token transfers
      const tokenTxPromise = fetchBscScan<{
        status: string;
        message: string;
        result: Array<{
          hash: string;
          from: string;
          to: string;
          value: string;
          timeStamp: string;
          tokenName: string;
          tokenSymbol: string;
          tokenDecimal: string;
          contractAddress: string;
          gas: string;
          gasPrice: string;
        }>;
      }>({
        module: "account",
        action: "tokentx",
        address: input.address,
        startblock: "0",
        endblock: "99999999",
        page: input.page.toString(),
        offset: input.offset.toString(),
        sort: "desc",
      });

      const [bnbData, tokenTxData] = await Promise.all([bnbTxPromise, tokenTxPromise]);

      // Fetch BNB price for USD value calculation
      const bnbPriceData = await cachedFetch<any>(
        "bnb-usd-price-tx",
        "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
        TTL.prices,
        (res) => res.json(),
      );
      const bnbPrice = bnbPriceData?.binancecoin?.usd ?? 0;

      // Collect unique token symbols from token transfers for price lookup
      const tokenSymbols = new Set<string>();
      if (tokenTxData?.status === "1" && Array.isArray(tokenTxData.result)) {
        tokenTxData.result.forEach((tx) => tokenSymbols.add(tx.tokenSymbol.toUpperCase()));
      }

      // Fetch token prices from CoinGecko
      const SYMBOL_TO_COINGECKO: Record<string, string> = {
        USDT: "tether", USDC: "usd-coin", BUSD: "binance-usd", DAI: "dai",
        CAKE: "pancakeswap-token", WBNB: "wbnb", ETH: "ethereum", BTCB: "bitcoin-bep2",
        LINK: "chainlink", UNI: "uniswap", AAVE: "aave", DOT: "polkadot",
        MATIC: "matic-network", DOGE: "dogecoin", PEPE: "pepe", SHIB: "shiba-inu",
      };
      const tokenPrices: Record<string, number> = {};
      const coingeckoIds = Array.from(tokenSymbols)
        .map((s) => SYMBOL_TO_COINGECKO[s])
        .filter(Boolean);
      if (coingeckoIds.length > 0) {
        const priceData = await cachedFetch<any>(
          `token-prices-tx:${coingeckoIds.sort().join(",")}`,
          `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(",")}&vs_currencies=usd`,
          TTL.prices,
          (res) => res.json(),
        );
        if (priceData) {
          for (const [sym, cgId] of Object.entries(SYMBOL_TO_COINGECKO)) {
            if (priceData[cgId]?.usd) {
              tokenPrices[sym] = priceData[cgId].usd;
            }
          }
        }
      }

      // Unified transaction type
      interface UnifiedTx {
        hash: string;
        from: string;
        to: string;
        value: string;
        valueFormatted: string;
        timestamp: number;
        isError: boolean;
        isIncoming: boolean;
        gasUsed: string;
        gasPrice: string;
        tokenSymbol: string;
        tokenName: string;
        tokenDecimals: number;
        isTokenTransfer: boolean;
        usdValue: string | null;
      }

      const allTxs: UnifiedTx[] = [];

      // Process BNB native transactions
      if (bnbData?.status === "1" && Array.isArray(bnbData.result)) {
        for (const tx of bnbData.result) {
          const bnbAmount = parseFloat(tx.value) / 1e18;
          const usd = bnbPrice > 0 && bnbAmount > 0 ? (bnbAmount * bnbPrice).toFixed(2) : null;
          allTxs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            valueFormatted: bnbAmount.toFixed(6),
            timestamp: parseInt(tx.timeStamp, 10) * 1000,
            isError: tx.isError === "1",
            isIncoming: tx.to.toLowerCase() === input.address.toLowerCase(),
            gasUsed: tx.gas,
            gasPrice: tx.gasPrice,
            tokenSymbol: "BNB",
            tokenName: "BNB",
            tokenDecimals: 18,
            isTokenTransfer: false,
            usdValue: usd,
          });
        }
      }

      // Process BEP-20 token transfers
      if (tokenTxData?.status === "1" && Array.isArray(tokenTxData.result)) {
        for (const tx of tokenTxData.result) {
          const decimals = parseInt(tx.tokenDecimal, 10) || 18;
          const tokenAmount = parseFloat(tx.value) / Math.pow(10, decimals);
          const sym = tx.tokenSymbol.toUpperCase();
          const price = tokenPrices[sym] ?? 0;
          const usd = price > 0 && tokenAmount > 0 ? (tokenAmount * price).toFixed(2) : null;
          allTxs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            valueFormatted: tokenAmount.toFixed(6),
            timestamp: parseInt(tx.timeStamp, 10) * 1000,
            isError: false,
            isIncoming: tx.to.toLowerCase() === input.address.toLowerCase(),
            gasUsed: tx.gas,
            gasPrice: tx.gasPrice,
            tokenSymbol: tx.tokenSymbol,
            tokenName: tx.tokenName,
            tokenDecimals: decimals,
            isTokenTransfer: true,
            usdValue: usd,
          });
        }
      }

      // Sort by timestamp descending, deduplicate by hash+tokenSymbol
      const seen = new Set<string>();
      const deduplicated = allTxs.filter((tx) => {
        const key = `${tx.hash}-${tx.tokenSymbol}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      deduplicated.sort((a, b) => b.timestamp - a.timestamp);

      // Return top N results
      return deduplicated.slice(0, input.offset);
    }),
});
