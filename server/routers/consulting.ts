/**
 * AI Consulting Center Router
 * Handles paid AI consulting reports with BSC USDT payment verification
 *
 * Flow:
 * 1. User submits query → createReport (returns reportId + summary preview)
 * 2. User pays 10 USDT on BSC → submitPayment (stores txHash)
 * 3. Backend polls BSC for confirmation → verifyPayment
 * 4. After confirmation → generateFullReport (AI generates deep analysis)
 * 5. User views full report → getReport
 */

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { consultingReports, consultingPayments } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

// BSC USDT contract address
const USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955";
// Receiving wallet address
const RECEIVING_ADDRESS = "0x15aD376E5B9D7275B143d0398ccF8a5c499cc72B";
// Required payment amount (10 USDT in wei, 18 decimals)
const REQUIRED_USDT_AMOUNT = BigInt("10000000000000000000"); // 10 USDT

// ─── BSC Chain Verification ───────────────────────────────────────────────────
async function verifyBscUsdtPayment(
  txHash: string,
  fromAddress: string
): Promise<{ confirmed: boolean; amount?: string; error?: string }> {
  try {
    // Use BSCScan API to verify the transaction
    const apiUrl = `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=YourApiKeyToken`;
    const txUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=YourApiKeyToken`;

    const [statusRes, txRes] = await Promise.all([
      fetch(apiUrl, { signal: AbortSignal.timeout(10000) }),
      fetch(txUrl, { signal: AbortSignal.timeout(10000) }),
    ]);

    const statusData = await statusRes.json();
    const txData = await txRes.json();

    // Check if transaction is confirmed (status = 1)
    if (statusData.result?.status !== "1") {
      return { confirmed: false, error: "Transaction not confirmed yet" };
    }

    const tx = txData.result;
    if (!tx) return { confirmed: false, error: "Transaction not found" };

    // Verify it's a USDT transfer to our address
    // ERC-20 transfer method ID: 0xa9059cbb
    const methodId = tx.input?.slice(0, 10);
    if (methodId !== "0xa9059cbb") {
      return { confirmed: false, error: "Not a token transfer" };
    }

    // Verify contract address (USDT on BSC)
    if (tx.to?.toLowerCase() !== USDT_CONTRACT_BSC.toLowerCase()) {
      return { confirmed: false, error: "Not USDT contract" };
    }

    // Decode transfer data: to address (32 bytes) + amount (32 bytes)
    const inputData = tx.input.slice(10);
    const toAddressHex = inputData.slice(24, 64); // skip 12 bytes padding
    const amountHex = inputData.slice(64, 128);

    const toAddress = "0x" + toAddressHex;
    const amount = BigInt("0x" + amountHex);

    // Verify recipient is our receiving address
    if (toAddress.toLowerCase() !== RECEIVING_ADDRESS.toLowerCase()) {
      return { confirmed: false, error: "Wrong recipient address" };
    }

    // Verify amount >= 10 USDT
    if (amount < REQUIRED_USDT_AMOUNT) {
      return {
        confirmed: false,
        error: `Insufficient amount: ${(Number(amount) / 1e18).toFixed(2)} USDT`,
      };
    }

    return {
      confirmed: true,
      amount: (Number(amount) / 1e18).toFixed(2),
    };
  } catch (err) {
    console.error("[BSC Verify] Error:", err);
    return { confirmed: false, error: "Network error during verification" };
  }
}

// ─── AI Report Generation ─────────────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  project: `你是一位顶级加密货币项目分析师，拥有丰富的区块链投研经验。
请对用户提供的加密项目进行全面深入的分析，包括：
1. 项目概述与核心价值主张
2. 技术架构分析（共识机制、扩展性、安全性）
3. 代币经济学分析（供应量、分配、通胀/通缩机制）
4. 团队背景与执行能力评估
5. 竞争格局分析（主要竞争对手、差异化优势）
6. 链上数据分析（TVL、活跃地址、交易量趋势）
7. 风险因素识别（技术风险、市场风险、监管风险）
8. 投资评级与目标价位预测（6个月/12个月）
9. 操作建议（入场时机、仓位管理、止损策略）

请以专业投研报告格式输出，数据翔实，逻辑严谨，给出明确的可执行建议。`,

  security: `你是一位资深区块链安全审计专家，专注于智能合约漏洞分析和DeFi安全评估。
请对用户提供的项目进行全面的安全审计分析，包括：
1. 智能合约代码安全评估
2. 常见漏洞检查（重入攻击、整数溢出、权限控制、闪电贷攻击等）
3. 合约升级机制与中心化风险
4. 多签钱包与治理安全
5. 预言机操纵风险
6. 流动性风险与退出流动性分析
7. 历史安全事件回顾（如有）
8. 第三方审计报告评估
9. 安全评分（1-10分）与风险等级
10. 安全改进建议

请以专业安全审计报告格式输出，标注每个风险点的严重程度（Critical/High/Medium/Low）。`,

  market: `你是一位顶级加密货币市场分析师，擅长技术分析、链上数据分析和宏观市场研判。
请对用户提供的加密资产进行全面的市场分析，包括：
1. 当前市场结构分析（支撑位/阻力位、趋势判断）
2. 技术指标综合分析（MA、RSI、MACD、布林带、成交量）
3. 链上数据分析（持仓分布、大户动向、交易所净流入/流出）
4. 市场情绪分析（恐贪指数、社交媒体热度、期货未平仓量）
5. 宏观环境影响（BTC相关性、美联储政策、监管动态）
6. 主力资金动向分析
7. 短期（1-2周）、中期（1-3个月）、长期（6-12个月）走势预判
8. 关键价格节点与交易策略
9. 风险提示与仓位管理建议

请以专业市场分析报告格式输出，结合具体数据和图表描述，给出清晰的交易策略。`,
};

async function generateSummary(queryType: string, queryText: string): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[queryType] || SYSTEM_PROMPTS.project;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `请对以下内容进行分析，先给出一个200字以内的摘要预览（不包含完整分析）：\n\n${queryText}`,
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  return (typeof content === 'string' ? content : null) || "正在生成摘要...";
}

async function generateFullReport(queryType: string, queryText: string): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[queryType] || SYSTEM_PROMPTS.project;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: queryText,
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  return (typeof content === 'string' ? content : null) || "报告生成失败，请联系客服。";
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const consultingRouter = router({
  /**
   * Step 1: Create a consulting report request and generate a free summary preview
   * Returns: reportId, summary (free preview)
   */
  createReport: protectedProcedure
    .input(
      z.object({
        queryType: z.enum(["project", "security", "market"]),
        queryText: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      // Generate a cache key to prevent duplicate reports
      const cacheKey = `${ctx.user.id}:${input.queryType}:${input.queryText.slice(0, 100)}`;

      // Check for existing pending/completed report with same query
      const [existing] = await db
        .select()
        .from(consultingReports)
        .where(eq(consultingReports.cacheKey, cacheKey))
        .limit(1);

      if (existing && existing.status !== "failed") {
        return {
          reportId: existing.id,
          summary: existing.summary || "摘要生成中...",
          status: existing.status,
          isExisting: true,
        };
      }

      // Generate free summary preview
      let summary = "";
      try {
        summary = await generateSummary(input.queryType, input.queryText);
      } catch (err) {
        console.error("[Consulting] Summary generation failed:", err);
        summary = `正在分析 ${input.queryText.slice(0, 50)}... 支付后将为您生成完整的专业报告。`;
      }

      // Create report record
      const [result] = await db.insert(consultingReports).values({
        userId: ctx.user.id,
        queryType: input.queryType,
        queryText: input.queryText,
        summary,
        status: "pending_payment",
        cacheKey,
      });

      const reportId = (result as any).insertId as number;

      return {
        reportId,
        summary,
        status: "pending_payment" as const,
        isExisting: false,
      };
    }),

  /**
   * Step 2: User submits their wallet address and txHash after paying
   */
  submitPayment: protectedProcedure
    .input(
      z.object({
        reportId: z.number(),
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      // Verify the report belongs to this user
      const [report] = await db
        .select()
        .from(consultingReports)
        .where(and(eq(consultingReports.id, input.reportId), eq(consultingReports.userId, ctx.user.id)))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "报告不存在" });
      }

      if (report.status === "completed") {
        return { success: true, message: "报告已完成" };
      }

      // Check if txHash already used
      const [existingPayment] = await db
        .select()
        .from(consultingPayments)
        .where(eq(consultingPayments.txHash, input.txHash))
        .limit(1);

      if (existingPayment) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该交易哈希已被使用" });
      }

      // Create payment record
      await db.insert(consultingPayments).values({
        reportId: input.reportId,
        userId: ctx.user.id,
        walletAddress: input.walletAddress,
        txHash: input.txHash,
        amount: "10",
        chain: "BSC",
        status: "pending",
      });

      // Update report with txHash
      await db
        .update(consultingReports)
        .set({ txHash: input.txHash, status: "generating" })
        .where(eq(consultingReports.id, input.reportId));

      // Trigger async verification and report generation
      // We don't await this - it runs in background
      verifyAndGenerateReport(input.reportId, input.txHash, input.walletAddress, ctx.user.id).catch(
        (err) => console.error("[Consulting] Background generation failed:", err)
      );

      return { success: true, message: "支付已提交，正在验证交易..." };
    }),

  /**
   * Poll payment and report status
   */
  getStatus: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const [report] = await db
        .select()
        .from(consultingReports)
        .where(and(eq(consultingReports.id, input.reportId), eq(consultingReports.userId, ctx.user.id)))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "报告不存在" });
      }

      return {
        reportId: report.id,
        status: report.status,
        queryType: report.queryType,
        queryText: report.queryText,
        summary: report.summary,
        txHash: report.txHash,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };
    }),

  /**
   * Get full report (only available after payment confirmed)
   */
  getFullReport: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const [report] = await db
        .select()
        .from(consultingReports)
        .where(and(eq(consultingReports.id, input.reportId), eq(consultingReports.userId, ctx.user.id)))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "报告不存在" });
      }

      if (report.status !== "completed") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: report.status === "pending_payment" ? "请先完成支付" : "报告正在生成中，请稍候",
        });
      }

      return {
        reportId: report.id,
        queryType: report.queryType,
        queryText: report.queryText,
        summary: report.summary,
        fullContent: report.fullContent,
        txHash: report.txHash,
        createdAt: report.createdAt,
      };
    }),

  /**
   * Get user's consulting history
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: consultingReports.id,
          queryType: consultingReports.queryType,
          queryText: consultingReports.queryText,
          summary: consultingReports.summary,
          status: consultingReports.status,
          txHash: consultingReports.txHash,
          createdAt: consultingReports.createdAt,
        })
        .from(consultingReports)
        .where(eq(consultingReports.userId, ctx.user.id))
        .orderBy(desc(consultingReports.createdAt))
        .limit(input?.limit ?? 20);
    }),

  /**
   * Manually retry payment verification (for cases where auto-verify failed)
   */
  retryVerification: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const [report] = await db
        .select()
        .from(consultingReports)
        .where(and(eq(consultingReports.id, input.reportId), eq(consultingReports.userId, ctx.user.id)))
        .limit(1);

      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "报告不存在" });
      if (!report.txHash) throw new TRPCError({ code: "BAD_REQUEST", message: "尚未提交交易哈希" });
      if (report.status === "completed") return { success: true, message: "报告已完成" };

      // Get payment record
      const [payment] = await db
        .select()
        .from(consultingPayments)
        .where(eq(consultingPayments.reportId, input.reportId))
        .limit(1);

      const walletAddress = payment?.walletAddress || "unknown";

      // Trigger background verification
      verifyAndGenerateReport(input.reportId, report.txHash, walletAddress, ctx.user.id).catch(
        (err) => console.error("[Consulting] Retry verification failed:", err)
      );

      return { success: true, message: "已重新提交验证，请等待..." };
    }),
});

// ─── Background: Verify Payment + Generate Report ────────────────────────────
async function verifyAndGenerateReport(
  reportId: number,
  txHash: string,
  walletAddress: string,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const MAX_RETRIES = 12; // Try for ~1 minute (12 * 5s)
  let retries = 0;

  while (retries < MAX_RETRIES) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    try {
      const result = await verifyBscUsdtPayment(txHash, walletAddress);

      if (result.confirmed) {
        // Update payment record
        await db
          .update(consultingPayments)
          .set({ status: "confirmed", confirmedAt: new Date() })
          .where(eq(consultingPayments.txHash, txHash));

        // Get report details
        const [report] = await db
          .select()
          .from(consultingReports)
          .where(eq(consultingReports.id, reportId))
          .limit(1);

        if (!report) return;

        // Generate full AI report
        try {
          const fullContent = await generateFullReport(report.queryType, report.queryText);

          await db
            .update(consultingReports)
            .set({ status: "completed", fullContent, updatedAt: new Date() })
            .where(eq(consultingReports.id, reportId));

          console.log(`[Consulting] Report ${reportId} completed for user ${userId}`);
        } catch (aiErr) {
          console.error(`[Consulting] AI generation failed for report ${reportId}:`, aiErr);
          await db
            .update(consultingReports)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(consultingReports.id, reportId));
        }
        return;
      }

      console.log(`[Consulting] Payment not confirmed yet (attempt ${retries + 1}): ${result.error}`);
    } catch (err) {
      console.error(`[Consulting] Verification error (attempt ${retries + 1}):`, err);
    }

    retries++;
  }

  // After max retries, mark as failed
  console.error(`[Consulting] Payment verification timed out for report ${reportId}`);
  await db
    .update(consultingReports)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(consultingReports.id, reportId));

  await db
    .update(consultingPayments)
    .set({ status: "failed" })
    .where(eq(consultingPayments.txHash, txHash));
}
