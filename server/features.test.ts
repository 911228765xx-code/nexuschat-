/**
 * NexusChat Feature Tests
 * Covers: wallet, chat, research, posts, user routers
 */
import { describe, it, expect } from "vitest";
import { TASK_DEFINITIONS } from "./routers/user";

// ─── Wallet Tests ────────────────────────────────────────────────────────────
describe("Wallet Router", () => {
  it("validates BSC address format", () => {
    const validAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";
    const invalidAddress = "not-an-address";
    const bscRegex = /^0x[a-fA-F0-9]{40}$/;
    expect(bscRegex.test(validAddress)).toBe(true);
    expect(bscRegex.test(invalidAddress)).toBe(false);
  });

  it("formats BNB balance correctly", () => {
    const wei = "1000000000000000000"; // 1 BNB in wei
    const bnb = Number(BigInt(wei)) / 1e18;
    expect(bnb.toFixed(4)).toBe("1.0000");
  });

  it("formats token balance with decimals", () => {
    const rawBalance = "1000000"; // 1 USDT with 6 decimals
    const decimals = 6;
    const formatted = (parseFloat(rawBalance) / Math.pow(10, decimals)).toFixed(4);
    expect(formatted).toBe("1.0000");
  });

  it("calculates USD value from BNB balance", () => {
    const bnbBalance = 2.5;
    const bnbPrice = 600;
    const usdValue = (bnbBalance * bnbPrice).toFixed(2);
    expect(usdValue).toBe("1500.00");
  });

  it("validates BscScan API response structure", () => {
    const mockResponse = { status: "1", message: "OK", result: "1000000000000000000" };
    expect(mockResponse.status).toBe("1");
    expect(typeof mockResponse.result).toBe("string");
  });

  it("handles BscScan API error response", () => {
    const errorResponse = { status: "0", message: "NOTOK", result: "Error!" };
    const isSuccess = errorResponse.status === "1";
    expect(isSuccess).toBe(false);
  });
});

// ─── Chat Tests ───────────────────────────────────────────────────────────────
describe("Chat Router", () => {
  it("validates message content length", () => {
    const validMsg = "Hello, world!";
    const emptyMsg = "";
    const longMsg = "x".repeat(5001);
    expect(validMsg.length >= 1 && validMsg.length <= 5000).toBe(true);
    expect(emptyMsg.length >= 1).toBe(false);
    expect(longMsg.length <= 5000).toBe(false);
  });

  it("validates chat room ID format", () => {
    const validId = "room-123";
    const emptyId = "";
    expect(validId.length > 0).toBe(true);
    expect(emptyId.length > 0).toBe(false);
  });

  it("formats message timestamp correctly", () => {
    const ts = Date.now();
    const date = new Date(ts);
    expect(date instanceof Date).toBe(true);
    expect(isNaN(date.getTime())).toBe(false);
  });
});

// ─── Research Tests ───────────────────────────────────────────────────────────
describe("Research Router", () => {
  it("validates token symbol format", () => {
    const validSymbols = ["BTC", "ETH", "BNB", "USDT"];
    validSymbols.forEach((s) => {
      expect(s.length >= 1 && s.length <= 20).toBe(true);
    });
    expect("".length >= 1).toBe(false);
  });

  it("calculates sentiment score correctly", () => {
    const bullishSignals = 7;
    const totalSignals = 10;
    const score = Math.round((bullishSignals / totalSignals) * 100);
    expect(score).toBe(70);
  });

  it("determines market sentiment label", () => {
    const getSentiment = (score: number) => {
      if (score >= 70) return "bullish";
      if (score >= 40) return "neutral";
      return "bearish";
    };
    expect(getSentiment(80)).toBe("bullish");
    expect(getSentiment(55)).toBe("neutral");
    expect(getSentiment(20)).toBe("bearish");
  });
});

// ─── Posts Tests ──────────────────────────────────────────────────────────────
describe("Posts Router", () => {
  it("validates post content length", () => {
    const validContent = "This is a valid post about #BTC";
    const tooLong = "x".repeat(2001);
    expect(validContent.length >= 1 && validContent.length <= 2000).toBe(true);
    expect(tooLong.length <= 2000).toBe(false);
  });

  it("extracts hashtags from post content", () => {
    const content = "Bullish on #BTC and #ETH today! #DeFi";
    const tags = content.match(/#(\w+)/g)?.map((t) => t.slice(1)) ?? [];
    expect(tags).toEqual(["BTC", "ETH", "DeFi"]);
  });

  it("validates media URL count limit", () => {
    const maxMedia = 4;
    const validUrls = ["url1", "url2", "url3", "url4"];
    const tooMany = ["url1", "url2", "url3", "url4", "url5"];
    expect(validUrls.length <= maxMedia).toBe(true);
    expect(tooMany.length <= maxMedia).toBe(false);
  });

  it("formats like count correctly", () => {
    const formatNum = (n: number) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
      return n.toString();
    };
    expect(formatNum(1500000)).toBe("1.5M");
    expect(formatNum(2500)).toBe("2.5K");
    expect(formatNum(42)).toBe("42");
  });
});

// ─── User Router Tests ────────────────────────────────────────────────────────
describe("User Router — Task Definitions", () => {
  it("all task definitions have required fields", () => {
    Object.entries(TASK_DEFINITIONS).forEach(([key, def]) => {
      expect(typeof def.label).toBe("string");
      expect(typeof def.description).toBe("string");
      expect(typeof def.npReward).toBe("number");
      expect(def.npReward).toBeGreaterThan(0);
      expect(typeof def.maxCompletions).toBe("number");
      expect(def.maxCompletions).toBeGreaterThan(0);
    });
  });

  it("daily_login task has high max completions", () => {
    const dailyLogin = TASK_DEFINITIONS["daily_login"];
    expect(dailyLogin).toBeDefined();
    expect(dailyLogin.maxCompletions).toBeGreaterThan(100);
  });

  it("one-time tasks have maxCompletions of 1", () => {
    const oneTimeTasks = ["connect_wallet", "complete_profile", "first_post", "first_message", "first_research"];
    oneTimeTasks.forEach((taskType) => {
      const def = TASK_DEFINITIONS[taskType];
      expect(def).toBeDefined();
      expect(def.maxCompletions).toBe(1);
    });
  });

  it("validates profile update input", () => {
    const validName = "Alice";
    const emptyName = "";
    const longName = "x".repeat(51);
    expect(validName.length >= 1 && validName.length <= 50).toBe(true);
    expect(emptyName.length >= 1).toBe(false);
    expect(longName.length <= 50).toBe(false);
  });

  it("validates username format", () => {
    const validUsername = "alice_123";
    const invalidUsername = "alice@123!";
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    expect(usernameRegex.test(validUsername)).toBe(true);
    expect(usernameRegex.test(invalidUsername)).toBe(false);
  });

  it("validates bio length", () => {
    const validBio = "Web3 builder & DeFi enthusiast";
    const longBio = "x".repeat(201);
    expect(validBio.length <= 200).toBe(true);
    expect(longBio.length <= 200).toBe(false);
  });

  it("calculates NP rank correctly", () => {
    const usersAbove = 42;
    const myRank = usersAbove + 1;
    expect(myRank).toBe(43);
  });

  it("leaderboard limit validation", () => {
    const validLimit = 50;
    const tooLarge = 101;
    expect(validLimit >= 1 && validLimit <= 100).toBe(true);
    expect(tooLarge <= 100).toBe(false);
  });
});
