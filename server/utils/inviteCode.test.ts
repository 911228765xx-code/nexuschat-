import { describe, expect, it } from "vitest";
import { normalizeInviteCode, parseInviteInput } from "./inviteCode";

describe("parseInviteInput", () => {
  it("treats a numeric ID as the referrer user id", () => {
    expect(parseInviteInput("5899")).toEqual({ userId: 5899 });
    expect(parseInviteInput("  42  ")).toEqual({ userId: 42 });
  });

  it("accepts the profile card form u123", () => {
    expect(parseInviteInput("u123")).toEqual({ userId: 123 });
    expect(parseInviteInput("U88")).toEqual({ userId: 88 });
  });

  it("keeps legacy AI / NEXUS codes as codes", () => {
    expect(parseInviteInput("AI7KQ2")).toEqual({ code: "AI7KQ2" });
    expect(parseInviteInput("ai-7kq2")).toEqual({ code: "AI7KQ2" });
    expect(parseInviteInput("NEXUS-ABC123-YYYY")).toEqual({ code: "NEXUSABC123YYYY" });
  });

  it("rejects empty input", () => {
    expect(parseInviteInput("")).toBeNull();
    expect(parseInviteInput("   ")).toBeNull();
  });
});

describe("normalizeInviteCode", () => {
  it("strips separators and uppercases", () => {
    expect(normalizeInviteCode("ai·7kq2")).toBe("AI7KQ2");
  });
});
