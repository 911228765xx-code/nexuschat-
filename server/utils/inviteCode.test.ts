import { describe, expect, it } from "vitest";
import {
  decodeInviteCodeToUserId,
  generateInviteCode,
  normalizeInviteCode,
  parseInviteInput,
  toPublicInviteId,
} from "./inviteCode";

describe("parseInviteInput", () => {
  it("treats a numeric ID as the referrer user id", () => {
    expect(parseInviteInput("5899")).toEqual({ userId: 5899 });
    expect(parseInviteInput("  42  ")).toEqual({ userId: 42 });
  });

  it("accepts the profile card form u123", () => {
    expect(parseInviteInput("u123")).toEqual({ userId: 123 });
    expect(parseInviteInput("U88")).toEqual({ userId: 88 });
  });

  it("decodes legacy AI codes back to the user id", () => {
    const code = generateInviteCode(5899);
    expect(parseInviteInput(code)).toEqual({ userId: 5899 });
    const fromPretty = decodeInviteCodeToUserId("AI7KQ2");
    expect(fromPretty).toBeTruthy();
    expect(parseInviteInput("ai-7kq2")).toEqual({ userId: fromPretty });
  });

  it("keeps unmatched NEXUS codes as codes", () => {
    expect(parseInviteInput("NEXUS-ABC123-YYYY")).toEqual({ code: "NEXUSABC123YYYY" });
  });

  it("rejects empty input", () => {
    expect(parseInviteInput("")).toBeNull();
    expect(parseInviteInput("   ")).toBeNull();
  });
});

describe("toPublicInviteId", () => {
  it("returns only the numeric user id", () => {
    expect(toPublicInviteId(5899, "AI7KQ2")).toBe("5899");
    expect(toPublicInviteId(0, "5899")).toBe("5899");
    expect(toPublicInviteId(12, generateInviteCode(12))).toBe("12");
  });
});

describe("decodeInviteCodeToUserId", () => {
  it("round-trips generateInviteCode", () => {
    for (const id of [1, 12, 99, 476, 5899, 10001]) {
      expect(decodeInviteCodeToUserId(generateInviteCode(id))).toBe(id);
    }
  });
});

describe("normalizeInviteCode", () => {
  it("strips separators and uppercases", () => {
    expect(normalizeInviteCode("ai·7kq2")).toBe("AI7KQ2");
  });
});
