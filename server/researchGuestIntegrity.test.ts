import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Research guest loading integrity", () => {
  const source = readFileSync(new URL("../client/src/pages/Research.tsx", import.meta.url), "utf8");

  it("defers private report history and alert queries for visitors", () => {
    expect(source).toContain("trpc.research.getHistory.useQuery");
    expect(source).toContain("trpc.research.myAlerts.useQuery");
    const guards = source.match(/enabled: isResearchAuthed/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });
});

