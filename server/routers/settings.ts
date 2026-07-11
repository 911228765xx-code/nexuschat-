import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userSettings, userApiKeys } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKeyString(): string {
  const random = randomBytes(24).toString("hex"); // 48 hex chars
  return `nx_sk_${random}`;
}

export const settingsRouter = router({
  // ─── Get user settings (privacy & security preferences) ───────────────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);

    if (existing) return existing;

    // Create default settings for new users
    await db.insert(userSettings).values({ userId: ctx.user.id });
    const [created] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);
    return created!;
  }),

  // ─── Update user settings ─────────────────────────────────────────────────
  updateSettings: protectedProcedure
    .input(
      z.object({
        showWallet: z.boolean().optional(),
        showActivity: z.boolean().optional(),
        showNFTs: z.boolean().optional(),
        readReceipts: z.boolean().optional(),
        profileVisible: z.boolean().optional(),
        dmOnlyFriends: z.boolean().optional(),
        twoFAEnabled: z.boolean().optional(),
        biometricEnabled: z.boolean().optional(),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Upsert: check if settings exist
      const [existing] = await db
        .select({ id: userSettings.id })
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);

      const updateData: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(input)) {
        if (val !== undefined) updateData[key] = val;
      }

      if (existing) {
        await db
          .update(userSettings)
          .set(updateData)
          .where(eq(userSettings.userId, ctx.user.id));
      } else {
        await db.insert(userSettings).values({
          userId: ctx.user.id,
          ...updateData,
        });
      }

      return { success: true };
    }),

  // ─── List API keys (masked) ───────────────────────────────────────────────
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const keys = await db
      .select({
        id: userApiKeys.id,
        keyPrefix: userApiKeys.keyPrefix,
        label: userApiKeys.label,
        isActive: userApiKeys.isActive,
        lastUsedAt: userApiKeys.lastUsedAt,
        createdAt: userApiKeys.createdAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, ctx.user.id))
      .orderBy(desc(userApiKeys.createdAt));

    return keys.map((k) => ({
      ...k,
      maskedKey: `${k.keyPrefix}${"•".repeat(40)}`,
    }));
  }),

  // ─── Generate new API key ─────────────────────────────────────────────────
  generateApiKey: protectedProcedure
    .input(
      z.object({
        label: z.string().max(100).default("Default"),
      }).optional()
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Limit to 5 active keys per user
      const existingKeys = await db
        .select({ id: userApiKeys.id })
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, ctx.user.id),
            eq(userApiKeys.isActive, true)
          )
        );

      if (existingKeys.length >= 5) {
        throw new Error("Maximum 5 active API keys allowed. Revoke an existing key first.");
      }

      const rawKey = generateApiKeyString();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = rawKey.slice(0, 10); // "nx_sk_" + first 4 hex chars

      await db.insert(userApiKeys).values({
        userId: ctx.user.id,
        keyPrefix,
        keyHash,
        label: input?.label ?? "Default",
      });

      // Return the raw key ONLY on creation (never stored in plaintext)
      return { apiKey: rawKey, keyPrefix };
    }),

  // ─── Revoke (deactivate) an API key ───────────────────────────────────────
  revokeApiKey: protectedProcedure
    .input(z.object({ keyId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(userApiKeys)
        .set({ isActive: false })
        .where(
          and(
            eq(userApiKeys.id, input.keyId),
            eq(userApiKeys.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});
