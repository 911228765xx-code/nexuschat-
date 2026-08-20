import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Login mobile interaction integrity", () => {
  const source = readFileSync(new URL("../client/src/pages/Login.tsx", import.meta.url), "utf8");

  it("keeps explicit touch manipulation on the login page shell", () => {
    expect(source).toContain('touchAction: "manipulation" as const');
  });
});
