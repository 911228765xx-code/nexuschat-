/**
 * BIT 段位空投（按捐献 IT 加权分红）
 *
 * 规则：
 *  - 发射月第 1 个月日起额 1000 BIT/天，之后每月日额度 +500
 *  - 月账按 30 天计：月总量 = 日额度 × 30
 *  - 日额度平均拆成 10 份，对应 10 个 IT 段位（青铜…传奇）
 *  - 达到该段位后，每天可捐献对应 IT 参与分红（V1=1000 … V10=10000）
 *  - 捐献人数 ≤50：每人拿该段位当日额度的 1%（100 BIT → 1 BIT），不是谁捐谁领走整份
 *  - 捐献人数 >50：按当天实际捐献的 IT 加权分整池
 *  - 捐献当时只扣 IT、不发 BIT；北京时间凌晨 0 点结算入账。未捐献不参与，余数留金库
 *  - 账本按上海日历日；每人每天只能捐献一次
 */
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { bitRankAirdropClaim, bitRankAirdropRun, itTransactions, users, userTasks } from "../drizzle/schema";
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

/** 上海日历日（UTC+8），空投捐献/结算按这个切日 */
export function ymdShanghai(d = new Date()): string {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function shanghaiDayBounds(ymd: string): { start: Date; end: Date } {
  const start = new Date(`${ymd}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
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

/** 同段位均分到个人（旧规则，仅兼容测试） */
export function bitAirdropPerUser(tierPot: number, recipients: number): number {
  if (tierPot <= 0 || recipients <= 0) return 0;
  return Math.floor(tierPot / recipients);
}

/** 按捐献 IT 加权：我的份额 = 段位池 × 我的 IT / 全员捐献 IT（向下取整，余数留金库） */
export function bitAirdropWeightedShare(tierPot: number, myIt: number, totalIt: number): number {
  if (tierPot <= 0 || myIt <= 0 || totalIt <= 0) return 0;
  return Math.floor((tierPot * myIt) / totalIt);
}

/** 超过此人数才改为加权分红 */
export const BIT_AIRDROP_WEIGHT_AFTER = 50;
/** 人数未超标时，每人拿段位额度的这个比例 */
export const BIT_AIRDROP_FLAT_PCT = 0.01;

/** ≤50 人：每人 1% 额度。例：100 BIT → 1 BIT */
export function bitAirdropFlatShare(tierPot: number): number {
  if (tierPot <= 0) return 0;
  return Math.floor(tierPot * BIT_AIRDROP_FLAT_PCT);
}

/** 按当日捐献人数决定：≤50 人定额 1%，>50 人按 IT 加权 */
export function bitAirdropPayout(
  tierPot: number,
  donorCount: number,
  myIt: number,
  totalIt: number,
): number {
  if (donorCount <= BIT_AIRDROP_WEIGHT_AFTER) return bitAirdropFlatShare(tierPot);
  return bitAirdropWeightedShare(tierPot, myIt, totalIt);
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
export function bitAirdropSchedule(ymd = ymdShanghai()) {
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
    weightAfter: BIT_AIRDROP_WEIGHT_AFTER,
    flatPct: BIT_AIRDROP_FLAT_PCT,
    flatShare: bitAirdropFlatShare(tierPot),
  };
}

async function tierDonateStats(db: Db, ymd: string, tier: number): Promise<{ donors: number; totalIt: number }> {
  const [row] = await db
    .select({
      donors: sql<number>`COUNT(*)`,
      totalIt: sql<number>`COALESCE(SUM(${bitRankAirdropClaim.itCost}), 0)`,
    })
    .from(bitRankAirdropClaim)
    .where(and(eq(bitRankAirdropClaim.ymd, ymd), eq(bitRankAirdropClaim.tier, tier)));
  return { donors: Number(row?.donors ?? 0), totalIt: Number(row?.totalIt ?? 0) };
}

async function isUserActiveOn(db: Db, userId: number, ymd: string): Promise<boolean> {
  const { start: dayStart, end: dayEnd } = shanghaiDayBounds(ymd);
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
export async function getBitAirdropClaimStatus(db: Db, userId: number, tier: number, ymd = ymdShanghai()) {
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
  const stats = tier >= 1 && schedule.dailyPool > 0
    ? await tierDonateStats(db, ymd, tier)
    : { donors: 0, totalIt: 0 };
  const myIt = claimed ? (claimed.itCost ?? itCost) : itCost;
  const donorCount = claimed ? stats.donors : stats.donors + 1;
  const totalIt = claimed ? stats.totalIt : stats.totalIt + myIt;
  const estimatedBit = bitAirdropPayout(schedule.tierPot, donorCount, myIt, totalIt);

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
      ? ((claimed.bitAmount ?? 0) > 0 ? "今日已分红到账" : "今日已捐献，等待日结到账")
      : tier < 1
        ? "需先达到青铜及以上段位"
        : schedule.dailyPool <= 0
          ? "空投尚未开始"
          : !activeToday
            ? "今日需先完成任务才可领取"
            : npPoints < itCost
                ? `IT 不足，需捐献 ${itCost.toLocaleString()} IT`
                : null,
    donorCount: stats.donors,
    donatedItTotal: stats.totalIt,
    pendingSettle: !!claimed && (claimed.bitAmount ?? 0) <= 0,
  };
}

/**
 * 用户捐献 IT 参与当日段位加权分红（每人每天一次）。BIT 在日结发放，此处不入账。
 */
export async function claimBitRankAirdrop(
  db: Db,
  userId: number,
): Promise<{ ok: true; ymd: string; tier: number; itCost: number; bitAmount: number; pending: true }> {
  const ymd = ymdShanghai();
  const dailyPool = bitAirdropDailyPool(bitAirdropMonthIndex(ymd));
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
    throw Object.assign(new Error("今日已捐献"), { code: "CONFLICT" as const });
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(bitRankAirdropClaim).values({
        userId,
        ymd,
        tier,
        itCost,
        bitAmount: 0,
      });
      const spent = await spendIT(tx as Db, userId, itCost);
      if (!spent) {
        throw Object.assign(new Error(`IT 不足，需捐献 ${itCost.toLocaleString()} IT`), { code: "BAD_REQUEST" as const });
      }
    });
  } catch (e) {
    const err = e as Error & { code?: string; errno?: number };
    if (err.code === "BAD_REQUEST") throw e;
    if (err.code === "CONFLICT" || err.errno === 1062 || /Duplicate|unique/i.test(String(err.message))) {
      throw Object.assign(new Error("今日已捐献"), { code: "CONFLICT" as const });
    }
    throw e;
  }

  await db.insert(itTransactions).values({
    userId,
    amount: -itCost,
    type: "bit_airdrop_donate",
    refType: "rank",
    memo: `${ymd}:T${tier}`,
  }).catch(() => { /* 流水失败不影响捐献 */ });

  logger.info({ userId, ymd, tier, itCost }, "bitRankAirdrop: 已捐献，待日结到账");
  return { ok: true, ymd, tier, itCost, bitAmount: 0, pending: true };
}

/**
 * 日结：把当日各段位额度按捐献 IT 加权分给已捐献用户。幂等：已有 bitAmount 的记录跳过。
 */
export async function runBitRankAirdrop(
  db: Db,
  targetYmd?: string,
): Promise<{ ran: boolean; ymd: string; paidUsers: number; paidTotal: number; dailyPool: number }> {
  const ymd = targetYmd ?? ymdShanghai(new Date(Date.now() - 86_400_000));
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  if (dailyPool <= 0) {
    return { ran: false, ymd, paidUsers: 0, paidTotal: 0, dailyPool };
  }

  const pending = await db
    .select({
      id: bitRankAirdropClaim.id,
      userId: bitRankAirdropClaim.userId,
      tier: bitRankAirdropClaim.tier,
      itCost: bitRankAirdropClaim.itCost,
    })
    .from(bitRankAirdropClaim)
    .where(and(eq(bitRankAirdropClaim.ymd, ymd), eq(bitRankAirdropClaim.bitAmount, 0)));

  if (pending.length === 0) {
    logger.info({ ymd, dailyPool }, "bitRankAirdrop: 无待分红捐献");
    return { ran: false, ymd, paidUsers: 0, paidTotal: 0, dailyPool };
  }

  const byTier = new Map<number, typeof pending>();
  for (const row of pending) {
    const list = byTier.get(row.tier) ?? [];
    list.push(row);
    byTier.set(row.tier, list);
  }

  const tierPot = bitAirdropTierPot(dailyPool);
  let paidUsers = 0;
  let paidTotal = 0;

  for (const [tier, rows] of byTier) {
    const totalIt = rows.reduce((s, r) => s + (r.itCost ?? 0), 0);
    const donorCount = rows.length;
    const mode = donorCount <= BIT_AIRDROP_WEIGHT_AFTER ? "flat1" : "weight";
    for (const row of rows) {
      const bitAmount = bitAirdropPayout(tierPot, donorCount, row.itCost ?? 0, totalIt);
      if (bitAmount <= 0) continue;
      // 先占坑再发币：并发 tick / 发放后写库失败时，不会把同一笔再发一遍
      const reserved: any = await db.update(bitRankAirdropClaim)
        .set({ bitAmount })
        .where(and(eq(bitRankAirdropClaim.id, row.id), eq(bitRankAirdropClaim.bitAmount, 0)));
      const reservedRows = reserved?.[0]?.affectedRows ?? reserved?.affectedRows ?? reserved?.rowsAffected ?? 0;
      if (reservedRows <= 0) continue;
      const ok = await grantNN(db, row.userId, bitAmount, {
        type: "rank_bit_airdrop",
        refType: "rank",
        memo: `${ymd}:T${tier}:${mode}:${row.itCost}/${totalIt}`,
      });
      if (!ok) {
        await db.update(bitRankAirdropClaim)
          .set({ bitAmount: 0 })
          .where(eq(bitRankAirdropClaim.id, row.id));
        logger.warn({ userId: row.userId, ymd, tier, bitAmount }, "bitRankAirdrop: 日结发放失败");
        continue;
      }
      paidUsers += 1;
      paidTotal += bitAmount;
    }
  }

  try {
    await db.insert(bitRankAirdropRun).values({
      ymd,
      monthIndex,
      dailyPool,
      paidUsers,
      paidTotal,
    });
  } catch {
    await db.update(bitRankAirdropRun)
      .set({
        paidUsers: sql`${bitRankAirdropRun.paidUsers} + ${paidUsers}`,
        paidTotal: sql`${bitRankAirdropRun.paidTotal} + ${paidTotal}`,
      })
      .where(eq(bitRankAirdropRun.ymd, ymd));
  }

  logger.info({ ymd, monthIndex, dailyPool, paidUsers, paidTotal }, "bitRankAirdrop: 日结分红完成");
  return { ran: paidUsers > 0, ymd, paidUsers, paidTotal, dailyPool };
}

/** 北京时间凌晨 0 点结算前一日捐献。每分钟检查，幂等；上一轮没跑完就跳过，避免重叠双发。 */
let bitAirdropSettling = false;
export function startBitRankAirdropSettlement(): void {
  const tick = async () => {
    if (bitAirdropSettling) return;
    bitAirdropSettling = true;
    try {
      const db = await getDb();
      if (!db) return;
      const ymd = ymdShanghai(new Date(Date.now() - 86_400_000));
      await runBitRankAirdrop(db, ymd);
    } catch (err) {
      logger.warn({ err }, "bitRankAirdrop: 凌晨结算异常");
    } finally {
      bitAirdropSettling = false;
    }
  };
  setInterval(() => { void tick(); }, 60 * 1000);
  void tick();
}
