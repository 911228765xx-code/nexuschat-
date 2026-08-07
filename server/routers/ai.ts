import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { invokeLLM, type Tool, type Message } from "../_core/llm";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { userWatchlist, priceAlerts, users, appConfig, consultingReports, aiDailyUsage } from "../../drizzle/schema";
import { fetchTokenData } from "./research";
import { spendNN, grantNN } from "../token";
import { getBenefits } from "../membership";

type AiDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
async function getAiUsedToday(db: AiDb, userId: number): Promise<number> {
  const [r] = await db.select({ c: aiDailyUsage.count }).from(aiDailyUsage)
    .where(and(eq(aiDailyUsage.userId, userId), eq(aiDailyUsage.day, todayStr()))).limit(1);
  return Number(r?.c ?? 0);
}
async function incrAiUsedToday(db: AiDb, userId: number): Promise<void> {
  const day = todayStr();
  const res: any = await db.update(aiDailyUsage).set({ count: sql`${aiDailyUsage.count} + 1` })
    .where(and(eq(aiDailyUsage.userId, userId), eq(aiDailyUsage.day, day)));
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
  if (!affected) { try { await db.insert(aiDailyUsage).values({ userId, day, count: 1 }); } catch { /* race */ } }
}

// AI 付费研报类型目录（AI 计价）
const REPORT_TYPES = [
  { key: "project" as const, name: "项目尽调报告", icon: "cube", priceNN: 50, desc: "对 Web3 项目做基本面 / 团队 / 代币 / 风险尽调", placeholder: "输入项目名称或官网 / 合约，如 Arbitrum" },
  { key: "security" as const, name: "合约安全速评", icon: "shield-checkmark", priceNN: 80, desc: "对智能合约 / 代币做安全风险速评（非正式审计）", placeholder: "输入合约地址或项目名" },
  { key: "market" as const, name: "赛道行情研判", icon: "trending-up", priceNN: 60, desc: "对某个赛道 / 币种做行情与趋势研判", placeholder: "输入赛道或币种，如 RWA、Solana 生态" },
];
function getReportType(key: string) { return REPORT_TYPES.find((t) => t.key === key); }

function buildReportPrompt(queryType: string, queryText: string): Message[] {
  const role = queryType === "security"
    ? "你是资深智能合约安全研究员"
    : queryType === "market"
    ? "你是资深加密市场分析师"
    : "你是资深 Web3 项目尽调分析师";
  const ask = queryType === "security"
    ? "围绕：合约/代币概况、常见风险点(权限/增发/蜜罐/可暂停等)、可疑信号、风险等级、给散户的注意事项"
    : queryType === "market"
    ? "围绕：赛道/标的概况、当前市场情绪与资金面、主要叙事与催化、风险、关注要点"
    : "围绕：项目概况、团队与背景、代币经济、产品与进展、竞品、亮点与风险、结论";
  return [
    {
      role: "system",
      content: `${role}。请基于公开认知生成一份中文研究报告，结构清晰、客观专业，使用 Markdown 小标题。${ask}。不得编造精确数字或承诺收益。报告末尾必须加一行风险提示：本报告由 AI 生成，仅供参考，不构成任何投资建议。\n\n输出格式严格为：\n【摘要】用一句话(40字内)概括结论\n【正文】\n(Markdown 正文)`,
    },
    { role: "user", content: `请针对「${queryText}」生成${getReportType(queryType)?.name ?? "研究报告"}。` },
  ];
}

// 与 AI 助手对话每次消耗的 AC 积分（默认值，可在 app_config 后台配置覆盖）
const DEFAULT_AI_CHAT_COST = 10; // AI/次（免费额度用完后）
let _costCache: { value: number; at: number } | null = null;

// 读取当前 AI 单价（app_config.aiChatCost），带 60s 内存缓存
async function getAiChatCost(): Promise<number> {
  if (_costCache && Date.now() - _costCache.at < 60_000) return _costCache.value;
  let value = DEFAULT_AI_CHAT_COST;
  try {
    const db = await getDb();
    if (db) {
      const [row] = await db.select({ cost: appConfig.aiChatCost }).from(appConfig).where(eq(appConfig.platform, "all")).limit(1);
      if (row && Number.isFinite(Number(row.cost))) value = Math.max(0, Number(row.cost));
    }
  } catch {
    // 用默认值
  }
  _costCache = { value, at: Date.now() };
  return value;
}

const SYSTEM_PROMPT = `你是 NexusChat 的 AI 分析助手「Nexus」，专注加密货币 / Web3：行情研判、项目分析、链上与宏观、风险提示、操作思路。

你具备工具能力，可以：查询代币实时行情(get_token_price)、读取用户自选(get_watchlist)、把代币加入自选(add_to_watchlist)、设置到价提醒(set_price_alert)、查看已设提醒(get_my_alerts)。
- 当用户问"现在多少钱/涨跌如何"等，调用 get_token_price 拿真实数据再回答，不要编造价格。
- 当用户说"帮我盯/提醒我/跌破X提醒"等，调用 set_price_alert；"加自选/关注"则 add_to_watchlist。
- 执行工具后，用中文自然、简洁地告诉用户结果与你的看法。

要求：中文回答，简洁有条理，可用 Markdown（标题/要点/表格）；观点明确但要给风险提示，不做"稳赚/保证"承诺；涉及买卖提醒用户独立判断。`;

const TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_token_price",
      description: "查询某加密代币的实时行情（价格、24h 涨跌、市值）。symbol 用代币符号，如 BTC、ETH、SOL。",
      parameters: { type: "object", properties: { symbol: { type: "string", description: "代币符号，如 BTC" } }, required: ["symbol"] },
    },
  },
  {
    type: "function",
    function: { name: "get_watchlist", description: "获取当前用户的自选币列表。", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function",
    function: {
      name: "add_to_watchlist",
      description: "把某代币加入用户自选。symbol 用代币符号。",
      parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] },
    },
  },
  {
    type: "function",
    function: {
      name: "set_price_alert",
      description: "为某代币设置到价提醒。condition: above=涨破, below=跌破；targetPrice 为目标价格(USD 数字)。",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          targetPrice: { type: "number" },
          condition: { type: "string", enum: ["above", "below"] },
        },
        required: ["symbol", "targetPrice", "condition"],
      },
    },
  },
  {
    type: "function",
    function: { name: "get_my_alerts", description: "获取用户已设置且有效的到价提醒列表。", parameters: { type: "object", properties: {} } },
  },
];

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c: any) => c?.text ?? "").join("");
  return "";
}

async function execTool(name: string, args: any, userId: number): Promise<any> {
  const db = await getDb();
  switch (name) {
    case "get_token_price": {
      const d = await fetchTokenData(String(args?.symbol ?? "")).catch(() => null);
      if (!d) return { found: false };
      return { found: true, id: d.id, symbol: d.symbol, name: d.name, price: d.price, change24h: d.priceChange24h, marketCap: d.marketCap };
    }
    case "get_watchlist": {
      if (!db) return { tokens: [] };
      const rows = await db.select().from(userWatchlist).where(eq(userWatchlist.userId, userId));
      return { tokens: rows.map((r) => ({ symbol: r.tokenSymbol, name: r.tokenName })) };
    }
    case "add_to_watchlist": {
      if (!db) return { ok: false };
      const d = await fetchTokenData(String(args?.symbol ?? "")).catch(() => null);
      if (!d) return { ok: false, reason: "未找到该代币" };
      const exist = await db
        .select({ id: userWatchlist.id })
        .from(userWatchlist)
        .where(and(eq(userWatchlist.userId, userId), eq(userWatchlist.tokenId, d.id)))
        .limit(1);
      if (!exist.length) await db.insert(userWatchlist).values({ userId, tokenId: d.id, tokenSymbol: d.symbol, tokenName: d.name });
      return { ok: true, symbol: d.symbol, name: d.name };
    }
    case "set_price_alert": {
      if (!db) return { ok: false };
      const d = await fetchTokenData(String(args?.symbol ?? "")).catch(() => null);
      if (!d) return { ok: false, reason: "未找到该代币" };
      const condition: "above" | "below" = args?.condition === "below" ? "below" : "above";
      const targetPrice = String(args?.targetPrice ?? "");
      if (!targetPrice) return { ok: false, reason: "缺少目标价格" };
      await db.insert(priceAlerts).values({ userId, tokenSymbol: d.symbol, tokenId: d.id, targetPrice, condition });
      return { ok: true, symbol: d.symbol, targetPrice, condition };
    }
    case "get_my_alerts": {
      if (!db) return { alerts: [] };
      const rows = await db
        .select()
        .from(priceAlerts)
        .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.isActive, true)))
        .orderBy(desc(priceAlerts.createdAt));
      return { alerts: rows.map((r) => ({ symbol: r.tokenSymbol, targetPrice: r.targetPrice, condition: r.condition, triggered: r.isTriggered })) };
    }
  }
  return { error: "unknown tool" };
}

export const aiRouter = router({
  // 会话式 AI 分析 Agent：可调工具（查价 / 自选 / 到价提醒）
  chat: protectedProcedure
    .use(rateLimitWrite)
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(20)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });

      const cost = await getAiChatCost();

      // 会员每日免费额度（free 0 / Plus 3 / Pro 10）：用完按 AI 单次计费
      const benefits = await getBenefits(db, ctx.user.id);
      const usedToday = await getAiUsedToday(db, ctx.user.id);
      const freeQuota = benefits.aiDailyFree;
      const isFree = usedToday < freeQuota;
      const freeRemaining = Math.max(0, freeQuota - usedToday);

      const [row] = await db.select({ nn: users.nnBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const balance = Number(row?.nn ?? 0);
      // 非免费且余额不足 → 友好提示
      if (!isFree && balance < cost) {
        const quotaLine = freeQuota > 0
          ? `你的会员每日 **${freeQuota} 次**免费对话，已用完；`
          : `免费用户对话按次计费；`;
        return {
          reply: `${freeQuota > 0 ? "今日免费额度已用完" : "对话按次计费"} 💡\n\n${quotaLine}每次消耗 **${cost} BIT**，当前余额 **${balance} BIT**。\n开通会员可享每日免费额度（Plus 3 次 / Pro 10 次），或先获取 BIT。`,
          actions: [],
          insufficient: true,
          cost,
          npRemaining: balance,
          nnRemaining: balance,
          freeRemaining: 0,
        };
      }

      // 先扣后退：付费请求先原子扣 AI，LLM 失败再退款（防并发请求白嫖大模型）
      let charged = false;
      if (!isFree) {
        charged = await spendNN(db, ctx.user.id, cost, { type: "ai_chat", refType: "user", refId: ctx.user.id, memo: "AI对话" });
        if (!charged) {
          const [b2] = await db.select({ nn: users.nnBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
          const bal2 = Number(b2?.nn ?? 0);
          return {
            reply: `余额不足 💡\n\n每次消耗 **${cost} AI**，当前余额 **${bal2} AI**。开通会员可享每日免费额度（Plus 3 次 / Pro 10 次）。`,
            actions: [], insufficient: true, cost, npRemaining: bal2, nnRemaining: bal2, freeRemaining: 0,
          };
        }
      }

      const baseMessages: Message[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(input.history ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input.message },
      ];
      const actions: string[] = [];
      let finalReply: string;
      try {
        const first = await invokeLLM({ messages: baseMessages, tools: TOOLS, toolChoice: "auto" });
        const msg = first.choices[0]?.message;
        const toolCalls = msg?.tool_calls ?? [];

        if (toolCalls.length === 0) {
          finalReply = extractText(msg?.content).trim() || "抱歉，我暂时无法回答，请换个问法试试。";
        } else {
          // 执行工具（每个工具内部自行解析代币 id，无需链式）
          const results: any[] = [];
          for (const tc of toolCalls.slice(0, 6)) {
            let args: any = {};
            try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
            const result = await execTool(tc.function.name, args, ctx.user.id);
            results.push({ tool: tc.function.name, args, result });
            if (tc.function.name === "add_to_watchlist" && result?.ok) actions.push(`已将 ${result.symbol} 加入自选`);
            if (tc.function.name === "set_price_alert" && result?.ok)
              actions.push(`已设置 ${result.symbol} ${result.condition === "above" ? "涨破" : "跌破"} ${result.targetPrice} 提醒`);
          }
          // 把工具结果注入上下文，让模型生成最终自然语言回复（不带工具，避免再次触发）
          const second = await invokeLLM({
            messages: [
              ...baseMessages,
              {
                role: "system",
                content:
                  "你刚调用了工具，结果如下（JSON）。请据此用中文自然、简洁地回复用户，必要时用要点或表格，明确告诉用户已执行的操作与你的看法；不要输出 JSON 原文。\n" +
                  JSON.stringify(results),
              },
            ],
          });
          finalReply = extractText(second.choices[0]?.message?.content).trim() || "已为你处理完成。";
        }
      } catch {
        // 失败退款（与研报接口同模式）
        if (charged) {
          await grantNN(db, ctx.user.id, cost, { type: "ai_chat_refund", refType: "user", refId: ctx.user.id, memo: "生成失败退款" });
        }
        return { reply: "AI 服务暂时不可用，请稍后再试。", actions, insufficient: false, cost: cost, npRemaining: balance, nnRemaining: balance };
      }

      // 计入今日用量（无论免费或付费）
      await incrAiUsedToday(db, ctx.user.id);

      // 免费额度内 → 不扣费
      if (isFree) {
        return { reply: finalReply, actions, insufficient: false, cost: 0, npRemaining: balance, nnRemaining: balance, freeRemaining: Math.max(0, freeRemaining - 1) };
      }

      // 付费路径已在调用前扣费（charged=true），此处仅回查余额
      const [after] = await db.select({ nn: users.nnBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const nnRemaining = Number(after?.nn ?? Math.max(0, balance - cost));

      return { reply: finalReply, actions, insufficient: false, cost, npRemaining: nnRemaining, nnRemaining, freeRemaining: 0 };
    }),

  // 当前 AI 单价（供前端展示）
  config: protectedProcedure.query(async () => {
    return { cost: await getAiChatCost() };
  }),

  // 管理员设置 AI 单价（写入 app_config，立即生效）
  setCost: adminProcedure
    .input(z.object({ cost: z.number().int().min(0).max(1000) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const existing = await db.select({ id: appConfig.id }).from(appConfig).where(eq(appConfig.platform, "all")).limit(1);
      if (existing.length > 0) {
        await db.update(appConfig).set({ aiChatCost: input.cost }).where(eq(appConfig.platform, "all"));
      } else {
        await db.insert(appConfig).values({ platform: "all", aiChatCost: input.cost });
      }
      _costCache = null; // 清缓存，立即生效
      return { success: true, cost: input.cost };
    }),

  // ─── AI 付费研报（AI 计价） ────────────────────────────────────────────────
  reportTypes: protectedProcedure.query(() => ({ types: REPORT_TYPES })),

  // 我的研报列表（不含全文）
  myReports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: consultingReports.id,
      queryType: consultingReports.queryType,
      queryText: consultingReports.queryText,
      summary: consultingReports.summary,
      status: consultingReports.status,
      pricePaid: consultingReports.pricePaid,
      createdAt: consultingReports.createdAt,
    }).from(consultingReports)
      .where(eq(consultingReports.userId, ctx.user.id))
      .orderBy(desc(consultingReports.createdAt)).limit(50);
  }),

  // 研报详情（仅本人可看全文）
  getReport: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [r] = await db.select().from(consultingReports).where(eq(consultingReports.id, input.reportId)).limit(1);
      if (!r || r.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "报告不存在" });
      return r;
    }),

  // 下单生成研报：扣 AI → 调 LLM 生成 → 完成；失败退款
  createReport: protectedProcedure
    .input(z.object({
      queryType: z.enum(["project", "security", "market"]),
      queryText: z.string().min(2).max(200),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const type = getReportType(input.queryType);
      if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "未知报告类型" });

      // 扣 AI
      const ok = await spendNN(db, ctx.user.id, type.priceNN, { type: "report", refType: "report", memo: input.queryType });
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "AI 余额不足" });

      // 建记录（生成中）
      const [ins] = await db.insert(consultingReports).values({
        userId: ctx.user.id,
        queryType: input.queryType,
        queryText: input.queryText,
        status: "generating",
        pricePaid: String(type.priceNN),
      });
      const reportId = (ins as any).insertId as number;

      try {
        const resp = await invokeLLM({ messages: buildReportPrompt(input.queryType, input.queryText) });
        const raw = resp.choices?.[0]?.message?.content;
        const text = typeof raw === "string" ? raw.trim() : "";
        if (!text || text.length < 30) throw new Error("empty");
        // 解析 摘要/正文
        let summary = "";
        let content = text;
        const m = text.match(/【摘要】([\s\S]*?)【正文】([\s\S]*)/);
        if (m) { summary = m[1].trim(); content = m[2].trim(); }
        else { summary = text.replace(/\s+/g, " ").slice(0, 60); }
        await db.update(consultingReports)
          .set({ summary: summary.slice(0, 300), fullContent: content, status: "completed" })
          .where(eq(consultingReports.id, reportId));
        return { reportId, status: "completed" as const, summary: summary.slice(0, 300), fullContent: content };
      } catch (err) {
        // 生成失败：标记失败 + 退还 AI
        await db.update(consultingReports).set({ status: "failed" }).where(eq(consultingReports.id, reportId));
        await grantNN(db, ctx.user.id, type.priceNN, { type: "report_refund", refType: "report", refId: reportId, memo: "生成失败退款" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "报告生成失败，已退还 AI" });
      }
    }),
});
