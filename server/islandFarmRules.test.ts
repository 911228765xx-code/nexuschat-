import { describe, expect, it } from "vitest";
import { cropReadyAt, DAILY_ORDERS, ISLAND_CROPS, ISLAND_ECONOMY_BOUNDARY, PET_CARE_COOLDOWN_MS, PET_EXPLORE_COOLDOWN_MS, STARTER_SEEDS, WORKSHOP_RECIPES } from "./islandFarmRules";

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

  it("starts every new island with bounded seeds and makes daily orders replenish gameplay inputs", () => {
    expect(STARTER_SEEDS).toEqual({ seed_wheat: 12, seed_tomato: 8, seed_moonberry: 4 });
    expect(DAILY_ORDERS).toHaveLength(2);
    expect(DAILY_ORDERS.every((order) => order.seedRewardKey.startsWith("seed_") && order.itReward > 0)).toBe(true);
  });

  it("keeps crafting and companion exploration inside controlled in-game rewards", () => {
    expect(WORKSHOP_RECIPES.sunrise_crate.inputs).toEqual({ wheat: 3, tomato: 2 });
    expect(WORKSHOP_RECIPES.sunrise_crate.outputKey).toBe("sunrise_crate");
    expect(PET_EXPLORE_COOLDOWN_MS).toBe(4 * 60 * 60 * 1000);
  });
});
