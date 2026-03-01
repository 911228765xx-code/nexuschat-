import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { rateLimitStrict, rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { researchReports, priceAlerts, posts, users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

import { cachedFetch, TTL } from "../utils/coinGeckoCache";
import { sanitizeInput } from "../utils/sanitize";

// ─── CoinGecko Data Fetching ─────────────────────────────────────────────────

async function fetchTokenData(symbol: string) {
  const cacheKey = `token:search:${symbol.toLowerCase()}`;
  const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;

  const searchData = await cachedFetch<any>(
    cacheKey,
    searchUrl,
    TTL.search,
    (res) => res.json(),
  );
  const coin = searchData?.coins?.[0];
  if (!coin) return null;

  const detailCacheKey = `token:detail:${coin.id}`;
  const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`;

  const detail = await cachedFetch<any>(
    detailCacheKey,
    detailUrl,
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
      ? (detail.market_data.total_volume.usd / detail.market_data.market_cap.usd)
      : null,
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

// ─── Global Market Data ────────────────────────────────────────────────────────

interface GlobalMarketData {
  totalMarketCap: number | null;
  totalVolume24h: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  marketCapChange24h: number | null;
  activeCryptocurrencies: number | null;
}

async function fetchGlobalMarketData(): Promise<GlobalMarketData | null> {
  try {
    const data = await cachedFetch<any>(
      "global:market",
      "https://api.coingecko.com/api/v3/global",
      TTL.prices,
      (res) => res.json(),
    );
    if (!data?.data) return null;
    const d = data.data;
    return {
      totalMarketCap: d.total_market_cap?.usd ?? null,
      totalVolume24h: d.total_volume?.usd ?? null,
      btcDominance: d.market_cap_percentage?.btc ?? null,
      ethDominance: d.market_cap_percentage?.eth ?? null,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? null,
      activeCryptocurrencies: d.active_cryptocurrencies ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchFearGreedIndex(): Promise<{ value: number; classification: string } | null> {
  try {
    const data = await cachedFetch<any>(
      "feargreed:index",
      "https://api.alternative.me/fng/?limit=1",
      TTL.prices,
      (res) => res.json(),
    );
    if (!data?.data?.[0]) return null;
    return {
      value: parseInt(data.data[0].value, 10),
      classification: data.data[0].value_classification,
    };
  } catch {
    return null;
  }
}

async function fetchBtcPrice(): Promise<{ price: number; change24h: number } | null> {
  try {
    const data = await cachedFetch<any>(
      "btc:price:report",
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      TTL.prices,
      (res) => res.json(),
    );
    if (!data?.bitcoin) return null;
    return {
      price: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change,
    };
  } catch {
    return null;
  }
}

function buildGlobalContext(global: GlobalMarketData | null, fng: { value: number; classification: string } | null, btc: { price: number; change24h: number } | null): string {
  if (!global && !fng && !btc) return "";
  const lines: string[] = ["\n=== 全球市场环境 ==="];
  if (btc) {
    lines.push(`BTC 价格: $${btc.price.toLocaleString()} (${fmtPct(btc.change24h)})`);
  }
  if (global) {
    if (global.totalMarketCap) lines.push(`加密市场总市值: $${fmtUsd(global.totalMarketCap)} (24h ${fmtPct(global.marketCapChange24h)})`);
    if (global.totalVolume24h) lines.push(`24h 总成交量: $${fmtUsd(global.totalVolume24h)}`);
    if (global.btcDominance) lines.push(`BTC 主导率: ${global.btcDominance.toFixed(1)}%`);
    if (global.ethDominance) lines.push(`ETH 主导率: ${global.ethDominance.toFixed(1)}%`);
    if (global.activeCryptocurrencies) lines.push(`活跃加密货币数量: ${global.activeCryptocurrencies.toLocaleString()}`);
  }
  if (fng) {
    lines.push(`恐惧与贪婪指数: ${fng.value}/100 (${fng.classification})`);
  }
  return lines.join("\n");
}

// ─── Historical Price Trend ───────────────────────────────────────────────────

async function fetchPriceTrend(coinId: string): Promise<string> {
  try {
    // 30-day daily prices
    const data = await cachedFetch<any>(
      `trend:30d:${coinId}`,
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`,
      TTL.chart,
      (res) => res.json(),
    );
    if (!data?.prices || data.prices.length < 5) return "";

    const prices: [number, number][] = data.prices;
    const latest = prices[prices.length - 1][1];
    const weekAgo = prices.length >= 8 ? prices[prices.length - 8][1] : prices[0][1];
    const twoWeeksAgo = prices.length >= 15 ? prices[prices.length - 15][1] : prices[0][1];
    const monthStart = prices[0][1];

    // Calculate simple moving averages
    const last7 = prices.slice(-7).map(p => p[1]);
    const last14 = prices.slice(-14).map(p => p[1]);
    const sma7 = last7.reduce((a, b) => a + b, 0) / last7.length;
    const sma14 = last14.length > 0 ? last14.reduce((a, b) => a + b, 0) / last14.length : sma7;

    // Find 30d high/low
    const allPrices = prices.map(p => p[1]);
    const high30d = Math.max(...allPrices);
    const low30d = Math.min(...allPrices);
    const range = high30d - low30d;
    const positionInRange = range > 0 ? ((latest - low30d) / range * 100).toFixed(0) : "50";

    // Trend determination
    let trend = "震荡";
    if (latest > sma7 && sma7 > sma14) trend = "上升趋势";
    else if (latest < sma7 && sma7 < sma14) trend = "下降趋势";
    else if (latest > sma7 && sma7 < sma14) trend = "反弹初期";
    else if (latest < sma7 && sma7 > sma14) trend = "回调初期";

    return `\n=== 30天价格趋势分析 ===
当前价格: $${latest.toFixed(latest < 1 ? 6 : 2)}
7天前价格: $${weekAgo.toFixed(weekAgo < 1 ? 6 : 2)} (变化 ${fmtPct((latest - weekAgo) / weekAgo * 100)})
14天前价格: $${twoWeeksAgo.toFixed(twoWeeksAgo < 1 ? 6 : 2)} (变化 ${fmtPct((latest - twoWeeksAgo) / twoWeeksAgo * 100)})
30天前价格: $${monthStart.toFixed(monthStart < 1 ? 6 : 2)} (变化 ${fmtPct((latest - monthStart) / monthStart * 100)})
30天最高: $${high30d.toFixed(high30d < 1 ? 6 : 2)}
30天最低: $${low30d.toFixed(low30d < 1 ? 6 : 2)}
当前位置: 在 30天区间的 ${positionInRange}% 位置
7天均线 (SMA7): $${sma7.toFixed(sma7 < 1 ? 6 : 2)}
14天均线 (SMA14): $${sma14.toFixed(sma14 < 1 ? 6 : 2)}
趋势判断: ${trend} (价格 ${latest > sma7 ? "在" : "低于"} SMA7 ${sma7 > sma14 ? "且 SMA7 > SMA14" : "且 SMA7 < SMA14"})`;
  } catch {
    return "";
  }
}

// ─── Market Context Builder ──────────────────────────────────────────────────────

function buildMarketContext(tokenData: NonNullable<Awaited<ReturnType<typeof fetchTokenData>>>) { const athDrop = tokenData.athChangePercentage
    ? `距离ATH下跌 ${Math.abs(tokenData.athChangePercentage).toFixed(1)}%`
    : "N/A";

  const supplyInfo = tokenData.maxSupply
    ? `流通量: ${fmtNum(tokenData.circulatingSupply)} / 最大供应: ${fmtNum(tokenData.maxSupply)} (${((tokenData.circulatingSupply ?? 0) / tokenData.maxSupply * 100).toFixed(1)}% 已释放)`
    : `流通量: ${fmtNum(tokenData.circulatingSupply)} / 总供应: ${fmtNum(tokenData.totalSupply)}`;

  const volumeMcapRatio = tokenData.volumeToMcapRatio
    ? `成交量/市值比: ${(tokenData.volumeToMcapRatio * 100).toFixed(2)}% (${tokenData.volumeToMcapRatio > 0.1 ? "高换手，交易活跃" : tokenData.volumeToMcapRatio > 0.03 ? "正常换手" : "低换手，流动性偏弱"})`
    : "";

  const sentiment = tokenData.sentimentVotesUpPercentage
    ? `社区情绪: ${tokenData.sentimentVotesUpPercentage.toFixed(0)}% 看涨 / ${tokenData.sentimentVotesDownPercentage?.toFixed(0) ?? "N/A"}% 看跌`
    : "";

  return `=== 实时市场数据 ===
代币: ${tokenData.name} (${tokenData.symbol})
当前价格: $${tokenData.price ?? "N/A"}
24h 涨跌: ${fmtPct(tokenData.priceChange24h)}
7d 涨跌: ${fmtPct(tokenData.priceChange7d)}
30d 涨跌: ${fmtPct(tokenData.priceChange30d)}
市值: $${fmtUsd(tokenData.marketCap)} (排名 #${tokenData.marketCapRank ?? "N/A"})
FDV: $${fmtUsd(tokenData.fdv)}
24h 成交量: $${fmtUsd(tokenData.volume24h)}
${volumeMcapRatio}
ATH: $${tokenData.ath ?? "N/A"} (${athDrop})
ATL: $${tokenData.atl ?? "N/A"}
${supplyInfo}
创世日期: ${tokenData.genesisDate ?? "N/A"}
${sentiment}
类别: ${tokenData.categories?.join(", ") ?? "N/A"}
项目简介: ${tokenData.description ?? "暂无"}`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

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
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

function buildQuickPrompt(symbol: string, marketContext: string): string {
  return `你是一位经验丰富的加密货币交易员和分析师，拥有 10 年以上的市场经验。你以敢于表达明确观点著称，不会给出模棱两可的分析。

请基于以下实时数据，对 ${symbol} 进行快速投研分析。

${marketContext}

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

function buildDeepPrompt(symbol: string, marketContext: string): string {
  return `基于实时数据深度研究 ${symbol}。写作规则：每句话必须包含具体数字或明确观点，禁止“值得关注”“需要观察”等废话，用数据说话，直接下结论。

${marketContext}

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

// ─── Sentiment Extraction ────────────────────────────────────────────────────

function extractSentiment(content: string): "bullish" | "bearish" | "neutral" {
  const bullishSignals = [
    "看多", "看涨", "利好", "强烈看多", "积极", "上升趋势",
    "建议买入", "建议建仓", "突破", "评分：7", "评分：8", "评分：9", "评分：10",
    "评分: 7", "评分: 8", "评分: 9", "评分: 10",
    "7/10", "8/10", "9/10", "10/10",
  ];
  const bearishSignals = [
    "看空", "看跌", "利空", "强烈看空", "下跌趋势", "建议卖出",
    "建议减仓", "建议回避", "评分：1", "评分：2", "评分：3",
    "评分: 1", "评分: 2", "评分: 3",
    "1/10", "2/10", "3/10",
  ];

  let bullScore = 0;
  let bearScore = 0;

  for (const signal of bullishSignals) {
    if (content.includes(signal)) bullScore++;
  }
  for (const signal of bearishSignals) {
    if (content.includes(signal)) bearScore++;
  }

  if (bullScore > bearScore + 1) return "bullish";
  if (bearScore > bullScore + 1) return "bearish";
  return "neutral";
}

function extractRiskLevel(content: string): "low" | "medium" | "high" {
  const highRiskSignals = ["高风险", "风险极高", "风险较大", "强烈警惕", "建议回避"];
  const lowRiskSignals = ["低风险", "风险较低", "相对安全", "蓝筹"];

  for (const signal of highRiskSignals) {
    if (content.includes(signal)) return "high";
  }
  for (const signal of lowRiskSignals) {
    if (content.includes(signal)) return "low";
  }
  return "medium";
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const researchRouter = router({
  // Generate AI research report (supports quick / deep modes)
  generate: protectedProcedure
    .use(rateLimitStrict)
    .input(z.object({
      tokenSymbol: z.string().min(1).max(20),
      contractAddress: z.string().optional(),
      chain: z.string().default("BSC"),
      mode: z.enum(["quick", "deep"]).default("deep"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch real market data (token-specific)
      const tokenData = await fetchTokenData(input.tokenSymbol);

      let marketContext = tokenData
        ? buildMarketContext(tokenData)
        : `=== 市场数据 ===\n代币符号: ${input.tokenSymbol.toUpperCase()}\n链: ${input.chain}\n（无法获取实时数据，请基于你的专业知识进行分析，但需明确标注数据缺失）`;

      // For Deep mode, fetch additional data dimensions in parallel
      if (input.mode === "deep") {
        const coinId = tokenData ? (await cachedFetch<any>(
          `token:search:${input.tokenSymbol.toLowerCase()}`,
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(input.tokenSymbol)}`,
          TTL.search,
          (res) => res.json(),
        ))?.coins?.[0]?.id : null;

        const [globalData, fngData, btcData, priceTrend] = await Promise.all([
          fetchGlobalMarketData(),
          fetchFearGreedIndex(),
          fetchBtcPrice(),
          coinId ? fetchPriceTrend(coinId) : Promise.resolve(""),
        ]);

        // Append global market context
        const globalContext = buildGlobalContext(globalData, fngData, btcData);
        if (globalContext) marketContext += "\n" + globalContext;

        // Append price trend analysis
        if (priceTrend) marketContext += "\n" + priceTrend;
      } else {
        // Quick mode: fetch Fear & Greed only (lightweight)
        const fngData = await fetchFearGreedIndex();
        if (fngData) {
          marketContext += `\n\n恐惧与贪婪指数: ${fngData.value}/100 (${fngData.classification})`;
        }
      }

      const symbol = input.tokenSymbol.toUpperCase();
      const prompt = input.mode === "quick"
        ? buildQuickPrompt(symbol, marketContext)
        : buildDeepPrompt(symbol, marketContext);

      const systemMessage = input.mode === "quick"
        ? "你是加密货币交易员。规则：1)每句话必须有具体数字或明确观点 2)禁止套话废话，如“值得关注”“需要观察” 3)直接下结论，不要模棱两可 4)用数据说话。回复使用中文。"
        : "你是加密货币首席分析师。规则：1)每句话必须含具体数字 2)禁止“值得关注”“需要观察”“不容忽视”等废话 3)直接下结论，用数据说话 4)语言精练，信息密度最大化。回复使用中文。";

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system" as const, content: systemMessage },
          { role: "user" as const, content: prompt },
        ],
      });

      const rawContent = llmResponse.choices[0]?.message?.content;
      const reportContent: string = typeof rawContent === "string"
        ? rawContent
        : (Array.isArray(rawContent)
          ? rawContent.map((c: any) => c.text ?? "").join("")
          : "报告生成失败，请重试。");

      const sentiment = extractSentiment(reportContent);
      const riskLevel = extractRiskLevel(reportContent);

      // Extract AI score from report content (e.g., "评分: 7/10" or "7/10")
      const scoreMatch = reportContent.match(/(\d+)\s*\/\s*10/);
      const aiScore = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5;

      const [result] = await db.insert(researchReports).values({
        userId: ctx.user.id,
        tokenSymbol: symbol,
        tokenName: tokenData?.name ?? undefined,
        contractAddress: input.contractAddress ?? undefined,
        chain: input.chain,
        reportContent,
        priceAtReport: tokenData?.price?.toString() ?? undefined,
        marketCapAtReport: tokenData?.marketCap?.toString() ?? undefined,
        sentiment: sentiment,
        riskLevel: riskLevel,
        nxcCost: input.mode === "quick" ? 5 : 10,
      });

      // Build structured visualization data for frontend
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
      };

      return {
        reportId: (result as any).insertId,
        reportContent,
        tokenData,
        sentiment,
        riskLevel,
        mode: input.mode,
        vizData,
      };
    }),

  // List user's reports
  myReports: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(researchReports)
        .where(eq(researchReports.userId, ctx.user.id))
        .orderBy(desc(researchReports.createdAt))
        .limit(input?.limit ?? 10);
    }),

  // Get a single report
  getReport: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(researchReports)
        .where(eq(researchReports.id, input.reportId))
        .limit(1);
      return result[0] ?? null;
    }),

  // Price alerts
  createAlert: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({
      tokenSymbol: z.string().max(20),
      tokenId: z.string().max(100),
      targetPrice: z.string().max(30),
      condition: z.enum(["above", "below"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(priceAlerts).values({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  myAlerts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, ctx.user.id))
      .orderBy(desc(priceAlerts.createdAt));
  }),

  // Get user's research report history
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(researchReports)
        .where(eq(researchReports.userId, ctx.user.id))
        .orderBy(desc(researchReports.createdAt))
        .limit(input?.limit ?? 20);
    }),

  // Fetch live price from CoinGecko (public)
  getPrice: publicProcedure
    .input(z.object({ symbol: z.string().max(20) }))
    .query(async ({ input }) => {
      return fetchTokenData(input.symbol);
    }),

  // ─── Share report to community feed ─────────────────────────────────────
  shareToFeed: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [report] = await db
        .select()
        .from(researchReports)
        .where(eq(researchReports.id, input.reportId))
        .limit(1);

      if (!report) throw new Error("Report not found");
      if (report.userId !== ctx.user.id) throw new Error("Not authorized");

      const sentimentEmoji = report.sentiment === "bullish" ? "\ud83d\udfe2" : report.sentiment === "bearish" ? "\ud83d\udd34" : "\ud83d\udfe1";
      const sentimentLabel = report.sentiment === "bullish" ? "\u770b\u591a" : report.sentiment === "bearish" ? "\u770b\u7a7a" : "\u4e2d\u6027";
      const riskLabel = report.riskLevel === "low" ? "\u4f4e\u98ce\u9669" : report.riskLevel === "high" ? "\u9ad8\u98ce\u9669" : "\u4e2d\u98ce\u9669";

      const scoreMatch = report.reportContent.match(/(\d+)\s*\/\s*10/);
      const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

      const lines = report.reportContent.split("\n").filter((l: string) => l.trim() && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("---") && !l.startsWith("*Nexus"));
      const summaryLine = lines.find((l: string) => l.length > 30) ?? `${report.tokenSymbol} \u6295\u7814\u62a5\u544a`;
      const summary = summaryLine.replace(/\*\*/g, "").slice(0, 150);

      const userComment = input.comment?.trim() ? `${sanitizeInput(input.comment.trim(), 500)}\n\n` : "";
      const fmtMcap = (v: number | null) => {
        if (!v) return "N/A";
        if (v > 1e9) return (v / 1e9).toFixed(1) + "B";
        if (v > 1e6) return (v / 1e6).toFixed(1) + "M";
        return v.toString();
      };
      const postContent = `${userComment}\ud83d\udcca AI \u6295\u7814\u62a5\u544a | ${report.tokenSymbol} ${sentimentEmoji} ${sentimentLabel}\n\n${summary}${summary.length >= 150 ? "..." : ""}\n\n\ud83d\udcb0 \u62a5\u544a\u4ef7\u683c: $${report.priceAtReport ?? "N/A"} | \ud83d\udcc8 \u5e02\u503c: $${fmtMcap(Number(report.marketCapAtReport) || null)} | \u26a0\ufe0f ${riskLabel}${aiScore ? ` | \ud83c\udfaf \u8bc4\u5206: ${aiScore}/10` : ""}`;

      const tags = JSON.stringify(["\u6295\u7814\u62a5\u544a", report.tokenSymbol, sentimentLabel]);

      const [result] = await db.insert(posts).values({
        authorId: ctx.user.id,
        content: postContent,
        tags,
        reportId: input.reportId,
        aiScore: aiScore,
      });

      return {
        postId: (result as any).insertId as number,
        success: true,
      };
    }),

  // ─── Get report by ID (public, for viewing shared reports) ─────────────
  getReportPublic: publicProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [report] = await db
        .select({
          id: researchReports.id,
          tokenSymbol: researchReports.tokenSymbol,
          tokenName: researchReports.tokenName,
          reportContent: researchReports.reportContent,
          priceAtReport: researchReports.priceAtReport,
          marketCapAtReport: researchReports.marketCapAtReport,
          sentiment: researchReports.sentiment,
          riskLevel: researchReports.riskLevel,
          createdAt: researchReports.createdAt,
          authorName: users.name,
          authorAvatar: users.avatar,
        })
        .from(researchReports)
        .leftJoin(users, eq(researchReports.userId, users.id))
        .where(eq(researchReports.id, input.reportId))
        .limit(1);
      return report ?? null;
    }),
});
