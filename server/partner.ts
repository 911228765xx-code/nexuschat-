/**
 * 合伙人计划（平台共建）：USDT 认购 → 三档身份 + 双池分红 + USDT 认购奖励。
 *
 * 三档身份（按累计已确认认购额判定，可追加升级）：
 *   合伙人       3,000 – 9,999 USDT
 *   超级合伙人  10,000 – 49,999 USDT
 *   联合创始人  50,000 – 100,000 USDT
 *
 * 收益结构：
 * 1) 手续费分红池（NN·每日结算）：生态内交易收 5% 手续费，其中 3.7% 注入分红池，
 *    按档位拆分 1% / 1.2% / 1.5%（合计 3.7%），档内按认购额加权分配。
 *    手续费来源通过 recordPlatformFee() 逐笔记账（红包/转账/交易功能接入时调用）。
 * 2) 收益分红池（NN·每日结算）：平台服务收入（会员/AI报告/推广/机器人/群套餐 NN 流水）
 *    的 20% 注入，全体合伙人按 认购额×档位系数 加权分配。
 * 3) 认购奖励（USDT）：确认到账后按档位 5% / 8% / 10% 生成奖励，分 6 期按月解锁，
 *    领取需近 30 天内活跃；提取走运营审核打款。
 * 4) NN 配额：认购额 × 档位汇率，按档位锁仓线性释放（复用 nn_vesting）。
 *
 * 合规护栏：分红与奖励均为平台经营收益分享，不承诺保本/固定收益；
 * 仅向非中国大陆地区用户开放（与 NN 一致的地域隔离要求），文案见 App 端免责声明。
 */
import { and, eq, sql, desc, inArray, gte, lt, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import {
  users, nnTransactions, partnerEarnings, partnerSettleRuns, platformFeeLedger,
} from "../drizzle/schema";
import { grantNN } from "./token";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export interface PartnerTier {
  key: string;
  name: string;
  badge: string;
  minUsdt: number;
  maxUsdt: number;
  nnPerUsdt: number;       // 认购 NN 配额汇率（对比底池末轮 12/U 有溢价）
  feeSharePct: number;     // 手续费池档位份额（占交易额百分比：1 / 1.2 / 1.5，合计 3.7）
  revWeight: number;       // 收益池档位系数（×认购额加权）
  bonusPct: number;        // USDT 认购奖励比例（5 / 8 / 10）
  cliffMonths: number;     // NN 锁仓
  durationMonths: number;  // NN 线性释放时长
  seats: number;           // 限量席位
  proGiftMonths: number;   // 赠送 Pro 会员月数（0=不送；999=终身）
  benefits: string[];
}

/** 手续费率与入池率（5% 手续费，其中 3.7% 进分红池；1+1.2+1.5=3.7） */
export const PLATFORM_FEE_PCT = 5;
export const FEE_POOL_PCT = 3.7;
/** 收益分红池：平台服务收入注入比例 */
export const REVENUE_POOL_PCT = 20;
/** 平台服务收入口径（nn_transactions.type，amount<0 的消费侧） */
export const REVENUE_TYPES = ["membership", "report", "promote", "bot_sub", "package"];
/** USDT 奖励解锁期数（月） */
export const BONUS_PERIODS = 6;

export const PARTNER_TIERS: PartnerTier[] = [
  {
    key: "partner", name: "合伙人", badge: "合伙人",
    minUsdt: 3000, maxUsdt: 9999, nnPerUsdt: 12,
    feeSharePct: 1.0, revWeight: 1, bonusPct: 5,
    cliffMonths: 0, durationMonths: 6, seats: 88, proGiftMonths: 6,
    benefits: [
      "手续费分红池 1% 档位权益（NN·日结）",
      "收益分红池按认购额加权（NN·日结）",
      "认购额 5% USDT 奖励 · 6 期解锁",
      "NN 配额 1U=12NN · 6 月线性释放",
      "Pro 会员 6 个月 · 合伙人专属标识",
      "治理权重 ×3 · 新功能内测优先",
    ],
  },
  {
    key: "super", name: "超级合伙人", badge: "超级",
    minUsdt: 10000, maxUsdt: 49999, nnPerUsdt: 13,
    feeSharePct: 1.2, revWeight: 1.5, bonusPct: 8,
    cliffMonths: 1, durationMonths: 9, seats: 28, proGiftMonths: 12,
    benefits: [
      "手续费分红池 1.2% 档位权益（NN·日结）",
      "收益分红池 ×1.5 系数加权（NN·日结）",
      "认购额 8% USDT 奖励 · 6 期解锁",
      "NN 配额 1U=13NN · 1 月锁仓 + 9 月线性",
      "Pro 会员 12 个月 · 超级合伙人标识",
      "治理权重 ×8 · 官方共建群席位 · 重大提案优先投票",
    ],
  },
  {
    key: "founder", name: "联合创始人", badge: "联创",
    minUsdt: 50000, maxUsdt: 100000, nnPerUsdt: 15,
    feeSharePct: 1.5, revWeight: 2, bonusPct: 10,
    cliffMonths: 1, durationMonths: 12, seats: 8, proGiftMonths: 999,
    benefits: [
      "手续费分红池 1.5% 档位权益（NN·日结）",
      "收益分红池 ×2 系数加权（NN·日结）",
      "认购额 10% USDT 奖励 · 6 期解锁",
      "NN 配额 1U=15NN · 1 月锁仓 + 12 月线性",
      "终身 Pro 会员 · 联合创始人铭牌",
      "治理权重 ×20 · 产品路线共决权 · 专属客户经理",
      "官网创始成员署名（自愿）",
    ],
  },
];

export function getPartnerTier(key: string): PartnerTier | undefined {
  return PARTNER_TIERS.find((t) => t.key === key);
}

/** 按累计认购额判定档位（不足最低档返回 null） */
export function tierForStake(stakeUsdt: number): PartnerTier | null {
  let hit: PartnerTier | null = null;
  for (const t of PARTNER_TIERS) {
    if (stakeUsdt >= t.minUsdt) hit = t; // tiers 按 minUsdt 升序
  }
  return hit;
}

/** 档位序（用于"只升不降"） */
export function tierOrder(key: string | null): number {
  if (!key) return 0;
  const i = PARTNER_TIERS.findIndex((t) => t.key === key);
  return i === -1 ? 0 : i + 1;
}

/**
 * 平台手续费记账钩子：任何"收 5% 手续费"的交易场景调用一次。
 * baseNN = 交易基数（如转账额/红包额）；入池额 = baseNN × 3.7%。
 * 红包/NN 转账/交易等功能接入时调用本函数即可自动进入手续费分红池。
 */
export async function recordPlatformFee(db: Db, baseNN: number, source: string): Promise<void> {
  if (baseNN <= 0) return;
  const poolNN = Math.floor((baseNN * FEE_POOL_PCT) / 100);
  if (poolNN <= 0) return;
  try {
    await db.insert(platformFeeLedger).values({ baseNN, poolNN, source });
  } catch { /* 记账失败不阻塞主流程 */ }
}

interface PartnerRow { id: number; tier: string; stake: number }

async function listConfirmedPartners(db: Db): Promise<PartnerRow[]> {
  const rows = await db
    .select({ id: users.id, tier: users.partnerTier, stake: users.partnerStakeUsdt })
    .from(users)
    .where(and(isNotNull(users.partnerTier), sql`${users.partnerStakeUsdt} > 0`));
  return rows
    .filter((r) => r.tier && getPartnerTier(r.tier))
    .map((r) => ({ id: r.id, tier: r.tier as string, stake: Number(r.stake) }));
}

/** 把 totalNN 按 stake 加权分给一组合伙人，逐人入账（floor 取整，余数留池） */
async function distribute(db: Db, members: PartnerRow[], totalNN: number, kind: "fee" | "revenue", ymd: string, weightOf: (m: PartnerRow) => number): Promise<number> {
  const totalWeight = members.reduce((s, m) => s + weightOf(m), 0);
  if (totalWeight <= 0 || totalNN <= 0) return 0;
  let paid = 0;
  for (const m of members) {
    const share = Math.floor((totalNN * weightOf(m)) / totalWeight);
    if (share <= 0) continue;
    const ok = await grantNN(db, m.id, share, { type: "partner_div", refType: kind, memo: `${kind}:${ymd}` });
    if (!ok) continue; // 金库不足极端情形：跳过，余额留待人工处理
    await db.insert(partnerEarnings).values({ userId: m.id, kind, amountNN: share, ymd });
    paid += share;
  }
  return paid;
}

function ymdOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 每日分红结算（幂等：partner_settle_runs 唯一闸）。
 * 结算"昨天"的两池：手续费池（未结算台账全量）+ 收益池（昨日平台 NN 收入 ×20%）。
 */
export async function runPartnerSettlement(now = new Date()): Promise<{ fee: number; revenue: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const y = new Date(now.getTime() - 24 * 3600 * 1000);
  const ymd = ymdOf(y);
  const dayStart = new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

  const partners = await listConfirmedPartners(db);
  let feePaid = 0;
  let revPaid = 0;

  // ── 手续费池 ──────────────────────────────────────────────────────────────
  try {
    await db.insert(partnerSettleRuns).values({ ymd, kind: "fee", poolNN: 0 });
    // 闸已拿到：取全部未结算手续费台账
    const rows = await db.select().from(platformFeeLedger).where(eq(platformFeeLedger.settled, false));
    const totalBase = rows.reduce((s, r) => s + r.baseNN, 0);
    if (totalBase > 0 && partners.length > 0) {
      // 各档位按"占交易额百分比"独立拆池：tierPool = totalBase × feeSharePct%
      for (const t of PARTNER_TIERS) {
        const members = partners.filter((p) => p.tier === t.key);
        if (members.length === 0) continue; // 该档无人：份额留存平台
        const tierPool = Math.floor((totalBase * t.feeSharePct) / 100);
        feePaid += await distribute(db, members, tierPool, "fee", ymd, (m) => m.stake);
      }
    }
    if (rows.length > 0) {
      await db.update(platformFeeLedger).set({ settled: true })
        .where(inArray(platformFeeLedger.id, rows.map((r) => r.id)));
    }
    await db.update(partnerSettleRuns).set({ poolNN: feePaid })
      .where(and(eq(partnerSettleRuns.ymd, ymd), eq(partnerSettleRuns.kind, "fee")));
  } catch { /* 唯一键冲突 = 今日已结算，跳过 */ }

  // ── 收益池 ────────────────────────────────────────────────────────────────
  try {
    await db.insert(partnerSettleRuns).values({ ymd, kind: "revenue", poolNN: 0 });
    const [r] = await db
      .select({ s: sql<number>`COALESCE(SUM(-${nnTransactions.amount}), 0)` })
      .from(nnTransactions)
      .where(and(
        inArray(nnTransactions.type, REVENUE_TYPES),
        sql`${nnTransactions.amount} < 0`,
        gte(nnTransactions.createdAt, dayStart),
        lt(nnTransactions.createdAt, dayEnd),
      ));
    const income = Number(r?.s ?? 0);
    const pool = Math.floor((income * REVENUE_POOL_PCT) / 100);
    if (pool > 0 && partners.length > 0) {
      revPaid = await distribute(db, partners, pool, "revenue", ymd, (m) => {
        const t = getPartnerTier(m.tier);
        return m.stake * (t?.revWeight ?? 1);
      });
    }
    await db.update(partnerSettleRuns).set({ poolNN: revPaid })
      .where(and(eq(partnerSettleRuns.ymd, ymd), eq(partnerSettleRuns.kind, "revenue")));
  } catch { /* 已结算 */ }

  return { fee: feePaid, revenue: revPaid };
}

/** 我的分红汇总（累计/近30天/今日明细用） */
export async function getMyEarnings(db: Db, userId: number) {
  const agg = await db
    .select({ kind: partnerEarnings.kind, total: sql<number>`COALESCE(SUM(${partnerEarnings.amountNN}), 0)` })
    .from(partnerEarnings)
    .where(eq(partnerEarnings.userId, userId))
    .groupBy(partnerEarnings.kind);
  const recent = await db
    .select()
    .from(partnerEarnings)
    .where(eq(partnerEarnings.userId, userId))
    .orderBy(desc(partnerEarnings.createdAt))
    .limit(30);
  let fee = 0;
  let revenue = 0;
  for (const a of agg) {
    if (a.kind === "fee") fee = Number(a.total);
    else revenue = Number(a.total);
  }
  return {
    totalNN: fee + revenue,
    feeNN: fee,
    revenueNN: revenue,
    recent: recent.map((e) => ({ kind: e.kind, amountNN: e.amountNN, ymd: e.ymd })),
  };
}

/** 各档已占席位（按已确认身份计数） */
export async function getSeatUsage(db: Db): Promise<Record<string, number>> {
  const rows = await db
    .select({ tier: users.partnerTier, c: sql<number>`COUNT(*)` })
    .from(users)
    .where(isNotNull(users.partnerTier))
    .groupBy(users.partnerTier);
  const out: Record<string, number> = {};
  for (const r of rows) if (r.tier) out[r.tier] = Number(r.c);
  return out;
}

let settleTimer: ReturnType<typeof setInterval> | null = null;

/** 启动每日分红结算调度（每 6 小时尝试一次，幂等闸保证每天只结一次） */
export function startPartnerSettlement(): void {
  if (settleTimer) return;
  setTimeout(() => { void runPartnerSettlement().catch(() => undefined); }, 90 * 1000);
  settleTimer = setInterval(() => { void runPartnerSettlement().catch(() => undefined); }, 6 * 3600 * 1000);
}
