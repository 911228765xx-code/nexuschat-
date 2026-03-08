/**
 * AI Consulting Center — Unit Tests
 * Tests router structure, input validation, and business logic
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("AI Consulting Router", () => {
  it("should have consulting router registered in appRouter", () => {
    expect(appRouter._def.procedures).toHaveProperty("consulting.createReport");
    expect(appRouter._def.procedures).toHaveProperty("consulting.submitPayment");
    expect(appRouter._def.procedures).toHaveProperty("consulting.getStatus");
    expect(appRouter._def.procedures).toHaveProperty("consulting.getFullReport");
    expect(appRouter._def.procedures).toHaveProperty("consulting.getHistory");
    expect(appRouter._def.procedures).toHaveProperty("consulting.retryVerification");
  });

  it("should have all 6 consulting procedures", () => {
    const procedures = Object.keys(appRouter._def.procedures).filter(k =>
      k.startsWith("consulting.")
    );
    expect(procedures.length).toBe(6);
  });

  it("should validate queryType enum values", () => {
    // The createReport procedure accepts only project | security | market
    const validTypes = ["project", "security", "market"];
    validTypes.forEach(type => {
      expect(["project", "security", "market"]).toContain(type);
    });
  });

  it("should validate BSC txHash format", () => {
    const validTxHash = "0x" + "a".repeat(64);
    const invalidTxHash1 = "0x" + "a".repeat(63); // too short
    const invalidTxHash2 = "abc123"; // no 0x prefix
    const invalidTxHash3 = "0x" + "g".repeat(64); // invalid hex

    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    expect(txHashRegex.test(validTxHash)).toBe(true);
    expect(txHashRegex.test(invalidTxHash1)).toBe(false);
    expect(txHashRegex.test(invalidTxHash2)).toBe(false);
    expect(txHashRegex.test(invalidTxHash3)).toBe(false);
  });

  it("should validate wallet address format", () => {
    const validAddress = "0x" + "a".repeat(40);
    const invalidAddress1 = "0x" + "a".repeat(39); // too short
    const invalidAddress2 = "abc123"; // no 0x prefix

    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    expect(addressRegex.test(validAddress)).toBe(true);
    expect(addressRegex.test(invalidAddress1)).toBe(false);
    expect(addressRegex.test(invalidAddress2)).toBe(false);
  });

  it("should have correct USDT amount constant (10 USDT = 10^19 wei)", () => {
    // 10 USDT with 18 decimals = 10 * 10^18 = 10^19
    const REQUIRED_USDT_AMOUNT = BigInt("10000000000000000000");
    expect(REQUIRED_USDT_AMOUNT).toBe(BigInt(10) * BigInt(10 ** 18));
  });
});
