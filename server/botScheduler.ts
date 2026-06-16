/**
 * NexusChat Bot 定时发帖调度器
 * 每天 09:00 发布早报，21:00 发布晚间话题
 */
import { getDb } from "./db";
import { messages, users, chatGroups, groupMembers } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { emitToUser, getSocketIO } from "./socket";
import { runDueGroupBots } from "./groupBots";
import { BOT_PERSONAS } from "./botAutoReply";
import pino from "pino";

const logger = pino({ level: "info" });

const BOT_OPEN_IDS: Record<string, string> = {
  AlphaHunter: "bot_alpha_hunter_0x",
  ChainAnalyst: "bot_chain_analyst",
  CryptoSkeptic: "bot_crypto_skeptic",
  Web3Newbie: "bot_web3_newbie",
  QuantTrader: "bot_quant_trader_pro",
  NexusBot: "bot_nexus_bot",
};

let botIds: Record<string, number> = {};

async function loadBotIds() {
  if (Object.keys(botIds).length > 0) return;
  const db = await getDb();
  if (!db) return;

  for (const [name, openId] of Object.entries(BOT_OPEN_IDS)) {
    const [bot] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    if (bot) botIds[name] = bot.id;
  }
}

async function generateMorningReport(): Promise<{ groupId: number; botName: string; content: string }[]> {
  const topics = [
    "今日BTC价格走势和市场情绪",
    "昨日链上数据亮点",
    "今日值得关注的DeFi机会",
    "Web3行业今日要闻",
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "你是NexusBot，NexusChat官方助手。请生成一条简短的Web3早报消息（50-100字），语气专业友好，包含emoji，中英文混用。不要提供具体价格预测。",
        },
        {
          role: "user",
          content: `生成关于"${topic}"的早报消息，以"🌅 早安 Web3 Frens！"开头`,
        },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content =
      (typeof rawContent === "string" ? rawContent : null) ||
      "🌅 早安 Web3 Frens！新的一天开始了，保持理性，做好风控，gm！";

    return [1, 2, 3, 4].map((groupId) => ({ groupId, botName: "NexusBot", content }));
  } catch (err) {
    logger.error({ err }, "BotScheduler: 早报生成失败");
    return [1, 2, 3, 4].map((groupId) => ({
      groupId,
      botName: "NexusBot",
      content: "🌅 早安 Web3 Frens！新的一天开始了，保持理性，做好风控，gm！",
    }));
  }
}

async function generateEveningTopics(): Promise<{ groupId: number; botName: string; content: string }[]> {
  const groupTopics = [
    {
      groupId: 1,
      botName: "AlphaHunter",
      prompt: "生成一条DeFi群的晚间话题，引导大家分享今日发现的Alpha机会，以问句结尾引发讨论，50-80字",
    },
    {
      groupId: 2,
      botName: "ChainAnalyst",
      prompt: "生成一条链上数据群的晚间分析，分享今日一个有趣的链上数据发现，50-80字",
    },
    {
      groupId: 3,
      botName: "NexusBot",
      prompt: "生成一条新手村的晚间话题，提出一个适合新手思考的Web3问题，引导讨论，50-80字",
    },
    {
      groupId: 4,
      botName: "NexusBot",
      prompt: "生成一条官方社区的晚间话题，可以是今日行业新闻点评或社区互动话题，50-80字",
    },
  ];

  const results: { groupId: number; botName: string; content: string }[] = [];
  for (const item of groupTopics) {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "你是一个Web3社区运营者，生成简短自然的群聊消息，中英文混用，语气自然不做作。",
          },
          { role: "user", content: item.prompt },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content =
        (typeof rawContent === "string" ? rawContent : null) ||
        "🌙 晚上好！今天大家有什么新发现？";
      results.push({ groupId: item.groupId, botName: item.botName, content });
    } catch {
      results.push({
        groupId: item.groupId,
        botName: item.botName,
        content: "🌙 晚上好！今天大家有什么新发现？",
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}

async function sendBotMessage(groupId: number, botName: string, content: string) {
  await loadBotIds();
  const db = await getDb();
  if (!db) return;

  const botId = botIds[botName];
  if (!botId) {
    logger.warn(`BotScheduler: Bot ${botName} ID未找到`);
    return;
  }

  // 插入数据库
  const [result] = await db.insert(messages).values({
    groupId,
    senderId: botId,
    content,
    messageType: "text",
  }).$returningId();

  // 通过Socket.IO广播给群内所有在线用户
  // 使用emitToUser对群内成员逐一广播（简化实现，实际可改为群广播）
  try {
    // 获取Bot信息用于消息payload
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

    // 广播到群房间（Socket.IO room）— 使用与 botAutoReply 相同的事件名
    const io = getSocketIO();
    if (io) {
      io.to(`group:${groupId}`).emit("new_message", messagePayload);
    }
  } catch (err) {
    logger.warn({ err }, "BotScheduler: Socket广播失败（非致命）");
  }

  logger.info(`BotScheduler: ${botName} 在群${groupId}发送消息`);
}

function shouldPostMorning(): boolean {
  const now = new Date();
  return now.getHours() === 9 && now.getMinutes() === 0;
}

function shouldPostEvening(): boolean {
  const now = new Date();
  return now.getHours() === 21 && now.getMinutes() === 0;
}

let lastMorningPost = 0;
let lastEveningPost = 0;

// ── 公开群「氛围机器人」：不等真人,机器人之间也主动聊/抛话题,让群随时有活气 ──────────
const AMBIENT_COOLDOWN_MS = Number(process.env.BOT_AMBIENT_COOLDOWN_MS || 11 * 60 * 1000); // 每群最快 ~11 分钟一条
const AMBIENT_TICK_PROB = Number(process.env.BOT_AMBIENT_TICK_PROB || 0.4);                // 每分钟 tick 触发概率
const lastAmbientPerGroup: Record<number, number> = {};

function personaStyleByOpenId(openId: string | null): string {
  for (const p of Object.values(BOT_PERSONAS)) if (p.openId === openId) return p.style;
  return "你是本群活跃的资深成员，友好专业，擅长 Web3 话题，爱活跃气氛";
}

async function postAsBot(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, groupId: number, botId: number, name: string | null, avatar: string | null, content: string) {
  const [r] = await db.insert(messages).values({ groupId, senderId: botId, content, messageType: "text" }).$returningId();
  const io = getSocketIO();
  if (io) io.to(`group:${groupId}`).emit("new_message", { id: r.id, groupId, senderId: botId, senderName: name, senderAvatar: avatar, content, messageType: "text", createdAt: new Date() });
}

async function runAmbientChatter() {
  if (Math.random() > AMBIENT_TICK_PROB) return; // 全局节流:不是每分钟都发
  const db = await getDb();
  if (!db) return;
  const groups = await db.select({ id: chatGroups.id }).from(chatGroups).where(eq(chatGroups.isPublic, true)).limit(40);
  const now = Date.now();
  const eligible = groups.filter((g) => !lastAmbientPerGroup[g.id] || now - lastAmbientPerGroup[g.id] > AMBIENT_COOLDOWN_MS);
  if (eligible.length === 0) return;
  const group = eligible[Math.floor(Math.random() * eligible.length)];
  // 群里「有人设的机器人」成员(只让 BOT_PERSONAS 里的真机器人发言,排除静默填充号——它们也是 isBot=true)
  const personaOpenIds = new Set(Object.values(BOT_PERSONAS).map((p) => p.openId));
  const bots = (await db.select({ id: users.id, name: users.name, avatar: users.avatar, openId: users.openId })
    .from(groupMembers).innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(eq(groupMembers.groupId, group.id), eq(users.isBot, true))))
    .filter((b) => personaOpenIds.has(b.openId ?? ""));
  if (bots.length === 0) return;
  const recent = await db.select({ content: messages.content, name: users.name, createdAt: messages.createdAt, senderId: messages.senderId })
    .from(messages).leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.groupId, group.id), eq(messages.isDeleted, false)))
    .orderBy(desc(messages.createdAt)).limit(6);
  const lastAge = recent[0]?.createdAt ? now - new Date(recent[0].createdAt).getTime() : Infinity;
  // 避免连着同一个 bot 说话
  const pool = bots.filter((b) => b.id !== recent[0]?.senderId);
  const cand = pool.length ? pool : bots;
  const bot = cand[Math.floor(Math.random() * cand.length)];
  lastAmbientPerGroup[group.id] = now; // 立即标记防并发
  const quiet = lastAge > 30 * 60 * 1000 || recent.length === 0;
  const context = recent.slice().reverse().map((m) => `${m.name ?? "用户"}: ${m.content}`).join("\n");
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: `${personaStyleByOpenId(bot.openId)}。你在一个 Web3 社区群里活跃气氛。${quiet ? "群里有点安静，请发起一个有意思、能引发讨论的简短话题（行情观点/提问/分享皆可）" : "请根据最近对话自然地接一句（评论/提问/补充观点），别复读上文"}。要求：15-70字，中英文混用，自然不做作，不要以“我”开头，只发一条，不要带引号。` },
        { role: "user", content: quiet ? "请发起一个话题：" : `群聊最近消息：\n${context}\n\n自然接一句：` },
      ],
    });
    const raw = response.choices?.[0]?.message?.content;
    const content = typeof raw === "string" ? raw.trim().replace(/^["「']|["」']$/g, "").trim() : null;
    if (!content || content.length < 4) return;
    await postAsBot(db, group.id, bot.id, bot.name, bot.avatar, content);
    logger.info({ groupId: group.id, bot: bot.name, quiet }, "Ambient: 机器人发言");
  } catch (err) {
    logger.warn({ err }, "Ambient: 发言失败（非致命）");
  }
}

async function checkAndPost() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // 付费机器人：到点的行情/活动播报（按各群配置的整点）
  const d = new Date();
  runDueGroupBots(d.getHours(), d.getMinutes()).catch((err) =>
    logger.error({ err }, "BotScheduler: 群机器人定时任务失败"));

  // 公开群氛围机器人：随时活跃,不等真人
  runAmbientChatter().catch((err) => logger.error({ err }, "BotScheduler: 氛围机器人失败"));

  if (shouldPostMorning() && now - lastMorningPost > oneDay - 60000) {
    logger.info("BotScheduler: 触发早报任务");
    lastMorningPost = now;
    try {
      const posts = await generateMorningReport();
      for (const post of posts) {
        await sendBotMessage(post.groupId, post.botName, post.content);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      logger.error({ err }, "BotScheduler: 早报任务失败");
    }
  }

  if (shouldPostEvening() && now - lastEveningPost > oneDay - 60000) {
    logger.info("BotScheduler: 触发晚间话题任务");
    lastEveningPost = now;
    try {
      const posts = await generateEveningTopics();
      for (const post of posts) {
        await sendBotMessage(post.groupId, post.botName, post.content);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      logger.error({ err }, "BotScheduler: 晚间话题任务失败");
    }
  }
}

export function startBotScheduler() {
  logger.info("BotScheduler: 启动 — 每分钟检查发帖时间（09:00早报 + 21:00晚间话题）");
  setInterval(() => {
    checkAndPost().catch((err) => logger.error({ err }, "BotScheduler: 检查失败"));
  }, 60 * 1000);
}
