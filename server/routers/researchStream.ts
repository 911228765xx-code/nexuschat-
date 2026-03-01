/**
 * Research Report Streaming Endpoint
 *
 * SSE endpoint for streaming AI research report generation.
 * Streams the LLM report content token-by-token, then sends
 * structured vizData + metadata as a final JSON event.
 *
 * POST /api/research/stream
 * Body: { tokenSymbol, contractAddress?, chain?, mode? }
 * Response: text/event-stream with SSE events:
 *   data: { content: "..." }        — incremental report text
 *   data: { vizData: {...} }        — structured visualization data (sent once, after report)
 *   data: { meta: {...} }           — reportId, sentiment, riskLevel, tokenData
 *   data: [DONE]                    — stream complete
 */

import { Router, type Request, type Response } from "express";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { cachedFetch, TTL } from "../utils/coinGeckoCache";
import logger from "../utils/logger";
import { getDb } from "../db";
import { researchReports } from "../../drizzle/schema";

// ─── Rate limiter (per-user) ─────────────────────────────────────────────────
const rateStore = new Map<string, number[]>();
const RATE_WINDOW = 60_000;
const RATE_MAX = 5; // 5 reports per minute

function checkRate(userId: string): boolean {
  const now = Date.now();
  let ts = rateStore.get(userId);
  if (!ts) { ts = []; rateStore.set(userId, ts); }
  const valid = ts.filter((t) => now - t < RATE_WINDOW);
  rateStore.set(userId, valid);
  if (valid.length >= RATE_MAX) return false;
  valid.push(now);
  return true;
}

setInterval(() => {
  const now = Date.now();
  rateStore.forEach((ts, key) => {
    const valid = ts.filter((t) => now - t < RATE_WINDOW * 2);
    if (valid.length === 0) rateStore.delete(key);
    else rateStore.set(key, valid);
  });
}, 300_000);

// ─── CoinGecko helpers ───────────────────────────────────────────────────────

async function fetchTokenData(symbol: string) {
  const searchData = await cachedFetch<any>(
    `token:search:${symbol.toLowerCase()}`,
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
    TTL.search,
    (res) => res.json(),
  );
  const coin = searchData?.coins?.[0];
  if (!coin) return null;

  const detail = await cachedFetch<any>(
    `token:detail:${coin.id}`,
    `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`,
    TTL.tokenDetail,
    (res) => res.json(),
  );
  if (!detail) return null;

  return {
    id: coin.id,
    name: detail.name,
    symbol: detail.symbol?.toUpperCase(),
    price: detail.market_data?.current_price?.usd,
    priceChange24h: detail.market_data?.price_change_percentage_24h,
    priceChange7d: detail.market_data?.price_change_percentage_7d,
    priceChange30d: detail.market_data?.price_change_percentage_30d,
    marketCap: detail.market_data?.market_cap?.usd,
    marketCapRank: detail.market_cap_rank,
    volume24h: detail.market_data?.total_volume?.usd,
    volumeToMcapRatio: detail.market_data?.total_volume?.usd && detail.market_data?.market_cap?.usd
      ? (detail.market_data.total_volume.usd / detail.market_data.market_cap.usd) : null,
    ath: detail.market_data?.ath?.usd,
    athDate: detail.market_data?.ath_date?.usd,
    athChangePercentage: detail.market_data?.ath_change_percentage?.usd,
    atl: detail.market_data?.atl?.usd,
    circulatingSupply: detail.market_data?.circulating_supply,
    totalSupply: detail.market_data?.total_supply,
    maxSupply: detail.market_data?.max_supply,
    fdv: detail.market_data?.fully_diluted_valuation?.usd,
    description: detail.description?.en?.slice(0, 800),
    categories: detail.categories?.slice(0, 5),
    genesisDate: detail.genesis_date,
    sentimentVotesUpPercentage: detail.sentiment_votes_up_percentage,
    sentimentVotesDownPercentage: detail.sentiment_votes_down_percentage,
  };
}

async function fetchGlobalMarketData() {
  try {
    const data = await cachedFetch<any>("global:market", "https://api.coingecko.com/api/v3/global", TTL.prices, (res) => res.json());
    if (!data?.data) return null;
    const d = data.data;
    return {
      totalMarketCap: d.total_market_cap?.usd ?? null,
      totalVolume24h: d.total_volume?.usd ?? null,
      btcDominance: d.market_cap_percentage?.btc ?? null,
      ethDominance: d.market_cap_percentage?.eth ?? null,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? null,
    };
  } catch { return null; }
}

async function fetchFearGreedIndex() {
  try {
    const data = await cachedFetch<any>("feargreed:index", "https://api.alternative.me/fng/?limit=1", TTL.prices, (res) => res.json());
    if (!data?.data?.[0]) return null;
    return { value: parseInt(data.data[0].value, 10), classification: data.data[0].value_classification };
  } catch { return null; }
}

async function fetchBtcPrice() {
  try {
    const data = await cachedFetch<any>("btc:price:report", "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true", TTL.prices, (res) => res.json());
    if (!data?.bitcoin) return null;
    return { price: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change };
  } catch { return null; }
}

async function fetchPriceHistory30d(coinId: string): Promise<{ date: string; price: number }[]> {
  try {
    const data = await cachedFetch<any>(
      `trend:30d:${coinId}`,
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`,
      TTL.chart,
      (res) => res.json(),
    );
    if (!data?.prices || data.prices.length < 3) return [];
    return data.prices.map((p: [number, number]) => ({
      date: new Date(p[0]).toISOString().slice(0, 10),
      price: p[1],
    }));
  } catch { return []; }
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

// ─── Context builders ────────────────────────────────────────────────────────

function buildMarketContext(td: NonNullable<Awaited<ReturnType<typeof fetchTokenData>>>) {
  const athDrop = td.athChangePercentage ? `距离ATH下跌 ${Math.abs(td.athChangePercentage).toFixed(1)}%` : "N/A";
  const supplyInfo = td.maxSupply
    ? `流通量: ${fmtNum(td.circulatingSupply)} / 最大供应: ${fmtNum(td.maxSupply)} (${((td.circulatingSupply ?? 0) / td.maxSupply * 100).toFixed(1)}% 已释放)`
    : `流通量: ${fmtNum(td.circulatingSupply)} / 总供应: ${fmtNum(td.totalSupply)}`;
  const volumeMcapRatio = td.volumeToMcapRatio
    ? `成交量/市值比: ${(td.volumeToMcapRatio * 100).toFixed(2)}% (${td.volumeToMcapRatio > 0.1 ? "高换手" : td.volumeToMcapRatio > 0.03 ? "正常换手" : "低换手"})`
    : "";
  const sentiment = td.sentimentVotesUpPercentage
    ? `社区情绪: ${td.sentimentVotesUpPercentage.toFixed(0)}% 看涨 / ${td.sentimentVotesDownPercentage?.toFixed(0) ?? "N/A"}% 看跌`
    : "";

  return `=== 实时市场数据 ===
代币: ${td.name} (${td.symbol})
当前价格: $${td.price ?? "N/A"}
24h 涨跌: ${fmtPct(td.priceChange24h)}
7d 涨跌: ${fmtPct(td.priceChange7d)}
30d 涨跌: ${fmtPct(td.priceChange30d)}
市值: $${fmtUsd(td.marketCap)} (排名 #${td.marketCapRank ?? "N/A"})
FDV: $${fmtUsd(td.fdv)}
24h 成交量: $${fmtUsd(td.volume24h)}
${volumeMcapRatio}
ATH: $${td.ath ?? "N/A"} (${athDrop})
ATL: $${td.atl ?? "N/A"}
${supplyInfo}
${sentiment}
类别: ${td.categories?.join(", ") ?? "N/A"}`;
}

function buildGlobalContext(
  global: Awaited<ReturnType<typeof fetchGlobalMarketData>>,
  fng: Awaited<ReturnType<typeof fetchFearGreedIndex>>,
  btc: Awaited<ReturnType<typeof fetchBtcPrice>>,
): string {
  if (!global && !fng && !btc) return "";
  const lines: string[] = ["\n=== 全球市场环境 ==="];
  if (btc) lines.push(`BTC 价格: $${btc.price.toLocaleString()} (${fmtPct(btc.change24h)})`);
  if (global) {
    if (global.totalMarketCap) lines.push(`总市值: $${fmtUsd(global.totalMarketCap)} (24h ${fmtPct(global.marketCapChange24h)})`);
    if (global.btcDominance) lines.push(`BTC 主导率: ${global.btcDominance.toFixed(1)}%`);
  }
  if (fng) lines.push(`恐惧与贪婪指数: ${fng.value}/100 (${fng.classification})`);
  return lines.join("\n");
}

function buildPriceTrendContext(priceHistory: { date: string; price: number }[]): string {
  if (priceHistory.length < 5) return "";
  const prices = priceHistory.map(p => p.price);
  const latest = prices[prices.length - 1];
  const monthStart = prices[0];
  const last7 = prices.slice(-7);
  const last14 = prices.slice(-14);
  const sma7 = last7.reduce((a, b) => a + b, 0) / last7.length;
  const sma14 = last14.length > 0 ? last14.reduce((a, b) => a + b, 0) / last14.length : sma7;
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const range = high - low;
  const pos = range > 0 ? ((latest - low) / range * 100).toFixed(0) : "50";
  let trend = "震荡";
  if (latest > sma7 && sma7 > sma14) trend = "上升趋势";
  else if (latest < sma7 && sma7 < sma14) trend = "下降趋势";
  else if (latest > sma7 && sma7 < sma14) trend = "反弹初期";
  else if (latest < sma7 && sma7 > sma14) trend = "回调初期";

  const fmt = (n: number) => n < 1 ? `$${n.toFixed(6)}` : `$${n.toFixed(2)}`;
  return `\n=== 30天价格趋势 ===
当前: ${fmt(latest)} | 30天前: ${fmt(monthStart)} (${fmtPct((latest - monthStart) / monthStart * 100)})
30天高: ${fmt(high)} | 30天低: ${fmt(low)} | 区间位置: ${pos}%
SMA7: ${fmt(sma7)} | SMA14: ${fmt(sma14)} | 趋势: ${trend}`;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildQuickPrompt(symbol: string, ctx: string): string {
  return `你是一位经验丰富的加密货币交易员和分析师，拥有 10 年以上的市场经验。你以敢于表达明确观点著称，不会给出模棱两可的分析。

请基于以下实时数据，对 ${symbol} 进行快速投研分析。

${ctx}

**输出要求（Markdown 格式，约 400-500 字）：**

## ⚡ ${symbol} 快速研判

### 🎯 核心观点
用 1-2 句话给出你对该代币当前阶段的**明确判断**（看多/看空/观望），以及判断的核心依据。不要模棱两可。

### 📊 关键数据解读
用一个表格总结最关键的 3-5 个数据点，并在每个数据后给出你的**解读**（利好/利空/中性）：

| 指标 | 数值 | 解读 |
|------|------|------|

### 🧭 投研思路
给出明确的操作思路：
- **短线（1-7天）**：具体的方向判断和关键价位
- **中线（1-3月）**：趋势判断和关注的催化剂
- 给出具体的**关注价位**（支撑位/阻力位）

### ⚠️ 核心风险
列出 2-3 个最需要警惕的风险因素，每个用一句话说明

---
*NexusChat AI 研究助手 | 数据来源: CoinGecko | 本分析基于公开数据的 AI 推理，仅供参考，不构成投资建议*`;
}

function buildDeepPrompt(symbol: string, ctx: string): string {
  return `基于实时数据深度研究 ${symbol}。写作规则：每句话必须包含具体数字或明确观点，禁止"值得关注""需要观察"等废话，用数据说话，直接下结论。

${ctx}

**输出格式（Markdown，严格 600-800 字，每句必须含具体数字）：**

## 📋 ${symbol} 深度投研报告

**结论：** 看多/看空/观望。评分: X/10。一句话核心论点。

### 宏观环境
2-3 句，引用 BTC 主导率、恐惧贪婪指数等具体数字，判断市场周期对 ${symbol} 的影响。

### 基本面
用表格展示核心指标：

| 指标 | 数值 | 判断 |
|------|------|------|
| 市值/排名 | 实际数字 | 估值判断 |
| FDV | 实际数字 | 泡沫/合理/低估 |
| 成交量/市值比 | X% | 流动性判断 |
| 流通/最大供应 | X% | 通胀压力判断 |
| 社区情绪 | X%看多 | 情绪判断 |

每行后用 1 句话解读含义。

### 技术面
基于 30 天趋势数据，用 3-4 句话说清：当前阶段、均线关系、区间位置。
- 支撑: $X | 阻力: $X

### 操作策略

| 维度 | 方向 | 具体价位 |
|------|------|----------|
| 短线 1-7天 | 看多/空 + 置信度 | 入场 $X / 止损 $X / 目标 $X |
| 中线 1-3月 | 看多/空 + 置信度 | 建仓策略 + 催化剂 |
| 长线 6月+ | 看多/空 + 置信度 | 配置 X% 仓位 |

### 风险
| 类型 | 描述 | 概率 | 影响 |
|------|------|------|------|
（3 行核心风险，每行一句话）

**一句话总结：** 最重要的行动建议。

---
*NexusChat AI | CoinGecko 实时数据 | 仅供参考*`;
}

// ─── Sentiment / Risk extraction ─────────────────────────────────────────────

function extractSentiment(content: string): "bullish" | "bearish" | "neutral" {
  const bull = ["看多", "看涨", "利好", "强烈看多", "上升趋势", "建议买入", "建议建仓", "突破", "7/10", "8/10", "9/10", "10/10"];
  const bear = ["看空", "看跌", "利空", "强烈看空", "下跌趋势", "建议卖出", "建议减仓", "建议回避", "1/10", "2/10", "3/10"];
  let bs = 0, be = 0;
  for (const s of bull) if (content.includes(s)) bs++;
  for (const s of bear) if (content.includes(s)) be++;
  if (bs > be + 1) return "bullish";
  if (be > bs + 1) return "bearish";
  return "neutral";
}

function extractRiskLevel(content: string): "low" | "medium" | "high" {
  if (["高风险", "风险极高", "风险较大", "强烈警惕", "建议回避"].some(s => content.includes(s))) return "high";
  if (["低风险", "风险较低", "相对安全", "蓝筹"].some(s => content.includes(s))) return "low";
  return "medium";
}

// ─── LLM API URL ─────────────────────────────────────────────────────────────

function resolveApiUrl(): string {
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
}

// ─── Express Router ──────────────────────────────────────────────────────────

export const researchStreamRouter = Router();

researchStreamRouter.post("/stream", async (req: Request, res: Response) => {
  // 1. Auth
  let user;
  try { user = await sdk.authenticateRequest(req); } catch { /* */ }
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  // 2. Rate limit
  if (!checkRate(user.id.toString())) {
    res.status(429).json({ error: "Rate limit exceeded" }); return;
  }

  // 3. Validate input
  const { tokenSymbol, contractAddress, chain = "BSC", mode = "deep" } = req.body ?? {};
  if (!tokenSymbol || typeof tokenSymbol !== "string" || tokenSymbol.length > 20) {
    res.status(400).json({ error: "Invalid tokenSymbol" }); return;
  }
  const validMode = mode === "quick" ? "quick" : "deep";
  const symbol = tokenSymbol.toUpperCase();

  // 4. Fetch market data
  const tokenData = await fetchTokenData(tokenSymbol);
  let marketContext = tokenData
    ? buildMarketContext(tokenData)
    : `=== 市场数据 ===\n代币符号: ${symbol}\n链: ${chain}\n（无法获取实时数据，请基于你的专业知识进行分析，但需明确标注数据缺失）`;

  // 5. Fetch additional data (parallel)
  let priceHistory: { date: string; price: number }[] = [];
  const coinId = tokenData?.id ?? null;

  if (validMode === "deep") {
    const [globalData, fngData, btcData, ph] = await Promise.all([
      fetchGlobalMarketData(),
      fetchFearGreedIndex(),
      fetchBtcPrice(),
      coinId ? fetchPriceHistory30d(coinId) : Promise.resolve([]),
    ]);
    const globalCtx = buildGlobalContext(globalData, fngData, btcData);
    if (globalCtx) marketContext += "\n" + globalCtx;
    priceHistory = ph;
    const trendCtx = buildPriceTrendContext(priceHistory);
    if (trendCtx) marketContext += "\n" + trendCtx;
  } else {
    const [fngData, ph] = await Promise.all([
      fetchFearGreedIndex(),
      coinId ? fetchPriceHistory30d(coinId) : Promise.resolve([]),
    ]);
    if (fngData) marketContext += `\n\n恐惧与贪婪指数: ${fngData.value}/100 (${fngData.classification})`;
    priceHistory = ph;
  }

  // 6. Build prompt
  const prompt = validMode === "quick"
    ? buildQuickPrompt(symbol, marketContext)
    : buildDeepPrompt(symbol, marketContext);

  const systemMessage = validMode === "quick"
    ? `你是加密货币交易员。规则：1)每句话必须有具体数字或明确观点 2)禁止套话废话，如"值得关注""需要观察" 3)直接下结论，不要模棱两可 4)用数据说话。回复使用中文。`
    : `你是加密货币首席分析师。规则：1)每句话必须含具体数字 2)禁止"值得关注""需要观察""不容忽视"等废话 3)直接下结论，用数据说话 4)语言精练，信息密度最大化。回复使用中文。`;

  // 7. Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => { clientDisconnected = true; });

  try {
    // 8. Call LLM with streaming
    const llmResponse = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        max_tokens: 32768,
        thinking: { budget_tokens: 128 },
        stream: true,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      logger.error({ status: llmResponse.status, errText, symbol }, "Research stream LLM request failed");
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

    req.on("close", () => { reader.cancel().catch(() => {}); });

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    // 9. Stream tokens to client
    while (true) {
      if (clientDisconnected) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") continue; // We'll send our own [DONE]

        try {
          const chunk = JSON.parse(dataStr);
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
            res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
          }
        } catch { /* skip malformed */ }
      }
    }

    if (clientDisconnected) return;

    // 10. Extract metadata from full content
    const sentiment = extractSentiment(fullContent);
    const riskLevel = extractRiskLevel(fullContent);
    const scoreMatch = fullContent.match(/(\d+)\s*\/\s*10/);
    const aiScore = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5;

    // 11. Save to database
    let reportId: number | null = null;
    try {
      const db = await getDb();
      if (db) {
        const [result] = await db.insert(researchReports).values({
          userId: user.id,
          tokenSymbol: symbol,
          tokenName: tokenData?.name ?? undefined,
          contractAddress: contractAddress ?? undefined,
          chain,
          reportContent: fullContent,
          priceAtReport: tokenData?.price?.toString() ?? undefined,
          marketCapAtReport: tokenData?.marketCap?.toString() ?? undefined,
          sentiment,
          riskLevel,
          nxcCost: validMode === "quick" ? 5 : 10,
        });
        reportId = (result as any).insertId ?? null;
      }
    } catch (err) {
      logger.error({ err, symbol }, "Failed to save streaming research report");
    }

    // 12. Compute SMA from price history for the mini chart
    const priceHistoryWithSma = priceHistory.map((p, i, arr) => {
      const sma7Slice = arr.slice(Math.max(0, i - 6), i + 1).map(x => x.price);
      const sma14Slice = arr.slice(Math.max(0, i - 13), i + 1).map(x => x.price);
      return {
        date: p.date,
        price: p.price,
        sma7: sma7Slice.length >= 7 ? sma7Slice.reduce((a, b) => a + b, 0) / sma7Slice.length : null,
        sma14: sma14Slice.length >= 14 ? sma14Slice.reduce((a, b) => a + b, 0) / sma14Slice.length : null,
      };
    });

    // 13. Build vizData
    const vizData = {
      aiScore,
      sentiment,
      riskLevel,
      keyMetrics: {
        price: tokenData?.price ?? null,
        priceChange24h: tokenData?.priceChange24h ?? null,
        priceChange7d: tokenData?.priceChange7d ?? null,
        priceChange30d: tokenData?.priceChange30d ?? null,
        marketCap: tokenData?.marketCap ?? null,
        marketCapRank: tokenData?.marketCapRank ?? null,
        volume24h: tokenData?.volume24h ?? null,
        volumeToMcapRatio: tokenData?.volumeToMcapRatio ?? null,
        ath: tokenData?.ath ?? null,
        athChangePercentage: tokenData?.athChangePercentage ?? null,
        circulatingSupply: tokenData?.circulatingSupply ?? null,
        maxSupply: tokenData?.maxSupply ?? null,
        totalSupply: tokenData?.totalSupply ?? null,
        fdv: tokenData?.fdv ?? null,
        sentimentUp: tokenData?.sentimentVotesUpPercentage ?? null,
      },
      priceHistory30d: priceHistoryWithSma,
    };

    // 14. Send vizData + meta as final events
    res.write(`data: ${JSON.stringify({ vizData })}\n\n`);
    res.write(`data: ${JSON.stringify({
      meta: {
        reportId,
        sentiment,
        riskLevel,
        tokenData: tokenData ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          price: tokenData.price,
          marketCap: tokenData.marketCap,
        } : null,
      },
    })}\n\n`);

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    logger.error({ err, symbol }, "Research stream error");
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});
