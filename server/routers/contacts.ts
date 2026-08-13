import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { friendRequests, users, contactMetadata, userBlocklist, chatGroups, groupMembers, userSettings } from "../../drizzle/schema";
import { and, eq, or, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { createNotification } from "./notificationsRouter";
import { hasBlocked, isBlockedEither, assertCanDM } from "../utils/relations";

export const contactsRouter = router({
  // ─── 看某用户的公开资料(头像/昵称/简介)+ 是否好友 ───────────────────────────
  //   群聊点头像进资料页用。bio 本就在 user.searchUsers 公开,故对所有登录用户可见。
  getProfileById: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [u] = await db
        .select({
          // 仅公开字段:绝不外泄 npPoints(他人积分余额)/email/openId 等
          id: users.id, name: users.name, username: users.username,
          avatar: users.avatar, bio: users.bio, isBot: users.isBot, createdAt: users.createdAt,
        })
        .from(users).where(eq(users.id, input.userId)).limit(1);
      if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      const isSelf = input.userId === ctx.user.id;
      let isFriend = false, requestPending = false, blockedByMe = false;
      if (!isSelf) {
        const [rel] = await db
          .select({ status: friendRequests.status })
          .from(friendRequests)
          .where(or(
            and(eq(friendRequests.senderId, ctx.user.id), eq(friendRequests.receiverId, input.userId)),
            and(eq(friendRequests.senderId, input.userId), eq(friendRequests.receiverId, ctx.user.id)),
          ))
          .limit(1);
        if (rel?.status === "accepted") isFriend = true;
        else if (rel?.status === "pending") requestPending = true;
        blockedByMe = await hasBlocked(db, ctx.user.id, input.userId);
      }
      let canDM = false;
      if (!isSelf) {
        try { await assertCanDM(db, ctx.user.id, input.userId); canDM = true; } catch { canDM = false; }
      }
      let profileVisible = true;
      try {
        const [st] = await db.select({ v: userSettings.profileVisible }).from(userSettings)
          .where(eq(userSettings.userId, input.userId)).limit(1);
        if (st) profileVisible = !!st.v;
      } catch { /* 列未补齐时按公开 */ }
      const profileHidden = !isSelf && !isFriend && !profileVisible;
      if (profileHidden) {
        return {
          id: u.id, name: u.name, username: u.username, avatar: u.avatar,
          bio: null, isBot: u.isBot, createdAt: null,
          isSelf, isFriend, requestPending, blockedByMe,
          profileHidden: true, canDM,
        };
      }
      return { ...u, isSelf, isFriend, requestPending, blockedByMe, profileHidden: false, canDM };
    }),

  // ─── 拉黑 / 解除拉黑 / 黑名单列表 ─────────────────────────────────────────────
  blockUser: protectedProcedure
    .input(z.object({ targetId: z.number().int().positive() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.targetId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能拉黑自己" });
      try {
        await db.insert(userBlocklist).values({ blockerId: ctx.user.id, blockedId: input.targetId });
      } catch { /* 已拉黑(唯一索引),幂等 */ }
      // 拉黑即解除好友关系(双向),并清理双方备注/收藏元数据
      await db.delete(friendRequests).where(or(
        and(eq(friendRequests.senderId, ctx.user.id), eq(friendRequests.receiverId, input.targetId)),
        and(eq(friendRequests.senderId, input.targetId), eq(friendRequests.receiverId, ctx.user.id)),
      ));
      await db.delete(contactMetadata).where(or(
        and(eq(contactMetadata.userId, ctx.user.id), eq(contactMetadata.contactId, input.targetId)),
        and(eq(contactMetadata.userId, input.targetId), eq(contactMetadata.contactId, ctx.user.id)),
      ));
      return { ok: true };
    }),
  unblockUser: protectedProcedure
    .input(z.object({ targetId: z.number().int().positive() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(userBlocklist)
        .where(and(eq(userBlocklist.blockerId, ctx.user.id), eq(userBlocklist.blockedId, input.targetId)));
      return { ok: true };
    }),
  listBlocked: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id, name: users.name, username: users.username, avatar: users.avatar,
      blockedAt: userBlocklist.createdAt,
    }).from(userBlocklist)
      .innerJoin(users, eq(users.id, userBlocklist.blockedId))
      .where(eq(userBlocklist.blockerId, ctx.user.id))
      .orderBy(desc(userBlocklist.createdAt));
  }),

  // ─── Send friend request ────────────────────────────────────────────────────
  sendRequest: protectedProcedure
    .input(z.object({ receiverId: z.number().int().positive() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.receiverId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能添加自己为好友" });
      if (await isBlockedEither(db, ctx.user.id, input.receiverId)) throw new TRPCError({ code: "FORBIDDEN", message: "无法添加好友(存在拉黑关系)" });

      // 共同群开了「禁止互加好友」，且双方都是普通成员 → 拒绝（群主/管理仍可加）
      const meM = alias(groupMembers, "forbid_me");
      const themM = alias(groupMembers, "forbid_them");
      const [forbidHit] = await db.select({ id: chatGroups.id })
        .from(chatGroups)
        .innerJoin(meM, and(eq(meM.groupId, chatGroups.id), eq(meM.userId, ctx.user.id)))
        .innerJoin(themM, and(eq(themM.groupId, chatGroups.id), eq(themM.userId, input.receiverId)))
        .where(and(
          eq(chatGroups.forbidAddFriend, true),
          eq(meM.role, "member"),
          eq(themM.role, "member"),
        ))
        .limit(1);
      if (forbidHit) throw new TRPCError({ code: "FORBIDDEN", message: "该群已禁止成员互加好友" });

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
