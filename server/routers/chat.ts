import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { chatGroups, groupMembers, messages, users } from "../../drizzle/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";

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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(messages).values({
        groupId: input.groupId,
        senderId: ctx.user.id,
        content: input.content,
        messageType: input.messageType as "text" | "image" | "file" | "system",
        mediaUrl: input.mediaUrl ?? undefined,
      });
      return { messageId: (result as any).insertId };
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
});
