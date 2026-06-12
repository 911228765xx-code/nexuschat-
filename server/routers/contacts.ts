import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { friendRequests, users, contactMetadata } from "../../drizzle/schema";
import { and, eq, or, desc } from "drizzle-orm";
import { createNotification } from "./notificationsRouter";

export const contactsRouter = router({
  // ─── Send friend request ────────────────────────────────────────────────────
  sendRequest: protectedProcedure
    .input(z.object({ receiverId: z.number().int().positive() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.receiverId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能添加自己为好友" });

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
        if (existing[0].status === "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "已发送过好友申请，等待对方处理" });
        if (existing[0].status === "accepted") throw new TRPCError({ code: "BAD_REQUEST", message: "你们已经是好友了" });
      }

      await db.insert(friendRequests).values({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        status: "pending",
      });
      // 通知对方：有人请求加你为好友（进通知中心 + 未读计数提醒）
      try {
        await createNotification({
          db,
          targetUserId: input.receiverId,
          fromUserId: ctx.user.id,
          fromUserName: (ctx.user as any).name ?? (ctx.user as any).username ?? "有人",
          fromUserAvatar: (ctx.user as any).avatar ?? "",
          type: "follow",
          content: "请求添加你为好友",
        });
      } catch { /* 通知失败不影响请求 */ }
      return { success: true };
    }),

  // ─── 删除好友（删除两人间已接受的好友关系，任一方向）──────────────────────────
  removeFriend: protectedProcedure
    .input(z.object({ friendId: z.number().int().positive() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(friendRequests).where(
        and(
          eq(friendRequests.status, "accepted"),
          or(
            and(eq(friendRequests.senderId, ctx.user.id), eq(friendRequests.receiverId, input.friendId)),
            and(eq(friendRequests.senderId, input.friendId), eq(friendRequests.receiverId, ctx.user.id)),
          )!,
        ),
      );
      // 一并清理好友备注（双向）
      try {
        await db.delete(contactMetadata).where(
          or(
            and(eq(contactMetadata.userId, ctx.user.id), eq(contactMetadata.contactId, input.friendId)),
            and(eq(contactMetadata.userId, input.friendId), eq(contactMetadata.contactId, ctx.user.id)),
          )!,
        );
      } catch { /* 备注清理失败不影响删好友 */ }
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
    const result: Array<{ id: number; userId: number; displayName: string; remarkName: string | null; avatar: string | null; createdAt: Date }> = [];
    for (const r of [...sent, ...received]) {
      if (r.otherId == null || seen.has(r.otherId)) continue;
      seen.add(r.otherId);
      result.push({
        id: r.id,
        userId: r.otherId,
        displayName: r.otherName ?? r.otherUsername ?? `User #${r.otherId}`,
        remarkName: null,
        avatar: r.otherAvatar,
        createdAt: r.createdAt,
      });
    }
    // 合并好友备注名（我对每个好友设置的 remarkName）
    if (result.length > 0) {
      const metas = await db
        .select({ contactId: contactMetadata.contactId, remarkName: contactMetadata.remarkName })
        .from(contactMetadata)
        .where(eq(contactMetadata.userId, ctx.user.id));
      const remarkMap = new Map(metas.filter((m) => m.remarkName).map((m) => [m.contactId, m.remarkName!]));
      for (const f of result) f.remarkName = remarkMap.get(f.userId) ?? null;
    }
    return result;
  }),

  // ─── Set friend remark name ──────────────────────────────────────────────
  setRemark: protectedProcedure
    .input(z.object({ contactId: z.number().int().positive(), remarkName: z.string().max(50) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const remark = input.remarkName.trim() || null;
      const existing = await db.select({ id: contactMetadata.id }).from(contactMetadata)
        .where(and(eq(contactMetadata.userId, ctx.user.id), eq(contactMetadata.contactId, input.contactId)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(contactMetadata).set({ remarkName: remark }).where(eq(contactMetadata.id, existing[0].id));
      } else {
        await db.insert(contactMetadata).values({ userId: ctx.user.id, contactId: input.contactId, remarkName: remark });
      }
      return { success: true, remarkName: remark };
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
