import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { copyTraders, copyTraderFollows, tradingStrategies, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const copyTradingRouter = router({
  // ─── List all active copy traders ──────────────────────────────────────────
  listTraders: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: copyTraders.id,
        userId: copyTraders.userId,
        displayName: copyTraders.displayName,
        avatar: copyTraders.avatar,
        badge: copyTraders.badge,
        description: copyTraders.description,
        riskLevel: copyTraders.riskLevel,
        totalReturn: copyTraders.totalReturn,
        winRate: copyTraders.winRate,
        trades30d: copyTraders.trades30d,
        maxDrawdown: copyTraders.maxDrawdown,
        topPairs: copyTraders.topPairs,
        followerCount: sql<number>`(SELECT COUNT(*) FROM copy_trader_follows WHERE traderId = ${copyTraders.id})`,
      })
      .from(copyTraders)
      .where(eq(copyTraders.isActive, true))
      .orderBy(desc(copyTraders.winRate))
      .limit(50);

    return rows.map((r) => ({
      ...r,
      topPairs: r.topPairs ? (JSON.parse(r.topPairs) as string[]) : [],
    }));
  }),

  // ─── Follow / unfollow a trader ────────────────────────────────────────────
  toggleFollow: protectedProcedure
    .input(z.object({ traderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, isFollowing: false };

      const existing = await db
        .select()
        .from(copyTraderFollows)
        .where(
          and(
            eq(copyTraderFollows.userId, ctx.user.id),
            eq(copyTraderFollows.traderId, input.traderId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(copyTraderFollows)
          .where(eq(copyTraderFollows.id, existing[0].id));
        return { success: true, isFollowing: false };
      } else {
        await db.insert(copyTraderFollows).values({
          userId: ctx.user.id,
          traderId: input.traderId,
        });
        return { success: true, isFollowing: true };
      }
    }),

  // ─── List traders I follow ─────────────────────────────────────────────────
  myFollowedTraders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({ traderId: copyTraderFollows.traderId })
      .from(copyTraderFollows)
      .where(eq(copyTraderFollows.userId, ctx.user.id));
    return rows.map((r) => r.traderId);
  }),

  // ─── Register as a copy trader ─────────────────────────────────────────────
  registerAsTrader: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
      topPairs: z.array(z.string().max(20)).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Check if user is already registered
      const existing = await db
        .select()
        .from(copyTraders)
        .where(eq(copyTraders.userId, ctx.user.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(copyTraders)
          .set({
            displayName: input.displayName,
            description: input.description ?? null,
            riskLevel: input.riskLevel,
            topPairs: input.topPairs ? JSON.stringify(input.topPairs) : null,
            isActive: true,
          })
          .where(eq(copyTraders.id, existing[0].id));
        return { success: true, traderId: existing[0].id };
      }

      const user = await db
        .select({ avatar: users.avatar, name: users.name })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const [result] = await db.insert(copyTraders).values({
        userId: ctx.user.id,
        displayName: input.displayName,
        avatar: user[0]?.name?.slice(0, 1) ?? "🤖",
        description: input.description ?? null,
        riskLevel: input.riskLevel,
        topPairs: input.topPairs ? JSON.stringify(input.topPairs) : null,
      });
      return { success: true, traderId: (result as any).insertId };
    }),

  // ─── List all strategies ───────────────────────────────────────────────────
  listStrategies: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(tradingStrategies)
      .where(eq(tradingStrategies.isActive, true))
      .orderBy(desc(tradingStrategies.winRate))
      .limit(50);
  }),

  // ─── Create / update a strategy ────────────────────────────────────────────
  upsertStrategy: protectedProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      type: z.enum(["grid", "dca", "momentum", "arbitrage", "custom"]).default("custom"),
      pair: z.string().max(30).optional(),
      riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
      stopLoss: z.string().max(30).optional(),
      takeProfit: z.string().max(30).optional(),
      maxPosition: z.string().max(30).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      if (input.id) {
        await db
          .update(tradingStrategies)
          .set({
            name: input.name,
            description: input.description ?? null,
            type: input.type,
            pair: input.pair ?? null,
            riskLevel: input.riskLevel,
            stopLoss: input.stopLoss ?? null,
            takeProfit: input.takeProfit ?? null,
            maxPosition: input.maxPosition ?? null,
          })
          .where(
            and(
              eq(tradingStrategies.id, input.id),
              eq(tradingStrategies.userId, ctx.user.id)
            )
          );
        return { success: true, strategyId: input.id };
      }

      const [result] = await db.insert(tradingStrategies).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        pair: input.pair ?? null,
        riskLevel: input.riskLevel,
        stopLoss: input.stopLoss ?? null,
        takeProfit: input.takeProfit ?? null,
        maxPosition: input.maxPosition ?? null,
      });
      return { success: true, strategyId: (result as any).insertId };
    }),

  // ─── My strategies ─────────────────────────────────────────────────────────
  myStrategies: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(tradingStrategies)
      .where(eq(tradingStrategies.userId, ctx.user.id))
      .orderBy(desc(tradingStrategies.createdAt));
  }),

  // ─── Toggle strategy active status ─────────────────────────────────────────
  toggleStrategy: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const existing = await db
        .select()
        .from(tradingStrategies)
        .where(
          and(
            eq(tradingStrategies.id, input.id),
            eq(tradingStrategies.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (existing.length === 0) return { success: false };
      await db
        .update(tradingStrategies)
        .set({ isActive: !existing[0].isActive })
        .where(eq(tradingStrategies.id, input.id));
      return { success: true, isActive: !existing[0].isActive };
    }),
});
