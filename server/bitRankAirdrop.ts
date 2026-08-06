/**
 * BIT 段位空投（按 IT 段位加权 · 捐献 IT 后领取）
 *
 * 规则：
 *  - 发射月第 1 个月日起额 1000 BIT/天，之后每月日额度 +500
 *  - 月账按 30 天计：月总量 = 日额度 × 30
 *  - 日额度平均拆成 10 份，对应 10 个 IT 段位（青铜…传奇）
 *  - 当天活跃且有段位的用户，可捐献 IT 领取该段位份额（同段位活跃用户均分）
 *  - 捐献门槛：V1=1000 … V10=10000 IT（段位序号 × 1000）
 *  - 无段位(0)不参与；未捐献则不发 BIT（份额留在金库）
 *  - 每人每天只能领取一次
 */
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { getDb } from "./db";
import { bitRankAirdropClaim, bitRankAirdropRun, users, userTasks } from "../drizzle/schema";
import { grantNN } from "./token";
import { RANK_TIERS } from "./rankEngine";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** 原子扣 IT；余额不足返回 false */
async function spendIT(db: Db, userId: number, cost: number): Promise<boolean> {
  if (cost <= 0) return true;
  const res: any = await db.update(users)
    .set({ npPoints: sql`${users.npPoints} - ${cost}` })
    .where(and(eq(users.id, userId), sql`${users.npPoints} >= ${cost}`));
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  return affected > 0;
}

/** 发射日起点（可用环境变量覆盖，格式 YYYY-MM-DD） */
export const BIT_RANK_AIRDROP_START =
  (process.env.BIT_RANK_AIRDROP_START || "2026-08-01").slice(0, 10);

/** 第 1 个月日额度；之后每月 +500 */
export const BIT_AIRDROP_BASE_DAILY = 1000;
export const BIT_AIRDROP_MONTHLY_STEP = 500;
export const BIT_AIRDROP_MONTH_DAYS = 30;
export const BIT_AIRDROP_TIER_COUNT = 10;

/**
 * 捐献 IT 门槛（按段位固定）：
 * V1=1000, V2=2000, V3=3000, V4=4000, V5=5000,
 * V6=6000, V7=7000, V8=8000, V9=9000, V10=10000
 */
export const BIT_AIRDROP_IT_COSTS = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000] as const;

export function ymdUtc(d = new Date()): string {
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

/** 领取所需捐献 IT（V1=1000 … V10=10000） */
export function bitAirdropItCost(tier: number): number {
  if (tier < 1 || tier > BIT_AIRDROP_TIER_COUNT) return 0;
  return BIT_AIRDROP_IT_COSTS[tier - 1] ?? 0;
}

/** V1–V10 捐献门槛表（前端展示） */
export function bitAirdropDonateLadder() {
  return RANK_TIERS.map((t, i) => {
    const tier = i + 1;
    return { tier, name: t.name, itCost: bitAirdropItCost(tier) };
  });
}

/** 空投进度/规则（给前端展示） */
export function bitAirdropSchedule(ymd = ymdUtc()) {
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  const tierPot = bitAirdropTierPot(dailyPool);
  // 展示前 10 个月（去掉第 11 月）
  const months = Array.from({ length: 10 }, (_, i) => {
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
    donateLadder: bitAirdropDonateLadder(),
    schedule: months,
  };
}

async function countActiveInTier(db: Db, ymd: string, tier: number): Promise<number> {
  const dayStart = new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const activeRows = await db
    .selectDistinct({ userId: userTasks.userId })
    .from(userTasks)
    .where(and(gte(userTasks.completedAt, dayStart), lt(userTasks.completedAt, dayEnd)));
  const activeIds = activeRows.map((r) => r.userId);
  if (activeIds.length === 0) return 0;
  const ranked = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, activeIds), eq(users.rankTier, tier)));
  return ranked.length;
}

async function isUserActiveOn(db: Db, userId: number, ymd: string): Promise<boolean> {
  const dayStart = new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const [row] = await db
    .select({ id: userTasks.id })
    .from(userTasks)
    .where(and(
      eq(userTasks.userId, userId),
      gte(userTasks.completedAt, dayStart),
      lt(userTasks.completedAt, dayEnd),
    ))
    .limit(1);
  return !!row;
}

/** 查询用户当日领取状态（给 getRankStatus） */
export async function getBitAirdropClaimStatus(db: Db, userId: number, tier: number, ymd = ymdUtc()) {
  const schedule = bitAirdropSchedule(ymd);
  const itCost = bitAirdropItCost(tier);
  const [claimed] = await db
    .select({
      itCost: bitRankAirdropClaim.itCost,
      bitAmount: bitRankAirdropClaim.bitAmount,
      claimedAt: bitRankAirdropClaim.claimedAt,
    })
    .from(bitRankAirdropClaim)
    .where(and(eq(bitRankAirdropClaim.userId, userId), eq(bitRankAirdropClaim.ymd, ymd)))
    .limit(1);

  const activeToday = tier >= 1 ? await isUserActiveOn(db, userId, ymd) : false;
  const peers = tier >= 1 && schedule.dailyPool > 0
    ? await countActiveInTier(db, ymd, tier)
    : 0;
  // 估算：含自己在内的同段位活跃人数均分（若自己尚未计入活跃则 +1 预估）
  const peerCount = peers > 0 ? peers : (activeToday ? 1 : 0);
  const estimatedBit = bitAirdropPerUser(schedule.tierPot, peerCount);

  const [u] = await db
    .select({ npPoints: users.npPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const npPoints = u?.npPoints ?? 0;

  const canClaim =
    !claimed &&
    tier >= 1 &&
    schedule.dailyPool > 0 &&
    activeToday &&
    estimatedBit > 0 &&
    itCost > 0 &&
    npPoints >= itCost;

  return {
    ymd,
    itCost,
    estimatedBit,
    claimedToday: !!claimed,
    claimedBit: claimed?.bitAmount ?? 0,
    claimedItCost: claimed?.itCost ?? 0,
    activeToday,
    canClaim,
    reason: claimed
      ? "今日已领取"
      : tier < 1
        ? "需先达到青铜及以上段位"
        : schedule.dailyPool <= 0
          ? "空投尚未开始"
          : !activeToday
            ? "今日需先完成任务才可领取"
            : estimatedBit <= 0
              ? "当前段位暂无可领份额"
              : npPoints < itCost
                ? `IT 不足，需捐献 ${itCost.toLocaleString()} IT`
                : null,
  };
}

/**
 * 用户捐献 IT，领取当日 BIT 段位空投（每人每天一次）。
 */
export async function claimBitRankAirdrop(
  db: Db,
  userId: number,
): Promise<{ ok: true; ymd: string; tier: number; itCost: number; bitAmount: number }> {
  const ymd = ymdUtc();
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  if (dailyPool <= 0) {
    throw Object.assign(new Error("空投尚未开始"), { code: "BAD_REQUEST" as const });
  }

  const [u] = await db
    .select({ rankTier: users.rankTier, npPoints: users.npPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const tier = u?.rankTier ?? 0;
  if (tier < 1 || tier > BIT_AIRDROP_TIER_COUNT) {
    throw Object.assign(new Error("需先达到青铜及以上段位"), { code: "FORBIDDEN" as const });
  }

  const itCost = bitAirdropItCost(tier);
  if ((u?.npPoints ?? 0) < itCost) {
    throw Object.assign(new Error(`IT 不足，需捐献 ${itCost.toLocaleString()} IT`), { code: "BAD_REQUEST" as const });
  }

  if (!(await isUserActiveOn(db, userId, ymd))) {
    throw Object.assign(new Error("今日需先完成任务才可领取"), { code: "FORBIDDEN" as const });
  }

  const [existing] = await db
    .select({ id: bitRankAirdropClaim.id })
    .from(bitRankAirdropClaim)
    .where(and(eq(bitRankAirdropClaim.userId, userId), eq(bitRankAirdropClaim.ymd, ymd)))
    .limit(1);
  if (existing) {
    throw Object.assign(new Error("今日已领取"), { code: "CONFLICT" as const });
  }

  const tierPot = bitAirdropTierPot(dailyPool);
  const peers = await countActiveInTier(db, ymd, tier);
  const bitAmount = bitAirdropPerUser(tierPot, peers);
  if (bitAmount <= 0) {
    throw Object.assign(new Error("当前段位暂无可领份额"), { code: "BAD_REQUEST" as const });
  }

  // 先占领取坑位（防并发双领）
  try {
    await db.insert(bitRankAirdropClaim).values({
      userId,
      ymd,
      tier,
      itCost,
      bitAmount,
    });
  } catch {
    throw Object.assign(new Error("今日已领取"), { code: "CONFLICT" as const });
  }

  const spent = await spendIT(db, userId, itCost);
  if (!spent) {
    await db.delete(bitRankAirdropClaim).where(and(
      eq(bitRankAirdropClaim.userId, userId),
      eq(bitRankAirdropClaim.ymd, ymd),
    ));
    throw Object.assign(new Error(`IT 不足，需捐献 ${itCost.toLocaleString()} IT`), { code: "BAD_REQUEST" as const });
  }

  const ok = await grantNN(db, userId, bitAmount, {
    type: "rank_bit_airdrop",
    refType: "rank",
    memo: `${ymd}:T${tier}:donate${itCost}`,
  });
  if (!ok) {
    await db.update(users).set({ npPoints: sql`${users.npPoints} + ${itCost}` }).where(eq(users.id, userId));
    await db.delete(bitRankAirdropClaim).where(and(
      eq(bitRankAirdropClaim.userId, userId),
      eq(bitRankAirdropClaim.ymd, ymd),
    ));
    throw Object.assign(new Error("BIT 发放失败，已退回 IT，请稍后重试"), { code: "INTERNAL_SERVER_ERROR" as const });
  }

  // 更新日统计（幂等 upsert）
  try {
    await db.insert(bitRankAirdropRun).values({
      ymd,
      monthIndex,
      dailyPool,
      paidUsers: 1,
      paidTotal: bitAmount,
    });
  } catch {
    await db.update(bitRankAirdropRun)
      .set({
        paidUsers: sql`${bitRankAirdropRun.paidUsers} + 1`,
        paidTotal: sql`${bitRankAirdropRun.paidTotal} + ${bitAmount}`,
      })
      .where(eq(bitRankAirdropRun.ymd, ymd));
  }

  logger.info({ userId, ymd, tier, itCost, bitAmount }, "bitRankAirdrop: 用户捐献领取");
  return { ok: true, ymd, tier, itCost, bitAmount };
}

/**
 * 日结算钩子：不再自动发放。保留调用点兼容；统计由用户领取时累加。
 * 返回 ran:false 表示无需自动发。
 */
export async function runBitRankAirdrop(
  _db: Db,
  targetYmd?: string,
): Promise<{ ran: boolean; ymd: string; paidUsers: number; paidTotal: number; dailyPool: number }> {
  const ymd = targetYmd ?? ymdUtc(new Date(Date.now() - 86_400_000));
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  // 改为用户主动捐献领取，聚合任务不再自动空投
  logger.info({ ymd, monthIndex, dailyPool }, "bitRankAirdrop: 已改为捐献领取，跳过自动发放");
  return { ran: false, ymd, paidUsers: 0, paidTotal: 0, dailyPool };
}
