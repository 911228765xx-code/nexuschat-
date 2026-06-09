/**
 * NN 治理代币（与 NP 积分区分）
 *
 * - NN：治理 + 付费服务货币，总量恒定 2100 万枚。用户持有量记在 users.nnBalance。
 * - NP：社交积分（红包/任务等），只进不出、不可提现。
 *
 * 供应守恒模型（无需额外账本表）：
 *   总量 TOTAL = 21,000,000（恒定）
 *   流通 circulating = SUM(users.nnBalance)
 *   金库 treasury = TOTAL - circulating（协议未分发/已回收部分）
 *   - 用户付费（买机器人等）→ nnBalance 减少 → 流通下降、金库回升（NN 回流金库）
 *   - 分发（空投/任务/兑换）→ nnBalance 增加 → 流通上升、金库下降（不可超过金库）
 */
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { users, nnTransactions, nnPool, nnVesting } from "../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export interface NNTxMeta {
  type: string;                 // bot_sub/package/node/grant/...
  refType?: string;             // group/order/admin
  refId?: number;
  memo?: string;
}

async function recordTx(db: Db, userId: number, amount: number, meta: NNTxMeta): Promise<void> {
  try {
    await db.insert(nnTransactions).values({
      userId, amount,
      type: meta.type,
      refType: meta.refType ?? null,
      refId: meta.refId ?? null,
      memo: meta.memo ?? null,
    });
  } catch { /* 账本记录失败不影响主流程 */ }
}

/** NN 总发行量：2100 万枚（恒定） */
export const NN_TOTAL_SUPPLY = 21_000_000;
export const NN_SYMBOL = "NN";
export const NN_NAME = "NexusNation 治理代币";

/**
 * 代币分配模型（DAO 私募认购）。比例可调，需合计 100%。
 * 三大主轴：节点认购 / 质押挖矿 / 流动性共建，外加 DAO 金库、团队(锁仓)、社区。
 */
export interface AllocationBucket {
  key: string;
  name: string;
  desc: string;
  pct: number;        // 占总量百分比
  amount: number;     // = totalSupply * pct/100
  vesting?: string;   // 释放/锁仓说明
}

const ALLOCATION_PCT: Omit<AllocationBucket, "amount">[] = [
  { key: "node",      name: "节点认购",     pct: 25, desc: "DAO 私募：节点认购席位，认购即获 NN 配额", vesting: "按节点等级线性释放" },
  { key: "staking",   name: "质押挖矿",     pct: 30, desc: "质押 NN/参与生态挖矿产出，长期激励持有者", vesting: "随挖矿逐步产出" },
  { key: "liquidity", name: "流动性共建",   pct: 15, desc: "DEX/做市流动性池，社区共建交易深度", vesting: "随流动性投放释放" },
  { key: "treasury",  name: "DAO 金库",     pct: 15, desc: "生态建设、治理提案、运营储备", vesting: "DAO 治理解锁" },
  { key: "team",      name: "团队",         pct: 10, desc: "创始与核心贡献者", vesting: "12 月悬崖 + 24 月线性" },
  { key: "community", name: "社区/空投",    pct: 5,  desc: "早期用户激励、任务空投", vesting: "活动逐步释放" },
];

export const NN_ALLOCATION: AllocationBucket[] = ALLOCATION_PCT.map((b) => ({
  ...b,
  amount: Math.round((NN_TOTAL_SUPPLY * b.pct) / 100),
}));

/** USDT 收款配置（链上结算在 App 外；地址/链通过环境变量配置，避免硬编码） */
export const USDT_DEPOSIT_ADDRESS = process.env.USDT_DEPOSIT_ADDRESS || "";
export const USDT_CHAIN = process.env.USDT_CHAIN || "TRC20";

/** 节点认购等级（DAO 私募；USDT 支付，配额从「节点认购」池 525 万出） */
export interface NodeTier {
  key: string;
  name: string;
  badge: string;
  usdtPrice: number;        // 认购价（USDT）
  nnAmount: number;         // 获得 NN
  governanceWeight: number; // 治理投票权重
  cliffMonths: number;      // 锁仓期（满后才开始解锁）
  durationMonths: number;   // 线性释放总时长
  benefits: string[];
}

export const NN_NODE_TIERS: NodeTier[] = [
  {
    key: "genesis", name: "创世节点", badge: "创世", usdtPrice: 1000, nnAmount: 50000, governanceWeight: 3,
    cliffMonths: 1, durationMonths: 12,
    benefits: ["治理权重 ×3", "新代币/空投优先", "专属创世标识", "节点分红优先级最高", "1 月锁仓 + 12 月线性释放"],
  },
  {
    key: "super", name: "超级节点", badge: "超级", usdtPrice: 500, nnAmount: 22000, governanceWeight: 2,
    cliffMonths: 1, durationMonths: 9,
    benefits: ["治理权重 ×2", "空投优先", "超级节点标识", "节点分红", "1 月锁仓 + 9 月线性释放"],
  },
  {
    key: "standard", name: "普通节点", badge: "普通", usdtPrice: 100, nnAmount: 4000, governanceWeight: 1,
    cliffMonths: 0, durationMonths: 6,
    benefits: ["治理权重 ×1", "节点标识", "参与节点分红", "6 月线性释放"],
  },
];

export function getNodeTier(key: string): NodeTier | undefined {
  return NN_NODE_TIERS.find((t) => t.key === key);
}

/** 代币经济概览（总量 + 分配模型；静态、可对外公开） */
export function getTokenomics() {
  return {
    symbol: NN_SYMBOL,
    name: NN_NAME,
    totalSupply: NN_TOTAL_SUPPLY,
    allocation: NN_ALLOCATION,
  };
}

/** 当前流通量（所有用户持有之和） */
export async function getCirculating(db: Db): Promise<number> {
  const [r] = await db.select({ s: sql<number>`COALESCE(SUM(${users.nnBalance}), 0)` }).from(users);
  return Number(r?.s ?? 0);
}

/** 代币概览 + 某用户余额 */
export async function getTokenInfo(db: Db, userId?: number) {
  const circulating = await getCirculating(db);
  let myBalance = 0;
  if (userId) {
    const [u] = await db.select({ b: users.nnBalance }).from(users).where(eq(users.id, userId)).limit(1);
    myBalance = Number(u?.b ?? 0);
  }
  return {
    symbol: NN_SYMBOL,
    name: NN_NAME,
    totalSupply: NN_TOTAL_SUPPLY,
    circulating,
    treasury: Math.max(0, NN_TOTAL_SUPPLY - circulating),
    myBalance,
  };
}

/**
 * 从用户扣 NN（付费）。原子操作：余额足够才扣。
 * 返回是否成功。NN 回流金库（流通减少）。
 */
export async function spendNN(db: Db, userId: number, amount: number, meta?: NNTxMeta): Promise<boolean> {
  if (amount <= 0) return true;
  const res: any = await db.update(users)
    .set({ nnBalance: sql`${users.nnBalance} - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.nnBalance} >= ${amount}`);
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  if (affected > 0) await recordTx(db, userId, -amount, meta ?? { type: "spend" });
  return affected > 0;
}

/**
 * 向用户发放 NN（空投/任务/兑换）。不可超过金库余额（守恒）。
 * 返回是否成功。
 */
export async function grantNN(db: Db, userId: number, amount: number, meta?: NNTxMeta): Promise<boolean> {
  if (amount <= 0) return false;
  const circulating = await getCirculating(db);
  if (circulating + amount > NN_TOTAL_SUPPLY) return false; // 金库不足
  await db.update(users).set({ nnBalance: sql`${users.nnBalance} + ${amount}` }).where(eq(users.id, userId));
  await recordTx(db, userId, amount, meta ?? { type: "grant" });
  return true;
}

// ─── NN 底池（流动性共建 · 用户从底池购买 NN） ──────────────────────────────────
/** 底池初始储备 = 流动性共建桶 15% = 3,150,000 NN */
export const NN_POOL_SEED = Math.round((NN_TOTAL_SUPPLY * 15) / 100);

/**
 * 联合曲线（分档 bonding curve）：随累计售出量上涨，越早买每 USDT 得到的 NN 越多。
 * rate = 每 1 USDT 兑换的 NN 数量（越往后越少 = 价格越高）。
 */
export interface PoolTier { round: number; untilSold: number; rate: number; }
export const NN_POOL_TIERS: PoolTier[] = [
  { round: 1, untilSold: 500_000, rate: 25 },     // 早鸟：1 USDT = 25 NN
  { round: 2, untilSold: 1_500_000, rate: 20 },
  { round: 3, untilSold: 2_500_000, rate: 16 },
  { round: 4, untilSold: NN_POOL_SEED, rate: 12 }, // 末轮：1 USDT = 12 NN
];

/** 按当前累计售出量取所在档（含下一档信息，用于前端展示涨价进度） */
export function poolRateInfo(soldNN: number) {
  const idx = NN_POOL_TIERS.findIndex((t) => soldNN < t.untilSold);
  const i = idx === -1 ? NN_POOL_TIERS.length - 1 : idx;
  const cur = NN_POOL_TIERS[i];
  const next = NN_POOL_TIERS[i + 1] ?? null;
  return {
    round: cur.round,
    rate: cur.rate,
    soldToNextTier: next ? Math.max(0, cur.untilSold - soldNN) : null, // 还差多少售出量进入下一档
    nextRate: next ? next.rate : null,
    tiers: NN_POOL_TIERS,
  };
}

/** 读取底池（首次自动按播种值初始化单行 id=1） */
export async function getPool(db: Db) {
  let [p] = await db.select().from(nnPool).where(eq(nnPool.id, 1)).limit(1);
  if (!p) {
    try {
      await db.insert(nnPool).values({ id: 1, reserveNN: NN_POOL_SEED, soldNN: 0, priceNnPerUsdt: 20, raisedUsdt: 0 });
    } catch { /* 并发已建 */ }
    [p] = await db.select().from(nnPool).where(eq(nnPool.id, 1)).limit(1);
  }
  return p!;
}

export async function getPoolInfo(db: Db) {
  const p = await getPool(db);
  const soldNN = Number(p.soldNN);
  const info = poolRateInfo(soldNN);
  return {
    reserveNN: Number(p.reserveNN),
    soldNN,
    priceNnPerUsdt: info.rate,        // 当前档汇率（联合曲线）
    raisedUsdt: Number(p.raisedUsdt),
    round: info.round,                // 当前轮次
    nextRate: info.nextRate,          // 下一档汇率（null=末轮）
    soldToNextTier: info.soldToNextTier,
    tiers: info.tiers,
  };
}

/**
 * 确认底池购买到账：发放 NN 给用户 + 更新底池（已售↑/储备↓/募集↑）。
 * 返回是否成功（储备不足或金库不足则失败）。
 */
export async function confirmPoolPurchase(db: Db, userId: number, usdtAmount: number, nnAmount: number, orderId: number): Promise<boolean> {
  const p = await getPool(db);
  if (Number(p.reserveNN) < nnAmount) return false;
  const ok = await grantNN(db, userId, nnAmount, { type: "pool_buy", refType: "pool_order", refId: orderId, memo: `${usdtAmount}USDT` });
  if (!ok) return false;
  await db.update(nnPool).set({
    reserveNN: sql`${nnPool.reserveNN} - ${nnAmount}`,
    soldNN: sql`${nnPool.soldNN} + ${nnAmount}`,
    raisedUsdt: sql`${nnPool.raisedUsdt} + ${usdtAmount}`,
  }).where(eq(nnPool.id, 1));
  return true;
}

// ─── NN 线性归属（vesting）──────────────────────────────────────────────────────
const MONTH_MS = 30 * 24 * 3600 * 1000;

/** 截至 now 已归属（解锁）数量：cliff 内为 0，之后按时长线性到满 */
export function vestedAmount(v: { totalNN: number; startAt: Date; cliffMonths: number; durationMonths: number }, now = Date.now()): number {
  const elapsedMonths = (now - v.startAt.getTime()) / MONTH_MS;
  if (elapsedMonths < v.cliffMonths) return 0;
  if (elapsedMonths >= v.durationMonths) return v.totalNN;
  return Math.floor((v.totalNN * elapsedMonths) / v.durationMonths);
}

/** 建立归属计划（不立即发币，按计划逐步 claim） */
export async function createVesting(db: Db, userId: number, source: string, refId: number | null, totalNN: number, cliffMonths: number, durationMonths: number): Promise<void> {
  await db.insert(nnVesting).values({
    userId, source, refId: refId ?? null, totalNN, claimedNN: 0,
    startAt: new Date(), cliffMonths, durationMonths,
  });
}

/** 我的归属计划（含已解锁/可领） */
export async function getMyVesting(db: Db, userId: number) {
  const rows = await db.select().from(nnVesting).where(eq(nnVesting.userId, userId)).orderBy(desc(nnVesting.createdAt));
  return rows.map((v) => {
    const vested = vestedAmount(v);
    const claimable = Math.max(0, vested - v.claimedNN);
    return {
      id: v.id, source: v.source,
      totalNN: v.totalNN, claimedNN: v.claimedNN,
      vestedNN: vested, claimableNN: claimable,
      startAt: v.startAt.toISOString(), cliffMonths: v.cliffMonths, durationMonths: v.durationMonths,
      done: v.claimedNN >= v.totalNN,
    };
  });
}

/** 领取某计划当前可解锁部分 → 发 NN，更新 claimed */
export async function claimVesting(db: Db, userId: number, vestingId: number): Promise<{ ok: boolean; claimed: number }> {
  const [v] = await db.select().from(nnVesting).where(eq(nnVesting.id, vestingId)).limit(1);
  if (!v || v.userId !== userId) return { ok: false, claimed: 0 };
  const vested = vestedAmount(v);
  const claimable = Math.max(0, vested - v.claimedNN);
  if (claimable <= 0) return { ok: false, claimed: 0 };
  const ok = await grantNN(db, userId, claimable, { type: "vesting_claim", refType: "vesting", refId: v.id, memo: v.source });
  if (!ok) return { ok: false, claimed: 0 };
  await db.update(nnVesting).set({ claimedNN: sql`${nnVesting.claimedNN} + ${claimable}` }).where(eq(nnVesting.id, v.id));
  return { ok: true, claimed: claimable };
}

/** 用户 NN 流水（最近 N 条） */
export async function getMyNNTransactions(db: Db, userId: number, limit = 50) {
  return db.select().from(nnTransactions)
    .where(eq(nnTransactions.userId, userId))
    .orderBy(desc(nnTransactions.createdAt)).limit(limit);
}

/** 运营：NN 营收概览（按类型汇总支出额，即平台收入） */
export async function getNNRevenue(db: Db) {
  const rows = await db
    .select({
      type: nnTransactions.type,
      total: sql<number>`COALESCE(SUM(-${nnTransactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(nnTransactions)
    .where(and(inArray(nnTransactions.type, ["bot_sub", "package"]), sql`${nnTransactions.amount} < 0`))
    .groupBy(nnTransactions.type);
  const byType: Record<string, { total: number; count: number }> = {};
  let totalRevenue = 0;
  for (const r of rows) {
    const total = Number(r.total);
    byType[r.type] = { total, count: Number(r.count) };
    totalRevenue += total;
  }
  return { totalRevenue, byType };
}
