import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { invokeLLM, type Tool, type Message } from "../_core/llm";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { userWatchlist, priceAlerts, users, appConfig } from "../../drizzle/schema";
import { fetchTokenData } from "./research";

// 与 AI 助手对话每次消耗的 NP 积分（默认值，可在 app_config 后台配置覆盖）
const DEFAULT_AI_CHAT_COST = 5;
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

const SYSTEM_PROMPT = `你是 NexusChat 的 AI 投研助手「Nexus」，专注加密货币 / Web3：行情研判、项目分析、链上与宏观、风险提示、操作思路。

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
  // 会话式 AI 投研 Agent：可调工具（查价 / 自选 / 到价提醒）
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

      // 积分门槛：余额不足则友好提示（作为正常回复返回，前端直接展示）
      const [row] = await db.select({ np: users.npPoints }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const balance = Number(row?.np ?? 0);
      if (balance < cost) {
        return {
          reply: `你的积分不足啦 💡\n\n与 AI 投研助手对话每次消耗 **${cost} NP**，你当前余额 **${balance} NP**。\n前往「我的 → 任务中心」完成任务即可获取积分。`,
          actions: [],
          insufficient: true,
          cost: cost,
          npRemaining: balance,
        };
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
        // 失败不扣分
        return { reply: "AI 服务暂时不可用，请稍后再试。", actions, insufficient: false, cost: cost, npRemaining: balance };
      }

      // 成功 → 扣除积分（条件更新，防并发扣成负数）
      await db.update(users)
        .set({ npPoints: sql`npPoints - ${cost}` })
        .where(and(eq(users.id, ctx.user.id), sql`npPoints >= ${cost}`));

      // 回查真实余额，避免与并发扣减产生乐观偏差
      const [after] = await db.select({ np: users.npPoints }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const npRemaining = Number(after?.np ?? Math.max(0, balance - cost));

      return { reply: finalReply, actions, insufficient: false, cost: cost, npRemaining };
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
});
