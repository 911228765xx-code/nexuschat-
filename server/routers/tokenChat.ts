import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { rateLimitStrict } from "../rateLimit";
import { invokeLLM } from "../_core/llm";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";
import logger from "../utils/logger";

// ─── CoinGecko helpers (reused from research) ──────────────────────────────

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
  ADA: "cardano", DOT: "polkadot", AVAX: "avalanche-2", MATIC: "matic-network",
  LINK: "chainlink", UNI: "uniswap", AAVE: "aave", CAKE: "pancakeswap-token",
  DOGE: "dogecoin", XRP: "ripple", PEPE: "pepe", RENDER: "render-token",
};

async function fetchTokenContext(symbol: string): Promise<string> {
  const coinId = SYMBOL_TO_COINGECKO[symbol.toUpperCase()];
  if (!coinId) {
    return `Token: ${symbol.toUpperCase()}\n(Real-time data unavailable for this token. Provide general analysis based on your knowledge.)`;
  }

  try {
    const detailUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const detail = await cachedFetch<any>(
      `token:detail:${coinId}`,
      detailUrl,
      TTL.tokenDetail,
      (res) => res.json(),
    );
    if (!detail) throw new Error("No data");

    const md = detail.market_data;
    const fmtUsd = (n: number | null) => {
      if (n == null) return "N/A";
      if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      return `$${n.toFixed(2)}`;
    };
    const fmtPct = (n: number | null) => {
      if (n == null) return "N/A";
      return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
    };

    return `=== Real-Time Market Data ===
Token: ${detail.name} (${detail.symbol?.toUpperCase()})
Price: $${md?.current_price?.usd ?? "N/A"}
24h Change: ${fmtPct(md?.price_change_percentage_24h)}
7d Change: ${fmtPct(md?.price_change_percentage_7d)}
30d Change: ${fmtPct(md?.price_change_percentage_30d)}
Market Cap: ${fmtUsd(md?.market_cap?.usd)} (Rank #${detail.market_cap_rank ?? "N/A"})
24h Volume: ${fmtUsd(md?.total_volume?.usd)}
ATH: $${md?.ath?.usd ?? "N/A"} (${fmtPct(md?.ath_change_percentage?.usd)} from ATH)
ATL: $${md?.atl?.usd ?? "N/A"}
Circulating Supply: ${md?.circulating_supply?.toLocaleString() ?? "N/A"}
Max Supply: ${md?.max_supply?.toLocaleString() ?? "Unlimited"}
FDV: ${fmtUsd(md?.fully_diluted_valuation?.usd)}
Sentiment: ${detail.sentiment_votes_up_percentage?.toFixed(0) ?? "N/A"}% bullish
Categories: ${detail.categories?.slice(0, 5).join(", ") ?? "N/A"}
Description: ${detail.description?.en?.slice(0, 500) ?? "N/A"}`;
  } catch (err) {
    logger.warn({ symbol, err }, "Failed to fetch token context for AI chat");
    return `Token: ${symbol.toUpperCase()}\n(Real-time data temporarily unavailable. Provide analysis based on general market knowledge.)`;
  }
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const tokenChatRouter = router({
  /**
   * AI chat for token analysis — accepts user message + conversation history,
   * returns AI response with real-time market context.
   */
  sendMessage: protectedProcedure
    .use(rateLimitStrict)
    .input(
      z.object({
        tokenSymbol: z.string().min(1).max(20),
        message: z.string().min(1).max(2000),
        history: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ).max(20).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const { tokenSymbol, message, history } = input;
      const symbol = tokenSymbol.toUpperCase();

      // Fetch real-time market data as context
      const marketContext = await fetchTokenContext(symbol);

      const systemPrompt = `You are NexusChat AI, an expert crypto analyst assistant embedded in a token detail page for ${symbol}. You have access to real-time market data below.

${marketContext}

Guidelines:
- Provide data-driven analysis based on the real-time market data above
- Be concise but insightful — users are viewing this on mobile
- Include specific numbers (price, % changes, market cap) when relevant
- For technical analysis questions, reference key support/resistance levels
- For fundamental questions, discuss tokenomics, ecosystem, and catalysts
- Always include a brief risk disclaimer at the end
- Respond in the same language as the user's message
- Use markdown formatting for better readability (bold, bullet points, etc.)
- Keep responses under 300 words unless the user asks for detailed analysis`;

      // Build conversation messages
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      try {
        const llmResponse = await invokeLLM({ messages });

        const rawContent = llmResponse.choices[0]?.message?.content;
        const content: string = typeof rawContent === "string"
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map((c: any) => c.text ?? "").join("")
            : "Sorry, I couldn't generate a response. Please try again.";

        return { content };
      } catch (err) {
        logger.error({ err, symbol }, "AI chat LLM invocation failed");
        throw new Error("AI analysis temporarily unavailable. Please try again in a moment.");
      }
    }),
});
