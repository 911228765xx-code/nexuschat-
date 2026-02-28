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
