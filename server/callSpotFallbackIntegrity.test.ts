import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("call spot public market fallbacks", () => {
  it("uses public K-line fallbacks instead of an unauthenticated CryptoCompare history call", () => {
    const source = readFileSync(new URL("./callSpot.ts", import.meta.url), "utf8");

    expect(source).toContain("data-api.binance.vision");
    expect(source).toContain("api.binance.us/api/v3/klines");
    expect(source).toContain("api.bybit.com/v5/market/kline");
    expect(source).not.toContain("min-api.cryptocompare.com/data/v2/histominute");
  });
});

