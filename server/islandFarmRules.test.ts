import { describe, expect, it } from "vitest";
import { cropReadyAt, DAILY_ORDERS, DOCK_COMPLETION_BONUS, GROUP_ISLAND_DAILY_GOAL, groupIslandVisual, ISLAND_CROPS, ISLAND_ECONOMY_BOUNDARY, PET_CARE_COOLDOWN_MS, PET_EXPLORE_COOLDOWN_MS, plotUnlocked, STARTER_SEEDS, unlockedPlotCount, WORKSHOP_RECIPES } from "./islandFarmRules";

describe("island farm rules", () => {
  it("keeps the three launch crops on a short but server-verifiable growth curve", () => {
    expect(Object.keys(ISLAND_CROPS)).toEqual(["wheat", "tomato", "moonberry"]);
    expect(ISLAND_CROPS.wheat.growMinutes).toBeLessThan(ISLAND_CROPS.tomato.growMinutes);
    expect(ISLAND_CROPS.tomato.growMinutes).toBeLessThan(ISLAND_CROPS.moonberry.growMinutes);
    expect(ISLAND_CROPS.moonberry.itReward).toBeGreaterThan(ISLAND_CROPS.tomato.itReward);
  });

  it("derives readiness from a server timestamp rather than a client-supplied duration", () => {
    const plantedAt = new Date("2026-08-21T00:00:00.000Z");
    expect(cropReadyAt("tomato", plantedAt).toISOString()).toBe("2026-08-21T00:02:00.000Z");
    expect(PET_CARE_COOLDOWN_MS).toBe(600_000);
  });

  it("reserves BIT settlement for a future guarded market and keeps IT non-transferable in gameplay", () => {
    expect(ISLAND_ECONOMY_BOUNDARY.settlementCurrency).toBe("BIT");
    expect(ISLAND_ECONOMY_BOUNDARY.bitMarketEnabled).toBe(false);
    expect(ISLAND_ECONOMY_BOUNDARY.bitConversionEnabled).toBe(false);
    expect(ISLAND_ECONOMY_BOUNDARY.automaticBitRewardsEnabled).toBe(false);
    expect(ISLAND_ECONOMY_BOUNDARY.itTransferable).toBe(false);
  });

  it("keeps group-island daily goals small and server-defined", () => {
    expect(GROUP_ISLAND_DAILY_GOAL).toBe(5);
  });

  it("starts every new island with bounded seeds and makes daily orders replenish gameplay inputs", () => {
    expect(STARTER_SEEDS).toEqual({ seed_wheat: 12, seed_tomato: 8, seed_moonberry: 4 });
    expect(DAILY_ORDERS).toHaveLength(3);
    expect(DAILY_ORDERS.map((order) => order.cropKey)).toEqual(["wheat", "tomato", "moonberry"]);
    expect(DAILY_ORDERS.every((order) => order.seedRewardKey.startsWith("seed_") && order.itReward > 0)).toBe(true);
    expect(DOCK_COMPLETION_BONUS.itReward).toBeGreaterThan(0);
    expect(DOCK_COMPLETION_BONUS.seedRewardQuantity).toBeGreaterThan(0);
  });

  it("unlocks six plots by farm level instead of a client-side fake lock", () => {
    expect(unlockedPlotCount(1)).toBe(3);
    expect(unlockedPlotCount(3)).toBe(4);
    expect(unlockedPlotCount(5)).toBe(5);
    expect(unlockedPlotCount(8)).toBe(6);
    expect(plotUnlocked(1, 2)).toBe(true);
    expect(plotUnlocked(1, 3)).toBe(false);
    expect(plotUnlocked(3, 3)).toBe(true);
  });

  it("keeps crafting and companion exploration inside controlled in-game rewards", () => {
    expect(WORKSHOP_RECIPES.sunrise_crate.inputs).toEqual({ wheat: 3, tomato: 2 });
    expect(WORKSHOP_RECIPES.sunrise_crate.outputKey).toBe("sunrise_crate");
    expect(WORKSHOP_RECIPES.moonlit_seedling.requiredWorkshopLevel).toBe(2);
    expect(WORKSHOP_RECIPES.moonlit_seedling.outputKey).toBe("seed_moonberry");
    expect(PET_EXPLORE_COOLDOWN_MS).toBe(4 * 60 * 60 * 1000);
  });

  it("turns group-island crate counts into visible stages", () => {
    expect(groupIslandVisual(0, 5).stage).toBe(1);
    expect(groupIslandVisual(2, 5).stage).toBe(2);
    expect(groupIslandVisual(4, 5).stage).toBe(3);
    expect(groupIslandVisual(5, 5)).toMatchObject({ stage: 4, percent: 100 });
  });
});
