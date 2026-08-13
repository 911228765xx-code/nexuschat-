/**
 * Alpha 猜涨跌：押「下一整根 K 线」——开盘价对收盘价。
 * horizonHours 列存分钟（历史字段名）；极旧单 24/72/168/720 仍按小时读。
 */
export const CALL_HORIZONS_MIN = [5, 15, 30, 60] as const;
export const CALL_LOCK_MINUTES = 1;

export function horizonToMinutes(horizonHoursField: number): number {
  if (horizonHoursField === 24 || horizonHoursField === 72 || horizonHoursField === 168 || horizonHoursField === 720) {
    return horizonHoursField * 60;
  }
  return horizonHoursField;
}

/** 短窗只滤掉计价噪声（0.01%）；旧长窗仍 ±1%。 */
export function deadbandBpForHorizon(horizonMin: number): number {
  return horizonMin <= 60 ? 1 : 100;
}

export function overdueVoidMs(horizonMin: number): number {
  return horizonMin <= 60 ? 2 * 3600_000 : 3 * 86_400_000;
}

export function isAlignedWindow(closeMs: number, horizonMin: number): boolean {
  const period = Math.max(1, horizonMin) * 60_000;
  return closeMs % period === 0;
}

/**
 * 下一整局：已开盘的 K 线不中途入场。
 * 距下一根开盘 ≤ lockMin 分钟则再跳一局（封窗）。
 */
export function nextFullWindow(
  horizonMin: number,
  nowMs = Date.now(),
  lockMin = CALL_LOCK_MINUTES,
): { openMs: number; closeMs: number } {
  const period = Math.max(1, horizonMin) * 60_000;
  const lock = Math.max(0, lockMin) * 60_000;
  const currentOpen = Math.floor(nowMs / period) * period;
  let open = currentOpen;
  if (nowMs - currentOpen > 2000) open = currentOpen + period;
  if (open - nowMs > 0 && open - nowMs <= lock) open += period;
  return { openMs: open, closeMs: open + period };
}

export function nextWindowCloseMs(
  horizonMin: number,
  nowMs = Date.now(),
  lockMin = CALL_LOCK_MINUTES,
): number {
  return nextFullWindow(horizonMin, nowMs, lockMin).closeMs;
}

export function nextWindowClose(
  horizonMin: number,
  nowMs = Date.now(),
  lockMin = CALL_LOCK_MINUTES,
): Date {
  return new Date(nextWindowCloseMs(horizonMin, nowMs, lockMin));
}
