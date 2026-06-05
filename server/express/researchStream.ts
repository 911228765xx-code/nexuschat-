/**
 * Research Stream — SSE endpoint for streaming AI research reports
 * POST /api/research/stream
 *
 * Fetches real-time data from CryptoCompare (free, no API key needed),
 * streams LLM report token-by-token via SSE, then sends vizData at the end.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";

// Rate limiting: 5 requests per 60 seconds per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; expiresAt: number }>();

async function fetchWithCache<T>(key: string, url: string, ttlMs: number): Promise<T | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return cached?.data ?? null;
    const data = await res.json();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

const fmtUsd = (v: number | null | undefined) =>
  v != null ? (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toFixed(2)}`) : "N/A";
const fmtPct = (v: number | null | undefined) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";
const fmtNum = (v: number | null | undefined) =>
  v != null ? (v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toFixed(0)) : "N/A";

interface TokenData {
  symbol: string;
  name: string;
  price: number | null;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  marketCap: number | null;
  rank: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  supply: number | null;
  ath: number | null;
}

interface MarketData {
  btcDominance: number | null;
  totalMarketCap: number | null;
  fearGreedValue: number | null;
  fearGreedLabel: string | null;
}

async function fetchTokenData(symbol: string): Promise<TokenData> {
  const sym = symbol.toUpperCase();

  // Fetch current price + market data from CryptoCompare
  const [priceData, histData] = await Promise.all([
    fetchWithCache<any>(
      `cc:price:${sym}`,
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${sym}&tsyms=USD`,
      30_000
    ),
    fetchWithCache<any>(
      `cc:hist:${sym}`,
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${sym}&tsym=USD&limit=31`,
      120_000
    ),
  ]);

  const raw = priceData?.RAW?.[sym]?.USD ?? null;
  const histPoints: any[] = histData?.Data?.Data ?? [];

  let change7d: number | null = null;
  let change30d: number | null = null;
  if (histPoints.length >= 31) {
    const priceNow = histPoints[histPoints.length - 1]?.close;
    const price7d = histPoints[histPoints.length - 8]?.close;
    const price30d = histPoints[0]?.close;
    if (priceNow && price7d) change7d = (priceNow - price7d) / price7d * 100;
    if (priceNow && price30d) change30d = (priceNow - price30d) / price30d * 100;
  }

  // Get market cap rank from top 200 list
  const topCoinsRes = await fetchWithCache<any>(
    "cc:top200",
    "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=200&tsym=USD",
    120_000
  );
  let rank: number | null = null;
  const topCoinsList: any[] = Array.isArray(topCoinsRes?.Data) ? topCoinsRes.Data : [];
  if (topCoinsList.length > 0) {
    const idx = topCoinsList.findIndex((c: any) => c.CoinInfo?.Name?.toUpperCase() === sym);
    if (idx >= 0) rank = idx + 1;
  }

  return {
    symbol: sym,
    name: raw?.FROMSYMBOL ?? sym,
    price: raw?.PRICE ?? null,
    change24h: raw?.CHANGEPCT24HOUR ?? null,
    change7d,
    change30d,
    marketCap: raw?.MKTCAP ?? null,
    rank,
    volume24h: raw?.TOTALVOLUME24HTO ?? null,
    high24h: raw?.HIGH24HOUR ?? null,
    low24h: raw?.LOW24HOUR ?? null,
    supply: raw?.SUPPLY ?? null,
    ath: null, // CryptoCompare free tier doesn't provide ATH
  };
}

async function fetchMarketData(): Promise<MarketData> {
  const [btcData, fgData] = await Promise.all([
    fetchWithCache<any>(
      "cc:btc:dom",
      "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD",
      30_000
    ),
    fetchWithCache<any>(
      "fg:index",
      "https://api.alternative.me/fng/?limit=1",
      300_000
    ),
  ]);

  // BTC dominance approximation from market cap
  const btcMcap = btcData?.RAW?.BTC?.USD?.MKTCAP ?? null;
  // Total crypto market cap from CryptoCompare global
  const globalData = await fetchWithCache<any>(
    "cc:global",
    "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=1&tsym=USD",
    60_000
  );

  const fg = fgData?.data?.[0] ?? null;

  return {
    btcDominance: null, // Will be estimated from BTC mcap
    totalMarketCap: btcMcap ? btcMcap / 0.55 : null, // rough estimate
    fearGreedValue: fg ? parseInt(fg.value) : null,
    fearGreedLabel: fg?.value_classification ?? null,
  };
}

function buildSystemPrompt(mode: string): string {
  if (mode === "quick") {
    return "你是一位经验丰富的加密货币交易员，擅长快速研判市场机会。你的分析风格直接、果断，不回避给出明确方向。每句话必须包含具体数字或明确观点，禁止使用\"值得关注\"\"需要观察\"等废话。回复使用中文。";
  }
  return "你是一位顶级加密货币研究机构的首席分析师，擅长多维度深度分析。你的报告以数据驱动、逻辑严密、观点鲜明著称。每句话必须包含具体数字或明确观点，禁止套话废话。回复使用中文。";
}

function buildPrompt(token: TokenData, market: MarketData, mode: string): string {
  const volMcap = token.volume24h && token.marketCap ? (token.volume24h / token.marketCap * 100).toFixed(2) : null;

  const tokenSection = `=== ${token.name} (${token.symbol}) 实时数据 ===
价格: ${token.price ? `$${token.price.toLocaleString()}` : "N/A"}
24h: ${fmtPct(token.change24h)} | 7d: ${fmtPct(token.change7d)} | 30d: ${fmtPct(token.change30d)}
市值: ${fmtUsd(token.marketCap)}${token.rank ? ` (排名 #${token.rank})` : ""}
24h 成交量: ${fmtUsd(token.volume24h)}${volMcap ? ` (量/市值比: ${volMcap}%)` : ""}
24h 最高: ${token.high24h ? `$${token.high24h.toLocaleString()}` : "N/A"} / 最低: ${token.low24h ? `$${token.low24h.toLocaleString()}` : "N/A"}
流通量: ${fmtNum(token.supply)}`;

  const marketSection = market.fearGreedValue != null
    ? `\n=== 市场情绪 ===\n恐惧贪婪指数: ${market.fearGreedValue} (${market.fearGreedLabel})\n总市值估算: ${fmtUsd(market.totalMarketCap)}`
    : "";

  const baseContext = tokenSection + marketSection;

  if (mode === "quick") {
    return `${baseContext}

请对 ${token.symbol} 进行快速研判（250-350字）：
1. **核心判断**：一句话给出明确方向（看涨/看跌/中性）及理由
2. **关键数据**：引用上述数据中最重要的2-3个指标支撑判断
3. **操作建议**：具体的入场/观望/离场建议（含价格参考）
4. **风险提示**：最主要的1-2个风险点

在报告结尾给出评分：**综合评分: X/10**（X为1-10的整数）`;
  }

  return `${baseContext}

请对 ${token.symbol} 进行深度投研分析（600-800字），包含以下章节：

## 市场概况
引用具体数据描述当前价格位置、趋势和市场情绪

## 技术面分析
基于价格变化数据分析支撑/阻力位，趋势判断

## 基本面分析
代币经济学（供应量/成交量比）、项目价值评估

## 宏观环境
结合恐惧贪婪指数分析市场大环境影响

## 风险评估
列出主要风险因素，给出风险等级（低/中/高）

## 投资建议
明确的操作建议，包含具体价格参考

在报告结尾给出：**综合评分: X/10** | **风险等级: 低/中/高** | **市场情绪: 看涨/中性/看跌**`;
}

function extractVizData(content: string, token: TokenData) {
  // Extract AI score
  const scoreMatch = content.match(/综合评分[：:]\s*(\d+)\s*\/\s*10/);
  const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

  // Extract sentiment
  let sentiment: "bullish" | "neutral" | "bearish" = "neutral";
  if (content.includes("市场情绪: 看涨") || content.includes("市场情绪：看涨") || content.includes("核心判断.*看涨")) sentiment = "bullish";
  else if (content.includes("市场情绪: 看跌") || content.includes("市场情绪：看跌")) sentiment = "bearish";
  else if (content.includes("看涨") && !content.includes("看跌")) sentiment = "bullish";
  else if (content.includes("看跌") && !content.includes("看涨")) sentiment = "bearish";

  // Extract risk level
  let riskLevel: "low" | "medium" | "high" = "medium";
  if (content.includes("风险等级: 低") || content.includes("风险等级：低") || content.includes("低风险")) riskLevel = "low";
  else if (content.includes("风险等级: 高") || content.includes("风险等级：高") || content.includes("高风险")) riskLevel = "high";

  const volMcap = token.volume24h && token.marketCap ? (token.volume24h / token.marketCap * 100) : null;

  const keyMetrics = [
    { label: "当前价格", value: token.price ? `$${token.price.toLocaleString()}` : "N/A" },
    {
      label: "24h 涨跌",
      value: token.change24h != null ? `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%` : "N/A",
      isChange: true,
      changeVal: token.change24h,
    },
    {
      label: "7d 涨跌",
      value: token.change7d != null ? `${token.change7d >= 0 ? "+" : ""}${token.change7d.toFixed(2)}%` : "N/A",
      isChange: true,
      changeVal: token.change7d,
    },
    {
      label: "30d 涨跌",
      value: token.change30d != null ? `${token.change30d >= 0 ? "+" : ""}${token.change30d.toFixed(2)}%` : "N/A",
      isChange: true,
      changeVal: token.change30d,
    },
    { label: "市值", value: fmtUsd(token.marketCap) },
    { label: "市值排名", value: token.rank ? `#${token.rank}` : "N/A" },
    { label: "24h 成交量", value: fmtUsd(token.volume24h) },
    { label: "量/市值比", value: volMcap ? `${volMcap.toFixed(2)}%` : "N/A" },
    { label: "24h 最高", value: token.high24h ? `$${token.high24h.toLocaleString()}` : "N/A" },
    { label: "24h 最低", value: token.low24h ? `$${token.low24h.toLocaleString()}` : "N/A" },
  ];

  return { aiScore, sentiment, riskLevel, keyMetrics };
}

export async function handleResearchStream(req: Request, res: Response) {
  // Require authentication — this triggers paid LLM calls, so anonymous access is not allowed.
  let user: any;
  try {
    user = await sdk.authenticateRequest(req as any);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Rate limit per authenticated user
  const rateLimitKey = String(user.id);
  if (!checkRateLimit(rateLimitKey)) {
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
    // Fetch all data in parallel
    const [token, market] = await Promise.all([
      fetchTokenData(tokenSymbol),
      fetchMarketData(),
    ]);

    // Build prompt
    const systemPrompt = buildSystemPrompt(mode);
    const userPrompt = buildPrompt(token, market, mode);

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
    const vizData = extractVizData(fullContent, token);
    sendEvent(JSON.stringify({
      done: true,
      vizData,
      meta: {
        tokenName: token.name,
        price: token.price,
        marketCap: token.marketCap,
      },
    }));

    // Save report to DB if user is logged in
    if (user) {
      try {
        const { getDb } = await import("../db");
        const { researchReports } = await import("../../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(researchReports).values({
          userId: user.id,
          tokenSymbol: tokenSymbol.toUpperCase(),
          tokenName: token.name,
          reportContent: fullContent,
          sentiment: vizData.sentiment,
          riskLevel: vizData.riskLevel,
          priceAtReport: token.price ? `$${token.price.toLocaleString()}` : undefined,
          marketCapAtReport: fmtUsd(token.marketCap),
        });
      } catch {
        // Ignore DB errors for anonymous users
      }
    }
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
