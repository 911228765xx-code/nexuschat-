import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { chatGroups, groupMembers, messages, users, groupUnreadCounts, messageReactions, groupInviteLinks, groupFiles, messageReadReceipts, groupMutes, redPacketClaims, redPackets, groupAnnouncements, conversationPrefs, groupJoinRequests } from "../../drizzle/schema";
import { eq, and, desc, lt, sql, or, ne, gt, like, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { emitToUser } from "../socket";
import { sanitizeInput } from "../utils/sanitize";
import { rateLimitWrite } from "../rateLimit";
import logger from "../utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Throw FORBIDDEN if the user is not a member of the group. */
async function assertGroupMember(db: Db, groupId: number, userId: number): Promise<void> {
  const [m] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!m) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group" });
}

/** 用户清除历史后的游标：只显示 id > clearedBeforeId 的消息（0=未清除）。 */
async function getClearedBeforeId(db: Db, userId: number, convKey: string): Promise<number> {
  const [p] = await db
    .select({ c: conversationPrefs.clearedBeforeId })
    .from(conversationPrefs)
    .where(and(eq(conversationPrefs.userId, userId), eq(conversationPrefs.convKey, convKey)))
    .limit(1);
  return p?.c ?? 0;
}

export const chatRouter = router({
  // List public groups
  listGroups: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
          category: z.string().optional(),
          search: z.string().max(50).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(chatGroups.isPublic, true)];
      if (input?.category && input.category !== "all") {
        conditions.push(eq(chatGroups.category, input.category));
      }
      const q = input?.search?.trim();
      if (q) {
        const term = `%${q}%`;
        const match = or(like(chatGroups.name, term), like(chatGroups.description, term));
        if (match) conditions.push(match);
      }
      return db
        .select()
        .from(chatGroups)
        .where(and(...conditions))
        .orderBy(desc(chatGroups.memberCount))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);
    }),

  // ─── 管理员：列出所有群（含私有），用于平台管理 ─────────────────────────
  adminListGroups: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30), offset: z.number().min(0).default(0), search: z.string().max(50).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = [] as any[];
      const q = input?.search?.trim();
      if (q) conds.push(like(chatGroups.name, `%${q}%`));
      return db
        .select({ id: chatGroups.id, name: chatGroups.name, memberCount: chatGroups.memberCount, isPublic: chatGroups.isPublic, category: chatGroups.category, creatorId: chatGroups.creatorId, createdAt: chatGroups.createdAt })
        .from(chatGroups)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(chatGroups.createdAt))
        .limit(input?.limit ?? 30)
        .offset(input?.offset ?? 0);
    }),

  // ─── 管理员：删除群（连带成员/消息/公告）─────────────────────────────
  adminDeleteGroup: adminProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      await db.delete(messages).where(eq(messages.groupId, input.groupId));
      await db.delete(groupMembers).where(eq(groupMembers.groupId, input.groupId));
      await db.delete(groupAnnouncements).where(eq(groupAnnouncements.groupId, input.groupId));
      await db.delete(chatGroups).where(eq(chatGroups.id, input.groupId));
      return { success: true };
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
      category: z.string().max(30).optional().default("community"),
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
        category: input.category ?? "community",
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
      // 审批群：不直接加入，转为提交加入申请
      const [grp] = await db.select({ joinApproval: chatGroups.joinApproval }).from(chatGroups)
        .where(eq(chatGroups.id, input.groupId)).limit(1);
      if (grp?.joinApproval) {
        const pending = await db.select({ id: groupJoinRequests.id }).from(groupJoinRequests)
          .where(and(eq(groupJoinRequests.groupId, input.groupId), eq(groupJoinRequests.userId, ctx.user.id), eq(groupJoinRequests.status, "pending")))
          .limit(1);
        if (pending.length === 0) {
          await db.insert(groupJoinRequests).values({ groupId: input.groupId, userId: ctx.user.id });
        }
        return { success: true, alreadyMember: false, pendingApproval: true };
      }
      await db.insert(groupMembers).values({
        groupId: input.groupId,
        userId: ctx.user.id,
        role: "member",
      });
      // 用真实成员数回写，避免并发重复加入导致 memberCount 自增漂移
      await db
        .update(chatGroups)
        .set({
          memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`,
        })
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
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Private groups: only members may read messages. Public groups are browsable.
      const [grp] = await db
        .select({ isPublic: chatGroups.isPublic })
        .from(chatGroups)
        .where(eq(chatGroups.id, input.groupId))
        .limit(1);
      if (!grp) return [];
      if (!grp.isPublic) await assertGroupMember(db, input.groupId, ctx.user.id);
      const conditions = [
        eq(messages.groupId, input.groupId),
        eq(messages.isDeleted, false),
        sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
      ];
      const clearedG = await getClearedBeforeId(db, ctx.user.id, `group:${input.groupId}`);
      if (clearedG > 0) conditions.push(gt(messages.id, clearedG));
      if (input.before) {
        conditions.push(lt(messages.id, input.before));
      }
      const repliedMsg = alias(messages, "replied_msg_g");
      const repliedUser = alias(users, "replied_user_g");
      const rows = await db
        .select({
          id: messages.id,
          content: messages.content,
          messageType: messages.messageType,
          mediaUrl: messages.mediaUrl,
          durationSeconds: messages.durationSeconds,
          replyToId: messages.replyToId,
          isPinned: messages.isPinned,
          recalledAt: messages.recalledAt,
          createdAt: messages.createdAt,
          expiresAt: messages.expiresAt,
          senderId: messages.senderId,
          senderName: users.name,
          senderAvatar: users.avatar,
          senderRole: groupMembers.role,
          replyContent: repliedMsg.content,
          replyType: repliedMsg.messageType,
          replySenderName: repliedUser.name,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(groupMembers, and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, messages.senderId)))
        .leftJoin(repliedMsg, eq(repliedMsg.id, messages.replyToId))
        .leftJoin(repliedUser, eq(repliedUser.id, repliedMsg.senderId))
        .where(and(...conditions))
        // 按 id 排序，与 before 游标(lt id)保持一致，避免同秒消息翻页丢/重
        .orderBy(desc(messages.id))
        .limit(input.limit);
      return rows.reverse();
    }),

  // Save a message (called from socket handler via REST fallback)
  saveMessage: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      content: z.string().min(1).max(4000),
      messageType: z.enum(["text", "image", "file", "voice", "video"]).default("text"),
      mediaUrl: z.string().optional(),
      durationSeconds: z.number().int().min(0).max(600).optional(),
      replyToId: z.number().int().optional(),
      ttlSeconds: z.number().int().min(0).max(60 * 60 * 24 * 90).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertGroupMember(db, input.groupId, ctx.user.id);
      const expiresAt = input.ttlSeconds && input.ttlSeconds > 0 ? new Date(Date.now() + input.ttlSeconds * 1000) : null;
      const [result] = await db.insert(messages).values({
        groupId: input.groupId,
        senderId: ctx.user.id,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? undefined,
        durationSeconds: input.durationSeconds ?? undefined,
        replyToId: input.replyToId ?? undefined,
        expiresAt,
      });
      return { messageId: (result as any).insertId };
    }),

  // ─── DM: Send a direct message ─────────────────────────────────────────────
  sendDM: protectedProcedure
    .input(z.object({
      receiverId: z.number(),
      content: z.string().min(1).max(4000),
      messageType: z.enum(["text", "image", "file", "voice", "video"]).default("text"),
      mediaUrl: z.string().optional(),
      durationSeconds: z.number().int().min(0).max(600).optional(),
      replyToId: z.number().int().optional(),
      ttlSeconds: z.number().int().min(0).max(60 * 60 * 24 * 90).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const expiresAt = input.ttlSeconds && input.ttlSeconds > 0 ? new Date(Date.now() + input.ttlSeconds * 1000) : null;
      const [result] = await db.insert(messages).values({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        groupId: null,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? undefined,
        durationSeconds: input.durationSeconds ?? undefined,
        replyToId: input.replyToId ?? undefined,
        expiresAt,
      });
      const messageId = (result as any).insertId as number;
      // Push real-time notification to recipient via Socket.IO (use the sanitized content,
      // matching what is persisted, so the pushed payload can't carry unsanitized markup).
      emitToUser(input.receiverId, "dm_message", {
        messageId,
        senderId: ctx.user.id,
        senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? null,
        durationSeconds: input.durationSeconds ?? null,
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
        sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
      ];
      const clearedD = await getClearedBeforeId(db, myId, `dm:${otherId}`);
      if (clearedD > 0) conditions.push(gt(messages.id, clearedD));
      if (input.before) conditions.push(lt(messages.id, input.before));
      const repliedMsg = alias(messages, "replied_msg_d");
      const repliedUser = alias(users, "replied_user_d");
      const rows = await db
        .select({
          id: messages.id,
          content: messages.content,
          messageType: messages.messageType,
          mediaUrl: messages.mediaUrl,
          durationSeconds: messages.durationSeconds,
          replyToId: messages.replyToId,
          recalledAt: messages.recalledAt,
          createdAt: messages.createdAt,
          expiresAt: messages.expiresAt,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          senderName: users.name,
          senderAvatar: users.avatar,
          replyContent: repliedMsg.content,
          replyType: repliedMsg.messageType,
          replySenderName: repliedUser.name,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(repliedMsg, eq(repliedMsg.id, messages.replyToId))
        .leftJoin(repliedUser, eq(repliedUser.id, repliedMsg.senderId))
        .where(and(...conditions))
        // 按 id 排序，与 before 游标(lt id)保持一致
        .orderBy(desc(messages.id))
        .limit(input.limit);
      // 打开会话即把对方发来的未读私信标记为已读
      try {
        await db.update(messages).set({ isRead: true }).where(
          and(
            eq(messages.senderId, otherId),
            eq(messages.receiverId, myId),
            eq(messages.isRead, false),
            sql`${messages.groupId} IS NULL`,
          )
        );
      } catch (err) {
        logger.warn({ err, otherId, myId }, "markDMsRead failed");
      }
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
          sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
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

    // 各会话未读数（对方发来、未读、DM）
    const unreadRows = await db
      .select({ senderId: messages.senderId, cnt: sql<number>`COUNT(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, myId),
          eq(messages.isRead, false),
          eq(messages.isDeleted, false),
          sql`${messages.groupId} IS NULL`,
        )
      )
      .groupBy(messages.senderId);
    const unreadMap = new Map(unreadRows.map(r => [r.senderId, Number(r.cnt)]));

    return partnerUsers.map(u => ({
      userId: u.id,
      name: u.name ?? u.username ?? "User",
      avatar: u.avatar,
      lastMessage: convMap.get(u.id)?.content ?? "",
      lastMessageAt: convMap.get(u.id)?.createdAt ?? new Date(),
      isMine: convMap.get(u.id)?.senderId === myId,
      unreadCount: unreadMap.get(u.id) ?? 0,
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

    // Fetch latest message for all groups in ONE pass (avoid N+1).
    // 1) max(id) per group  2) join back to get its content/sender.
    const groupIds = groups.map((g) => g.id);
    const latestByGroup = new Map<number, { content: string; createdAt: Date; senderName: string | null; senderUsername: string | null }>();
    if (groupIds.length > 0) {
      const latest = db
        .select({
          groupId: messages.groupId,
          maxId: sql<number>`MAX(${messages.id})`.as("max_id"),
        })
        .from(messages)
        .where(and(inArray(messages.groupId, groupIds), eq(messages.isDeleted, false)))
        .groupBy(messages.groupId)
        .as("latest");
      const latestRows = await db
        .select({
          groupId: messages.groupId,
          content: messages.content,
          createdAt: messages.createdAt,
          senderName: users.name,
          senderUsername: users.username,
        })
        .from(messages)
        .innerJoin(latest, eq(messages.id, latest.maxId))
        .leftJoin(users, eq(messages.senderId, users.id));
      for (const r of latestRows) {
        if (r.groupId != null) latestByGroup.set(r.groupId, r);
      }
    }
    const result = groups.map((g) => {
      const m = latestByGroup.get(g.id);
      return {
        ...g,
        lastMessage: m?.content ?? g.description ?? '',
        lastMessageAt: m?.createdAt ?? g.updatedAt,
        lastSender: m?.senderName ?? m?.senderUsername ?? null,
      };
    });
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
      base64: z.string().max(22_000_000), // ~16MB raw file (base64 is ~33% larger)
      mimeType: z.string().default("image/jpeg"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const { downscaleImage } = await import("../utils/image");
      const raw = Buffer.from(input.base64, "base64");
      // 等比缩到最长边 ≤1600，避免存/发 4000px 原图
      const { buffer, mime } = await downscaleImage(raw, 1600, 82, input.mimeType);
      const ext = mime.split("/")[1] ?? "jpg";
      const key = `chat-images/${ctx.user.id}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, mime);
      return { url };
    }),

  // Upload chat video to S3 (short clips; stays under the 50MB JSON body limit)
  uploadChatVideo: protectedProcedure
    .input(z.object({
      base64: z.string().max(40_000_000), // ~30MB raw file (base64 ~33% larger)
      mimeType: z.string().default("video/mp4"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 30 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "视频不能超过 30MB，请录短一点" });
      }
      const ext = input.mimeType.split("/")[1]?.split(";")[0] ?? "mp4";
      const key = `chat-videos/${ctx.user.id}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  // Upload an arbitrary chat file (documents) to S3
  uploadChatFile: protectedProcedure
    .input(z.object({
      base64: z.string().max(20_000_000), // ~15MB raw
      mimeType: z.string().default("application/octet-stream"),
      fileName: z.string().max(200).default("file"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 15 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "文件不能超过 15MB" });
      }
      const safe = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
      const key = `chat-files/${ctx.user.id}/${Date.now()}_${safe}`;
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

    // One aggregated query (avoid N+1): join messages to the user's per-group
    // read cursor and count messages newer than it, grouped by group.
    const groupIds = joinedGroups.map((g) => g.groupId);
    const result: Record<number, number> = {};
    for (const id of groupIds) result[id] = 0;
    const rows = await db
      .select({
        groupId: messages.groupId,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .leftJoin(
        groupUnreadCounts,
        and(
          eq(groupUnreadCounts.groupId, messages.groupId),
          eq(groupUnreadCounts.userId, ctx.user.id),
        ),
      )
      .where(and(
        inArray(messages.groupId, groupIds),
        eq(messages.isDeleted, false),
        gt(messages.id, sql`COALESCE(${groupUnreadCounts.lastReadMessageId}, 0)`),
      ))
      .groupBy(messages.groupId);
    for (const r of rows) {
      if (r.groupId != null) result[r.groupId] = Number(r.count);
    }
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

  // ─── 撤回消息（2 分钟内，仅发送者）────────────────────────────────────────
  recallMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [m] = await db.select({ senderId: messages.senderId, createdAt: messages.createdAt })
        .from(messages).where(eq(messages.id, input.messageId)).limit(1);
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "消息不存在" });
      if (m.senderId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能撤回自己的消息" });
      if (Date.now() - new Date(m.createdAt).getTime() > 2 * 60 * 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "超过 2 分钟，无法撤回" });
      }
      await db.update(messages).set({ recalledAt: new Date(), isPinned: false }).where(eq(messages.id, input.messageId));
      return { ok: true };
    }),

  // ─── 转发消息（到群或私信）───────────────────────────────────────────────
  forwardMessage: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      targetGroupId: z.number().optional(),
      targetReceiverId: z.number().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      if (!input.targetGroupId && !input.targetReceiverId) throw new TRPCError({ code: "BAD_REQUEST", message: "缺少转发目标" });
      const [src] = await db.select({
        content: messages.content, messageType: messages.messageType, mediaUrl: messages.mediaUrl,
        durationSeconds: messages.durationSeconds, recalledAt: messages.recalledAt, isDeleted: messages.isDeleted,
      }).from(messages).where(eq(messages.id, input.messageId)).limit(1);
      if (!src || src.isDeleted || src.recalledAt) throw new TRPCError({ code: "NOT_FOUND", message: "原消息不可用" });
      if (src.messageType === "redpacket") throw new TRPCError({ code: "BAD_REQUEST", message: "红包不能转发" });
      if (input.targetGroupId) {
        await assertGroupMember(db, input.targetGroupId, ctx.user.id);
        const [r] = await db.insert(messages).values({
          groupId: input.targetGroupId, senderId: ctx.user.id, content: src.content,
          messageType: src.messageType, mediaUrl: src.mediaUrl ?? undefined,
          durationSeconds: src.durationSeconds ?? undefined, forwardFromId: input.messageId,
        });
        return { messageId: (r as any).insertId as number };
      }
      const [r] = await db.insert(messages).values({
        receiverId: input.targetReceiverId!, senderId: ctx.user.id, groupId: null, content: src.content,
        messageType: src.messageType, mediaUrl: src.mediaUrl ?? undefined,
        durationSeconds: src.durationSeconds ?? undefined, forwardFromId: input.messageId,
      });
      const messageId = (r as any).insertId as number;
      emitToUser(input.targetReceiverId!, "dm_message", {
        messageId, senderId: ctx.user.id, senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
        content: src.content, messageType: src.messageType, mediaUrl: src.mediaUrl ?? null,
        durationSeconds: src.durationSeconds ?? null, createdAt: new Date().toISOString(),
      });
      return { messageId };
    }),

  // ─── 置顶消息（群主/管理员）─────────────────────────────────────────────
  pinMessage: protectedProcedure
    .input(z.object({ messageId: z.number(), groupId: z.number(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主/管理员可置顶消息" });
      }
      await db.update(messages).set({ isPinned: input.pinned })
        .where(and(eq(messages.id, input.messageId), eq(messages.groupId, input.groupId)));
      return { ok: true };
    }),

  getPinnedMessages: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: messages.id, content: messages.content, messageType: messages.messageType,
        senderId: messages.senderId, senderName: users.name, createdAt: messages.createdAt,
      }).from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(
          eq(messages.groupId, input.groupId), eq(messages.isPinned, true),
          eq(messages.isDeleted, false), sql`${messages.recalledAt} IS NULL`,
        ))
        .orderBy(desc(messages.id))
        .limit(10);
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
      await assertGroupMember(db, input.groupId, ctx.user.id);
      const [result] = await db.insert(groupFiles).values({ groupId: input.groupId, uploaderId: ctx.user.id, messageId: input.messageId, fileName: input.fileName, fileSize: input.fileSize, mimeType: input.mimeType, fileKey: input.fileKey, url: input.url });
      return { id: (result as { insertId: number }).insertId, url: input.url };
    }),

  getGroupFiles: protectedProcedure
    .input(z.object({ groupId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      await assertGroupMember(db, input.groupId, ctx.user.id);
      return db.select({ id: groupFiles.id, fileName: groupFiles.fileName, fileSize: groupFiles.fileSize, mimeType: groupFiles.mimeType, url: groupFiles.url, createdAt: groupFiles.createdAt, uploaderName: users.name })
        .from(groupFiles)
        .leftJoin(users, eq(groupFiles.uploaderId, users.id))
        .where(eq(groupFiles.groupId, input.groupId))
        .orderBy(desc(groupFiles.createdAt)).limit(input.limit);
    }),

  // ─── 群文件库：直接列出群内已发的 图片/视频/文件 消息 ──────────────────────
  getGroupMedia: protectedProcedure
    .input(z.object({ groupId: z.number(), limit: z.number().default(60) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      await assertGroupMember(db, input.groupId, ctx.user.id);
      return db.select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        mediaUrl: messages.mediaUrl,
        durationSeconds: messages.durationSeconds,
        createdAt: messages.createdAt,
        senderName: users.name,
      }).from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(
          eq(messages.groupId, input.groupId),
          eq(messages.isDeleted, false),
          sql`${messages.recalledAt} IS NULL`,
          inArray(messages.messageType, ["image", "video", "file"]),
        ))
        .orderBy(desc(messages.id))
        .limit(input.limit);
    }),

  // ─── Read Receipts ────────────────────────────────────────────────────────
  markMessagesRead: protectedProcedure
    .input(z.object({ groupId: z.number(), messageIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return { ok: true };
      const db = await getDb();
      if (!db) return { ok: true };
      await assertGroupMember(db, input.groupId, ctx.user.id);
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

  // Returns up to 5 readers (with avatar) for a specific message
  getReadReceipts: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          userId: messageReadReceipts.userId,
          name: users.name,
          avatar: users.avatar,
        })
        .from(messageReadReceipts)
        .innerJoin(users, eq(users.id, messageReadReceipts.userId))
        .where(eq(messageReadReceipts.messageId, input.messageId))
        .limit(5);
      return rows.map(r => ({ userId: r.userId, name: r.name ?? "User", avatar: r.avatar ?? null }));
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
      // The new owner must already be a member, otherwise the group would be left with no owner.
      const target = await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.newOwnerId))).limit(1);
      if (!target[0]) throw new Error("New owner must be a member of the group");
      await db.update(groupMembers).set({ role: "owner" }).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.newOwnerId)));
      await db.update(groupMembers).set({ role: "member" }).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)));
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
      await db.update(chatGroups).set({ memberCount: sql`GREATEST(${chatGroups.memberCount} - 1, 0)` })
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
      isPublic: z.boolean().optional(),
      joinApproval: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      const updates: Partial<{ name: string; description: string; avatar: string; isPublic: boolean; joinApproval: boolean }> = {};
      if (input.name !== undefined) updates.name = sanitizeInput(input.name);
      if (input.description !== undefined) updates.description = sanitizeInput(input.description);
      if (input.avatar !== undefined) updates.avatar = input.avatar;
      if (input.isPublic !== undefined) updates.isPublic = input.isPublic;
      if (input.joinApproval !== undefined) updates.joinApproval = input.joinApproval;
      if (Object.keys(updates).length === 0) return { ok: true };
      await db.update(chatGroups).set(updates).where(eq(chatGroups.id, input.groupId));
      return { ok: true };
    }),

  // ─── 会话偏好：免打扰 / 置顶 / 清除历史 ──────────────────────────────────
  getConversationPrefs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {} as Record<string, { isMuted: boolean; isPinned: boolean }>;
    const rows = await db.select({
      convKey: conversationPrefs.convKey, isMuted: conversationPrefs.isMuted, isPinned: conversationPrefs.isPinned,
    }).from(conversationPrefs).where(eq(conversationPrefs.userId, ctx.user.id));
    const map: Record<string, { isMuted: boolean; isPinned: boolean }> = {};
    for (const r of rows) map[r.convKey] = { isMuted: r.isMuted, isPinned: r.isPinned };
    return map;
  }),

  setConversationPref: protectedProcedure
    .input(z.object({
      convKey: z.string().max(40),
      isMuted: z.boolean().optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [existing] = await db.select({ id: conversationPrefs.id }).from(conversationPrefs)
        .where(and(eq(conversationPrefs.userId, ctx.user.id), eq(conversationPrefs.convKey, input.convKey))).limit(1);
      const patch: Partial<{ isMuted: boolean; isPinned: boolean }> = {};
      if (input.isMuted !== undefined) patch.isMuted = input.isMuted;
      if (input.isPinned !== undefined) patch.isPinned = input.isPinned;
      if (existing) {
        if (Object.keys(patch).length > 0) await db.update(conversationPrefs).set(patch).where(eq(conversationPrefs.id, existing.id));
      } else {
        await db.insert(conversationPrefs).values({ userId: ctx.user.id, convKey: input.convKey, ...patch });
      }
      return { ok: true };
    }),

  clearConversationHistory: protectedProcedure
    .input(z.object({ convKey: z.string().max(40) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 把清除游标设到该会话当前最大消息 id —— 之后只显示更新的消息（仅对自己生效）
      let maxId = 0;
      if (input.convKey.startsWith("group:")) {
        const gid = parseInt(input.convKey.slice(6), 10);
        const [m] = await db.select({ id: messages.id }).from(messages)
          .where(eq(messages.groupId, gid)).orderBy(desc(messages.id)).limit(1);
        maxId = m?.id ?? 0;
      } else if (input.convKey.startsWith("dm:")) {
        const other = parseInt(input.convKey.slice(3), 10);
        const [m] = await db.select({ id: messages.id }).from(messages)
          .where(or(
            and(eq(messages.senderId, ctx.user.id), eq(messages.receiverId, other)),
            and(eq(messages.senderId, other), eq(messages.receiverId, ctx.user.id)),
          )!).orderBy(desc(messages.id)).limit(1);
        maxId = m?.id ?? 0;
      }
      const [existing] = await db.select({ id: conversationPrefs.id }).from(conversationPrefs)
        .where(and(eq(conversationPrefs.userId, ctx.user.id), eq(conversationPrefs.convKey, input.convKey))).limit(1);
      if (existing) {
        await db.update(conversationPrefs).set({ clearedBeforeId: maxId }).where(eq(conversationPrefs.id, existing.id));
      } else {
        await db.insert(conversationPrefs).values({ userId: ctx.user.id, convKey: input.convKey, clearedBeforeId: maxId });
      }
      return { ok: true, clearedBeforeId: maxId };
    }),

  // ─── 进群审批 ────────────────────────────────────────────────────────────
  listJoinRequests: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) return [];
      return db.select({
        id: groupJoinRequests.id, userId: groupJoinRequests.userId, createdAt: groupJoinRequests.createdAt,
        name: users.name, username: users.username, avatar: users.avatar,
      }).from(groupJoinRequests)
        .leftJoin(users, eq(users.id, groupJoinRequests.userId))
        .where(and(eq(groupJoinRequests.groupId, input.groupId), eq(groupJoinRequests.status, "pending")))
        .orderBy(desc(groupJoinRequests.id));
    }),

  reviewJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.number(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [req] = await db.select().from(groupJoinRequests).where(eq(groupJoinRequests.id, input.requestId)).limit(1);
      if (!req || req.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在或已处理" });
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, req.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主/管理员可审批" });
      }
      await db.update(groupJoinRequests).set({ status: input.approve ? "approved" : "rejected" }).where(eq(groupJoinRequests.id, input.requestId));
      if (input.approve) {
        const already = await db.select({ id: groupMembers.id }).from(groupMembers)
          .where(and(eq(groupMembers.groupId, req.groupId), eq(groupMembers.userId, req.userId))).limit(1);
        if (already.length === 0) {
          await db.insert(groupMembers).values({ groupId: req.groupId, userId: req.userId, role: "member" });
          await db.update(chatGroups).set({
            memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${req.groupId})`,
          }).where(eq(chatGroups.id, req.groupId));
        }
      }
      return { ok: true };
    }),

  // ─── Red Packet: Send (扣 NP 积分发群红包) ───────────────────────────────
  sendRedPacket: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      totalAmount: z.number().int().min(1).max(1_000_000),
      totalShares: z.number().int().min(1).max(100),
      isRandom: z.boolean().default(true),
      blessing: z.string().max(100).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      await assertGroupMember(db, input.groupId, ctx.user.id);
      if (input.totalShares > input.totalAmount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "红包个数不能超过总积分（每份至少 1 NP）" });
      }
      const blessing = (input.blessing?.trim() || "恭喜发财，大吉大利").slice(0, 100);
      let messageId = 0;
      await db.transaction(async (tx) => {
        // 1) 条件扣减发送者积分（防透支/并发）
        const deduct = await tx.update(users)
          .set({ npPoints: sql`npPoints - ${input.totalAmount}` })
          .where(and(eq(users.id, ctx.user.id), sql`npPoints >= ${input.totalAmount}`));
        const affected = (deduct as any)?.[0]?.affectedRows ?? (deduct as any)?.affectedRows ?? 0;
        if (!affected) throw new TRPCError({ code: "BAD_REQUEST", message: "积分不足，无法发红包" });
        // 2) 红包消息
        const [msg] = await tx.insert(messages).values({
          groupId: input.groupId,
          senderId: ctx.user.id,
          content: blessing,
          messageType: "redpacket",
        });
        messageId = (msg as any).insertId as number;
        // 3) 红包本体
        await tx.insert(redPackets).values({
          messageId,
          groupId: input.groupId,
          senderId: ctx.user.id,
          totalAmount: input.totalAmount,
          totalShares: input.totalShares,
          remainingAmount: input.totalAmount,
          remainingShares: input.totalShares,
          isRandom: input.isRandom,
          blessing,
        });
      });
      return { messageId, totalAmount: input.totalAmount, totalShares: input.totalShares };
    }),

  // ─── Red Packet: Claim (抢红包，随机/均分发放并入账) ───────────────────────
  claimRedPacket: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      groupId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      await assertGroupMember(db, input.groupId, ctx.user.id);
      let result: { ok: boolean; reason: string; amount: number } = { ok: false, reason: "not_found", amount: 0 };
      await db.transaction(async (tx) => {
        // 锁定红包行，串行化所有抢包请求，避免超发
        const [rp] = await tx.select().from(redPackets)
          .where(eq(redPackets.messageId, input.messageId))
          .for("update")
          .limit(1);
        if (!rp) { result = { ok: false, reason: "not_found", amount: 0 }; return; }
        // 是否已抢过
        const existing = await tx.select({ amount: redPacketClaims.amount }).from(redPacketClaims)
          .where(and(eq(redPacketClaims.messageId, input.messageId), eq(redPacketClaims.claimedBy, ctx.user.id)))
          .limit(1);
        if (existing.length > 0) { result = { ok: false, reason: "already_claimed", amount: existing[0].amount }; return; }
        if (rp.remainingShares <= 0 || rp.remainingAmount <= 0) { result = { ok: false, reason: "exhausted", amount: 0 }; return; }
        // 计算本次金额
        let amount: number;
        if (rp.remainingShares === 1) {
          amount = rp.remainingAmount; // 最后一个拿走全部余额
        } else if (rp.isRandom) {
          // 二倍均值法：保证后面每人至少 1 NP（max 兜底 ≥1，防极端不变量被破坏）
          const max = Math.max(1, rp.remainingAmount - (rp.remainingShares - 1));
          const avg2 = Math.floor((rp.remainingAmount / rp.remainingShares) * 2);
          const hi = Math.max(1, Math.min(max, avg2));
          amount = Math.floor(Math.random() * hi) + 1;
        } else {
          amount = Math.max(1, Math.floor(rp.remainingAmount / rp.remainingShares));
        }
        // 记录领取 + 扣减红包余额 + 给领取者加积分
        await tx.insert(redPacketClaims).values({
          messageId: input.messageId, groupId: input.groupId, claimedBy: ctx.user.id, amount,
        });
        await tx.update(redPackets)
          .set({ remainingAmount: sql`remainingAmount - ${amount}`, remainingShares: sql`remainingShares - 1` })
          .where(eq(redPackets.id, rp.id));
        await tx.update(users).set({ npPoints: sql`npPoints + ${amount}` }).where(eq(users.id, ctx.user.id));
        result = { ok: true, reason: "", amount };
      });
      return result;
    }),

  // ─── Red Packet: Get status (含金额与领取明细) ───────────────────────────
  getRedPacketStatus: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [rp] = await db.select().from(redPackets).where(eq(redPackets.messageId, input.messageId)).limit(1);
      if (!rp) return null;
      const claims = await db.select({
        claimedBy: redPacketClaims.claimedBy,
        amount: redPacketClaims.amount,
        claimedAt: redPacketClaims.claimedAt,
        name: users.name,
        avatar: users.avatar,
      }).from(redPacketClaims)
        .leftJoin(users, eq(users.id, redPacketClaims.claimedBy))
        .where(eq(redPacketClaims.messageId, input.messageId))
        .orderBy(desc(redPacketClaims.claimedAt));
      const mine = claims.find((c) => c.claimedBy === ctx.user.id);
      return {
        messageId: input.messageId,
        senderId: rp.senderId,
        totalAmount: rp.totalAmount,
        totalShares: rp.totalShares,
        remainingShares: rp.remainingShares,
        remainingAmount: rp.remainingAmount,
        isRandom: rp.isRandom,
        blessing: rp.blessing,
        claimedCount: rp.totalShares - rp.remainingShares,
        claimedByMe: !!mine,
        myAmount: mine?.amount ?? 0,
        claims: claims.map((c) => ({ userId: c.claimedBy, name: c.name, avatar: c.avatar, amount: c.amount })),
      };
    }),

  // ─── Group Announcements: Get ─────────────────────────────────────────────
  getAnnouncement: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const ann = await db.select().from(groupAnnouncements)
        .where(and(eq(groupAnnouncements.groupId, input.groupId), eq(groupAnnouncements.isPinned, true)))
        .orderBy(desc(groupAnnouncements.updatedAt)).limit(1);
      return ann[0] ?? null;
    }),

  // ─── Group Announcements: Set (owner/admin only) ──────────────────────────
  setAnnouncement: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      await db.delete(groupAnnouncements)
        .where(and(eq(groupAnnouncements.groupId, input.groupId), eq(groupAnnouncements.isPinned, true)));
      await db.insert(groupAnnouncements).values({
        groupId: input.groupId,
        content: sanitizeInput(input.content),
        createdBy: ctx.user.id,
        isPinned: true,
      });
      // Get group info and all members to push notification
      const [groupInfo] = await db.select({ name: chatGroups.name })
        .from(chatGroups).where(eq(chatGroups.id, input.groupId)).limit(1);
      const members = await db.select({ userId: groupMembers.userId })
        .from(groupMembers).where(eq(groupMembers.groupId, input.groupId));
      // Emit real-time notification to all members (except sender)
      const senderName = ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`;
      const groupName = groupInfo?.name ?? `Group #${input.groupId}`;
      const safeContent = sanitizeInput(input.content);
      const preview = safeContent.length > 60 ? safeContent.slice(0, 60) + "..." : safeContent;
      for (const member of members) {
        if (member.userId === ctx.user.id) continue;
        emitToUser(member.userId, "group_announcement", {
          groupId: input.groupId,
          groupName,
          content: preview,
          updatedBy: senderName,
          updatedAt: new Date().toISOString(),
        });
      }
      return { ok: true };
    }),

  // ─── Group Announcements: Delete (owner/admin only) ───────────────────────
  deleteAnnouncement: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      await db.delete(groupAnnouncements)
        .where(and(eq(groupAnnouncements.groupId, input.groupId), eq(groupAnnouncements.isPinned, true)));
      return { ok: true };
    }),

});


