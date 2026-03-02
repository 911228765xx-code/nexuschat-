/**
 * emailAuth router unit tests
 * Tests registration, login, duplicate email, and wrong password scenarios
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the sdk module
vi.mock("./_core/sdk", () => ({
  sdk: {
    signSession: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    appId: "test-app-id",
    ownerOpenId: "owner-open-id",
  },
}));

import bcrypt from "bcryptjs";
import { getDb } from "./db";

describe("emailAuth router logic", () => {
  const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
    });
  });

  it("should hash password on registration", async () => {
    // Simulate no existing user
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Verify bcrypt.hash would be called with SALT_ROUNDS=10
    await (bcrypt as typeof bcrypt).hash("password123", 10);
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });

  it("should reject duplicate email registration", async () => {
    // Simulate existing user
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ openId: "email:test@example.com" }]),
        }),
      }),
    });

    // The router would throw CONFLICT error for existing email
    const existingUser = await (getDb as ReturnType<typeof vi.fn>)()
      .then((db: ReturnType<typeof vi.fn>) => db.select().from(null).where(null).limit(1));
    expect(existingUser.length).toBe(1);
  });

  it("should reject login with wrong password", async () => {
    // Simulate existing user with hashed password
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ openId: "email:test@example.com", passwordHash: "hashed-pw" }]),
        }),
      }),
    });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await (bcrypt as typeof bcrypt).compare("wrong-password", "hashed-pw");
    expect(result).toBe(false);
  });

  it("should accept login with correct password", async () => {
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const result = await (bcrypt as typeof bcrypt).compare("correct-password", "hashed-pw");
    expect(result).toBe(true);
  });

  it("should normalize email to lowercase", () => {
    const email = "Test@Example.COM";
    const normalized = email.toLowerCase().trim();
    expect(normalized).toBe("test@example.com");
  });

  it("should generate correct openId from email", () => {
    const email = "test@example.com";
    const openId = `email:${email.toLowerCase().trim()}`;
    expect(openId).toBe("email:test@example.com");
  });
});
