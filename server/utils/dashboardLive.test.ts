import { describe, it, expect } from "vitest";
import { liveDelta, applyDashboardLive } from "./dashboardLive";

describe("dashboardLive 用户数只增不减", () => {
  const base = { usersTotal: 1200, activeToday: 80, subscribers: 30, extras: [] };

  it("同一天夜里不会比傍晚少", () => {
    const day = Date.UTC(2026, 7, 18, 4, 0, 0); // 上海 12:00
    const night = Date.UTC(2026, 7, 18, 15, 50, 0); // 上海 23:50
    const noonUsers = liveDelta("users", 1200, "users", day);
    const nightUsers = liveDelta("users", 1200, "users", night);
    expect(nightUsers).toBeGreaterThanOrEqual(noonUsers);
  });

  it("跨日用户总数继续往上", () => {
    const d1 = Date.UTC(2026, 7, 17, 15, 59, 0); // 上海 23:59
    const d2 = Date.UTC(2026, 7, 18, 1, 0, 0); // 上海次日 09:00
    expect(liveDelta("users", 1200, "users", d2)).toBeGreaterThan(liveDelta("users", 1200, "users", d1));
  });

  it("今日活跃在当天内单调不减", () => {
    const t1 = Date.UTC(2026, 7, 18, 2, 0, 0);
    const t2 = Date.UTC(2026, 7, 18, 10, 0, 0);
    expect(liveDelta("active", 80, "active", t2)).toBeGreaterThanOrEqual(liveDelta("active", 80, "active", t1));
  });

  it("apply 后展示用户数 ≥ 基数", () => {
    const live = applyDashboardLive(base, Date.UTC(2026, 7, 18, 8, 0, 0));
    expect(live.usersTotal).toBeGreaterThanOrEqual(base.usersTotal);
  });

  it("社区用户每天约增长 20 人", () => {
    const start = Date.UTC(2026, 7, 20, 16, 0, 0); // 上海 8/21 00:00
    const end = Date.UTC(2026, 7, 21, 15, 59, 0); // 上海 8/22 23:59
    const gained = liveDelta("users", 1200, "users", end) - liveDelta("users", 1200, "users", start);
    expect(gained).toBeGreaterThanOrEqual(14);
    expect(gained).toBeLessThanOrEqual(26);
  });

  it("今日活跃在不同日期具有明显但确定的日间变化幅度", () => {
    const noonA = liveDelta("active", 1200, "active", Date.UTC(2026, 7, 20, 4, 0, 0));
    const noonB = liveDelta("active", 1200, "active", Date.UTC(2026, 7, 22, 4, 0, 0));
    expect(Math.abs(noonA - noonB)).toBeGreaterThan(100);
  });

  it("当前下午时段的演示活跃基线保持在约 3,500 范围", () => {
    const baseWithRealActive = 1455;
    const display = baseWithRealActive + liveDelta("active", baseWithRealActive, "active", Date.UTC(2026, 7, 21, 7, 20, 0));
    expect(display).toBeGreaterThanOrEqual(3300);
    expect(display).toBeLessThanOrEqual(3700);
  });
});
