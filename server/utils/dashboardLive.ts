/**
 * 社区生态仪表盘：在「真实 + 加成」之上叠一层确定的时段波动。
 * 同一时刻所有用户看到同一组数字（用上海时区，不按请求随机）。
 * App 端 lib/dashboardLive.ts 需保持同一套公式，才能在两次拉取之间本地连跳。
 */
export type DashKind = "users" | "active" | "subs" | "daily" | "stock";

const SH_MS = 8 * 3600 * 1000;
const EPOCH = Date.UTC(2026, 7, 1); // 单调增量的起点，避免 lifetime 指标每天归零

export function extraKind(label: string): "daily" | "stock" {
  return /今日|当天|24h|消息|动态|活跃|在线|发言/i.test(label) ? "daily" : "stock";
}

export function shanghaiParts(nowMs: number): { sec: number; dayIndex: number } {
  const shifted = nowMs + SH_MS;
  const dayIndex = Math.floor(shifted / 86_400_000);
  const sec = Math.floor((shifted % 86_400_000) / 1000);
  return { sec, dayIndex };
}

/** 夜间低、午间/晚间高峰，范围约 0.16–1.0 */
export function activityFactor(sec: number): number {
  const h = sec / 3600;
  const p1 = Math.exp(-((h - 11.5) ** 2) / 10);
  const p2 = Math.exp(-((h - 21) ** 2) / 7);
  return Math.min(1, 0.16 + 0.52 * p1 + 0.84 * p2);
}

function mix01(key: string, salt: number): number {
  let h = (salt ^ 2166136261) >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return (h % 10000) / 10000;
}

export function liveDelta(kind: DashKind, base: number, key: string, nowMs: number): number {
  const { sec, dayIndex } = shanghaiParts(nowMs);
  const act = activityFactor(sec);
  const jitter = mix01(key, dayIndex);
  const floor = Math.max(0, Math.floor(base));

  if (kind === "users") {
    // 每天确定性增加 300–600，跨日累加，日内随活跃度慢慢长
    const epochDay = shanghaiParts(EPOCH).dayIndex;
    const daysElapsed = Math.max(0, dayIndex - epochDay);
    let sum = 0;
    for (let d = 0; d < daysElapsed; d++) sum += 300 + Math.floor(mix01("users", epochDay + d) * 301);
    const today = 300 + Math.floor(mix01("users", dayIndex) * 301);
    const progress = Math.min(1, (sec / 86400) * (0.45 + 0.55 * act));
    return sum + Math.floor(today * progress);
  }
  if (kind === "subs") {
    const perHour = Math.max(0.08, floor * 0.00004);
    return Math.floor(((nowMs - EPOCH) / 3_600_000) * perHour);
  }
  if (kind === "active") {
    // 大半天振幅 + 十几秒大浪 + 数秒微跳，盯着看也能感到在跳
    const span = Math.max(180, Math.round(Math.max(floor, 120) * 0.88));
    const wave = Math.sin(sec / 15 + jitter * 6) * 0.5 + 0.5;
    const micro = Math.sin(sec / 3.6 + jitter * 4) * 0.5 + 0.5;
    const tick = Math.sin(sec * 1.8 + jitter * 9) * 0.5 + 0.5;
    const breath = Math.max(0.34, act);
    return Math.floor(span * breath * (0.16 + 0.50 * wave + 0.24 * micro + 0.10 * tick));
  }
  if (kind === "daily") {
    const daily = Math.max(28, Math.round(Math.max(floor, 40) * 0.09));
    const progress = (sec / 86400) * (0.38 + 0.62 * act);
    const wave = Math.sin(sec / 43 + jitter * 5) * 0.5 + 0.5;
    return Math.floor(daily * progress + wave * Math.max(2, daily * 0.02));
  }
  const perHour = Math.max(0.12, floor * 0.00005);
  const wave = Math.sin(sec / 67 + jitter * 3) * 0.5 + 0.5;
  return Math.floor(((nowMs - EPOCH) / 3_600_000) * perHour + wave * Math.max(1, floor * 0.002));
}

export type DashboardLivePayload = {
  usersTotal: number;
  activeToday: number;
  subscribers: number;
  extras: { id: string; label: string; value: number; icon?: string }[];
};

export function applyDashboardLive<T extends DashboardLivePayload>(base: T, nowMs: number): T {
  return {
    ...base,
    usersTotal: base.usersTotal + liveDelta("users", base.usersTotal, "users", nowMs),
    activeToday: base.activeToday + liveDelta("active", base.activeToday, "active", nowMs),
    subscribers: base.subscribers + liveDelta("subs", base.subscribers, "subs", nowMs),
    extras: base.extras.map((e) => ({
      ...e,
      value: e.value + liveDelta(extraKind(e.label), e.value, e.id || e.label, nowMs),
    })),
  };
}

/** 用拉取时的快照继续往当前时刻推，避免把 live 叠两次 */
export function continueDashboardLive<T extends DashboardLivePayload>(
  snapshot: T,
  fetchedAtMs: number,
  nowMs: number,
): T {
  const then = applyDashboardLive(snapshot, fetchedAtMs);
  const now = applyDashboardLive(snapshot, nowMs);
  return {
    ...snapshot,
    usersTotal: snapshot.usersTotal + (now.usersTotal - then.usersTotal),
    activeToday: snapshot.activeToday + (now.activeToday - then.activeToday),
    subscribers: snapshot.subscribers + (now.subscribers - then.subscribers),
    extras: snapshot.extras.map((e, i) => ({
      ...e,
      value: e.value + ((now.extras[i]?.value ?? e.value) - (then.extras[i]?.value ?? e.value)),
    })),
  };
}
