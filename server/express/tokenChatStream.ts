/**
 * Token Chat Stream — SSE endpoint for streaming AI chat responses
 * POST /api/token-chat/stream
 * 
 * Authenticates via session cookie, fetches CoinGecko data for context,
 * streams LLM response token-by-token via SSE.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";

// Rate limiting: 10 requests per 60 seconds per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

async function fetchTokenContext(symbol: string): Promise<string> {
  try {
    const cacheKey = `token:search:${symbol.toLowerCase()}`;
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    const searchData = await cachedFetch<any>(cacheKey, searchUrl, TTL.search, (res) => res.json());
    const coin = searchData?.coins?.[0];
    if (!coin) return `代币符号: ${symbol.toUpperCase()}\n（无法获取实时数据）`;

    const detailCacheKey = `token:detail:${coin.id}`;
    const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const detail = await cachedFetch<any>(detailCacheKey, detailUrl, TTL.tokenDetail, (res) => res.json());
    if (!detail) return `代币符号: ${symbol.toUpperCase()}\n（无法获取实时数据）`;

    const md = detail.market_data;
    const price = md?.current_price?.usd;
    const change24h = md?.price_change_percentage_24h;
    const change7d = md?.price_change_percentage_7d;
    const marketCap = md?.market_cap?.usd;
    const rank = detail.market_cap_rank;
    const volume24h = md?.total_volume?.usd;
    const ath = md?.ath?.usd;
    const athChange = md?.ath_change_percentage?.usd;
    const circSupply = md?.circulating_supply;
    const maxSupply = md?.max_supply;
    const sentiment = detail.sentiment_votes_up_percentage;

    const fmtUsd = (v: number | null | undefined) =>
      v ? (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toFixed(2)}`) : "N/A";
    const fmtPct = (v: number | null | undefined) =>
      v !== null && v !== undefined ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";
    const fmtNum = (v: number | null | undefined) =>
      v ? (v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toFixed(0)) : "N/A";

    return `=== ${detail.name} (${detail.symbol?.toUpperCase()}) 实时市场数据 ===
当前价格: ${price ? `$${price.toLocaleString()}` : "N/A"}
24h 涨跌: ${fmtPct(change24h)}
7d 涨跌: ${fmtPct(change7d)}
市值: ${fmtUsd(marketCap)} (排名 #${rank ?? "N/A"})
24h 成交量: ${fmtUsd(volume24h)}
ATH: ${ath ? `$${ath.toLocaleString()}` : "N/A"} (距离ATH ${fmtPct(athChange)})
流通量: ${fmtNum(circSupply)}${maxSupply ? ` / 最大供应: ${fmtNum(maxSupply)}` : ""}
社区情绪: ${sentiment ? `${sentiment.toFixed(0)}% 看涨` : "N/A"}
${detail.description?.en ? `\n简介: ${detail.description.en.slice(0, 300)}...` : ""}`;
  } catch {
    return `代币符号: ${symbol.toUpperCase()}\n（获取实时数据时出错）`;
  }
}

export async function handleTokenChatStream(req: Request, res: Response) {
  // Auth
  let user: any;
  try {
    user = await sdk.authenticateRequest(req as any);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Rate limit
  if (!checkRateLimit(user.id)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait 60 seconds." });
    return;
  }

  const { token, message, history = [] } = req.body as {
    token: string;
    message: string;
    history?: Array<{ role: string; content: string }>;
  };

  if (!token || !message) {
    res.status(400).json({ error: "token and message are required" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  try {
    // Fetch token context
    const tokenContext = await fetchTokenContext(token);

    // Build messages
    const systemPrompt = `你是 NexusChat 的 AI 投研助手，专注于加密货币分析。
请基于以下实时市场数据回答用户问题：

${tokenContext}

回答要求：
- 使用中文回答
- 结合上述实时数据给出具体分析
- 观点明确，有理有据，避免废话
- 适当使用 Markdown 格式（加粗关键数据）
- 每次回答控制在 200-400 字`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    // Call LLM with streaming
    const apiUrl = ENV.forgeApiUrl
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://api.openai.com/v1/chat/completions";

    const llmRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages,
        stream: true,
        max_tokens: 1024,
      }),
      signal: req.socket.destroyed ? AbortSignal.abort() : undefined,
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      sendEvent(JSON.stringify({ error: `LLM error: ${llmRes.status} ${errText}` }));
      res.end();
      return;
    }

    const reader = llmRes.body?.getReader();
    if (!reader) {
      sendEvent(JSON.stringify({ error: "No response body" }));
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Handle client disconnect
    req.on("close", () => {
      reader.cancel();
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            sendEvent(JSON.stringify({ token: delta }));
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    sendEvent(JSON.stringify({ done: true }));
  } catch (err: any) {
    if (!res.writableEnded) {
      sendEvent(JSON.stringify({ error: err.message ?? "Unknown error" }));
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
