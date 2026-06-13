/**
 * ICO 锁仓释放 + 质押收益分配(纯函数,可单测)。
 * 释放: 曲线前少后多,首月(悬崖)不放,vestMonths 月放完。
 * 收益: 「每人目标年化 + 奖励池封顶 + 线性」——
 *       每人每日应得 = 本人质押 × targetApr/365(线性,人人同一年化);
 *       全网当日满额 = 全网质押 × targetApr/365;
 *       奖励池剩余不足以满额时,按比例同等下调(factor),发完即止。不超发。
 */

/** 已释放本金比例。elapsedMonths 可为小数;cliff 内为 0,之后 ((p)^2) 凸曲线到 1。 */
export function vestedFraction(elapsedMonths: number, vestMonths: number, cliffMonths: number): number {
  if (elapsedMonths <= cliffMonths) return 0;
  if (elapsedMonths >= vestMonths) return 1;
  const p = (elapsedMonths - cliffMonths) / (vestMonths - cliffMonths); // 0..1
  return Math.min(1, Math.max(0, p * p)); // 凸(前少后多)
}

export interface StakerStake { userId: number; staked: number }

/**
 * 第 elapsedDays 天(0-based)的有效年化:从 aprStart 线性降到 aprEnd,declineDays 天降完,之后维持 aprEnd。
 * aprEnd=aprStart → 恒定年化。运营可随时改三个参数(如按当天币价调)。
 */
export function effectiveApr(aprStart: number, aprEnd: number, declineDays: number, elapsedDays: number): number {
  if (declineDays <= 0) return aprEnd;
  const f = Math.min(1, Math.max(0, elapsedDays / declineDays));
  return aprStart + (aprEnd - aprStart) * f;
}

export interface AprDistribution {
  dist: Map<number, number>; // 每人本次应得
  emitted: number;           // 本次实际产出(= Σ dist)
  uncapped: number;          // 满额应发(池子充足时的产出)
  factor: number;            // 下调系数(1=满额发放;<1=池子不足按比例下调)
}

/**
 * 「每人目标年化 + 奖励池封顶 + 线性」当日分配。
 *  - dailyRate = targetApr / 365
 *  - 每人满额应得 = 本人质押 × dailyRate(线性,人人同一年化)
 *  - 全网满额 uncapped = Σ;若 remainingPool < uncapped → factor = remainingPool/uncapped(同等下调)
 *  - 每人实得 = 本人质押 × dailyRate × factor。发完即止(factor=0)。
 */
export function distributeApr(
  targetApr: number,
  stakers: StakerStake[],
  remainingPool: number,
): AprDistribution {
  const out = new Map<number, number>();
  const active = stakers.filter((s) => s.staked > 0);
  const dailyRate = targetApr / 365;
  const uncapped = active.reduce((sum, s) => sum + s.staked * dailyRate, 0);
  if (active.length === 0 || uncapped <= 0 || remainingPool <= 0) {
    return { dist: out, emitted: 0, uncapped, factor: 0 };
  }
  const factor = remainingPool >= uncapped ? 1 : remainingPool / uncapped;
  let emitted = 0;
  for (const s of active) {
    const r = s.staked * dailyRate * factor;
    out.set(s.userId, r);
    emitted += r;
  }
  return { dist: out, emitted, uncapped, factor };
}

export interface StakeLot { userId: number; amount: number; ageDays: number }

/**
 * 「每笔资金各自计龄」当日分配:
 *  - 每批次有效年化 = effectiveApr(aprStart, aprEnd, declineDays, 本批次年龄天数)
 *    → 新资金/复投(age≈0)拿 aprStart(如200%),老资金沿曲线降到 aprEnd(如50%)。
 *  - 每批次满额日收益 = 本批次数量 × 该年化 / 365(线性,人人同龄同率)。
 *  - 奖励池剩余不足以满额时,按比例同等下调(factor)。发完即止、不超发。
 * 返回按 userId 汇总的应得。
 */
export function distributeAprLots(
  lots: StakeLot[],
  aprStart: number,
  aprEnd: number,
  declineDays: number,
  remainingPool: number,
): { perUser: Map<number, number>; emitted: number; uncapped: number; factor: number } {
  const active = lots.filter((l) => l.amount > 0);
  const lotReward = active.map((l) => l.amount * effectiveApr(aprStart, aprEnd, declineDays, l.ageDays) / 365);
  const uncapped = lotReward.reduce((a, b) => a + b, 0);
  const perUser = new Map<number, number>();
  if (active.length === 0 || uncapped <= 0 || remainingPool <= 0) {
    return { perUser, emitted: 0, uncapped, factor: 0 };
  }
  const factor = remainingPool >= uncapped ? 1 : remainingPool / uncapped;
  let emitted = 0;
  active.forEach((l, i) => {
    const r = lotReward[i] * factor;
    perUser.set(l.userId, (perUser.get(l.userId) ?? 0) + r);
    emitted += r;
  });
  return { perUser, emitted, uncapped, factor };
}

/** 给定目标年化、预期质押量、想撑的天数,建议奖励池大小 = 预期质押 × targetApr/365 × 天数。仅辅助配置。 */
export function suggestRewardPool(targetApr: number, expectedStaked: number, sustainDays: number): number {
  return expectedStaked * (targetApr / 365) * sustainDays;
}
