/**
 * 段位引擎（AC 模型 Phase 2）：全网体每日累积价值分 → 段位 → 加成/日俸/升段奖。
 *
 * 规则（详见设计文档）：
 *  - 当日价值分 = 你【整个网体】中【当天活跃】成员的加权和（取最高身份权重）。
 *  - 累积价值分 = Σ 每天的当日价值分（只增不减）。段位看累积分，永久不降。
 *  - 加成（10%~100%）只乘"本人当天任务产出"（见 user.ts creditNp）。
 *  - 日俸（6-10 段）须本人当天活跃才发。升段奖一次性，跨段即发。
 *
 * 合规护栏：≤无限层级按业务决策；死号（当天无任务产出）不计价值分；
 *           加成/日俸均挂"本人当天活跃"，避免纯躺赚。地域隔离 + 法务见文档。
 *
 * 性能：每个 UTC 日只聚合一次（rank_agg_run 幂等）。当前实现把活跃成员的权重
 *       沿网体祖先链上溯累加；超大体量需改增量/分片，见 TODO。
 */
import { eq, and, gte, lt, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, userTasks, referrals, chatGroups, rankAggRun } from "../drizzle/schema";
import { effectiveTier } from "./membership";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** 10 段位表：min=累积价值分门槛，bonus=个人产出加成，daily=日俸（6-10 段）。 */
export const RANK_TIERS: { name: string; min: number; bonus: number; daily: number }[] = [
  { name: "青铜", min: 500, bonus: 0.10, daily: 0 },
  { name: "白银", min: 2000, bonus: 0.20, daily: 0 },
  { name: "黄金", min: 6000, bonus: 0.30, daily: 0 },
  { name: "铂金", min: 15000, bonus: 0.40, daily: 0 },
  { name: "钻石", min: 40000, bonus: 0.50, daily: 0 },
  { name: "星耀", min: 100000, bonus: 0.60, daily: 1000 },
  { name: "大师", min: 250000, bonus: 0.70, daily: 2000 },
  { name: "宗师", min: 600000, bonus: 0.80, daily: 3000 },
  { name: "王者", min: 1200000, bonus: 0.90, daily: 4000 },
  { name: "传奇", min: 2500000, bonus: 1.00, daily: 5000 },
];

/** 累积分 → 段位序号（0=无段位，1=青铜 … 10=传奇） */
export function tierForScore(score: number): number {
  let t = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) if (score >= RANK_TIERS[i].min) t = i + 1;
  return t;
}
/** 段位 → 个人产出加成比例（0=无段位时 0） */
export function tierBonus(tier: number): number {
  return tier >= 1 && tier <= 10 ? RANK_TIERS[tier - 1].bonus : 0;
}
/** 段位 → 日俸（6-10 段才有） */
export function tierDaily(tier: number): number {
  return tier >= 1 && tier <= 10 ? RANK_TIERS[tier - 1].daily : 0;
}
/** 升段一次性奖 = 该段门槛 ÷ 10 */
export function tierUpReward(tier: number): number {
  return tier >= 1 && tier <= 10 ? Math.floor(RANK_TIERS[tier - 1].min / 10) : 0;
}
/** 声誉加成（封顶 0.3；声誉体系填充前恒为 0） */
export function reputationBonus(rep: number): number {
  return Math.min(0.3, Math.max(0, rep) / 50_000);
}

function startOfUtcDay(ymd: string): Date { return new Date(`${ymd}T00:00:00.000Z`); }
function ymdUtc(d: Date): string { return d.toISOString().slice(0, 10); }

/**
 * 聚合某一天（默认昨天）的全网体价值分，更新累积分/段位，发升段奖与日俸。
 * 幂等：同一 ymd 只会成功执行一次。返回处理摘要。
 */
export async function runRankAggregation(
  db: Db, targetYmd?: string,
): Promise<{ ran: boolean; ymd: string; activeMembers: number; ancestorsUpdated: number }> {
  const ymd = targetYmd ?? ymdUtc(new Date(Date.now() - 86_400_000)); // 默认处理昨天（完整一天）
  // 幂等占位：唯一键冲突说明今天已聚合过
  try {
    await db.insert(rankAggRun).values({ ymd });
  } catch {
    return { ran: false, ymd, activeMembers: 0, ancestorsUpdated: 0 };
  }

  const dayStart = startOfUtcDay(ymd);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // 1) 当天活跃成员（有任务产出即算活跃；死号不计）
  const activeRows = await db
    .selectDistinct({ userId: userTasks.userId })
    .from(userTasks)
    .where(and(gte(userTasks.completedAt, dayStart), lt(userTasks.completedAt, dayEnd)));
  const activeIds = activeRows.map((r) => r.userId);
  if (activeIds.length === 0) return { ran: true, ymd, activeMembers: 0, ancestorsUpdated: 0 };

  // 2) 成员权重：Pro=6 / Plus=4 / 群主=3 / 普通=1（AI 活跃=2 待声誉/AI 用量接入）
  const memberRows = await db
    .select({ id: users.id, proTier: users.proTier, proUntil: users.proUntil })
    .from(users).where(inArray(users.id, activeIds));
  // 群主权重门槛：仅"活跃群"（成员 ≥10）的群主算 3 分，防建 1 人死群刷权重
  const ownerRows = await db.selectDistinct({ creatorId: chatGroups.creatorId })
    .from(chatGroups).where(gte(chatGroups.memberCount, 10));
  const owners = new Set(ownerRows.map((r) => r.creatorId));
  const weightOf = new Map<number, number>();
  for (const m of memberRows) {
    const eff = effectiveTier(m.proTier ?? "free", m.proUntil ?? null);
    let w = 1;
    if (eff === "pro") w = 6;
    else if (eff === "plus") w = 4;
    else if (owners.has(m.id)) w = 3;
    weightOf.set(m.id, w);
  }

  // 3) 网体父指针：active 推荐关系 inviteeId → referrerId
  const refRows = await db
    .select({ inviteeId: referrals.inviteeId, referrerId: referrals.referrerId })
    .from(referrals).where(eq(referrals.status, "active"));
  const parentOf = new Map<number, number>();
  for (const r of refRows) if (!parentOf.has(r.inviteeId)) parentOf.set(r.inviteeId, r.referrerId);

  // 4) 沿祖先链上溯，把每个活跃成员的权重累加给其所有祖先（≤100 层防环）
  const dailyScore = new Map<number, number>();
  for (const memberId of activeIds) {
    const w = weightOf.get(memberId) ?? 1;
    let cur = parentOf.get(memberId);
    const seen = new Set<number>([memberId]);
    let depth = 0;
    while (cur !== undefined && !seen.has(cur) && depth < 100) {
      dailyScore.set(cur, (dailyScore.get(cur) ?? 0) + w);
      seen.add(cur);
      cur = parentOf.get(cur);
      depth++;
    }
  }

  // 5) 累加到累积分 + 段位升级 + 升段奖（uncapped）
  const ancestorIds = Array.from(dailyScore.keys());
  let ancestorsUpdated = 0;
  if (ancestorIds.length > 0) {
    const cur = await db
      .select({ id: users.id, rankScore: users.rankScore, rankTier: users.rankTier })
      .from(users).where(inArray(users.id, ancestorIds));
    for (const u of cur) {
      const add = dailyScore.get(u.id) ?? 0;
      if (add <= 0) continue;
      const newScore = (u.rankScore ?? 0) + add;
      const newTier = Math.max(u.rankTier ?? 0, tierForScore(newScore));
      let upReward = 0;
      for (let t = (u.rankTier ?? 0) + 1; t <= newTier; t++) upReward += tierUpReward(t);
      await db.update(users)
        .set({ rankScore: newScore, rankTier: newTier, npPoints: sql`npPoints + ${upReward}` })
        .where(eq(users.id, u.id));
      ancestorsUpdated++;
    }
  }

  // 6) 日俸：当天活跃 且 段位 ≥ 星耀(6) 的成员发日俸（uncapped；须本人当天活跃）
  const dayuneers = await db
    .select({ id: users.id, rankTier: users.rankTier })
    .from(users).where(and(inArray(users.id, activeIds), gte(users.rankTier, 6)));
  for (const u of dayuneers) {
    const pay = tierDaily(u.rankTier ?? 0);
    if (pay > 0) await db.update(users).set({ npPoints: sql`npPoints + ${pay}` }).where(eq(users.id, u.id));
  }

  logger.info({ ymd, activeMembers: activeIds.length, ancestorsUpdated }, "rankEngine: 每日聚合完成");
  return { ran: true, ymd, activeMembers: activeIds.length, ancestorsUpdated };
}

/** 注册每日段位聚合定时任务（每 6 小时检查一次，幂等保证每个 UTC 日只跑一次）。 */
export function startRankAggregation(): void {
  const tick = async () => {
    try {
      const db = await getDb();
      if (db) await runRankAggregation(db);
    } catch (err) {
      logger.warn({ err }, "rankEngine: 聚合任务异常");
    }
  };
  setInterval(() => { void tick(); }, 6 * 3600 * 1000);
  void tick();
}
