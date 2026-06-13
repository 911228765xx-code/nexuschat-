/**
 * ICO 锁仓释放 + 质押收益分配(纯函数,可单测)。
 * 释放: 曲线前少后多,首月(悬崖)不放,vestMonths 月放完。
 * 收益: 固定奖励池按天发放(早多后少),开方权重(α)分配 + 保底平分,守恒不超发。
 */

/** 已释放本金比例。elapsedMonths 可为小数;cliff 内为 0,之后 ((p)^2) 凸曲线到 1。 */
export function vestedFraction(elapsedMonths: number, vestMonths: number, cliffMonths: number): number {
  if (elapsedMonths <= cliffMonths) return 0;
  if (elapsedMonths >= vestMonths) return 1;
  const p = (elapsedMonths - cliffMonths) / (vestMonths - cliffMonths); // 0..1
  return Math.min(1, Math.max(0, p * p)); // 凸(前少后多)
}

/** 第 d 天(1-based)的全网奖励产出:线性递减权重 w(d)=D−d+1,总和=池子。早多后少。 */
export function dailyEmission(rewardPoolTotal: number, rewardDays: number, day: number): number {
  if (day < 1 || day > rewardDays) return 0;
  const sumW = (rewardDays * (rewardDays + 1)) / 2;
  const w = rewardDays - day + 1;
  return rewardPoolTotal * (w / sumW);
}

export interface StakerStake { userId: number; staked: number }

/**
 * 把当天产出 emission 分给各质押者:
 *  - baseShare 比例平分给所有人(地板)
 *  - 其余按 开方权重(staked^alpha)份额分
 * 返回每人应得,总和 == emission(守恒)。
 */
export function distribute(
  emission: number,
  stakers: StakerStake[],
  alpha: number,
  baseShare: number,
): Map<number, number> {
  const out = new Map<number, number>();
  const active = stakers.filter((s) => s.staked > 0);
  if (active.length === 0 || emission <= 0) return out;
  const basePool = emission * baseShare;
  const weightPool = emission - basePool;
  const weights = active.map((s) => Math.pow(s.staked, alpha));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const baseEach = basePool / active.length;
  active.forEach((s, i) => {
    const byWeight = sumW > 0 ? weightPool * (weights[i] / sumW) : 0;
    out.set(s.userId, baseEach + byWeight);
  });
  return out;
}

/** 给定目标年化与预期质押量,建议奖励池大小(让首日 APR≈targetApr)。仅辅助配置。 */
export function suggestRewardPool(targetApr: number, expectedStaked: number, rewardDays: number): number {
  // 首日 emission ≈ targetApr/365 × staked;由 dailyEmission(d=1)=pool×D/(D(D+1)/2)=pool×2/(D+1)
  const day1Emission = (targetApr / 365) * expectedStaked;
  return (day1Emission * (rewardDays + 1)) / 2;
}
