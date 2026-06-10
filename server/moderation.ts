/**
 * 内容审核：拦截毒品 / 赌博 / 贩卖（人口·军火·野生动物等）违法内容。
 *
 * 策略（合规底线）：
 *  - 命中违禁词 → 直接拦截，消息/动态不发出；
 *  - 记一条违规（content_violations）；
 *  - 累计违规达阈值 → 自动封号（users.isBanned=true，全站功能被封禁拦截挡住）；
 *  - 管理员可在后台查违规、手动封号。
 *
 * 说明：关键词为基础防线，可在 RULES 持续扩充；严重场景建议再叠加人工审核 / 第三方审核服务。
 */
import { eq, and, gt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users, contentViolations, messages } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** 累计违规达到此值自动封号（可调；默认 3 次给容错，避免误杀） */
export const AUTO_BAN_THRESHOLD = 3;

/** 是否启用 AI 智能审核（关键词没拦住的内容交给 AI 判断；关掉则仅用关键词） */
export const AI_MODERATION = true;

/** 违禁词库（按类别）。尽量用明确违法词，降低误伤。 */
const RULES: { category: string; label: string; words: string[] }[] = [
  {
    category: "drugs", label: "毒品",
    words: [
      "冰毒", "海洛因", "可卡因", "摇头丸", "氯胺酮", "k粉", "麻古", "鸦片", "吗啡",
      "大麻", "毒品", "贩毒", "制毒", "运毒", "毒资", "毒贩", "迷幻药", "致幻剂",
      "heroin", "cocaine", "methamphetamine", "ketamine",
    ],
  },
  {
    category: "gambling", label: "赌博",
    words: [
      "赌博", "赌场", "博彩", "百家乐", "时时彩", "六合彩", "外围赌", "网赌", "赌资",
      "老虎机", "轮盘赌", "私彩", "开赌", "聚众赌博", "赌球", "线上赌", "对赌平台",
      "casino", "betting", "baccarat",
    ],
  },
  {
    category: "trafficking", label: "贩卖违禁品",
    words: [
      "贩卖枪支", "贩卖军火", "走私军火", "枪支弹药", "买卖枪支", "贩卖人口", "人口贩卖",
      "拐卖", "贩卖野生动物", "贩卖器官", "买卖器官", "卖淫", "嫖娼", "招嫖", "走私",
    ],
  },
  {
    category: "porn", label: "色情",
    words: [
      "色情", "黄色视频", "黄片", "淫秽", "三级片", "情色", "裸聊", "约炮", "一夜情",
      "成人影片", "成人视频", "av女优", "性服务", "性交易", "援交", "开房约", "福利姬",
      "自慰", "做爱", "嫖", "卖淫", "招嫖", "口交", "性爱视频", "porn", "sex chat", "escort",
    ],
  },
];

const FLAT = RULES.flatMap((r) => r.words.map((w) => ({ word: w.toLowerCase(), category: r.category })));

export interface ScanResult { blocked: boolean; category?: string; hit?: string; }

/** 纯文本扫描（不触发数据库），命中返回类别 + 命中词 */
export function scanContent(text: string | null | undefined): ScanResult {
  if (!text) return { blocked: false };
  const lower = text.toLowerCase();
  for (const { word, category } of FLAT) {
    if (word && lower.includes(word)) return { blocked: true, category, hit: word };
  }
  return { blocked: false };
}

/**
 * AI 智能审核：用 LLM 判断内容是否为违法违规（毒品交易/赌博/贩卖违禁品/色情）。
 * 仅判断"宣传·交易·提供"等违法内容；正常讨论/新闻/反对不算。
 * 失败/超时 → fail-open（返回不拦截），避免 LLM 异常时误杀正常消息。
 */
export async function moderateWithAI(text: string): Promise<ScanResult> {
  if (!AI_MODERATION || !text || text.trim().length < 2) return { blocked: false };
  try {
    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "你是内容安全审核员。判断用户文本是否包含中国法律明确禁止的违法违规信息，仅限四类：" +
            "drugs(毒品交易/买卖/吸贩)、gambling(赌博/博彩/网赌招揽)、trafficking(贩卖枪支军火/人口/器官/野生动物等违禁品)、porn(色情/淫秽/性交易招揽)。" +
            "注意：只对【宣传、招揽、交易、提供、传播】这类违法行为判定违规；正常讨论、新闻、科普、反对、玩笑、模糊词均不算违规。" +
            '严格只输出 JSON，不要任何多余文字：{"blocked":true或false,"category":"drugs|gambling|trafficking|porn|none"}',
        },
        { role: "user", content: `待审核内容：\n${text.slice(0, 1000)}` },
      ],
    });
    const raw = resp.choices?.[0]?.message?.content;
    const s = typeof raw === "string" ? raw : "";
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return { blocked: false };
    const j = JSON.parse(m[0]);
    if (j?.blocked === true && j?.category && j.category !== "none") {
      return { blocked: true, category: String(j.category) };
    }
    return { blocked: false };
  } catch (err) {
    logger.warn({ err }, "moderation: AI 审核失败（放行）");
    return { blocked: false }; // fail-open
  }
}

/** 记一条违规，并在近 30 天累计达阈值时自动封号。返回是否已封。 */
async function recordAndMaybeBan(db: Db, userId: number, category: string, source: string, snippet: string): Promise<{ banned: boolean }> {
  try {
    await db.insert(contentViolations).values({ userId, category, source, snippet: (snippet ?? "").slice(0, 200) });
  } catch (err) {
    logger.warn({ err }, "moderation: 记录违规失败");
  }
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [cnt] = await db.select({ c: sql<number>`COUNT(*)` }).from(contentViolations)
      .where(and(eq(contentViolations.userId, userId), gt(contentViolations.createdAt, since)));
    if (Number(cnt?.c ?? 0) >= AUTO_BAN_THRESHOLD) {
      await db.update(users).set({ isBanned: true }).where(eq(users.id, userId));
      logger.warn({ userId, category }, "moderation: 累计违规自动封号");
      return { banned: true };
    }
  } catch (err) {
    logger.warn({ err }, "moderation: 封号判断失败");
  }
  return { banned: false };
}

/**
 * 发送前审核（同步，命中即拦截不发出）。
 * @param opts.useAI 是否在关键词之外再叠加 AI 同步判断（广场动态用 true；群聊/私信用 false，AI 走异步）。
 */
export async function enforceContent(
  db: Db, userId: number, text: string | null | undefined, source: string,
  opts?: { useAI?: boolean },
): Promise<void> {
  if (!text) return;
  let r = scanContent(text);
  if (!r.blocked && opts?.useAI && AI_MODERATION) r = await moderateWithAI(text);
  if (!r.blocked) return;
  const { banned } = await recordAndMaybeBan(db, userId, r.category ?? "other", source, text);
  if (banned) throw new TRPCError({ code: "FORBIDDEN", message: "账号因多次发布违法违规内容（毒品/赌博/贩卖/色情等）已被封禁" });
  throw new TRPCError({ code: "FORBIDDEN", message: "内容涉及违法违规信息（毒品 / 赌博 / 贩卖 / 色情等），已被拦截。继续发布将封禁账号。" });
}

/**
 * 异步审核已发出的消息（群聊/私信，不阻塞发送）。
 * AI 判定违规 → 删该消息(isDeleted) + 记违规 + 累犯封号。fire-and-forget 调用。
 */
export async function reviewMessageAsync(db: Db, userId: number, messageId: number, text: string | null | undefined, source: string): Promise<void> {
  try {
    if (!AI_MODERATION || !text) return;
    const r = await moderateWithAI(text);
    if (!r.blocked) return;
    await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, messageId));
    await recordAndMaybeBan(db, userId, r.category ?? "other", source, text);
    logger.warn({ userId, messageId, category: r.category }, "moderation: 异步 AI 删除违规消息");
  } catch (err) {
    logger.warn({ err }, "moderation: 异步审核失败");
  }
}
