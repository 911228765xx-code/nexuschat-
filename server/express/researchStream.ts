/**
 * Research Stream — SSE endpoint for streaming AI research reports
 * POST /api/research/stream
 * 
 * Authenticates via session cookie, fetches CoinGecko + Fear & Greed data,
 * streams LLM report token-by-token via SSE, then sends vizData at the end.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";

// Rate limiting: 5 requests per 60 seconds per user (heavy endpoint)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

const fmtUsd = (v: number | null | undefined) =>
  v ? (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toFixed(2)}`) : "N/A";
const fmtPct = (v: number | null | undefined) =>
  v !== null && v !== undefined ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";
const fmtNum = (v: number | null | undefined) =>
  v ? (v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toFixed(0)) : "N/A";

async function fetchAllData(symbol: string) {
  // Parallel fetch: token data + global market + fear & greed + BTC price
  const [tokenData, globalData, fearGreedData, btcData, priceHistory] = await Promise.allSettled([
    // Token detail
    (async () => {
      const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
      const searchData = await cachedFetch<any>(`token:search:${symbol.toLowerCase()}`, searchUrl, TTL.search, (r) => r.json());
      const coin = searchData?.coins?.[0];
      if (!coin) return null;
      const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`;
      return cachedFetch<any>(`token:detail:${coin.id}`, detailUrl, TTL.tokenDetail, (r) => r.json());
    })(),
    // Global market
    cachedFetch<any>("global:market", "https://api.coingecko.com/api/v3/global", TTL.prices, (r) => r.json()),
    // Fear & Greed
    cachedFetch<any>("fear:greed", "https://api.alternative.me/fng/?limit=1", TTL.prices, (r) => r.json()),
    // BTC price
    cachedFetch<any>("btc:price", "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", TTL.prices, (r) => r.json()),
    // 30d price history (fetched separately to avoid rate limit)
    null,
  ]);

  const token = tokenData.status === "fulfilled" ? tokenData.value : null;
  const global = globalData.status === "fulfilled" ? globalData.value?.data : null;
  const fg = fearGreedData.status === "fulfilled" ? fearGreedData.value?.data?.[0] : null;
  const btc = btcData.status === "fulfilled" ? btcData.value?.bitcoin?.usd : null;

  return { token, global, fg, btc };
}

function buildSystemPrompt(mode: string): string {
  if (mode === "quick") {
    return "你是一位经验丰富的加密货币交易员，擅长快速研判市场机会。你的分析风格直接、果断，不回避给出明确方向。每句话必须包含具体数字或明确观点，禁止使用\"值得关注\"\"需要观察\"等废话。回复使用中文。";
  }
  return "你是一位顶级加密货币研究机构的首席分析师，擅长多维度深度分析。你的报告以数据驱动、逻辑严密、观点鲜明著称。每句话必须包含具体数字或明确观点，禁止套话废话。回复使用中文。";
}

function buildPrompt(symbol: string, mode: string, token: any, global: any, fg: any, btc: number | null): string {
  const md = token?.market_data;
  const price = md?.current_price?.usd;
  const change24h = md?.price_change_percentage_24h;
  const change7d = md?.price_change_percentage_7d;
  const change30d = md?.price_change_percentage_30d;
  const marketCap = md?.market_cap?.usd;
  const rank = token?.market_cap_rank;
  const volume24h = md?.total_volume?.usd;
  const ath = md?.ath?.usd;
  const athChange = md?.ath_change_percentage?.usd;
  const circSupply = md?.circulating_supply;
  const maxSupply = md?.max_supply;
  const sentiment = token?.sentiment_votes_up_percentage;
  const fdv = md?.fully_diluted_valuation?.usd;
  const volMcap = volume24h && marketCap ? (volume24h / marketCap * 100).toFixed(2) : null;

  const tokenSection = token ? `=== ${token.name} (${symbol.toUpperCase()}) 实时数据 ===
价格: ${price ? `$${price.toLocaleString()}` : "N/A"}
24h: ${fmtPct(change24h)} | 7d: ${fmtPct(change7d)} | 30d: ${fmtPct(change30d)}
市值: ${fmtUsd(marketCap)} (排名 #${rank ?? "N/A"}) | FDV: ${fmtUsd(fdv)}
24h 成交量: ${fmtUsd(volume24h)}${volMcap ? ` (量/市值比: ${volMcap}%)` : ""}
ATH: ${ath ? `$${ath.toLocaleString()}` : "N/A"} (距ATH ${fmtPct(athChange)})
流通量: ${fmtNum(circSupply)}${maxSupply ? ` / 最大: ${fmtNum(maxSupply)}` : ""}
社区情绪: ${sentiment ? `${sentiment.toFixed(0)}% 看涨` : "N/A"}` : `代币: ${symbol.toUpperCase()}\n（无法获取实时数据）`;

  const globalSection = global ? `\n=== 宏观市场 ===
BTC 主导率: ${global.market_cap_percentage?.btc?.toFixed(1) ?? "N/A"}%
ETH 主导率: ${global.market_cap_percentage?.eth?.toFixed(1) ?? "N/A"}%
加密总市值: ${fmtUsd(global.total_market_cap?.usd)}
24h 总成交量: ${fmtUsd(global.total_volume?.usd)}
BTC 价格: ${btc ? `$${btc.toLocaleString()}` : "N/A"}` : "";

  const fgSection = fg ? `\n恐惧贪婪指数: ${fg.value} (${fg.value_classification})` : "";

  const baseContext = tokenSection + globalSection + fgSection;

  if (mode === "quick") {
    return `${baseContext}

请对 ${symbol.toUpperCase()} 进行快速研判（250-350字）：
1. **核心判断**：一句话给出明确方向（看涨/看跌/中性）及理由
2. **关键数据**：引用上述数据中最重要的2-3个指标支撑判断
3. **操作建议**：具体的入场/观望/离场建议（含价格参考）
4. **风险提示**：最主要的1-2个风险点

在报告结尾给出评分：**综合评分: X/10**（X为1-10的整数）`;
  }

  return `${baseContext}

请对 ${symbol.toUpperCase()} 进行深度投研分析（600-800字），包含以下章节：

## 市场概况
引用具体数据描述当前价格位置、趋势和市场情绪

## 技术面分析
基于价格变化数据分析支撑/阻力位，趋势判断

## 基本面分析
代币经济学（供应量/FDV/成交量比）、项目价值评估

## 宏观环境
结合BTC主导率、恐惧贪婪指数分析市场大环境影响

## 风险评估
列出主要风险因素，给出风险等级（低/中/高）

## 投资建议
明确的操作建议，包含具体价格参考

在报告结尾给出：**综合评分: X/10** | **风险等级: 低/中/高** | **市场情绪: 看涨/中性/看跌**`;
}

function extractVizData(content: string, token: any, mode: string) {
  const md = token?.market_data;
  
  // Extract AI score
  const scoreMatch = content.match(/综合评分[：:]\s*(\d+)\s*\/\s*10/);
  const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

  // Extract sentiment
  let sentiment: "bullish" | "neutral" | "bearish" = "neutral";
  if (content.includes("看涨") || content.includes("bullish")) sentiment = "bullish";
  else if (content.includes("看跌") || content.includes("bearish")) sentiment = "bearish";

  // Extract risk level
  let riskLevel: "low" | "medium" | "high" = "medium";
  if (content.includes("风险等级: 低") || content.includes("风险等级：低") || content.includes("低风险")) riskLevel = "low";
  else if (content.includes("风险等级: 高") || content.includes("风险等级：高") || content.includes("高风险")) riskLevel = "high";

  // Key metrics
  const price = md?.current_price?.usd;
  const change24h = md?.price_change_percentage_24h;
  const change7d = md?.price_change_percentage_7d;
  const change30d = md?.price_change_percentage_30d;
  const marketCap = md?.market_cap?.usd;
  const rank = token?.market_cap_rank;
  const volume24h = md?.total_volume?.usd;
  const volMcap = volume24h && marketCap ? (volume24h / marketCap * 100) : null;
  const sentimentScore = token?.sentiment_votes_up_percentage;

  const keyMetrics = [
    { label: "当前价格", value: price ? `$${price.toLocaleString()}` : "N/A" },
    { label: "24h 涨跌", value: change24h !== undefined ? `${change24h >= 0 ? "+" : ""}${change24h?.toFixed(2)}%` : "N/A", isChange: true, changeVal: change24h },
    { label: "7d 涨跌", value: change7d !== undefined ? `${change7d >= 0 ? "+" : ""}${change7d?.toFixed(2)}%` : "N/A", isChange: true, changeVal: change7d },
    { label: "30d 涨跌", value: change30d !== undefined ? `${change30d >= 0 ? "+" : ""}${change30d?.toFixed(2)}%` : "N/A", isChange: true, changeVal: change30d },
    { label: "市值", value: fmtUsd(marketCap) },
    { label: "市值排名", value: rank ? `#${rank}` : "N/A" },
    { label: "24h 成交量", value: fmtUsd(volume24h) },
    { label: "量/市值比", value: volMcap ? `${volMcap.toFixed(2)}%` : "N/A" },
    { label: "社区情绪", value: sentimentScore ? `${sentimentScore.toFixed(0)}% 看涨` : "N/A", isProgress: true, progressVal: sentimentScore },
  ];

  return { aiScore, sentiment, riskLevel, keyMetrics };
}

export async function handleResearchStream(req: Request, res: Response) {
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

  const { tokenSymbol, mode = "quick" } = req.body as {
    tokenSymbol: string;
    mode?: "quick" | "deep";
  };

  if (!tokenSymbol) {
    res.status(400).json({ error: "tokenSymbol is required" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: string) => {
    if (!res.writableEnded) {
      res.write(`data: ${data}\n\n`);
    }
  };

  try {
    // Fetch all data
    const { token, global, fg, btc } = await fetchAllData(tokenSymbol);

    // Build prompt
    const systemPrompt = buildSystemPrompt(mode);
    const userPrompt = buildPrompt(tokenSymbol, mode, token, global, fg, btc);

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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: mode === "deep" ? 2048 : 1024,
      }),
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
    let fullContent = "";

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
            fullContent += delta;
            sendEvent(JSON.stringify({ token: delta }));
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Send vizData after streaming completes
    const vizData = extractVizData(fullContent, token, mode);
    sendEvent(JSON.stringify({
      done: true,
      vizData,
      meta: {
        tokenName: token?.name ?? tokenSymbol.toUpperCase(),
        price: token?.market_data?.current_price?.usd ?? null,
        marketCap: token?.market_data?.market_cap?.usd ?? null,
      },
    }));
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
