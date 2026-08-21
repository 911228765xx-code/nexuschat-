/**
 * 社区生态仪表盘：在「真实 + 加成」之上叠一层确定的增量。
 * 用户总数只增不减（按上海日累加）；今日活跃/今日类指标只在当天内往上走。
 * App 端 lib/dashboardLive.ts 必须保持同一套公式。
 */
export type DashKind = "users" | "active" | "subs" | "daily" | "stock";

const SH_MS = 8 * 3600 * 1000;
const EPOCH = Date.UTC(2026, 7, 1);

export function extraKind(label: string): "daily" | "stock" {
  return /今日|当天|24h|消息|动态|活跃|在线|发言/i.test(label) ? "daily" : "stock";
}

export function shanghaiParts(nowMs: number): { sec: number; dayIndex: number } {
  const shifted = nowMs + SH_MS;
  const dayIndex = Math.floor(shifted / 86_400_000);
  const sec = Math.floor((shifted % 86_400_000) / 1000);
  return { sec, dayIndex };
}

function mix01(key: string, salt: number): number {
  let h = (salt ^ 2166136261) >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return (h % 10000) / 10000;
}

function dailyUsersBoost(dayIndex: number): number {
  // 演示型社区增长：每天约 +20，保留小幅确定性波动，避免每日完全相同。
  return 14 + Math.floor(mix01("users", dayIndex) * 13);
}

function dailyActiveFactor(dayIndex: number): number {
  // 日活展示在不同日期保持较明显的日间差异（约 ±28%），同一天内仍只增不减。
  return 0.72 + mix01("active-day", dayIndex) * 0.56;
}

function usersDelta(nowMs: number): number {
  const { sec, dayIndex } = shanghaiParts(nowMs);
  const epochDay = shanghaiParts(EPOCH).dayIndex;
  const daysElapsed = Math.max(0, dayIndex - epochDay);
  let sum = 0;
  for (let d = 0; d < daysElapsed; d++) sum += dailyUsersBoost(epochDay + d);
  return sum + Math.floor(dailyUsersBoost(dayIndex) * (sec / 86400));
}

export function liveDelta(kind: DashKind, base: number, key: string, nowMs: number): number {
  const { sec, dayIndex } = shanghaiParts(nowMs);
  const floor = Math.max(0, Math.floor(base));

  if (kind === "users") return usersDelta(nowMs);

  if (kind === "subs") {
    const perHour = Math.max(0.08, floor * 0.00004);
    return Math.floor(((nowMs - EPOCH) / 3_600_000) * perHour);
  }

  // 今日活跃 / 今日类：当天内只增不减，跨日自然从 0 再长
  if (kind === "active") {
    const span = Math.max(420, Math.round(Math.max(floor, 120) * 1.88 * dailyActiveFactor(dayIndex)));
    return Math.floor(span * (sec / 86400));
  }
  if (kind === "daily") {
    const daily = Math.max(28, Math.round(Math.max(floor, 40) * 0.09));
    return Math.floor(daily * (sec / 86400));
  }

  const perHour = Math.max(0.12, floor * 0.00005);
  const grown = Math.floor(((nowMs - EPOCH) / 3_600_000) * perHour);
  const dayJitter = Math.floor(mix01(key, dayIndex) * Math.max(1, floor * 0.002));
  return grown + dayJitter;
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
