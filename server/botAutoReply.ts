/**
 * Bot 自动回复模块
 * 当真实用户在群内发消息后，随机选一个群内 Bot 延迟 5-30 秒用 LLM 生成上下文相关回复
 */
import { getDb } from "./db";
import { messages, users, groupMembers } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { getSocketIO } from "./socket";
import logger from "./utils/logger";

// Bot 人设配置
const BOT_PERSONAS: Record<string, { style: string; openId: string }> = {
  AlphaHunter: {
    openId: "bot_alpha_hunter_0x",
    style: "你是AlphaHunter，一个经验丰富的DeFi猎手，说话直接有力，喜欢分享alpha机会，偶尔用英文缩写（WAGMI/NGMI/GM/GN/LFG），语气自信但不傲慢",
  },
  ChainAnalyst: {
    openId: "bot_chain_analyst",
    style: "你是ChainAnalyst，专注链上数据分析，说话理性客观，喜欢引用数据，偶尔用专业术语（TVL/Gas/MEV/whale），语气冷静专业",
  },
  CryptoSkeptic: {
    openId: "bot_crypto_skeptic",
    style: "你是CryptoSkeptic，理性的怀疑者，喜欢提出反向观点和风险提示，不盲目跟风，语气略带犀利但有建设性",
  },
  Web3Newbie: {
    openId: "bot_web3_newbie",
    style: "你是Web3Newbie，热情的新手，喜欢问问题和分享学习心得，语气活泼积极，偶尔用emoji，不懂的会承认",
  },
  QuantTrader: {
    openId: "bot_quant_trader_pro",
    style: "你是QuantTrader，量化交易专家，喜欢从数据和概率角度分析，说话简洁精准，偶尔分享交易策略思路",
  },
  NexusBot: {
    openId: "bot_nexus_bot",
    style: "你是NexusBot，NexusChat官方助手，友好专业，负责解答问题和活跃社区氛围，语气温和积极",
  },
};

// 每个群的Bot倾向（哪些Bot更可能在该群回复）
const GROUP_BOT_WEIGHTS: Record<number, string[]> = {
  1: ["AlphaHunter", "CryptoSkeptic", "QuantTrader"],      // Alpha猎手联盟
  2: ["ChainAnalyst", "QuantTrader", "CryptoSkeptic"],     // 链上数据研究院
  3: ["Web3Newbie", "NexusBot", "AlphaHunter"],            // Web3新手村
  4: ["NexusBot", "AlphaHunter", "ChainAnalyst"],          // 官方社区
};

// 防止同一群短时间内Bot刷屏：记录每个群最后一次Bot回复时间
const lastBotReplyTime: Record<number, number> = {};
const BOT_REPLY_COOLDOWN_MS = 30_000; // 同一群30秒内只触发一次Bot回复

let botIdCache: Record<string, number> = {};

async function loadBotIds() {
  if (Object.keys(botIdCache).length >= Object.keys(BOT_PERSONAS).length) return;
  const db = await getDb();
  if (!db) return;
  for (const [name, { openId }] of Object.entries(BOT_PERSONAS)) {
    if (botIdCache[name]) continue;
    const [bot] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    if (bot) botIdCache[name] = bot.id;
  }
}

/**
 * 触发Bot自动回复
 * @param groupId 群组ID
 * @param triggerUserId 触发回复的真实用户ID（Bot不触发Bot回复）
 * @param triggerContent 触发回复的消息内容
 */
export async function triggerBotAutoReply(
  groupId: number,
  triggerUserId: number,
  triggerContent: string
) {
  // 冷却检查：避免刷屏
  const now = Date.now();
  if (lastBotReplyTime[groupId] && now - lastBotReplyTime[groupId] < BOT_REPLY_COOLDOWN_MS) {
    return;
  }

  // 随机决定是否回复（60%概率触发，增加自然感）
  if (Math.random() > 0.6) return;

  await loadBotIds();
  const db = await getDb();
  if (!db) return;

  // 确认触发者不是Bot
  const [triggerUser] = await db
    .select({ isBot: users.isBot })
    .from(users)
    .where(eq(users.id, triggerUserId))
    .limit(1);
  if (!triggerUser || triggerUser.isBot) return;

  // 选择回复的Bot（优先该群的倾向Bot，随机选一个在群内的）
  const preferredBots = GROUP_BOT_WEIGHTS[groupId] ?? Object.keys(BOT_PERSONAS);
  const availableBots = preferredBots.filter(name => botIdCache[name]);
  if (availableBots.length === 0) return;

  const botName = availableBots[Math.floor(Math.random() * availableBots.length)];
  const botId = botIdCache[botName];
  const persona = BOT_PERSONAS[botName];

  // 验证Bot是群成员
  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, botId)))
    .limit(1);
  if (!membership) return;

  // 获取最近5条消息作为上下文
  const recentMessages = await db
    .select({
      content: messages.content,
      senderName: users.name,
      senderUsername: users.username,
      isBot: users.isBot,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.groupId, groupId), eq(messages.isDeleted, false)))
    .orderBy(desc(messages.createdAt))
    .limit(5);

  const contextText = recentMessages
    .reverse()
    .map(m => `${m.senderName ?? m.senderUsername ?? "用户"}: ${m.content}`)
    .join("\n");

  // 延迟5-30秒（模拟真实用户思考时间）
  const delayMs = 5000 + Math.floor(Math.random() * 25000);
  lastBotReplyTime[groupId] = now; // 立即标记，防止并发触发

  setTimeout(async () => {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `${persona.style}。你正在参与一个Web3群聊。请根据最近的对话上下文，生成一条自然的回复消息。要求：1) 20-80字，简短自然；2) 不要重复上文内容；3) 可以提问、评论或分享观点；4) 中英文混用；5) 不要以"我"开头；6) 不要生成多条消息。`,
          },
          {
            role: "user",
            content: `群聊最近消息：\n${contextText}\n\n请生成一条自然的回复：`,
          },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent.trim() : null;
      if (!content || content.length < 5) return;

      // 插入数据库
      const [result] = await db.insert(messages).values({
        groupId,
        senderId: botId,
        content,
        messageType: "text",
      }).$returningId();

      // 获取Bot信息
      const [bot] = await db
        .select({ id: users.id, name: users.name, avatar: users.avatar, username: users.username })
        .from(users)
        .where(eq(users.id, botId))
        .limit(1);

      const messagePayload = {
        id: result.id,
        groupId,
        senderId: botId,
        senderName: bot?.name ?? botName,
        senderAvatar: bot?.avatar ?? null,
        content,
        messageType: "text",
        createdAt: new Date(),
      };

      // 广播到群房间
      const io = getSocketIO();
      if (io) {
        io.to(`group:${groupId}`).emit("new_message", messagePayload);
      }

      logger.info({ groupId, botName, delay: delayMs }, "BotAutoReply: 回复成功");
    } catch (err) {
      logger.warn({ err, groupId, botName }, "BotAutoReply: 回复失败（非致命）");
    }
  }, delayMs);
}
