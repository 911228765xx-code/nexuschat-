import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { researchReports, priceAlerts } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Fetch token data from CoinGecko (free API)
async function fetchTokenData(symbol: string) {
  try {
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`
    );
    const searchData = await searchRes.json() as any;
    const coin = searchData.coins?.[0];
    if (!coin) return null;

    const detailRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    const detail = await detailRes.json() as any;
    return {
      id: coin.id,
      name: detail.name,
      symbol: detail.symbol?.toUpperCase(),
      price: detail.market_data?.current_price?.usd,
      priceChange24h: detail.market_data?.price_change_percentage_24h,
      marketCap: detail.market_data?.market_cap?.usd,
      volume24h: detail.market_data?.total_volume?.usd,
      ath: detail.market_data?.ath?.usd,
      description: detail.description?.en?.slice(0, 500),
      categories: detail.categories?.slice(0, 3),
    };
  } catch (e) {
    console.error("CoinGecko fetch error:", e);
    return null;
  }
}

export const researchRouter = router({
  // Generate AI research report
  generate: protectedProcedure
    .input(z.object({
      tokenSymbol: z.string().min(1).max(20),
      contractAddress: z.string().optional(),
      chain: z.string().default("BSC"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch real market data
      const tokenData = await fetchTokenData(input.tokenSymbol);

      const marketContext = tokenData
        ? `当前价格: $${tokenData.price ?? "N/A"}
24h涨跌: ${tokenData.priceChange24h?.toFixed(2) ?? "N/A"}%
市值: $${tokenData.marketCap ? (tokenData.marketCap / 1e6).toFixed(2) + "M" : "N/A"}
24h成交量: $${tokenData.volume24h ? (tokenData.volume24h / 1e6).toFixed(2) + "M" : "N/A"}
历史最高: $${tokenData.ath ?? "N/A"}
项目描述: ${tokenData.description ?? "暂无"}
类别: ${tokenData.categories?.join(", ") ?? "N/A"}`
        : `代币符号: ${input.tokenSymbol}\n链: ${input.chain}\n（无法获取实时数据，基于通用分析）`;

      const prompt = `你是一位专业的加密货币研究分析师。请对以下代币进行深度研究分析，生成一份专业的投资研究报告。

代币: ${input.tokenSymbol.toUpperCase()}
${input.contractAddress ? `合约地址: ${input.contractAddress}` : ""}
${marketContext}

请按以下结构生成 Markdown 格式的研究报告（约800字）：

## 📊 基本信息
（代币基本数据汇总）

## 🔍 项目分析
（项目背景、技术特点、应用场景）

## 📈 市场表现
（价格走势分析、成交量、市值排名）

## ⚠️ 风险评估
（主要风险因素，1-5分风险评级）

## 💡 投资建议
（综合评估，明确说明这不构成投资建议）

## 🎯 关键指标
（关键数据总结）

请保持客观专业，数据准确，并在最后注明"本报告仅供参考，不构成投资建议"。`;

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system" as const, content: "你是专业的加密货币研究分析师，擅长技术分析和基本面分析。" },
          { role: "user" as const, content: prompt },
        ],
      });

      const rawContent = llmResponse.choices[0]?.message?.content;
      const reportContent: string = typeof rawContent === "string" ? rawContent : (Array.isArray(rawContent) ? rawContent.map((c: any) => c.text ?? "").join("") : "报告生成失败，请重试。");

      // Determine sentiment from content
      const sentiment = reportContent.includes("看涨") || reportContent.includes("利好")
        ? "bullish"
        : reportContent.includes("看跌") || reportContent.includes("风险较高")
        ? "bearish"
        : "neutral";

      const riskLevel = reportContent.includes("高风险") ? "high"
        : reportContent.includes("低风险") ? "low"
        : "medium";

      const [result] = await db.insert(researchReports).values({
        userId: ctx.user.id,
        tokenSymbol: input.tokenSymbol.toUpperCase(),
        tokenName: tokenData?.name ?? undefined,
        contractAddress: input.contractAddress ?? undefined,
        chain: input.chain,
        reportContent,
        priceAtReport: tokenData?.price?.toString() ?? undefined,
        marketCapAtReport: tokenData?.marketCap?.toString() ?? undefined,
        sentiment: sentiment as "bullish" | "neutral" | "bearish",
        riskLevel: riskLevel as "low" | "medium" | "high",
        nxcCost: 10,
      });

      return {
        reportId: (result as any).insertId,
        reportContent,
        tokenData,
        sentiment,
        riskLevel,
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
    .input(z.object({
      tokenSymbol: z.string(),
      tokenId: z.string(),
      targetPrice: z.string(),
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

  // Fetch live price from CoinGecko (public)
  getPrice: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      return fetchTokenData(input.symbol);
    }),
});
