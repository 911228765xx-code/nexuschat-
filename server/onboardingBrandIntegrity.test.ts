import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Onboarding brand integrity", () => {
  const source = readFileSync(new URL("../client/src/components/Onboarding.tsx", import.meta.url), "utf8");

  it("does not display the legacy product brand to new users", () => {
    expect(source).toContain("BitChat Official");
    expect(source).toContain("like BitChat!");
    expect(source).not.toMatch(/NexusChat(?!_onboarded)/);
  });
});

