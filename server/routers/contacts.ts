import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { friendRequests, users } from "../../drizzle/schema";
import { and, eq, or, desc } from "drizzle-orm";

export const contactsRouter = router({
  // ─── Send friend request ────────────────────────────────────────────────────
  sendRequest: protectedProcedure
    .input(z.object({ receiverId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.receiverId === ctx.user.id) throw new Error("Cannot send request to yourself");

      // Check if request already exists
      const existing = await db
        .select({ id: friendRequests.id, status: friendRequests.status })
        .from(friendRequests)
        .where(
          or(
            and(eq(friendRequests.senderId, ctx.user.id), eq(friendRequests.receiverId, input.receiverId)),
            and(eq(friendRequests.senderId, input.receiverId), eq(friendRequests.receiverId, ctx.user.id))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].status === "pending") throw new Error("Request already pending");
        if (existing[0].status === "accepted") throw new Error("Already friends");
      }

      await db.insert(friendRequests).values({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        status: "pending",
      });
      return { success: true };
    }),

  // ─── Accept friend request ──────────────────────────────────────────────────
  acceptRequest: protectedProcedure
    .input(z.object({ requestId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(friendRequests)
        .set({ status: "accepted" })
        .where(
          and(
            eq(friendRequests.id, input.requestId),
            eq(friendRequests.receiverId, ctx.user.id),
            eq(friendRequests.status, "pending")
          )
        );
      return { success: true };
    }),

  // ─── Reject friend request ──────────────────────────────────────────────────
  rejectRequest: protectedProcedure
    .input(z.object({ requestId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(friendRequests)
        .set({ status: "rejected" })
        .where(
          and(
            eq(friendRequests.id, input.requestId),
            eq(friendRequests.receiverId, ctx.user.id),
            eq(friendRequests.status, "pending")
          )
        );
      return { success: true };
    }),

  // ─── List pending incoming requests ─────────────────────────────────────────
  listIncoming: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        createdAt: friendRequests.createdAt,
        senderName: users.name,
        senderUsername: users.username,
        senderAvatar: users.avatar,
      })
      .from(friendRequests)
      .leftJoin(users, eq(users.id, friendRequests.senderId))
      .where(
        and(
          eq(friendRequests.receiverId, ctx.user.id),
          eq(friendRequests.status, "pending")
        )
      )
      .orderBy(desc(friendRequests.createdAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      createdAt: r.createdAt,
      displayName: r.senderName ?? r.senderUsername ?? `User #${r.senderId}`,
      avatar: r.senderAvatar,
    }));
  }),

  // ─── List accepted friends ───────────────────────────────────────────────────
  listFriends: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const sent = await db
      .select({
        id: friendRequests.id,
        otherId: friendRequests.receiverId,
        createdAt: friendRequests.createdAt,
        otherName: users.name,
        otherUsername: users.username,
        otherAvatar: users.avatar,
      })
      .from(friendRequests)
      .leftJoin(users, eq(users.id, friendRequests.receiverId))
      .where(
        and(eq(friendRequests.senderId, ctx.user.id), eq(friendRequests.status, "accepted"))
      );

    const received = await db
      .select({
        id: friendRequests.id,
        otherId: friendRequests.senderId,
        createdAt: friendRequests.createdAt,
        otherName: users.name,
        otherUsername: users.username,
        otherAvatar: users.avatar,
      })
      .from(friendRequests)
      .leftJoin(users, eq(users.id, friendRequests.senderId))
      .where(
        and(eq(friendRequests.receiverId, ctx.user.id), eq(friendRequests.status, "accepted"))
      );

    return [...sent, ...received].map((r) => ({
      id: r.id,
      userId: r.otherId,
      displayName: r.otherName ?? r.otherUsername ?? `User #${r.otherId}`,
      avatar: r.otherAvatar,
      createdAt: r.createdAt,
    }));
  }),
});
