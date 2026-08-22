import { describe, expect, it } from "vitest";
import { islandFarmRouter } from "./routers/islandFarm";

describe("island farm router", () => {
  it("exposes only the required first-phase state and server-settlement actions", () => {
    expect(Object.keys(islandFarmRouter._def.procedures).sort()).toEqual([
      "carePet",
      "getState",
      "harvest",
      "plant",
      "upgradeWorkshop",
    ]);
  });

  it("requires an authenticated context before any island state is read", async () => {
    const caller = islandFarmRouter.createCaller({ user: null } as any);
    await expect(caller.getState()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
