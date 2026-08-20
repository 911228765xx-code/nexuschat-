import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Trading guest loading integrity", () => {
  const source = readFileSync(new URL("../client/src/pages/Trading.tsx", import.meta.url), "utf8");

  it("defers all private portfolio queries until the user is authenticated", () => {
    expect(source).toContain("trpc.trading.listPositions.useQuery");
    expect(source).toContain("trpc.trading.listAlerts.useQuery");
    expect(source).toContain("trpc.trading.getPnlCalendar.useQuery");

    const gatedQueries = source.match(/enabled: isAuthenticated/g) ?? [];
    expect(gatedQueries.length).toBeGreaterThanOrEqual(5);
  });
});
