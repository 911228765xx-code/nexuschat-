import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendPushToUser } from "./webPush";

export const notificationsRouter = router({
  // ─── Get notifications for current user ─────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { notifications: [], unreadCount: 0 };

      const limit = input?.limit ?? 20;
      const unreadOnly = input?.unreadOnly ?? false;

      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const rows = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      // Count unread
      const [unreadRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));

      return {
        notifications: rows,
        unreadCount: Number(unreadRow?.count ?? 0),
      };
    }),

  // ─── Get unread count only (for badge) ──────────────────────────────────────
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };

    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));

    return { count: Number(row?.count ?? 0) };
  }),

  // ─── Mark notification(s) as read ───────────────────────────────────────────
  markRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.number().optional(), // if omitted, mark all as read
      }).optional()
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input?.notificationId) {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.id, input.notificationId),
              eq(notifications.userId, ctx.user.id)
            )
          );
      } else {
        // Mark all as read
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.userId, ctx.user.id));
      }

      return { success: true };
    }),

  // ─── Create notification (internal helper, called by other routers) ─────────
  // This is a protected procedure so only authenticated users can trigger it
  // In practice, call createNotification() helper from other routers
  create: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number(),
        type: z.enum(["like", "comment", "follow", "mention", "system"]),
        content: z.string().max(500),
        postId: z.number().optional(),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      // Don't notify yourself
      if (input.targetUserId === ctx.user.id) return { success: true };

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(notifications).values({
        userId: input.targetUserId,
        type: input.type,
        fromUserId: ctx.user.id,
        fromUserName: ctx.user.name ?? "Anonymous",
        fromUserAvatar: ctx.user.avatar ?? "🦊",
        postId: input.postId,
        content: input.content,
        isRead: false,
      });

      return { success: true };
    }),

  // ─── Delete a notification ───────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});

// ─── Helper: create notification from server-side code ──────────────────────
export async function createNotification(params: {
  db: Awaited<ReturnType<typeof getDb>>;
  targetUserId: number;
  fromUserId: number;
  fromUserName: string;
  fromUserAvatar: string;
  type: "like" | "comment" | "follow" | "mention" | "system";
  content: string;
  postId?: number;
}) {
  if (!params.db) return;
  if (params.targetUserId === params.fromUserId) return; // no self-notifications

  await params.db.insert(notifications).values({
    userId: params.targetUserId,
    type: params.type,
    fromUserId: params.fromUserId,
    fromUserName: params.fromUserName,
    fromUserAvatar: params.fromUserAvatar,
    postId: params.postId,
    content: params.content,
    isRead: false,
  });

  // 原生 / Web 推送（失败不影响通知入库）
  const titleMap: Record<string, string> = {
    like: `${params.fromUserName} 赞了你`,
    comment: `${params.fromUserName} 评论了你`,
    follow: `${params.fromUserName} 关注了你`,
    mention: `${params.fromUserName} 提到了你`,
    system: "AIChat 通知",
  };
  void sendPushToUser(params.targetUserId, {
    title: titleMap[params.type] ?? "AIChat 通知",
    body: params.content,
    url: "/notifications",
  }).catch(() => {});
}
