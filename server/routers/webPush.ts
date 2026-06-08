/**
 * webPush — Web Push 推送通知路由
 * 使用 VAPID 密钥对，支持订阅注册和消息推送
 */
import { TRPCError } from "@trpc/server";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { pushSubscriptions } from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

// VAPID keys — generated once and stored as env vars
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BDELsotXx1M-DHSpJ998MHEUIlj8-GzJPzOuDXRaHOGS_9h_-apvpaN4v6cnvaZQr3HwwauehFHRN5ROV77Qh5w";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "mzHowEZfED1ijF4CN1DsRVH3t0cALTZvmP3uy0UCxL0";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@nexuschat.best";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const webPushRouter = router({
  /** Return the VAPID public key for client-side subscription */
  getPublicKey: publicProcedure.query(() => {
    return { publicKey: VAPID_PUBLIC_KEY };
  }),

  /** Register a push subscription for the current user */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });

      // Upsert: replace existing subscription for same endpoint
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, ctx.user.id))
        .limit(10);

      // Remove old subscriptions for this user (keep only latest)
      if (existing.length >= 5) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, ctx.user.id));
      }

      await db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      });

      return { success: true };
    }),

  /** Unsubscribe (remove push subscription) */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, ctx.user.id));

      return { success: true };
    }),
});

/** Send a push notification to a specific user (called from server-side code) */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  const db = await getDb();
  if (!db) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/app/chat",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notificationPayload
      )
    )
  );

  // Clean up expired subscriptions
  const expiredEndpoints = results
    .map((r, i) => (r.status === "rejected" ? subs[i].endpoint : null))
    .filter(Boolean);

  if (expiredEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }
}
