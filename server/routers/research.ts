import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { rateLimitStrict, rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { researchReports, priceAlerts, posts, users } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

import { cachedFetch, TTL } from "../utils/coinGeckoCache";
import { sanitizeInput } from "../utils/sanitize";
import { awardTaskEvent } from "./user";

// ─── CoinGecko Data Fetching ─────────────────────────────────────────────────

export async function fetchTokenData(symbol: string) {
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

// ─── Market Context Builder ──────────────────────────────────────────────────

function buildMarketContext(tokenData: NonNullable<Awaited<ReturnType<typeof fetchTokenData>>>) {
  const athDrop = tokenData.athChangePercentage
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
  return `你是一位顶级加密货币研究机构的首席分析师，以深度、独立、有观点的研究报告著称。你的报告风格类似 Messari、Delphi Digital 的专业研报——数据驱动、逻辑严密、观点鲜明。

请基于以下实时数据，对 ${symbol} 进行全面深度研究，生成一份机构级投研报告。

${marketContext}

**输出要求（Markdown 格式，约 1000-1200 字）：**

## 📋 ${symbol} 深度投研报告

### 🎯 投资论点（Investment Thesis）
用 2-3 句话概括你的**核心投资论点**。明确表态：当前阶段你对该代币是看多、看空还是观望，以及最核心的理由。给出一个 1-10 的**综合评分**（1=强烈看空，5=中性，10=强烈看多）。

### 📊 基本面分析
- **项目定位与竞争格局**：该项目在其赛道中的位置，主要竞争对手对比
- **代币经济学评估**：供应机制、通胀/通缩模型、代币释放节奏对价格的影响
- **估值分析**：当前市值/FDV 是否合理，与同赛道项目的估值对比

### 📈 技术面与市场结构
- **价格趋势**：基于 24h/7d/30d 涨跌幅判断当前处于什么阶段（积累/上升/分配/下跌）
- **成交量分析**：量价关系是否健康，是否有异常放量/缩量
- **关键价位**：明确给出支撑位和阻力位（用具体数字）

### 🔗 链上与情绪分析
- **社区情绪**：基于投票数据和市场表现判断市场情绪
- **筹码分布推断**：基于供应量数据推断大户持仓情况
- **催化剂追踪**：近期可能影响价格的事件或升级

### 🧭 投研策略

**明确给出以下操作建议：**

| 维度 | 判断 | 具体建议 |
|------|------|----------|
| 短线（1-7天） | 方向 + 置信度 | 入场价位 / 止损 / 目标价 |
| 中线（1-3月） | 方向 + 置信度 | 建仓策略 / 关注催化剂 |
| 长线（6月+） | 方向 + 置信度 | 配置建议 / 关键里程碑 |

**仓位建议**：根据风险评估给出建议仓位占比（如：总仓位的 X%）

### ⚠️ 风险矩阵

| 风险类型 | 风险描述 | 发生概率 | 影响程度 |
|----------|----------|----------|----------|
| 市场风险 | ... | 高/中/低 | 高/中/低 |
| 项目风险 | ... | 高/中/低 | 高/中/低 |
| 监管风险 | ... | 高/中/低 | 高/中/低 |

### 💡 总结
用 2-3 句话总结你的核心观点和最重要的行动建议。

---
*NexusChat AI 研究助手 | 数据来源: CoinGecko | 本报告基于公开数据的 AI 深度分析，仅供研究参考，不构成投资建议。加密货币市场波动剧烈，请根据自身风险承受能力做出决策。*`;
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

      // Fetch real market data
      const tokenData = await fetchTokenData(input.tokenSymbol);

      const marketContext = tokenData
        ? buildMarketContext(tokenData)
        : `=== 市场数据 ===\n代币符号: ${input.tokenSymbol.toUpperCase()}\n链: ${input.chain}\n（无法获取实时数据，请基于你的专业知识进行分析，但需明确标注数据缺失）`;

      const symbol = input.tokenSymbol.toUpperCase();
      const prompt = input.mode === "quick"
        ? buildQuickPrompt(symbol, marketContext)
        : buildDeepPrompt(symbol, marketContext);

      const systemMessage = input.mode === "quick"
        ? "你是一位经验丰富的加密货币交易员，擅长快速研判市场机会。你的分析风格直接、果断，不回避给出明确方向。回复使用中文。"
        : "你是一位顶级加密货币研究机构的首席分析师，擅长多维度深度分析。你的报告以数据驱动、逻辑严密、观点鲜明著称。回复使用中文。";

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

      // NP 产出：生成 AI 投研报告（每日上限内）
      void awardTaskEvent(db, ctx.user.id, "research_daily");

      return {
        reportId: (result as any).insertId,
        reportContent,
        tokenData,
        sentiment,
        riskLevel,
        mode: input.mode,
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
      // Scope to the owner — reports may contain private analysis and payment data.
      const result = await db
        .select()
        .from(researchReports)
        .where(and(eq(researchReports.id, input.reportId), eq(researchReports.userId, ctx.user.id)))
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
