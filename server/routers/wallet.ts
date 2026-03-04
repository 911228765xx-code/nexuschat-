import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, swapHistory } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";

// BSC public RPC endpoints (no API key required)
const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
];

// BscScan V2 API (optional, for transaction history)
const BSCSCAN_V2_API = "https://api.bscscan.com/v2/api";
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY ?? "";

interface BscToken {
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  cgId: string;
}

// Well-known BSC BEP-20 tokens
const BSC_KNOWN_TOKENS: BscToken[] = [
  { symbol: "USDT",  name: "Tether USD",          contractAddress: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, cgId: "tether" },
  { symbol: "USDC",  name: "USD Coin",             contractAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, cgId: "usd-coin" },
  { symbol: "BUSD",  name: "Binance USD",          contractAddress: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, cgId: "binance-usd" },
  { symbol: "CAKE",  name: "PancakeSwap Token",    contractAddress: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, cgId: "pancakeswap-token" },
  { symbol: "ETH",   name: "Ethereum (BSC)",       contractAddress: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, cgId: "ethereum" },
  { symbol: "BTC",   name: "Bitcoin (BSC)",        contractAddress: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, cgId: "bitcoin" },
  { symbol: "XRP",   name: "XRP Token (BSC)",      contractAddress: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, cgId: "ripple" },
  { symbol: "ADA",   name: "Cardano Token (BSC)",  contractAddress: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18, cgId: "cardano" },
  { symbol: "DOT",   name: "Polkadot Token (BSC)", contractAddress: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", decimals: 18, cgId: "polkadot" },
  { symbol: "LINK",  name: "Chainlink (BSC)",      contractAddress: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, cgId: "chainlink" },
  { symbol: "LTC",   name: "Litecoin Token (BSC)", contractAddress: "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94", decimals: 18, cgId: "litecoin" },
  { symbol: "MATIC", name: "Polygon (BSC)",        contractAddress: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD", decimals: 18, cgId: "matic-network" },
  { symbol: "DOGE",  name: "Dogecoin (BSC)",       contractAddress: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8,  cgId: "dogecoin" },
  { symbol: "SOL",   name: "Solana (BSC)",         contractAddress: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, cgId: "solana" },
  { symbol: "AVAX",  name: "Avalanche (BSC)",      contractAddress: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, cgId: "avalanche-2" },
];

// Call BSC RPC with fallback across multiple endpoints
async function callBscRpc<T>(method: string, params: unknown[]): Promise<T | null> {
  for (const endpoint of BSC_RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: T; error?: unknown };
      if (json.error) continue;
      return json.result ?? null;
    } catch {
      // try next endpoint
    }
  }
  return null;
}

// ERC-20 balanceOf(address) ABI-encoded call data
function encodeBalanceOf(address: string): string {
  const addr = address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  return "0x70a08231" + addr;
}

async function fetchBscScanV2<T>(params: Record<string, string>): Promise<T | null> {
  if (!BSCSCAN_KEY) return null;
  try {
    const url = new URL(BSCSCAN_V2_API);
    Object.entries({ ...params, chainid: "56", apikey: BSCSCAN_KEY }).forEach(([k, v]) =>
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
  //
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

  //
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
  //
  getBalance: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
      })
    )
    .query(async ({ input }) => {
      // Use BSC public RPC directly — no API key required
      const hexBalance = await callBscRpc<string>("eth_getBalance", [input.address, "latest"]);

      if (!hexBalance) {
        return { bnbBalance: "0", bnbBalanceFormatted: "0.0000", usdValue: null };
      }

      const bnbWei = parseInt(hexBalance, 16);
      const bnb = bnbWei / 1e18;
      const bnbFormatted = bnb.toFixed(4);

      // Fetch BNB price in USD from CoinGecko (cached)
      let usdValue: string | null = null;
      const bnbPriceData = await cachedFetch<{ binancecoin?: { usd?: number } }>(
        "bnb-usd-price",
        "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
        TTL.prices,
        (res) => res.json(),
      );
      if (bnbPriceData?.binancecoin?.usd) {
        usdValue = (bnb * bnbPriceData.binancecoin.usd).toFixed(2);
      }

      return { bnbBalance: hexBalance, bnbBalanceFormatted: bnbFormatted, usdValue };
    }),

  //
  getTokenBalances: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
      })
    )
    .query(async ({ input }) => {
      // Query balances for all known BSC tokens in parallel via RPC eth_call
      const balanceResults = await Promise.all(
        BSC_KNOWN_TOKENS.map(async (token) => {
          try {
            const hexBal = await callBscRpc<string>("eth_call", [
              { to: token.contractAddress, data: encodeBalanceOf(input.address) },
              "latest",
            ]);
            if (!hexBal || hexBal === "0x" || hexBal === "0x0") return null;
            const rawBal = parseInt(hexBal, 16);
            if (rawBal === 0) return null;
            const formatted = (rawBal / Math.pow(10, token.decimals)).toFixed(6);
            if (parseFloat(formatted) <= 0) return null;
            return { ...token, balanceFormatted: formatted, usdPrice: 0, usdValue: 0, change24h: 0 };
          } catch {
            return null;
          }
        })
      );

      const tokens = balanceResults.filter((t): t is NonNullable<typeof t> => t !== null);

      if (tokens.length === 0) return [];

      //
      try {
        const cgIdSet = new Set(tokens.map((t) => t.cgId));
        const cgIds = Array.from(cgIdSet).join(",");
        const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`;
        const cacheKey = `bsc-token-cg-prices-${cgIds.slice(0, 80)}`;
        const priceData = await cachedFetch<Record<string, { usd?: number; usd_24h_change?: number }>>(
          cacheKey,
          priceUrl,
          TTL.prices,
          (res) => res.json(),
        );
        if (priceData) {
          for (const token of tokens) {
            const p = priceData[token.cgId];
            if (p?.usd) {
              const bal = parseFloat(token.balanceFormatted);
              token.usdPrice = p.usd;
              token.usdValue = parseFloat((bal * p.usd).toFixed(2));
              token.change24h = parseFloat((p.usd_24h_change ?? 0).toFixed(2));
            }
          }
        }
      } catch {
        // Price enrichment is best-effort
      }

      // Sort by USD value descending
      return tokens
        .filter((t) => t.usdValue > 0 || parseFloat(t.balanceFormatted) > 0)
        .sort((a, b) => b.usdValue - a.usdValue)
        .map((t) => ({
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          contractAddress: t.contractAddress.toLowerCase(),
          balance: t.balanceFormatted,
          balanceFormatted: t.balanceFormatted,
          usdPrice: t.usdPrice,
          usdValue: t.usdValue,
          change24h: t.change24h,
        }));
    }),

  //
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

  //
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

  //
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
  //
  getTransactions: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
        page: z.number().min(1).default(1),
        offset: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const data = await fetchBscScanV2<{
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

      return data.result.map((tx: { hash: string; from: string; to: string; value: string; timeStamp: string; isError: string; gas: string; gasPrice: string }) => ({
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

  //
  // Uses Alchemy JSON-RPC for accurate real-time balances.
  // Falls back to Etherscan free API if ALCHEMY_API_KEY is not set.
  // Enriches each token with USD price and 24h change from CoinGecko.
  getEthTokenBalances: publicProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
      })
    )
    .query(async ({ input }) => {
      const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
      const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY ?? "";

      // Well-known ERC-20 contract addresses → CoinGecko IDs
      const KNOWN_TOKENS: Record<string, { cgId: string; symbol: string; name: string }> = {
        "0xdac17f958d2ee523a2206206994597c13d831ec7": { cgId: "tether", symbol: "USDT", name: "Tether" },
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { cgId: "usd-coin", symbol: "USDC", name: "USD Coin" },
        "0x6b175474e89094c44da98b954eedeac495271d0f": { cgId: "dai", symbol: "DAI", name: "Dai" },
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { cgId: "weth", symbol: "WETH", name: "Wrapped Ether" },
        "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { cgId: "wrapped-bitcoin", symbol: "WBTC", name: "Wrapped Bitcoin" },
        "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { cgId: "uniswap", symbol: "UNI", name: "Uniswap" },
        "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": { cgId: "aave", symbol: "AAVE", name: "Aave" },
        "0x514910771af9ca656af840dff83e8264ecf986ca": { cgId: "chainlink", symbol: "LINK", name: "Chainlink" },
        "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": { cgId: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
        "0x4d224452801aced8b2f0aebe155379bb5d594381": { cgId: "apecoin", symbol: "APE", name: "ApeCoin" },
        "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": { cgId: "staked-ether", symbol: "stETH", name: "Lido Staked Ether" },
        "0xbe9895146f7af43049ca1c1ae358b0541ea49704": { cgId: "coinbase-wrapped-staked-eth", symbol: "cbETH", name: "Coinbase Wrapped Staked ETH" },
      };

      //
      async function alchemyPost<T>(method: string, params: unknown[]): Promise<T | null> {
        if (!ALCHEMY_KEY) return null;
        try {
          const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return null;
          const json = (await res.json()) as { result?: T };
          return json.result ?? null;
        } catch { return null; }
      }

      //
      async function fetchEthBalance(): Promise<number> {
        const hexBal = await alchemyPost<string>("eth_getBalance", [input.address, "latest"]);
        if (hexBal) return parseInt(hexBal, 16) / 1e18;
        // Etherscan fallback
        try {
          const params = new URLSearchParams({ module: "account", action: "balance", address: input.address, tag: "latest", ...(ETHERSCAN_KEY ? { apikey: ETHERSCAN_KEY } : {}) });
          const res = await fetch(`https://api.etherscan.io/api?${params}`, { signal: AbortSignal.timeout(8_000) });
          const json = (await res.json()) as { status: string; result: string };
          if (json.status === "1") return parseInt(json.result) / 1e18;
        } catch { /* ignore */ }
        return 0;
      }

      //
      async function fetchPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
        if (!ids.length) return {};
        try {
          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(new Set(ids)).join(",")}&vs_currencies=usd&include_24hr_change=true`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
          if (!res.ok) return {};
          return (await res.json()) as Record<string, { usd: number; usd_24h_change: number }>;
        } catch { return {}; }
      }

      type TokenResult = {
        contractAddress: string;
        symbol: string;
        name: string;
        decimals: number;
        balanceFormatted: string;
        usdPrice: number;
        usdValue: number;
        change24h: number;
        logo: string | null;
        chain: "ETH";
      };

      //
      const [rawTokens, ethBalance] = await Promise.all([
        alchemyPost<{ tokenBalances: Array<{ contractAddress: string; tokenBalance: string }> }>("alchemy_getTokenBalances", [input.address, "erc20"]),
        fetchEthBalance(),
      ]);

      const results: TokenResult[] = [];

      if (rawTokens?.tokenBalances?.length) {
        const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const nonZero = rawTokens.tokenBalances
          .filter((t) => t.tokenBalance && t.tokenBalance !== ZERO)
          .slice(0, 30);

        // Fetch metadata for unknown tokens in parallel
        const metaResults = await Promise.all(
          nonZero.map(async (t) => {
            const known = KNOWN_TOKENS[t.contractAddress.toLowerCase()];
            if (known) return { name: known.name, symbol: known.symbol, decimals: 18, logo: null as string | null };
            const meta = await alchemyPost<{ name: string; symbol: string; decimals: number; logo?: string }>("alchemy_getTokenMetadata", [t.contractAddress]);
            return meta ? { name: meta.name, symbol: meta.symbol, decimals: meta.decimals, logo: meta.logo ?? null } : null;
          })
        );

        // Collect CoinGecko IDs
        const cgIds = nonZero
          .map((t) => KNOWN_TOKENS[t.contractAddress.toLowerCase()]?.cgId)
          .filter(Boolean) as string[];
        cgIds.push("ethereum");
        const prices = await fetchPrices(cgIds);

        nonZero.forEach((t, i) => {
          const meta = metaResults[i];
          if (!meta) return;
          const decimals = meta.decimals || 18;
          const rawBal = BigInt(t.tokenBalance);
          const formatted = (Number(rawBal) / Math.pow(10, decimals)).toFixed(6);
          const known = KNOWN_TOKENS[t.contractAddress.toLowerCase()];
          const cgId = known?.cgId;
          const price = cgId ? (prices[cgId]?.usd ?? 0) : 0;
          const change24h = cgId ? (prices[cgId]?.usd_24h_change ?? 0) : 0;
          const usdValue = parseFloat(formatted) * price;
          if (parseFloat(formatted) <= 0) return; // skip dust
          results.push({
            contractAddress: t.contractAddress,
            symbol: meta.symbol,
            name: meta.name,
            decimals,
            balanceFormatted: formatted,
            usdPrice: price,
            usdValue,
            change24h,
            logo: meta.logo,
            chain: "ETH",
          });
        });
      } else {
        //
        try {
          const params = new URLSearchParams({
            module: "account", action: "tokenlist",
            address: input.address,
            ...(ETHERSCAN_KEY ? { apikey: ETHERSCAN_KEY } : {}),
          });
          const res = await fetch(`https://api.etherscan.io/api?${params}`, { signal: AbortSignal.timeout(10_000) });
          const json = (await res.json()) as { status: string; result: Array<{ contractAddress: string; tokenName: string; tokenSymbol: string; tokenDecimal: string; balance: string }> };
          if (json.status === "1" && Array.isArray(json.result)) {
            const cgIds = json.result
              .map((t) => KNOWN_TOKENS[t.contractAddress.toLowerCase()]?.cgId)
              .filter(Boolean) as string[];
            cgIds.push("ethereum");
            const prices = await fetchPrices(cgIds);

            json.result.slice(0, 30).forEach((t) => {
              const decimals = parseInt(t.tokenDecimal, 10) || 18;
              const formatted = (parseFloat(t.balance) / Math.pow(10, decimals)).toFixed(6);
              if (parseFloat(formatted) <= 0) return;
              const known = KNOWN_TOKENS[t.contractAddress.toLowerCase()];
              const cgId = known?.cgId;
              const price = cgId ? (prices[cgId]?.usd ?? 0) : 0;
              const change24h = cgId ? (prices[cgId]?.usd_24h_change ?? 0) : 0;
              results.push({
                contractAddress: t.contractAddress,
                symbol: t.tokenSymbol || known?.symbol || "???",
                name: t.tokenName || known?.name || "Unknown",
                decimals,
                balanceFormatted: formatted,
                usdPrice: price,
                usdValue: parseFloat(formatted) * price,
                change24h,
                logo: null,
                chain: "ETH",
              });
            });
          }
        } catch { /* ignore */ }
      }

      // Fetch ETH price
      const ethPrices = await fetchPrices(["ethereum"]);
      const ethUsdPrice = ethPrices["ethereum"]?.usd ?? 0;
      const ethChange24h = ethPrices["ethereum"]?.usd_24h_change ?? 0;

      return {
        ethBalance,
        ethUsdPrice,
        ethChange24h,
        ethUsdValue: ethBalance * ethUsdPrice,
        tokens: results,
      };
    }),
});
