import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { chatGroups, groupMembers, messages, users } from "../../drizzle/schema";
import { eq, and, desc, lt, sql, or, ne } from "drizzle-orm";
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

  // Get user's joined groups
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: chatGroups.id,
        name: chatGroups.name,
        description: chatGroups.description,
        avatar: chatGroups.avatar,
        memberCount: chatGroups.memberCount,
        isTokenGated: chatGroups.isTokenGated,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(chatGroups, eq(groupMembers.groupId, chatGroups.id))
      .where(eq(groupMembers.userId, ctx.user.id))
      .orderBy(desc(chatGroups.updatedAt));
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

  // Soft-delete a message (only sender can delete)
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Verify ownership
      const rows = await db
        .select({ senderId: messages.senderId })
        .from(messages)
        .where(eq(messages.id, input.messageId))
        .limit(1);
      if (!rows[0] || rows[0].senderId !== ctx.user.id) {
        throw new Error("Not authorized");
      }
      await db
        .update(messages)
        .set({ isDeleted: true })
        .where(eq(messages.id, input.messageId));
      return { ok: true };
    }),
});

