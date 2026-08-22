import { describe, expect, it } from "vitest";
import { islandFarmRouter } from "./routers/islandFarm";

describe("island farm router", () => {
  it("exposes the complete server-settlement loop and no market or BIT payout procedure", () => {
    expect(Object.keys(islandFarmRouter._def.procedures).sort()).toEqual([
      "carePet",
      "claimDailyOrder",
      "contributeToGroupIsland",
      "craftWorkshop",
      "exploreWithPet",
      "getGroupIslandProgress",
      "getState",
      "harvest",
      "plant",
      "upgradeWorkshop",
    ]);
    expect(Object.keys(islandFarmRouter._def.procedures)).not.toContain("trade");
    expect(Object.keys(islandFarmRouter._def.procedures)).not.toContain("convertToBit");
  });

  it("requires an authenticated context before any island state is read", async () => {
    const caller = islandFarmRouter.createCaller({ user: null } as any);
    await expect(caller.getState()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
