/**
 * 群机器人服务（互动机器人套餐 + 机器人设置 + 执行）
 *
 * - BOT_CATALOG：可订阅的机器人目录（用于 App 端「群机器人市场」展示与计费）。
 * - BOT_PACKAGES：把多个机器人打包成「套餐」（按月订阅，整体更便宜）。
 * - 读写每个群开了哪些机器人 + 配置（group_bots 表）。
 * - 执行：欢迎机器人（入群自动欢迎）已接入 joinGroup；管理机器人关键词检测在发消息时调用。
 *
 * 计费用 AI 治理代币（红包/积分仍用 AC），订阅到期 expiresAt 控制是否生效。
 */
import { eq, and, gt, or, isNull, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { groupBots, messages, users } from "../drizzle/schema";
import { getSocketIO } from "./socket";
import { invokeLLM } from "./_core/llm";
import { consumeBotLLMBudget } from "./botBudget";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type BotType = "welcome" | "manage" | "price" | "activity" | "stats" | "interact" | "growth";

export interface BotConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "tags" | "number" | "switch";
  placeholder?: string;
  hint?: string;
}

export interface BotCatalogItem {
  type: BotType;
  name: string;
  icon: string; // Ionicons 名
  tagline: string; // 一句话卖点
  desc: string;
  monthlyNN: number; // 月订阅价（按 currency 计价），0=免费
  currency: "AC" | "AI"; // 计价货币：基础四件套用 AC（积分出口），其余用 AI
  interactive: boolean; // 是否会主动/被动发消息（互动机器人）
  configFields: BotConfigField[];
  defaultConfig: Record<string, unknown>;
}

/** 机器人目录（市场） */
export const BOT_CATALOG: BotCatalogItem[] = [
  {
    type: "welcome",
    name: "欢迎机器人",
    icon: "hand-left",
    tagline: "新成员入群自动欢迎",
    desc: "有人加入群聊时，自动发送一条欢迎语，可带群规与暗号。",
    monthlyNN: 10000,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "message", label: "欢迎语", type: "textarea", placeholder: "欢迎 {name} 加入本群！进群先看群公告~", hint: "可用 {name} 代表新成员昵称" },
    ],
    defaultConfig: { message: "欢迎 {name} 加入本群！🎉" },
  },
  {
    type: "manage",
    name: "管理机器人",
    icon: "shield-checkmark",
    tagline: "关键词检测 · 自动提醒",
    desc: "检测到设定的违禁关键词时自动发出提醒，减轻群主管理负担。",
    monthlyNN: 30000,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "keywords", label: "违禁关键词", type: "tags", hint: "命中任一关键词即提醒，回车添加" },
      { key: "warnMessage", label: "提醒语", type: "text", placeholder: "请注意群内发言规范哦~" },
    ],
    defaultConfig: { keywords: [], warnMessage: "请注意群内发言规范哦~" },
  },
  {
    type: "price",
    name: "行情机器人",
    icon: "trending-up",
    tagline: "定时播报币价行情",
    desc: "每天定时在群里播报关注币种的价格与涨跌（需后端调度开启）。",
    monthlyNN: 80000,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "tokens", label: "关注币种", type: "tags", hint: "如 BTC、ETH、SOL，回车添加" },
      { key: "hour", label: "每日播报时间(0-23)", type: "number", placeholder: "9" },
    ],
    defaultConfig: { tokens: ["BTC", "ETH"], hour: 9 },
  },
  {
    type: "activity",
    name: "活动机器人",
    icon: "sparkles",
    tagline: "签到 · 定时活动提醒",
    desc: "定时提醒群成员签到/参与活动，活跃群氛围（需后端调度开启）。",
    monthlyNN: 150000,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "message", label: "活动提醒语", type: "textarea", placeholder: "今日签到开始啦，回复「签到」参与～" },
      { key: "hour", label: "每日提醒时间(0-23)", type: "number", placeholder: "20" },
    ],
    defaultConfig: { message: "今日活动开始啦～", hour: 20 },
  },
  {
    type: "interact",
    name: "互动机器人",
    icon: "chatbubble-ellipses",
    tagline: "AI 在群里自由聊天互动",
    desc: "一个有人设的 AI 成员，会根据群里聊天内容自然地参与讨论、答疑、活跃气氛（可设人设/回复频率/仅被@时回复）。",
    monthlyNN: 49,
    currency: "AI",
    interactive: true,
    configFields: [
      { key: "persona", label: "机器人人设/风格", type: "textarea", placeholder: "你是本群的 AI 助手，友好、专业又幽默，擅长 Web3 话题", hint: "决定它的说话风格" },
      { key: "probability", label: "主动回复概率(0-100)", type: "number", placeholder: "40", hint: "越高越爱说话；被@时必回" },
      { key: "onlyWhenMentioned", label: "仅被 @ 时回复", type: "switch", hint: "开启后平时不插话，只在被@时回应" },
    ],
    defaultConfig: { persona: "你是本群的 AI 助手，友好、专业又幽默，擅长活跃群氛围", probability: 40, onlyWhenMentioned: false },
  },
  {
    type: "growth",
    name: "添粉机器人",
    icon: "rocket",
    tagline: "拉新增长 · 邀请奖励",
    desc: "成员通过邀请链接拉来新人时，自动奖励邀请人 AC 并在群里致谢，激励大家拉新涨粉。",
    monthlyNN: 35,
    currency: "AI",
    interactive: true,
    configFields: [
      { key: "inviteReward", label: "每邀请1人奖励(AC)", type: "number", placeholder: "5", hint: "上限 100/人" },
      { key: "announceInvite", label: "群内致谢邀请人", type: "switch", hint: "新人加入时自动发感谢消息" },
      { key: "promoText", label: "推广文案(选填)", type: "textarea", placeholder: "本群专注 Web3 alpha，欢迎邀请好友一起来！", hint: "用于分享/未来定时推广到广场" },
    ],
    defaultConfig: { inviteReward: 5, announceInvite: true, promoText: "" },
  },
  {
    type: "stats",
    name: "数据机器人",
    icon: "stats-chart",
    tagline: "群数据周报",
    desc: "解锁「群数据看板」并每周生成增长/活跃周报。",
    monthlyNN: 25,
    currency: "AI",
    interactive: false,
    configFields: [],
    defaultConfig: {},
  },
];

/** 套餐：打包订阅更便宜（同币种打包，下单时逐个写入 group_bots 即可） */
export const BOT_PACKAGES = [
  {
    key: "starter",
    name: "新群启动包",
    desc: "欢迎 + 活动，零门槛把群带活。",
    bots: ["welcome", "activity"] as BotType[],
    monthlyNN: 135000, // 原价 10000+150000=160000，套餐价（AC）
    currency: "AC" as const,
    badge: "入门",
  },
  {
    key: "owner",
    name: "群管四件套",
    desc: "欢迎 + 管理 + 行情 + 活动，群运营一步到位。",
    bots: ["welcome", "manage", "price", "activity"] as BotType[],
    monthlyNN: 225000, // 原价 10000+30000+80000+150000=270000，套餐价（AC）
    currency: "AC" as const,
    badge: "热门",
  },
  {
    key: "growth",
    name: "AI 增长包",
    desc: "互动 + 添粉 + 数据，AI 互动与拉新一条龙。",
    bots: ["interact", "growth", "stats"] as BotType[],
    monthlyNN: 89, // 原价 49+35+25=109，套餐价（AI）
    currency: "AI" as const,
    badge: "涨粉",
  },
];

const catalogByType = new Map(BOT_CATALOG.map((b) => [b.type, b]));
export function getBotMeta(type: string): BotCatalogItem | undefined {
  return catalogByType.get(type as BotType);
}

/** 解析某群的机器人状态（合并目录 + 数据库订阅记录） */
export async function listGroupBots(db: Db, groupId: number) {
  const rows = await db
    .select()
    .from(groupBots)
    .where(eq(groupBots.groupId, groupId));
  const byType = new Map(rows.map((r) => [r.botType, r]));
  const now = new Date();
  return BOT_CATALOG.map((meta) => {
    const row = byType.get(meta.type);
    let config = meta.defaultConfig;
    if (row?.config) {
      try { config = { ...meta.defaultConfig, ...JSON.parse(row.config) }; } catch { /* keep default */ }
    }
    const expiresAt = row?.expiresAt ?? null;
    const expired = !!expiresAt && expiresAt.getTime() < now.getTime();
    const active = !!row?.enabled && !expired;
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000)) : null;
    const expiringSoon = active && daysLeft != null && daysLeft <= 7;
    return {
      type: meta.type,
      name: meta.name,
      icon: meta.icon,
      tagline: meta.tagline,
      desc: meta.desc,
      monthlyNN: meta.monthlyNN,
      currency: meta.currency,
      interactive: meta.interactive,
      configFields: meta.configFields,
      enabled: !!row?.enabled,
      active,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      expired,
      daysLeft,
      expiringSoon,
      config,
    };
  });
}

/** 该群某机器人当前是否生效（启用且未过期） */
export async function isBotActive(db: Db, groupId: number, type: BotType): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ enabled: groupBots.enabled, expiresAt: groupBots.expiresAt })
    .from(groupBots)
    .where(
      and(
        eq(groupBots.groupId, groupId),
        eq(groupBots.botType, type),
        eq(groupBots.enabled, true),
        or(isNull(groupBots.expiresAt), gt(groupBots.expiresAt, now)),
      ),
    )
    .limit(1);
  return !!row;
}

let nexusBotId: number | null = null;
async function getNexusBotId(db: Db): Promise<number | null> {
  if (nexusBotId) return nexusBotId;
  const [bot] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, "bot_nexus_bot"))
    .limit(1);
  if (bot) nexusBotId = bot.id;
  return nexusBotId;
}

/** 以系统机器人身份在群里发一条文本消息（落库 + socket 广播） */
export async function sendGroupBotMessage(db: Db, groupId: number, content: string): Promise<void> {
  const botId = await getNexusBotId(db);
  if (!botId) { logger.warn("groupBots: NexusBot 未找到，跳过发送"); return; }
  try {
    const [result] = await db.insert(messages).values({
      groupId, senderId: botId, content, messageType: "text",
    }).$returningId();
    const [bot] = await db
      .select({ id: users.id, name: users.name, avatar: users.avatar })
      .from(users).where(eq(users.id, botId)).limit(1);
    const io = getSocketIO();
    if (io) {
      io.to(`group:${groupId}`).emit("new_message", {
        id: result.id, groupId, senderId: botId,
        senderName: bot?.name ?? "NexusBot", senderAvatar: bot?.avatar ?? null,
        content, messageType: "text", createdAt: new Date(),
      });
    }
  } catch (err) {
    logger.warn({ err }, "groupBots: 发送机器人消息失败（非致命）");
  }
}

/** 欢迎机器人：新成员入群时调用（已接入 joinGroup） */
export async function runWelcomeBot(db: Db, groupId: number, newMemberName: string): Promise<void> {
  if (!(await isBotActive(db, groupId, "welcome"))) return;
  const [row] = await db
    .select({ config: groupBots.config })
    .from(groupBots)
    .where(and(eq(groupBots.groupId, groupId), eq(groupBots.botType, "welcome")))
    .limit(1);
  let template = "欢迎 {name} 加入本群！🎉";
  if (row?.config) { try { const c = JSON.parse(row.config); if (c.message) template = String(c.message); } catch { /* default */ } }
  const content = template.replace(/\{name\}/g, newMemberName || "新朋友");
  await sendGroupBotMessage(db, groupId, content);
}

/** 管理机器人：发消息时检测违禁关键词，命中则提醒。返回是否命中。 */
export async function runManageBot(db: Db, groupId: number, text: string): Promise<boolean> {
  if (!text) return false;
  if (!(await isBotActive(db, groupId, "manage"))) return false;
  const [row] = await db
    .select({ config: groupBots.config })
    .from(groupBots)
    .where(and(eq(groupBots.groupId, groupId), eq(groupBots.botType, "manage")))
    .limit(1);
  let keywords: string[] = [];
  let warn = "请注意群内发言规范哦~";
  if (row?.config) {
    try {
      const c = JSON.parse(row.config);
      if (Array.isArray(c.keywords)) keywords = c.keywords.map((k: unknown) => String(k)).filter(Boolean);
      if (c.warnMessage) warn = String(c.warnMessage);
    } catch { /* default */ }
  }
  if (keywords.length === 0) return false;
  const lower = text.toLowerCase();
  const hit = keywords.some((k) => k && lower.includes(k.toLowerCase()));
  if (hit) { await sendGroupBotMessage(db, groupId, warn); return true; }
  return false;
}

// 互动机器人：自由 AI 群聊（订阅驱动 + 可配人设/频率/仅@回复 + 冷却防刷屏）
const interactCooldown: Record<number, number> = {};
const INTERACT_COOLDOWN_MS = 20_000;

export async function runInteractBot(db: Db, groupId: number, triggerUserId: number, triggerContent: string): Promise<void> {
  if (!triggerContent) return;
  if (!(await isBotActive(db, groupId, "interact"))) return;

  const [row] = await db
    .select({ config: groupBots.config })
    .from(groupBots)
    .where(and(eq(groupBots.groupId, groupId), eq(groupBots.botType, "interact")))
    .limit(1);
  let persona = "你是本群的 AI 助手，友好、专业又幽默，擅长活跃群氛围";
  let probability = 40;
  let onlyWhenMentioned = false;
  if (row?.config) {
    try {
      const c = JSON.parse(row.config);
      if (c.persona) persona = String(c.persona);
      if (typeof c.probability === "number") probability = c.probability;
      onlyWhenMentioned = !!c.onlyWhenMentioned;
    } catch { /* default */ }
  }

  const mentioned = triggerContent.includes("@");
  if (onlyWhenMentioned && !mentioned) return;

  const now = Date.now();
  if (interactCooldown[groupId] && now - interactCooldown[groupId] < INTERACT_COOLDOWN_MS) return;
  // 被@必回；否则按概率
  if (!mentioned && Math.random() * 100 > probability) return;

  const [tu] = await db.select({ isBot: users.isBot }).from(users).where(eq(users.id, triggerUserId)).limit(1);
  if (!tu || tu.isBot) return;
  interactCooldown[groupId] = now;

  const recent = await db
    .select({ content: messages.content, name: users.name, username: users.username })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.groupId, groupId), eq(messages.isDeleted, false)))
    .orderBy(desc(messages.createdAt))
    .limit(5);
  const ctxText = recent.reverse().map((m) => `${m.name ?? m.username ?? "用户"}: ${m.content}`).join("\n");

  const delayMs = 4000 + Math.floor(Math.random() * 8000);
  setTimeout(async () => {
    try {
      if (!consumeBotLLMBudget()) return; // 今日机器人 LLM 额度已用完,本次跳过
      const resp = await invokeLLM({
        messages: [
          { role: "system", content: `${persona}。你正在参与一个群聊，请根据最近的对话生成一条自然、简短(20-80字)的中文回复。要求：不要重复上文、不要生成多条、不要以"我"开头。` },
          { role: "user", content: `群聊最近消息：\n${ctxText}\n\n请生成一条自然的回复：` },
        ],
      });
      const raw = resp.choices?.[0]?.message?.content;
      const content = typeof raw === "string" ? raw.trim() : null;
      if (!content || content.length < 3) return;
      await sendGroupBotMessage(db, groupId, content);
    } catch (err) {
      logger.warn({ err, groupId }, "interact bot failed");
    }
  }, delayMs);
}

// 添粉机器人：成员通过邀请链接拉新成功时奖励邀请人 + 群内致谢（拉新增长）
const GROWTH_MAX_REWARD = 100;
export async function runGrowthReward(db: Db, groupId: number, inviterId: number, newMemberName: string): Promise<void> {
  if (!inviterId) return;
  if (!(await isBotActive(db, groupId, "growth"))) return;

  const [row] = await db
    .select({ config: groupBots.config })
    .from(groupBots)
    .where(and(eq(groupBots.groupId, groupId), eq(groupBots.botType, "growth")))
    .limit(1);
  let reward = 5;
  let announce = true;
  if (row?.config) {
    try {
      const c = JSON.parse(row.config);
      if (typeof c.inviteReward === "number") reward = c.inviteReward;
      if (c.announceInvite !== undefined) announce = !!c.announceInvite;
    } catch { /* default */ }
  }
  reward = Math.max(0, Math.min(GROWTH_MAX_REWARD, Math.floor(reward)));

  if (reward > 0) {
    await db.update(users).set({ npPoints: sql`${users.npPoints} + ${reward}` }).where(eq(users.id, inviterId));
  }
  if (announce) {
    const [inv] = await db.select({ name: users.name, username: users.username }).from(users).where(eq(users.id, inviterId)).limit(1);
    const invName = inv?.name ?? inv?.username ?? "群友";
    await sendGroupBotMessage(
      db, groupId,
      `🎉 欢迎 ${newMemberName || "新朋友"} 加入！感谢 ${invName} 的邀请${reward > 0 ? `，已奖励 ${reward} IT` : ""}`,
    );
  }
}

// ─── 定时机器人：行情(price) / 活动(activity) ────────────────────────────────
// 由 botScheduler 每分钟 tick 调用；在配置的整点触发，每群每类每次窗口只发一次。
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin", XRP: "ripple",
  DOGE: "dogecoin", ADA: "cardano", TON: "the-open-network", TRX: "tron", AVAX: "avalanche-2",
  LINK: "chainlink", MATIC: "matic-network", DOT: "polkadot", LTC: "litecoin", BCH: "bitcoin-cash",
  ARB: "arbitrum", OP: "optimism", SUI: "sui", APT: "aptos", PEPE: "pepe", SHIB: "shiba-inu",
};
const lastScheduledFire: Record<string, number> = {};

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toPrecision(3);
}

async function buildPriceMessage(tokens: unknown[]): Promise<string | null> {
  const syms = (Array.isArray(tokens) ? tokens : [])
    .map((t) => String(t).toUpperCase().trim()).filter(Boolean).slice(0, 10);
  if (!syms.length) return null;
  const ids = Array.from(new Set(syms.map((s) => SYMBOL_TO_ID[s]).filter(Boolean)));
  if (!ids.length) return null;
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const lines = syms.map((s) => {
      const id = SYMBOL_TO_ID[s];
      const d = id && data[id];
      if (!d || typeof d.usd !== "number") return null;
      const c = typeof d.usd_24h_change === "number" ? d.usd_24h_change : 0;
      const arrow = c >= 0 ? "▲" : "▼";
      return `${s}  $${fmtPrice(d.usd)}  ${arrow}${Math.abs(c).toFixed(2)}%`;
    }).filter(Boolean);
    if (!lines.length) return null;
    return `📊 行情播报（24h）\n${lines.join("\n")}\n\n数据来源 CoinGecko，仅供参考，不构成投资建议。`;
  } catch {
    return null;
  }
}

/** 由调度器每分钟调用：触发到点的行情/活动机器人 */
export async function runDueGroupBots(hour: number, minute: number): Promise<void> {
  if (minute !== 0) return; // 只在整点触发
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  const rows = await db
    .select({ groupId: groupBots.groupId, botType: groupBots.botType, config: groupBots.config })
    .from(groupBots)
    .where(and(
      inArray(groupBots.botType, ["price", "activity"]),
      eq(groupBots.enabled, true),
      or(isNull(groupBots.expiresAt), gt(groupBots.expiresAt, new Date())),
    ));
  for (const r of rows) {
    let cfg: any = {};
    try { cfg = r.config ? JSON.parse(r.config) : {}; } catch { /* default */ }
    const targetHour = typeof cfg.hour === "number" ? cfg.hour : (r.botType === "price" ? 9 : 20);
    if (targetHour !== hour) continue;
    const key = `${r.groupId}:${r.botType}`;
    if (lastScheduledFire[key] && now - lastScheduledFire[key] < 2 * 3600 * 1000) continue;
    lastScheduledFire[key] = now;
    try {
      if (r.botType === "activity") {
        await sendGroupBotMessage(db, r.groupId, String(cfg.message || "今日活动开始啦～"));
      } else {
        const text = await buildPriceMessage(cfg.tokens);
        if (text) await sendGroupBotMessage(db, r.groupId, text);
      }
    } catch (err) {
      logger.warn({ err, groupId: r.groupId, botType: r.botType }, "scheduled group bot failed");
    }
  }
}
