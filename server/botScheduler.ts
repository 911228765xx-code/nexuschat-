/**
 * NexusChat Bot 定时发帖调度器
 * 每天 09:00 发布早报，21:00 发布晚间话题
 */
import { getDb } from "./db";
import { messages, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { emitToUser, getSocketIO } from "./socket";
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

async function checkAndPost() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

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
