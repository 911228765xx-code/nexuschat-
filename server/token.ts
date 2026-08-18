/**
 * AI 治理代币（与 AC 积分区分）
 *
 * - AI：治理 + 付费服务货币，总量恒定 2100 万枚。用户持有量记在 users.nnBalance。
 * - AC：社交积分（红包/任务等），只进不出、不可提现。
 *
 * 供应守恒模型（无需额外账本表）：
 *   总量 TOTAL = 21,000,000（恒定）
 *   流通 circulating = SUM(users.nnBalance)
 *   金库 treasury = TOTAL - circulating（协议未分发/已回收部分）
 *   - 用户付费（买机器人等）→ nnBalance 减少 → 流通下降、金库回升（AI 回流金库）
 *   - 分发（空投/任务/兑换）→ nnBalance 增加 → 流通上升、金库下降（不可超过金库）
 */
import { eq, sql, desc, and, gte, inArray } from "drizzle-orm";
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
  } catch (e) {
    // 账本记录失败不阻断主流程,但绝不能静默:余额已变而流水缺失会导致对账不平,必须可监控告警
    console.error("[recordTx] 流水写入失败(余额已变,账本缺失):", { userId, amount, type: meta.type, refType: meta.refType, refId: meta.refId, err: (e as Error)?.message });
  }
}

/** AI 总发行量：2100 万枚（恒定） */
export const NN_TOTAL_SUPPLY = 21_000_000;
export const NN_SYMBOL = "BIT";
export const NN_NAME = "BIT 治理代币";

/**
 * 代币分配模型（DAO 私募认购）。比例可调，需合计 100%。
 * 四档(2026-07-08 调整)：ICO 曲线认购 15% / 质押挖矿 70% / 流动性共建 10% / 社区空投 5%。
 * (原生态建设 15% + DAO 国库 10% 已取消，比例并入质押挖矿。)
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
  { key: "ico",       name: "ICO 曲线认购", pct: 15, desc: "曲线定价认购(0.8U 起/2U 封顶)，认购即全额锁仓进二池质押", vesting: "首月悬崖 + 12 月曲线释放" },
  { key: "staking",   name: "质押挖矿",     pct: 70, desc: "质押挖矿奖励池：每笔资金各自计龄，起步年化沿曲线递减", vesting: "随挖矿逐步产出·奖励池封顶" },
  { key: "liquidity", name: "流动性共建",   pct: 10, desc: "DEX/做市流动性池，社区共建交易深度", vesting: "随流动性投放释放" },
  { key: "community", name: "社区/空投",    pct: 5,  desc: "早期用户激励、任务空投", vesting: "活动逐步释放" },
];

export const NN_ALLOCATION: AllocationBucket[] = ALLOCATION_PCT.map((b) => ({
  ...b,
  amount: Math.round((NN_TOTAL_SUPPLY * b.pct) / 100),
}));

/** USDT 收款配置（链上结算在 App 外；地址/链通过环境变量配置，避免硬编码） */
export const USDT_DEPOSIT_ADDRESS = process.env.USDT_DEPOSIT_ADDRESS || "";
export const USDT_CHAIN = process.env.USDT_CHAIN || "BEP20"; // 默认 BSC(BEP20);项目 USDT 为 BSC-Peg。若收款钱包在以太坊主网则设环境变量 USDT_CHAIN=ERC20

/** 旧版节点等级（已停售，仅保留给历史订单展示/确认；新认购走 server/partner.ts 合伙人档位） */
export interface NodeTier {
  key: string;
  name: string;
  badge: string;
  usdtPrice: number;        // 认购价（USDT）
  nnAmount: number;         // 获得 AI
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
 * 从用户扣 AI（付费）。原子操作：余额足够才扣。
 * 返回是否成功。AI 回流金库（流通减少）。
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
 * 向用户发放 AI（空投/任务/兑换）。不可超过金库余额（守恒）。
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

/**
 * 用户间划转 BIT：A→B，流通总量不变（不经金库）。
 * 事务内条件扣减发送方再加接收方，并记双边流水。
 */
export async function transferNN(
  db: Db,
  fromUserId: number,
  toUserId: number,
  amount: number,
  memo?: string,
): Promise<boolean> {
  if (amount <= 0 || fromUserId === toUserId) return false;
  try {
    await db.transaction(async (tx) => {
      const res: any = await tx.update(users)
        .set({ nnBalance: sql`${users.nnBalance} - ${amount}` })
        .where(sql`${users.id} = ${fromUserId} AND ${users.nnBalance} >= ${amount}`);
      const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
      if (affected <= 0) throw new Error("INSUFFICIENT");
      await tx.update(users)
        .set({ nnBalance: sql`${users.nnBalance} + ${amount}` })
        .where(eq(users.id, toUserId));
      await tx.insert(nnTransactions).values({
        userId: fromUserId, amount: -amount, type: "transfer_out",
        refType: "user", refId: toUserId, memo: memo ?? `to#${toUserId}`,
      });
      await tx.insert(nnTransactions).values({
        userId: toUserId, amount, type: "transfer_in",
        refType: "user", refId: fromUserId, memo: memo ?? `from#${fromUserId}`,
      });
    });
    return true;
  } catch (e: any) {
    if (e?.message === "INSUFFICIENT") return false;
    console.error("[transferNN] failed:", e?.message);
    return false;
  }
}

// ─── AI 底池（流动性共建 · 用户从底池购买 AI） ──────────────────────────────────
/** 底池初始储备 = 流动性共建桶 10% = 2,100,000 AI（随分配模型 2026-07-08 调整同步）*/
export const NN_POOL_SEED = Math.round((NN_TOTAL_SUPPLY * 10) / 100);

/**
 * 底池兑换：AI 与 USDT 1:1 锚定（rate = 每 1 USDT 兑换的 AI 数量）。
 */
export interface PoolTier { round: number; untilSold: number; rate: number; }
export const NN_POOL_TIERS: PoolTier[] = [
  { round: 1, untilSold: NN_POOL_SEED, rate: 1 }, // AI 与 USDT 1:1 锚定
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
      await db.insert(nnPool).values({ id: 1, reserveNN: NN_POOL_SEED, soldNN: 0, priceNnPerUsdt: 1, raisedUsdt: 0 });
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
 * 确认底池购买到账：发放 AI 给用户 + 更新底池（已售↑/储备↓/募集↑）。
 * 返回是否成功（储备不足或金库不足则失败）。
 */
export async function confirmPoolPurchase(db: Db, userId: number, usdtAmount: number, nnAmount: number, orderId: number): Promise<boolean> {
  await getPool(db); // 确保单行存在
  // 原子条件扣减储备:仅当 reserveNN>=nnAmount 才扣 → 并发确认不会把储备扣成负(防超卖穿仓)
  const res: any = await db.update(nnPool).set({
    reserveNN: sql`${nnPool.reserveNN} - ${nnAmount}`,
    soldNN: sql`${nnPool.soldNN} + ${nnAmount}`,
    raisedUsdt: sql`${nnPool.raisedUsdt} + ${usdtAmount}`,
  }).where(and(eq(nnPool.id, 1), gte(nnPool.reserveNN, nnAmount)));
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
  if (affected < 1) return false; // 储备不足
  // 已原子占用储备,再发币;grantNN 失败(金库不足)返回 false,由调用方在事务里 throw 回滚扣减
  const ok = await grantNN(db, userId, nnAmount, { type: "pool_buy", refType: "pool_order", refId: orderId, memo: `${usdtAmount}USDT` });
  return ok;
}

// ─── AI 线性归属（vesting）──────────────────────────────────────────────────────
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

/** 领取某计划当前可解锁部分 → 发 AI，更新 claimed */
export async function claimVesting(db: Db, userId: number, vestingId: number): Promise<{ ok: boolean; claimed: number }> {
  const [v] = await db.select().from(nnVesting).where(eq(nnVesting.id, vestingId)).limit(1);
  if (!v || v.userId !== userId) return { ok: false, claimed: 0 };
  const vested = vestedAmount(v);
  const claimable = Math.max(0, vested - v.claimedNN);
  if (claimable <= 0) return { ok: false, claimed: 0 };
  // 先用「读到的 claimedNN」作乐观锁条件原子推进,杜绝并发双领(两个请求都读到旧值→都发币→双倍铸币)。
  // 只有第一个请求的 WHERE claimedNN=旧值 命中,第二个 affected=0 直接失败。
  const upd = await db.update(nnVesting)
    .set({ claimedNN: sql`${nnVesting.claimedNN} + ${claimable}` })
    .where(and(eq(nnVesting.id, v.id), eq(nnVesting.claimedNN, v.claimedNN)));
  const affected = (upd as any)?.[0]?.affectedRows ?? (upd as any)?.affectedRows ?? (upd as any)?.rowsAffected ?? 0;
  if (affected < 1) return { ok: false, claimed: 0 }; // 并发竞争失败,本次不发
  // 推进成功后再发币;发币失败则回滚 claimedNN,避免「扣了额度没发币」
  const ok = await grantNN(db, userId, claimable, { type: "vesting_claim", refType: "vesting", refId: v.id, memo: v.source });
  if (!ok) {
    await db.update(nnVesting).set({ claimedNN: sql`GREATEST(${nnVesting.claimedNN} - ${claimable}, 0)` }).where(eq(nnVesting.id, v.id));
    return { ok: false, claimed: 0 };
  }
  return { ok: true, claimed: claimable };
}

/** 用户 AI 流水（最近 N 条） */
export async function getMyNNTransactions(db: Db, userId: number, limit = 50) {
  return db.select().from(nnTransactions)
    .where(eq(nnTransactions.userId, userId))
    .orderBy(desc(nnTransactions.createdAt)).limit(limit);
}

/** 运营：AI 营收概览（按类型汇总支出额，即平台收入） */
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
