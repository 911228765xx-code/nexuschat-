/**
 * BIT 段位空投：月度递增额度、10 段位均分、同段位均分到人。
 */
import { describe, it, expect } from "vitest";
import {
  bitAirdropMonthIndex,
  bitAirdropDailyPool,
  bitAirdropMonthlyTotal,
  bitAirdropTierPot,
  bitAirdropPerUser,
  bitAirdropSchedule,
  bitAirdropItCost,
  bitAirdropDonateLadder,
  BIT_AIRDROP_BASE_DAILY,
  BIT_AIRDROP_MONTHLY_STEP,
  BIT_AIRDROP_IT_COSTS,
} from "./bitRankAirdrop";

describe("bitAirdropMonthIndex", () => {
  it("起点当月 = 第 1 月", () => {
    expect(bitAirdropMonthIndex("2026-08-01", "2026-08-01")).toBe(1);
    expect(bitAirdropMonthIndex("2026-08-31", "2026-08-01")).toBe(1);
  });
  it("下一自然月递增", () => {
    expect(bitAirdropMonthIndex("2026-09-01", "2026-08-01")).toBe(2);
    expect(bitAirdropMonthIndex("2027-07-01", "2026-08-01")).toBe(12);
  });
  it("早于起点 = 0", () => {
    expect(bitAirdropMonthIndex("2026-07-31", "2026-08-01")).toBe(0);
  });
});

describe("bitAirdropDailyPool / monthly", () => {
  it("1–11 月日额度与月总量符合产品表", () => {
    const expected = [
      [1000, 30000], [1500, 45000], [2000, 60000], [2500, 75000],
      [3000, 90000], [3500, 105000], [4000, 120000], [4500, 135000],
      [5000, 150000], [5500, 165000], [6000, 180000],
    ] as const;
    expected.forEach(([daily, monthly], i) => {
      const month = i + 1;
      expect(bitAirdropDailyPool(month)).toBe(daily);
      expect(bitAirdropMonthlyTotal(month)).toBe(monthly);
    });
  });
  it("递推公式：base + (m-1)*500", () => {
    for (let m = 1; m <= 24; m++) {
      expect(bitAirdropDailyPool(m)).toBe(BIT_AIRDROP_BASE_DAILY + (m - 1) * BIT_AIRDROP_MONTHLY_STEP);
    }
  });
  it("未开始 = 0", () => {
    expect(bitAirdropDailyPool(0)).toBe(0);
  });
});

describe("tier pot / per user", () => {
  it("日 1000 均分 10 段位 → 每段 100", () => {
    expect(bitAirdropTierPot(1000)).toBe(100);
  });
  it("日 1500 均分 10 段位 → 每段 150", () => {
    expect(bitAirdropTierPot(1500)).toBe(150);
  });
  it("同段位 3 人均分 100 → 每人 33", () => {
    expect(bitAirdropPerUser(100, 3)).toBe(33);
  });
  it("无人 / 零份额 → 0", () => {
    expect(bitAirdropPerUser(100, 0)).toBe(0);
    expect(bitAirdropPerUser(0, 5)).toBe(0);
  });
});

describe("bitAirdropSchedule", () => {
  it("返回 11 个月进度表", () => {
    const s = bitAirdropSchedule("2026-08-15");
    expect(s.monthIndex).toBe(1);
    expect(s.dailyPool).toBe(1000);
    expect(s.tierPot).toBe(100);
    expect(s.schedule).toHaveLength(11);
    expect(s.schedule[0]).toEqual({ month: 1, daily: 1000, monthly: 30000 });
    expect(s.schedule[10]).toEqual({ month: 11, daily: 6000, monthly: 180000 });
    expect(s.tiers).toHaveLength(10);
    expect(s.donateLadder).toHaveLength(10);
  });
});

describe("bitAirdropItCost / donate ladder", () => {
  it("V1–V10 捐献 IT = 1000…10000", () => {
    expect([...BIT_AIRDROP_IT_COSTS]).toEqual([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]);
    for (let t = 1; t <= 10; t++) {
      expect(bitAirdropItCost(t)).toBe(t * 1000);
    }
    expect(bitAirdropItCost(0)).toBe(0);
    expect(bitAirdropItCost(11)).toBe(0);
  });
  it("donateLadder 与段位一一对应", () => {
    const ladder = bitAirdropDonateLadder();
    expect(ladder[0]).toMatchObject({ tier: 1, itCost: 1000 });
    expect(ladder[9]).toMatchObject({ tier: 10, itCost: 10000 });
  });
});
