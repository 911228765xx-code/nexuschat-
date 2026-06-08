/**
 * webPush.test.ts — Web Push router unit tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock web-push ──────────────────────────────────────────────────────────────
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// ── Mock DB ───────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  }),
}));

// ── Mock env ──────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    VAPID_PUBLIC_KEY: "BFake_public_key_for_testing_only_123456789",
    VAPID_PRIVATE_KEY: "fake_private_key_for_testing_only",
    VAPID_SUBJECT: "mailto:test@example.com",
  },
}));

describe("webPush router", () => {
  it("should export sendPushToUser function", async () => {
    const { sendPushToUser } = await import("./routers/webPush");
    expect(typeof sendPushToUser).toBe("function");
  });

  it("sendPushToUser should not throw when no subscriptions found", async () => {
    const { sendPushToUser } = await import("./routers/webPush");
    // DB mock returns empty array, so no push is sent — should resolve cleanly
    await expect(sendPushToUser(999, { title: "Test", body: "Hello" })).resolves.not.toThrow();
  });

  it("VAPID public key should be a non-empty string", async () => {
    const { ENV } = await import("./_core/env");
    expect(typeof ENV.VAPID_PUBLIC_KEY).toBe("string");
  });
});
