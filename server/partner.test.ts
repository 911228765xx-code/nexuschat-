/** 合伙人模型纯函数测试：档位判定/边界、手续费拆分、奖励比例。 */
import { describe, it, expect } from "vitest";
import { PARTNER_TIERS, tierForStake, tierOrder, getPartnerTier, FEE_POOL_PCT, PLATFORM_FEE_PCT } from "./partner";

describe("合伙人档位判定", () => {
  it("边界：2999 无身份 / 3000 合伙人 / 9999 合伙人", () => {
    expect(tierForStake(2999)).toBeNull();
    expect(tierForStake(3000)?.key).toBe("partner");
    expect(tierForStake(9999)?.key).toBe("partner");
  });
  it("边界：10000 超级 / 49999 超级 / 50000 联创 / 100000 联创", () => {
    expect(tierForStake(10000)?.key).toBe("super");
    expect(tierForStake(49999)?.key).toBe("super");
    expect(tierForStake(50000)?.key).toBe("founder");
    expect(tierForStake(100000)?.key).toBe("founder");
  });
  it("追加认购只升不降：tierOrder 单调", () => {
    expect(tierOrder(null)).toBe(0);
    expect(tierOrder("partner")).toBeLessThan(tierOrder("super"));
    expect(tierOrder("super")).toBeLessThan(tierOrder("founder"));
  });
});

describe("分红与奖励参数", () => {
  it("手续费拆分：1% + 1.2% + 1.5% = 3.7%（5% 手续费的 74%）", () => {
    const sum = PARTNER_TIERS.reduce((s, t) => s + t.feeSharePct, 0);
    expect(sum).toBeCloseTo(FEE_POOL_PCT, 6);
    expect(FEE_POOL_PCT / PLATFORM_FEE_PCT).toBeCloseTo(0.74, 6);
  });
  it("USDT 奖励比例：5% / 8% / 10%", () => {
    expect(getPartnerTier("partner")?.bonusPct).toBe(5);
    expect(getPartnerTier("super")?.bonusPct).toBe(8);
    expect(getPartnerTier("founder")?.bonusPct).toBe(10);
  });
  it("奖励金额示例：3000U 合伙人 150U；10000U 超级 800U；50000U 联创 5000U", () => {
    expect(Math.floor((3000 * 5) / 100)).toBe(150);
    expect(Math.floor((10000 * 8) / 100)).toBe(800);
    expect(Math.floor((50000 * 10) / 100)).toBe(5000);
  });
  it("档位区间连续无空洞", () => {
    expect(PARTNER_TIERS[0].minUsdt).toBe(3000);
    expect(PARTNER_TIERS[1].minUsdt).toBe(PARTNER_TIERS[0].maxUsdt + 1);
    expect(PARTNER_TIERS[2].minUsdt).toBe(PARTNER_TIERS[1].maxUsdt + 1);
    expect(PARTNER_TIERS[2].maxUsdt).toBe(100000);
  });
});
