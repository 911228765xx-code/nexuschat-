import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userWatchlist } from "../../drizzle/schema";
import { and, eq, desc } from "drizzle-orm";
import { awardTaskEvent } from "./user";

export const watchlistRouter = router({
  // ─── Get user's watchlist ────────────────────────────────────────────────────
  getWatchlist: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(userWatchlist)
      .where(eq(userWatchlist.userId, ctx.user.id))
      .orderBy(desc(userWatchlist.createdAt));
  }),

  // ─── Add token to watchlist ──────────────────────────────────────────────────
  addToken: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().min(1).max(100),
        tokenSymbol: z.string().min(1).max(20),
        tokenName: z.string().min(1).max(100),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if already in watchlist
      const existing = await db
        .select({ id: userWatchlist.id })
        .from(userWatchlist)
        .where(
          and(
            eq(userWatchlist.userId, ctx.user.id),
            eq(userWatchlist.tokenId, input.tokenId)
          )
        )
        .limit(1);

      if (existing.length > 0) return { success: true, alreadyExists: true };

      await db.insert(userWatchlist).values({
        userId: ctx.user.id,
        tokenId: input.tokenId,
        tokenSymbol: input.tokenSymbol,
        tokenName: input.tokenName,
      });
      await awardTaskEvent(db, ctx.user.id, "watchlist_daily");
      return { success: true, alreadyExists: false };
    }),

  // ─── Remove token from watchlist ─────────────────────────────────────────────
  removeToken: protectedProcedure
    .input(z.object({ tokenId: z.string().min(1).max(100) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(userWatchlist)
        .where(
          and(
            eq(userWatchlist.userId, ctx.user.id),
            eq(userWatchlist.tokenId, input.tokenId)
          )
        );
      return { success: true };
    }),

  // ─── Check if token is in watchlist ─────────────────────────────────────────
  isWatching: protectedProcedure
    .input(z.object({ tokenId: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return false;

      const existing = await db
        .select({ id: userWatchlist.id })
        .from(userWatchlist)
        .where(
          and(
            eq(userWatchlist.userId, ctx.user.id),
            eq(userWatchlist.tokenId, input.tokenId)
          )
        )
        .limit(1);

      return existing.length > 0;
    }),
});
