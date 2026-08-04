/**
 * BIT 段位空投（按 IT 段位加权）
 *
 * 规则：
 *  - 发射月第 1 个月日起额 1000 BIT/天，之后每月日额度 +500
 *  - 月账按 30 天计：月总量 = 日额度 × 30
 *  - 日额度平均拆成 10 份，对应 10 个 IT 段位（青铜…传奇）
 *  - 当天活跃且有段位的用户，按所在段位领取该份；同段位活跃用户均分
 *  - 无段位(0)不参与；某段位当天无人活跃则该份留在金库
 */
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "./db";
import { bitRankAirdropRun, users, userTasks } from "../drizzle/schema";
import { grantNN } from "./token";
import { RANK_TIERS } from "./rankEngine";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** 发射日起点（可用环境变量覆盖，格式 YYYY-MM-DD） */
export const BIT_RANK_AIRDROP_START =
  (process.env.BIT_RANK_AIRDROP_START || "2026-08-01").slice(0, 10);

/** 第 1 个月日额度；之后每月 +500 */
export const BIT_AIRDROP_BASE_DAILY = 1000;
export const BIT_AIRDROP_MONTHLY_STEP = 500;
export const BIT_AIRDROP_MONTH_DAYS = 30;
export const BIT_AIRDROP_TIER_COUNT = 10;

function ymdUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** 发射月第几月（1-based）；早于起点返回 0 */
export function bitAirdropMonthIndex(ymd: string, startYmd = BIT_RANK_AIRDROP_START): number {
  const [sy, sm] = startYmd.split("-").map(Number);
  const [y, m] = ymd.split("-").map(Number);
  if (!sy || !sm || !y || !m) return 0;
  const idx = (y - sy) * 12 + (m - sm) + 1;
  return idx > 0 ? idx : 0;
}

/** 该发射月的日额度（BIT） */
export function bitAirdropDailyPool(monthIndex: number): number {
  if (monthIndex < 1) return 0;
  return BIT_AIRDROP_BASE_DAILY + (monthIndex - 1) * BIT_AIRDROP_MONTHLY_STEP;
}

/** 该发射月的月总量（按 30 天账） */
export function bitAirdropMonthlyTotal(monthIndex: number): number {
  return bitAirdropDailyPool(monthIndex) * BIT_AIRDROP_MONTH_DAYS;
}

/** 单段位当日份额（日额度 / 10，向下取整） */
export function bitAirdropTierPot(dailyPool: number): number {
  return Math.floor(dailyPool / BIT_AIRDROP_TIER_COUNT);
}

/** 同段位均分到个人（向下取整） */
export function bitAirdropPerUser(tierPot: number, recipients: number): number {
  if (tierPot <= 0 || recipients <= 0) return 0;
  return Math.floor(tierPot / recipients);
}

/** 空投进度/规则（给前端展示） */
export function bitAirdropSchedule(ymd = ymdUtc()) {
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  const tierPot = bitAirdropTierPot(dailyPool);
  const months = Array.from({ length: 11 }, (_, i) => {
    const idx = i + 1;
    const daily = bitAirdropDailyPool(idx);
    return { month: idx, daily, monthly: daily * BIT_AIRDROP_MONTH_DAYS };
  });
  return {
    startYmd: BIT_RANK_AIRDROP_START,
    monthIndex,
    dailyPool,
    monthlyTotal: bitAirdropMonthlyTotal(monthIndex),
    tierPot,
    tierCount: BIT_AIRDROP_TIER_COUNT,
    monthDays: BIT_AIRDROP_MONTH_DAYS,
    tiers: RANK_TIERS.map((t, i) => ({ idx: i + 1, name: t.name })),
    schedule: months,
  };
}

/**
 * 结算某一天的 BIT 段位空投（默认昨天，与段位聚合对齐）。
 * 幂等：同一 ymd 只成功跑一次。
 */
export async function runBitRankAirdrop(
  db: Db,
  targetYmd?: string,
): Promise<{ ran: boolean; ymd: string; paidUsers: number; paidTotal: number; dailyPool: number }> {
  const ymd = targetYmd ?? ymdUtc(new Date(Date.now() - 86_400_000));
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  if (dailyPool <= 0) {
    return { ran: false, ymd, paidUsers: 0, paidTotal: 0, dailyPool: 0 };
  }

  try {
    await db.insert(bitRankAirdropRun).values({
      ymd,
      monthIndex,
      dailyPool,
      paidUsers: 0,
      paidTotal: 0,
    });
  } catch {
    return { ran: false, ymd, paidUsers: 0, paidTotal: 0, dailyPool };
  }

  const dayStart = new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // 当天有任务产出的活跃用户
  const activeRows = await db
    .selectDistinct({ userId: userTasks.userId })
    .from(userTasks)
    .where(and(gte(userTasks.completedAt, dayStart), lt(userTasks.completedAt, dayEnd)));
  const activeIds = activeRows.map((r) => r.userId);
  if (activeIds.length === 0) {
    logger.info({ ymd, dailyPool }, "bitRankAirdrop: 无活跃用户");
    return { ran: true, ymd, paidUsers: 0, paidTotal: 0, dailyPool };
  }

  const ranked = await db
    .select({ id: users.id, rankTier: users.rankTier })
    .from(users)
    .where(and(inArray(users.id, activeIds), gte(users.rankTier, 1)));

  const byTier = new Map<number, number[]>();
  for (const u of ranked) {
    const t = u.rankTier ?? 0;
    if (t < 1 || t > BIT_AIRDROP_TIER_COUNT) continue;
    if (!byTier.has(t)) byTier.set(t, []);
    byTier.get(t)!.push(u.id);
  }

  const tierPot = bitAirdropTierPot(dailyPool);
  let paidUsers = 0;
  let paidTotal = 0;

  for (let tier = 1; tier <= BIT_AIRDROP_TIER_COUNT; tier++) {
    const ids = byTier.get(tier) ?? [];
    const per = bitAirdropPerUser(tierPot, ids.length);
    if (per <= 0) continue;
    for (const userId of ids) {
      const ok = await grantNN(db, userId, per, {
        type: "rank_bit_airdrop",
        refType: "rank",
        memo: `${ymd}:T${tier}`,
      });
      if (ok) {
        paidUsers++;
        paidTotal += per;
      }
    }
  }

  await db.update(bitRankAirdropRun)
    .set({ paidUsers, paidTotal })
    .where(eq(bitRankAirdropRun.ymd, ymd));

  logger.info({ ymd, monthIndex, dailyPool, paidUsers, paidTotal }, "bitRankAirdrop: 日结算完成");
  return { ran: true, ymd, paidUsers, paidTotal, dailyPool };
}
