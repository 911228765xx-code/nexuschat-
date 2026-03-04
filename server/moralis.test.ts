import { describe, it, expect } from "vitest";

describe("Moralis API Key validation", () => {
  it("should have MORALIS_API_KEY env var set", () => {
    const key = process.env.MORALIS_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should fetch BSC transactions from Moralis API", async () => {
    const key = process.env.MORALIS_API_KEY;
    if (!key) {
      console.warn("MORALIS_API_KEY not set, skipping live test");
      return;
    }

    // Use a well-known BSC address (Binance Hot Wallet)
    const testAddress = "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3";
    const url = `https://deep-index.moralis.io/api/v2/${testAddress}?chain=bsc&limit=3&order=DESC`;

    const res = await fetch(url, {
      headers: { "X-API-Key": key },
      signal: AbortSignal.timeout(10000),
    });

    expect(res.ok).toBe(true);
    const data = await res.json() as { result: unknown[] };
    expect(Array.isArray(data.result)).toBe(true);
    expect(data.result.length).toBeGreaterThan(0);
  }, 15000);
});
