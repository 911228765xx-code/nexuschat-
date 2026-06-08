import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { friendRequests, users, contactMetadata } from "../../drizzle/schema";
import { and, eq, or, desc } from "drizzle-orm";

export const contactsRouter = router({
  // ─── Send friend request ────────────────────────────────────────────────────
  sendRequest: protectedProcedure
    .input(z.object({ receiverId: z.number().int().positive() }))
    .use(rateLimitWrite)
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
    .use(rateLimitWrite)
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
    .use(rateLimitWrite)
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

  // ─── List pending outgoing requests ─────────────────────────────────────────
  listOutgoing: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: friendRequests.id,
        receiverId: friendRequests.receiverId,
        createdAt: friendRequests.createdAt,
        receiverName: users.name,
        receiverUsername: users.username,
        receiverAvatar: users.avatar,
      })
      .from(friendRequests)
      .leftJoin(users, eq(users.id, friendRequests.receiverId))
      .where(
        and(
          eq(friendRequests.senderId, ctx.user.id),
          eq(friendRequests.status, "pending")
        )
      )
      .orderBy(desc(friendRequests.createdAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      receiverId: r.receiverId,
      createdAt: r.createdAt,
      displayName: r.receiverName ?? r.receiverUsername ?? `User #${r.receiverId}`,
      avatar: r.receiverAvatar,
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

    // 按对方 userId 去重（互发好友请求都被接受时会出现两条）
    const seen = new Set<number>();
    const result: Array<{ id: number; userId: number; displayName: string; avatar: string | null; createdAt: Date }> = [];
    for (const r of [...sent, ...received]) {
      if (r.otherId == null || seen.has(r.otherId)) continue;
      seen.add(r.otherId);
      result.push({
        id: r.id,
        userId: r.otherId,
        displayName: r.otherName ?? r.otherUsername ?? `User #${r.otherId}`,
        avatar: r.otherAvatar,
        createdAt: r.createdAt,
      });
    }
    return result;
  }),

  // ─── Get metadata for a contact ──────────────────────────────────────────
  getContactMeta: protectedProcedure
    .input(z.object({ contactId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(contactMetadata)
        .where(
          and(
            eq(contactMetadata.userId, ctx.user.id),
            eq(contactMetadata.contactId, input.contactId)
          )
        )
        .limit(1);
      const row = rows[0];
      if (!row) return { isFavorite: false, note: "", tags: [] as string[] };
      return {
        isFavorite: row.isFavorite,
        note: row.note ?? "",
        tags: row.tags ? (JSON.parse(row.tags) as string[]) : ([] as string[]),
      };
    }),

  // ─── List all metadata for the user (for batch display) ────────────────
  listContactMeta: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(contactMetadata)
      .where(eq(contactMetadata.userId, ctx.user.id));
  }),

  // ─── Toggle favorite ─────────────────────────────────────────────────
  toggleFavorite: protectedProcedure
    .input(z.object({ contactId: z.number().int().positive() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const existing = await db
        .select()
        .from(contactMetadata)
        .where(
          and(
            eq(contactMetadata.userId, ctx.user.id),
            eq(contactMetadata.contactId, input.contactId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(contactMetadata)
          .set({ isFavorite: !existing[0].isFavorite })
          .where(eq(contactMetadata.id, existing[0].id));
        return { success: true, isFavorite: !existing[0].isFavorite };
      } else {
        await db.insert(contactMetadata).values({
          userId: ctx.user.id,
          contactId: input.contactId,
          isFavorite: true,
        });
        return { success: true, isFavorite: true };
      }
    }),

  // ─── Update note ─────────────────────────────────────────────────────
  updateNote: protectedProcedure
    .input(z.object({ contactId: z.number().int().positive(), note: z.string().max(500) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const existing = await db
        .select()
        .from(contactMetadata)
        .where(
          and(
            eq(contactMetadata.userId, ctx.user.id),
            eq(contactMetadata.contactId, input.contactId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(contactMetadata)
          .set({ note: input.note })
          .where(eq(contactMetadata.id, existing[0].id));
      } else {
        await db.insert(contactMetadata).values({
          userId: ctx.user.id,
          contactId: input.contactId,
          note: input.note,
        });
      }
      return { success: true };
    }),

  // ─── Update tags ─────────────────────────────────────────────────────
  updateTags: protectedProcedure
    .input(z.object({ contactId: z.number().int().positive(), tags: z.array(z.string().max(30)).max(10) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const tagsJson = JSON.stringify(input.tags);
      const existing = await db
        .select()
        .from(contactMetadata)
        .where(
          and(
            eq(contactMetadata.userId, ctx.user.id),
            eq(contactMetadata.contactId, input.contactId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(contactMetadata)
          .set({ tags: tagsJson })
          .where(eq(contactMetadata.id, existing[0].id));
      } else {
        await db.insert(contactMetadata).values({
          userId: ctx.user.id,
          contactId: input.contactId,
          tags: tagsJson,
        });
      }
      return { success: true };
    }),
});
