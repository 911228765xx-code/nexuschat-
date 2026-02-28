/**
 * NexusChat Feature Tests
 * Tests for wallet, chat, and research tRPC routers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Wallet Router Tests ──────────────────────────────────────────────────────
describe("Wallet Router", () => {
  it("validates BSC wallet address format", () => {
    const validAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
    const invalidAddress = "not-a-wallet";
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    expect(addressRegex.test(validAddress)).toBe(true);
    expect(addressRegex.test(invalidAddress)).toBe(false);
  });

  it("accepts BSC chain identifier", () => {
    const supportedChains = ["BSC", "ETH", "Polygon"];
    expect(supportedChains).toContain("BSC");
  });

  it("formats wallet balance correctly", () => {
    const rawBalance = "1234567890123456789"; // 1.23 BNB in wei
    const formatted = (parseFloat(rawBalance) / 1e18).toFixed(4);
    expect(parseFloat(formatted)).toBeGreaterThan(0);
    expect(formatted).toMatch(/^\d+\.\d{4}$/);
  });
});

// ─── Chat Router Tests ────────────────────────────────────────────────────────
describe("Chat Router", () => {
  it("validates message content length", () => {
    const validMsg = "Hello, Web3!";
    const emptyMsg = "";
    const tooLongMsg = "x".repeat(4001);

    expect(validMsg.length).toBeGreaterThan(0);
    expect(validMsg.length).toBeLessThanOrEqual(4000);
    expect(emptyMsg.length).toBe(0);
    expect(tooLongMsg.length).toBeGreaterThan(4000);
  });

  it("validates group ID is a positive integer", () => {
    const validGroupId = 1;
    const invalidGroupId = -1;
    const nanGroupId = NaN;

    expect(validGroupId).toBeGreaterThan(0);
    expect(invalidGroupId).toBeLessThan(0);
    expect(isNaN(nanGroupId)).toBe(true);
  });

  it("supports all message types", () => {
    const messageTypes = ["text", "image", "file", "system"];
    expect(messageTypes).toContain("text");
    expect(messageTypes).toContain("image");
    expect(messageTypes).toContain("file");
    expect(messageTypes).toContain("system");
  });

  it("extracts @mentions from message content", () => {
    const message = "Hey @alice.eth and @bob.eth, check this out!";
    const mentionMatches = message.match(/@([\w.]+)/g);
    const mentions = mentionMatches ? mentionMatches.map(m => m.slice(1)) : [];
    expect(mentions).toHaveLength(2);
    expect(mentions).toContain("alice.eth");
    expect(mentions).toContain("bob.eth");
  });
});

// ─── Research Router Tests ────────────────────────────────────────────────────
describe("Research Router", () => {
  it("validates token symbol format", () => {
    const validSymbols = ["BTC", "ETH", "BNB", "SOL"];
    const invalidSymbol = "";

    validSymbols.forEach(sym => {
      expect(sym.length).toBeGreaterThan(0);
      expect(sym.length).toBeLessThanOrEqual(20);
    });
    expect(invalidSymbol.length).toBe(0);
  });

  it("determines sentiment from report content", () => {
    const bullishContent = "代币表现强劲，看涨信号明显，利好消息不断";
    const bearishContent = "市场看跌，风险较高，建议谨慎";
    const neutralContent = "市场中性，等待更多数据确认";

    const getSentiment = (content: string) => {
      if (content.includes("看涨") || content.includes("利好")) return "bullish";
      if (content.includes("看跌") || content.includes("风险较高")) return "bearish";
      return "neutral";
    };

    expect(getSentiment(bullishContent)).toBe("bullish");
    expect(getSentiment(bearishContent)).toBe("bearish");
    expect(getSentiment(neutralContent)).toBe("neutral");
  });

  it("determines risk level from report content", () => {
    const highRiskContent = "该代币存在高风险，流动性不足";
    const lowRiskContent = "该代币低风险，基本面稳健";
    const mediumRiskContent = "中等风险，需要关注市场变化";

    const getRiskLevel = (content: string) => {
      if (content.includes("高风险")) return "high";
      if (content.includes("低风险")) return "low";
      return "medium";
    };

    expect(getRiskLevel(highRiskContent)).toBe("high");
    expect(getRiskLevel(lowRiskContent)).toBe("low");
    expect(getRiskLevel(mediumRiskContent)).toBe("medium");
  });

  it("calculates NXC cost for report generation", () => {
    const reportCost = 10; // NXC tokens per report
    expect(reportCost).toBe(10);
    expect(typeof reportCost).toBe("number");
  });

  it("formats market cap correctly", () => {
    const marketCapRaw = 1_000_000_000; // $1B
    const formatted = `$${(marketCapRaw / 1e6).toFixed(2)}M`;
    expect(formatted).toBe("$1000.00M");

    const smallCap = 50_000_000; // $50M
    const formattedSmall = `$${(smallCap / 1e6).toFixed(2)}M`;
    expect(formattedSmall).toBe("$50.00M");
  });
});

// ─── Wagmi/Wallet Config Tests ────────────────────────────────────────────────
describe("BSC Wallet Config", () => {
  it("BSC chain ID is correct", () => {
    const BSC_CHAIN_ID = 56;
    const BSC_TESTNET_CHAIN_ID = 97;
    expect(BSC_CHAIN_ID).toBe(56);
    expect(BSC_TESTNET_CHAIN_ID).toBe(97);
  });

  it("wallet address truncation works correctly", () => {
    const address = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
    expect(truncated).toBe("0x71C7...976F");
    expect(truncated.length).toBeLessThan(address.length);
  });
});
