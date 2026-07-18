/**
 * AC 积分模型逻辑测试：验证段位/加成/升段奖/日俸/连签/每日上限/价值分/质押/TGE
 * 算出来的数与设计文档一致。打的都是真实实现函数。
 */
import { describe, it, expect } from "vitest";
import {
  RANK_TIERS, tierForScore, tierBonus, tierDaily, tierUpReward, reputationBonus,
} from "./rankEngine";
import { dailyNpCap, signinStreakReward } from "./routers/user";
import { estimateNn } from "./routers/tge";
import { stakePayout } from "./callResolver";

// ─── 段位表 ────────────────────────────────────────────────────────────────────
describe("段位表 RANK_TIERS", () => {
  it("共 10 段，名称与门槛符合设计", () => {
    expect(RANK_TIERS).toHaveLength(10);
    expect(RANK_TIERS.map((t) => t.name)).toEqual([
      "青铜", "白银", "黄金", "铂金", "钻石", "星耀", "大师", "宗师", "王者", "传奇",
    ]);
    expect(RANK_TIERS.map((t) => t.min)).toEqual([
      500, 2000, 6000, 15000, 40000, 100000, 250000, 600000, 1200000, 2500000,
    ]);
  });
  it("加成 10%→100%，每段 +10%", () => {
    expect(RANK_TIERS.map((t) => Math.round(t.bonus * 100))).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });
  it("日俸：1-5 段无，6-10 段 1000→5000", () => {
    expect(RANK_TIERS.map((t) => t.daily)).toEqual([0, 0, 0, 0, 0, 1000, 2000, 3000, 4000, 5000]);
  });
});

// ─── 累积价值分 → 段位 ──────────────────────────────────────────────────────────
describe("tierForScore（累积价值分→段位序号）", () => {
  it("不足青铜门槛 = 无段位(0)", () => {
    expect(tierForScore(0)).toBe(0);
    expect(tierForScore(499)).toBe(0);
    expect(tierForScore(135)).toBe(0); // 单日价值分远不够累积门槛
  });
  it("跨过门槛即升段", () => {
    expect(tierForScore(500)).toBe(1);     // 青铜
    expect(tierForScore(5999)).toBe(2);    // 白银（未到黄金 6000）
    expect(tierForScore(6000)).toBe(3);    // 黄金
    expect(tierForScore(2500000)).toBe(10);// 传奇
    expect(tierForScore(9_999_999)).toBe(10);
  });
});

describe("tierBonus / tierDaily / tierUpReward", () => {
  it("青铜：+10% / 无日俸 / 升段奖=门槛÷10=50", () => {
    expect(tierBonus(1)).toBeCloseTo(0.10);
    expect(tierDaily(1)).toBe(0);
    expect(tierUpReward(1)).toBe(50);
  });
  it("星耀(6)：+60% / 日俸1000 / 升段奖=100000÷10=10000", () => {
    expect(tierBonus(6)).toBeCloseTo(0.60);
    expect(tierDaily(6)).toBe(1000);
    expect(tierUpReward(6)).toBe(10000);
  });
  it("传奇(10)：+100% / 日俸5000 / 升段奖=2500000÷10=250000", () => {
    expect(tierBonus(10)).toBeCloseTo(1.00);
    expect(tierDaily(10)).toBe(5000);
    expect(tierUpReward(10)).toBe(250000);
  });
  it("无段位(0)：加成/日俸/升段奖均为 0", () => {
    expect(tierBonus(0)).toBe(0);
    expect(tierDaily(0)).toBe(0);
    expect(tierUpReward(0)).toBe(0);
  });
});

// ─── 声誉加成 ────────────────────────────────────────────────────────────────────
describe("reputationBonus（封顶 0.3）", () => {
  it("0 声誉 = 0 加成", () => expect(reputationBonus(0)).toBe(0));
  it("线性 rep/50000", () => {
    expect(reputationBonus(5000)).toBeCloseTo(0.1);
    expect(reputationBonus(10000)).toBeCloseTo(0.2);
  });
  it("封顶 0.3", () => {
    expect(reputationBonus(15000)).toBeCloseTo(0.3);
    expect(reputationBonus(50000)).toBe(0.3);
    expect(reputationBonus(999999)).toBe(0.3);
  });
});

// ─── 结算公式：实得 = base×(1+段位+声誉) + 日俸 ──────────────────────────────────
describe("AC 结算公式（用真实 tierBonus/reputationBonus 组合）", () => {
  const settle = (base: number, tier: number, rep: number) =>
    Math.round(base * (1 + tierBonus(tier) + reputationBonus(rep))) + tierDaily(tier);

  it("base400 + 黄金(+30%) + 声誉0 = 520", () => {
    expect(settle(400, 3, 0)).toBe(520);
  });
  it("base400 + 星耀(+60%) + 日俸1000 = 1640", () => {
    expect(settle(400, 6, 0)).toBe(1640);
  });
  it("自己不做任务 base=0 → 加成乘出来仍是 0（日俸另算）", () => {
    expect(Math.round(0 * (1 + tierBonus(10)))).toBe(0);
  });
});

// ─── 连续签到 ────────────────────────────────────────────────────────────────────
describe("signinStreakReward（第1天10，递增，约7天封顶80）", () => {
  it("阶梯递增", () => {
    expect(signinStreakReward(1)).toBe(10);
    expect(signinStreakReward(2)).toBe(22);
    expect(signinStreakReward(6)).toBe(70);
  });
  it("第7天起封顶 80", () => {
    expect(signinStreakReward(7)).toBe(80);
    expect(signinStreakReward(30)).toBe(80);
  });
});

// ─── 每日产出上限（号龄分级）──────────────────────────────────────────────────────
describe("dailyNpCap（号龄分级）", () => {
  it("新号 <7 天 = 200/天", () => {
    expect(dailyNpCap(new Date())).toBe(200);
    expect(dailyNpCap(new Date(Date.now() - 3 * 86400000))).toBe(200);
  });
  it("老号 ≥7 天 = 2000/天", () => {
    expect(dailyNpCap(new Date(Date.now() - 30 * 86400000))).toBe(2000);
  });
});

// ─── 价值分权重聚合（设计文档示例）──────────────────────────────────────────────
describe("团队价值分加权求和", () => {
  const W = { 普通: 1, AI: 2, 群主: 3, Plus: 4, Pro: 6 };
  it("40普通+15AI+5群主+8Plus+3Pro = 135", () => {
    const score = 40 * W.普通 + 15 * W.AI + 5 * W.群主 + 8 * W.Plus + 3 * W.Pro;
    expect(score).toBe(135);
  });
  it("一个 Pro(6) ≈ 6 个普通(1)", () => {
    expect(W.Pro).toBe(6 * W.普通);
  });
});

// ─── 策展质押结算 ────────────────────────────────────────────────────────────────
describe("stakePayout（押对+30% / 押错销毁 / void退本）", () => {
  it("押对：100 → 130", () => expect(stakePayout(100, "win")).toBe(130));
  it("押错：100 → 0（销毁）", () => expect(stakePayout(100, "lose")).toBe(0));
  it("void：100 → 100（退本）", () => expect(stakePayout(100, "void")).toBe(100));
  it("净 AC 出口：胜率40%时平均返还 < 本金（净销毁）", () => {
    const winRate = 0.4;
    const avg = winRate * stakePayout(100, "win") + (1 - winRate) * stakePayout(100, "lose");
    expect(avg).toBeLessThan(100); // 0.4*130 + 0.6*0 = 52 < 100
  });
});

// ─── TGE 兑换 ────────────────────────────────────────────────────────────────────
describe("estimateNn（TGE pro-rata：nnPool×个人/全站）", () => {
  it("普通用户：池1.05M AI / 全站60亿AC / 持7.5万AC ≈ 13 AI", () => {
    expect(estimateNn(1_050_000, 75_000, 6_000_000_000)).toBe(13);
  });
  it("持有越多兑越多（单调）", () => {
    const a = estimateNn(1_050_000, 2_000_000, 6_000_000_000);
    const b = estimateNn(1_050_000, 75_000, 6_000_000_000);
    expect(a).toBeGreaterThan(b);
  });
  it("无快照/全站0 → 0", () => {
    expect(estimateNn(1_050_000, 0, 6_000_000_000)).toBe(0);
    expect(estimateNn(1_050_000, 75_000, 0)).toBe(0);
  });
});
