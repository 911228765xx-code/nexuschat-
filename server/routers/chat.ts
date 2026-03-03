import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { chatGroups, groupMembers, messages, users, groupUnreadCounts, messageReactions, groupInviteLinks, groupFiles, messageReadReceipts, groupMutes } from "../../drizzle/schema";
import { eq, and, desc, lt, sql, or, ne, gt } from "drizzle-orm";
import { emitToUser } from "../socket";
import { sanitizeInput } from "../utils/sanitize";
import { rateLimitWrite } from "../rateLimit";

export const chatRouter = router({
  // List public groups
  listGroups: publicProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(chatGroups)
        .where(eq(chatGroups.isPublic, true))
        .orderBy(desc(chatGroups.memberCount))
        .limit(input?.limit ?? 20);
    }),

  // Create a group
  createGroup: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().default(true),
      isTokenGated: z.boolean().default(false),
      tokenGateAmount: z.string().optional(),
      tokenGateContract: z.string().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(chatGroups).values({
        name: input.name,
        description: input.description ?? undefined,
        creatorId: ctx.user.id,
        isPublic: input.isPublic,
        isTokenGated: input.isTokenGated,
        tokenGateAmount: input.tokenGateAmount ?? undefined,
        tokenGateContract: input.tokenGateContract ?? undefined,
        memberCount: 1,
      });
      const groupId = (result as any).insertId as number;
      // Add creator as owner
      await db.insert(groupMembers).values({
        groupId,
        userId: ctx.user.id,
        role: "owner",
      });
      return { groupId };
    }),

  // Join a group
  joinGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Check if already member
      const existing = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)))
        .limit(1);
      if (existing.length > 0) return { success: true, alreadyMember: true };
      await db.insert(groupMembers).values({
        groupId: input.groupId,
        userId: ctx.user.id,
        role: "member",
      });
      await db
        .update(chatGroups)
        .set({ memberCount: sql`memberCount + 1` })
        .where(eq(chatGroups.id, input.groupId));
      return { success: true, alreadyMember: false };
    }),

  // Get messages for a group
  getMessages: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      limit: z.number().default(50),
      before: z.number().optional(), // message id cursor
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [
        eq(messages.groupId, input.groupId),
        eq(messages.isDeleted, false),
      ];
      if (input.before) {
        conditions.push(lt(messages.id, input.before));
      }
      const rows = await db
        .select({
          id: messages.id,
          content: messages.content,
          messageType: messages.messageType,
          mediaUrl: messages.mediaUrl,
          createdAt: messages.createdAt,
          senderId: messages.senderId,
          senderName: users.name,
          senderAvatar: users.avatar,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);
      return rows.reverse();
    }),

  // Save a message (called from socket handler via REST fallback)
  saveMessage: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      content: z.string().min(1).max(4000),
      messageType: z.enum(["text", "image", "file"]).default("text"),
      mediaUrl: z.string().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(messages).values({
        groupId: input.groupId,
        senderId: ctx.user.id,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType as "text" | "image" | "file" | "system",
        mediaUrl: input.mediaUrl ?? undefined,
      });
      return { messageId: (result as any).insertId };
    }),

  // ─── DM: Send a direct message ─────────────────────────────────────────────
  sendDM: protectedProcedure
    .input(z.object({
      receiverId: z.number(),
      content: z.string().min(1).max(4000),
      messageType: z.enum(["text", "image", "file"]).default("text"),
      mediaUrl: z.string().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(messages).values({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        groupId: null,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType as "text" | "image" | "file" | "system",
        mediaUrl: input.mediaUrl ?? undefined,
      });
      const messageId = (result as any).insertId as number;
      // Push real-time notification to recipient via Socket.IO
      emitToUser(input.receiverId, "dm_message", {
        messageId,
        senderId: ctx.user.id,
        senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
        content: input.content,
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? null,
        createdAt: new Date().toISOString(),
      });
      return { messageId };
    }),

  // ─── DM: Get message history between two users ────────────────────────────
  getDMHistory: protectedProcedure
    .input(z.object({
      otherUserId: z.number(),
      limit: z.number().default(50),
      before: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const myId = ctx.user.id;
      const otherId = input.otherUserId;
      const conditions = [
        or(
          and(eq(messages.senderId, myId), eq(messages.receiverId, otherId)),
          and(eq(messages.senderId, otherId), eq(messages.receiverId, myId))
        )!,
        eq(messages.isDeleted, false),
      ];
      if (input.before) conditions.push(lt(messages.id, input.before));
      const rows = await db
        .select({
          id: messages.id,
          content: messages.content,
          messageType: messages.messageType,
          mediaUrl: messages.mediaUrl,
          createdAt: messages.createdAt,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          senderName: users.name,
          senderAvatar: users.avatar,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);
      return rows.reverse();
    }),

  // ─── DM: List all DM conversations for current user ───────────────────────
  listDMConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const myId = ctx.user.id;
    // Get all DM messages involving current user
    const dmMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
      })
      .from(messages)
      .where(
        and(
          or(
            eq(messages.senderId, myId),
            eq(messages.receiverId, myId)
          )!,
          eq(messages.isDeleted, false),
          // DM messages have no groupId
          sql`${messages.groupId} IS NULL`,
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(200);
    // Group by conversation partner
    const convMap = new Map<number, typeof dmMessages[0]>();
    for (const msg of dmMessages) {
      const partnerId = msg.senderId === myId ? msg.receiverId! : msg.senderId;
      if (!convMap.has(partnerId)) convMap.set(partnerId, msg);
    }
    if (convMap.size === 0) return [];
    // Fetch partner user info
    const partnerIds = Array.from(convMap.keys());
    const partnerUsers = await db
      .select({ id: users.id, name: users.name, avatar: users.avatar, username: users.username })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(partnerIds.map(id => sql`${id}`), sql`, `)})`);
    return partnerUsers.map(u => ({
      userId: u.id,
      name: u.name ?? u.username ?? "User",
      avatar: u.avatar,
      lastMessage: convMap.get(u.id)?.content ?? "",
      lastMessageAt: convMap.get(u.id)?.createdAt ?? new Date(),
      isMine: convMap.get(u.id)?.senderId === myId,
    }));
  }),

  // Get user's joined groups with latest message preview
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const groups = await db
      .select({
        id: chatGroups.id,
        name: chatGroups.name,
        description: chatGroups.description,
        avatar: chatGroups.avatar,
        memberCount: chatGroups.memberCount,
        isTokenGated: chatGroups.isTokenGated,
        role: groupMembers.role,
        updatedAt: chatGroups.updatedAt,
      })
      .from(groupMembers)
      .innerJoin(chatGroups, eq(groupMembers.groupId, chatGroups.id))
      .where(eq(groupMembers.userId, ctx.user.id))
      .orderBy(desc(chatGroups.updatedAt));

    // Fetch latest message for each group
    const result = await Promise.all(groups.map(async (g) => {
      const [latestMsg] = await db
        .select({
          content: messages.content,
          createdAt: messages.createdAt,
          senderName: users.name,
          senderUsername: users.username,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(eq(messages.groupId, g.id), eq(messages.isDeleted, false)))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      return {
        ...g,
        lastMessage: latestMsg?.content ?? g.description ?? '',
        lastMessageAt: latestMsg?.createdAt ?? g.updatedAt,
        lastSender: latestMsg?.senderName ?? latestMsg?.senderUsername ?? null,
      };
    }));
    // Sort by last message time
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }),

  // Get members of a group
  getGroupMembers: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, input.groupId))
        .orderBy(groupMembers.role, groupMembers.joinedAt)
        .limit(200);
    }),

  // Get group info (name, description, memberCount, avatar)
  getGroupInfo: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(chatGroups)
        .where(eq(chatGroups.id, input.groupId))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Get user info by userId (for DM partner display)
  getUserInfo: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Upload chat image to S3
  uploadChatImage: protectedProcedure
    .input(z.object({
      base64: z.string().max(5_000_000), // ~3.7MB raw file
      mimeType: z.string().default("image/jpeg"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const key = `chat-images/${ctx.user.id}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  // ─── Mark group as read (update lastReadMessageId) ──────────────────────────
  markGroupRead: protectedProcedure
    .input(z.object({ groupId: z.number(), lastMessageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      // Upsert: update if exists, insert if not
      const existing = await db
        .select({ id: groupUnreadCounts.id })
        .from(groupUnreadCounts)
        .where(and(eq(groupUnreadCounts.userId, ctx.user.id), eq(groupUnreadCounts.groupId, input.groupId)))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(groupUnreadCounts)
          .set({ lastReadMessageId: input.lastMessageId })
          .where(and(eq(groupUnreadCounts.userId, ctx.user.id), eq(groupUnreadCounts.groupId, input.groupId)));
      } else {
        await db.insert(groupUnreadCounts).values({
          userId: ctx.user.id,
          groupId: input.groupId,
          lastReadMessageId: input.lastMessageId,
        });
      }
      return { ok: true };
    }),

  // ─── Get unread counts for all joined groups ──────────────────────────────
  getUnreadCounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {};
    // Get all groups the user has joined
    const joinedGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, ctx.user.id));
    if (joinedGroups.length === 0) return {};

    const result: Record<number, number> = {};
    await Promise.all(joinedGroups.map(async ({ groupId }) => {
      // Get user's lastReadMessageId for this group
      const [unreadRow] = await db
        .select({ lastReadMessageId: groupUnreadCounts.lastReadMessageId })
        .from(groupUnreadCounts)
        .where(and(eq(groupUnreadCounts.userId, ctx.user.id), eq(groupUnreadCounts.groupId, groupId)))
        .limit(1);
      const lastReadId = unreadRow?.lastReadMessageId ?? 0;
      // Count messages after lastReadMessageId
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.groupId, groupId),
          eq(messages.isDeleted, false),
          gt(messages.id, lastReadId),
        ));
      result[groupId] = countRow?.count ?? 0;
    }));
    return result;
  }),

  // ─── Auto-join sample groups for new users ───────────────────────────────
  autoJoinSampleGroups: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { joined: 0 };
    // Find the 4 sample groups (the ones created by bot_nexus_bot)
    const sampleGroups = await db
      .select({ id: chatGroups.id })
      .from(chatGroups)
      .where(eq(chatGroups.isPublic, true))
      .orderBy(chatGroups.id)
      .limit(4);
    let joined = 0;
    for (const group of sampleGroups) {
      const existing = await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, ctx.user.id)))
        .limit(1);
      if (existing.length > 0) continue;
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: ctx.user.id,
        role: "member",
      });
      await db
        .update(chatGroups)
        .set({ memberCount: sql`memberCount + 1` })
        .where(eq(chatGroups.id, group.id));
      joined++;
    }
    return { joined };
  }),

  // Soft-delete a message (only sender can delete)
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number(), groupId: z.number().optional() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({ senderId: messages.senderId })
        .from(messages)
        .where(eq(messages.id, input.messageId))
        .limit(1);
      if (!rows[0]) throw new Error("Message not found");
      const isSender = rows[0].senderId === ctx.user.id;
      if (!isSender) {
        // Allow group admin/owner to delete any message
        if (input.groupId) {
          const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
            .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
          if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
        } else {
          throw new Error("Not authorized");
        }
      }
      await db
        .update(messages)
        .set({ isDeleted: true })
        .where(eq(messages.id, input.messageId));
      return { ok: true };
    }),

  // ─── Reactions ────────────────────────────────────────────────────────────
  toggleReaction: protectedProcedure
    .input(z.object({ messageId: z.number(), emoji: z.string().max(10) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select({ id: messageReactions.id })
        .from(messageReactions)
        .where(and(eq(messageReactions.messageId, input.messageId), eq(messageReactions.userId, ctx.user.id), eq(messageReactions.emoji, input.emoji)))
        .limit(1);
      if (existing.length > 0) {
        await db.delete(messageReactions).where(eq(messageReactions.id, existing[0].id));
        return { action: "removed" };
      } else {
        await db.insert(messageReactions).values({ messageId: input.messageId, userId: ctx.user.id, emoji: input.emoji });
        return { action: "added" };
      }
    }),

  getReactions: protectedProcedure
    .input(z.object({ messageIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return {};
      const db = await getDb();
      if (!db) return {};
      const rows = await db
        .select({ messageId: messageReactions.messageId, emoji: messageReactions.emoji, userId: messageReactions.userId })
        .from(messageReactions)
        .where(sql`${messageReactions.messageId} IN (${sql.join(input.messageIds.map(id => sql`${id}`), sql`, `)})`);
      // Group by messageId: { [msgId]: { [emoji]: { count, myReaction } } }
      const result: Record<number, Record<string, { count: number; mine: boolean }>> = {};
      for (const row of rows) {
        const mid = row.messageId;
        if (!result[mid]) result[mid] = {};
        if (!result[mid][row.emoji]) result[mid][row.emoji] = { count: 0, mine: false };
        result[mid][row.emoji].count++;
        if (row.userId === ctx.user.id) result[mid][row.emoji].mine = true;
      }
      return result;
    }),

  // ─── Invite Links ─────────────────────────────────────────────────────────
  createInviteLink: protectedProcedure
    .input(z.object({ groupId: z.number(), maxUses: z.number().default(0), expiresInHours: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Verify membership
      const member = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!member[0]) throw new Error("Not a member");
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const expiresAt = input.expiresInHours ? new Date(Date.now() + input.expiresInHours * 3600_000) : undefined;
      await db.insert(groupInviteLinks).values({ groupId: input.groupId, creatorId: ctx.user.id, token, maxUses: input.maxUses, expiresAt });
      return { token, url: `${input.groupId}/invite/${token}` };
    }),

  useInviteLink: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const link = await db.select().from(groupInviteLinks).where(and(eq(groupInviteLinks.token, input.token), eq(groupInviteLinks.isActive, true))).limit(1);
      if (!link[0]) throw new Error("Invalid or expired invite link");
      const l = link[0];
      if (l.expiresAt && l.expiresAt < new Date()) throw new Error("Invite link has expired");
      if (l.maxUses > 0 && l.useCount >= l.maxUses) throw new Error("Invite link has reached max uses");
      // Check already member
      const existing = await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, l.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (existing[0]) return { groupId: l.groupId, alreadyMember: true };
      await db.insert(groupMembers).values({ groupId: l.groupId, userId: ctx.user.id, role: "member" });
      await db.update(chatGroups).set({ memberCount: sql`memberCount + 1` }).where(eq(chatGroups.id, l.groupId));
      await db.update(groupInviteLinks).set({ useCount: sql`useCount + 1` }).where(eq(groupInviteLinks.id, l.id));
      return { groupId: l.groupId, alreadyMember: false };
    }),

  getGroupInviteLinks: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const member = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!member[0]) return [];
      return db.select().from(groupInviteLinks)
        .where(and(eq(groupInviteLinks.groupId, input.groupId), eq(groupInviteLinks.isActive, true)))
        .orderBy(desc(groupInviteLinks.createdAt)).limit(5);
    }),

  // ─── File Upload ──────────────────────────────────────────────────────────
  saveGroupFile: protectedProcedure
    .input(z.object({ groupId: z.number(), messageId: z.number().optional(), fileName: z.string(), fileSize: z.number(), mimeType: z.string(), fileKey: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [result] = await db.insert(groupFiles).values({ groupId: input.groupId, uploaderId: ctx.user.id, messageId: input.messageId, fileName: input.fileName, fileSize: input.fileSize, mimeType: input.mimeType, fileKey: input.fileKey, url: input.url });
      return { id: (result as { insertId: number }).insertId, url: input.url };
    }),

  getGroupFiles: protectedProcedure
    .input(z.object({ groupId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: groupFiles.id, fileName: groupFiles.fileName, fileSize: groupFiles.fileSize, mimeType: groupFiles.mimeType, url: groupFiles.url, createdAt: groupFiles.createdAt, uploaderName: users.name })
        .from(groupFiles)
        .leftJoin(users, eq(groupFiles.uploaderId, users.id))
        .where(eq(groupFiles.groupId, input.groupId))
        .orderBy(desc(groupFiles.createdAt)).limit(input.limit);
    }),

  // ─── Read Receipts ────────────────────────────────────────────────────────
  markMessagesRead: protectedProcedure
    .input(z.object({ groupId: z.number(), messageIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return { ok: true };
      const db = await getDb();
      if (!db) return { ok: true };
      // Upsert: only insert if not already read
      const existing = await db.select({ messageId: messageReadReceipts.messageId })
        .from(messageReadReceipts)
        .where(and(eq(messageReadReceipts.userId, ctx.user.id), eq(messageReadReceipts.groupId, input.groupId),
          sql`${messageReadReceipts.messageId} IN (${sql.join(input.messageIds.map(id => sql`${id}`), sql`, `)})`));
      const existingIds = new Set(existing.map(r => r.messageId));
      const toInsert = input.messageIds.filter(id => !existingIds.has(id));
      if (toInsert.length > 0) {
        await db.insert(messageReadReceipts).values(toInsert.map(msgId => ({ messageId: msgId, groupId: input.groupId, userId: ctx.user.id })));
      }
      return { ok: true };
    }),

  getReadCounts: protectedProcedure
    .input(z.object({ messageIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      if (input.messageIds.length === 0) return {};
      const db = await getDb();
      if (!db) return {};
      const rows = await db
        .select({ messageId: messageReadReceipts.messageId, count: sql<number>`COUNT(*)` })
        .from(messageReadReceipts)
        .where(sql`${messageReadReceipts.messageId} IN (${sql.join(input.messageIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(messageReadReceipts.messageId);
      return Object.fromEntries(rows.map(r => [r.messageId, r.count]));
    }),

  // ─── Group Management ─────────────────────────────────────────────────────
  kickMember: protectedProcedure
    .input(z.object({ groupId: z.number(), targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      const target = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId))).limit(1);
      if (!target[0]) throw new Error("User not in group");
      if (target[0].role === "owner") throw new Error("Cannot kick the owner");
      await db.delete(groupMembers).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)));
      await db.update(chatGroups).set({ memberCount: sql`GREATEST(memberCount - 1, 0)` }).where(eq(chatGroups.id, input.groupId));
      return { ok: true };
    }),

  muteMember: protectedProcedure
    .input(z.object({ groupId: z.number(), targetUserId: z.number(), durationHours: z.number().default(24) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      const expiresAt = new Date(Date.now() + input.durationHours * 3600_000);
      // Upsert mute
      const existing = await db.select({ id: groupMutes.id }).from(groupMutes)
        .where(and(eq(groupMutes.groupId, input.groupId), eq(groupMutes.userId, input.targetUserId))).limit(1);
      if (existing[0]) {
        await db.update(groupMutes).set({ expiresAt, mutedBy: ctx.user.id }).where(eq(groupMutes.id, existing[0].id));
      } else {
        await db.insert(groupMutes).values({ groupId: input.groupId, userId: input.targetUserId, mutedBy: ctx.user.id, expiresAt });
      }
      return { ok: true, expiresAt };
    }),

  unmuteMember: protectedProcedure
    .input(z.object({ groupId: z.number(), targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      await db.delete(groupMutes).where(and(eq(groupMutes.groupId, input.groupId), eq(groupMutes.userId, input.targetUserId)));
      return { ok: true };
    }),

  transferOwnership: protectedProcedure
    .input(z.object({ groupId: z.number(), newOwnerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || actor[0].role !== "owner") throw new Error("Only owner can transfer");
      await db.update(groupMembers).set({ role: "member" }).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)));
      await db.update(groupMembers).set({ role: "owner" }).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.newOwnerId)));
      return { ok: true };
    }),

  getMutedMembers: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) return [];
      const now = new Date();
      return db.select({ userId: groupMutes.userId, expiresAt: groupMutes.expiresAt, userName: users.name })
        .from(groupMutes)
        .leftJoin(users, eq(groupMutes.userId, users.id))
        .where(and(eq(groupMutes.groupId, input.groupId), gt(groupMutes.expiresAt, now)));
    }),

  // ─── Leave Group ──────────────────────────────────────────────────────────
  leaveGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const member = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!member[0]) throw new Error("Not a member");
      if (member[0].role === "owner") throw new Error("Owner cannot leave. Transfer ownership first.");
      await db.delete(groupMembers).where(
        and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))
      );
      await db.update(chatGroups).set({ memberCount: sql`${chatGroups.memberCount} - 1` })
        .where(eq(chatGroups.id, input.groupId));
      return { ok: true };
    }),

  // ─── Update Group Info (owner/admin only) ────────────────────────────────
  updateGroupInfo: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      avatar: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      const updates: Partial<{ name: string; description: string; avatar: string }> = {};
      if (input.name !== undefined) updates.name = sanitizeInput(input.name);
      if (input.description !== undefined) updates.description = sanitizeInput(input.description);
      if (input.avatar !== undefined) updates.avatar = input.avatar;
      if (Object.keys(updates).length === 0) return { ok: true };
      await db.update(chatGroups).set(updates).where(eq(chatGroups.id, input.groupId));
      return { ok: true };
    }),

});


