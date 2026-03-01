/**
 * Token Chat Streaming Endpoint
 *
 * SSE (Server-Sent Events) endpoint for streaming AI token analysis.
 * Uses the same LLM API with `stream: true` to return tokens incrementally.
 *
 * POST /api/token-chat/stream
 * Body: { tokenSymbol, message, history[] }
 * Response: text/event-stream with SSE events
 */

import { Router, type Request, type Response } from "express";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";
import logger from "../utils/logger";

// ─── Rate limiter (simple in-memory, per-user) ────────────────────────────
const streamRateStore = new Map<string, number[]>();
const STREAM_RATE_WINDOW = 60_000; // 60s
const STREAM_RATE_MAX = 10; // 10 requests per window

function checkStreamRate(userId: string): boolean {
  const now = Date.now();
  let timestamps = streamRateStore.get(userId);
  if (!timestamps) {
    timestamps = [];
    streamRateStore.set(userId, timestamps);
  }
  // Prune expired
  const valid = timestamps.filter((t) => now - t < STREAM_RATE_WINDOW);
  streamRateStore.set(userId, valid);
  if (valid.length >= STREAM_RATE_MAX) return false;
  valid.push(now);
  return true;
}

// Cleanup every 5 min
setInterval(() => {
  const now = Date.now();
  streamRateStore.forEach((timestamps, key) => {
    const valid = timestamps.filter((t) => now - t < STREAM_RATE_WINDOW * 2);
    if (valid.length === 0) streamRateStore.delete(key);
    else streamRateStore.set(key, valid);
  });
}, 300_000);

// ─── CoinGecko helpers (shared with tokenChat.ts) ─────────────────────────
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
    logger.warn({ symbol, err }, "Failed to fetch token context for AI chat stream");
    return `Token: ${symbol.toUpperCase()}\n(Real-time data temporarily unavailable. Provide analysis based on general market knowledge.)`;
  }
}

// ─── Build the LLM API URL ────────────────────────────────────────────────
function resolveApiUrl(): string {
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
}

// ─── Express Router ───────────────────────────────────────────────────────
export const tokenChatStreamRouter = Router();

tokenChatStreamRouter.post("/stream", async (req: Request, res: Response) => {
  // 1. Authenticate user
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // 2. Rate limit
  if (!checkStreamRate(user.id.toString())) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait a moment." });
    return;
  }

  // 3. Validate input
  const { tokenSymbol, message, history } = req.body ?? {};
  if (!tokenSymbol || typeof tokenSymbol !== "string" || tokenSymbol.length > 20) {
    res.status(400).json({ error: "Invalid tokenSymbol" });
    return;
  }
  if (!message || typeof message !== "string" || message.length > 2000) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }
  const safeHistory = Array.isArray(history)
    ? history.slice(-20).filter(
        (h: any) =>
          h &&
          typeof h.role === "string" &&
          (h.role === "user" || h.role === "assistant") &&
          typeof h.content === "string"
      )
    : [];

  const symbol = tokenSymbol.toUpperCase();

  // 4. Fetch market context
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

  const messages = [
    { role: "system", content: systemPrompt },
    ...safeHistory.map((h: any) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  // 5. Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // 6. Call LLM with streaming
  try {
    const llmResponse = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages,
        max_tokens: 32768,
        thinking: { budget_tokens: 128 },
        stream: true,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      logger.error({ status: llmResponse.status, errText, symbol }, "LLM stream request failed");
      res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const reader = llmResponse.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ error: "No response stream" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Handle client disconnect
    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
      reader.cancel().catch(() => {});
    });

    // 7. Stream SSE events from LLM to client
    while (true) {
      if (clientDisconnected) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines from the LLM response
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6); // Remove "data: " prefix
        if (dataStr === "[DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }

        try {
          const chunk = JSON.parse(dataStr);
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            // Forward the content token to the client
            res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    // Ensure we send [DONE] if not already sent
    if (!clientDisconnected) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (err) {
    logger.error({ err, symbol }, "AI chat stream error");
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});
