import { describe, expect, it } from "vitest";
import { detectCapacitorShell } from "../client/src/lib/isCapacitorShell";

describe("detectCapacitorShell", () => {
  it("returns false in a normal browser", () => {
    expect(detectCapacitorShell({ location: { protocol: "https:" } })).toBe(false);
  });

  it("detects Capacitor.isNativePlatform()", () => {
    expect(
      detectCapacitorShell({
        Capacitor: { isNativePlatform: () => true },
        location: { protocol: "https:" },
      }),
    ).toBe(true);
  });

  it("detects the capacitor: protocol", () => {
    expect(detectCapacitorShell({ location: { protocol: "capacitor:" } })).toBe(true);
  });
});
