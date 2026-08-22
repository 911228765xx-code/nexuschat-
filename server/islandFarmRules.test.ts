import { describe, expect, it } from "vitest";
import { cropReadyAt, ISLAND_CROPS, ISLAND_ECONOMY_BOUNDARY, PET_CARE_COOLDOWN_MS } from "./islandFarmRules";

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
});
