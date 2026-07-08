/**
 * webPush — Web Push 推送通知路由
 * 使用 VAPID 密钥对，支持订阅注册和消息推送
 */
import { TRPCError } from "@trpc/server";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { pushSubscriptions, devicePushTokens } from "../../drizzle/schema";
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

  /** 注册原生推送（Expo Push）设备 token。同一 token 改归当前用户（换账号登录），幂等。 */
  registerDeviceToken: protectedProcedure
    .input(z.object({ token: z.string().min(10).max(255), platform: z.enum(["android", "ios"]).default("android") }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });
      await db.delete(devicePushTokens).where(eq(devicePushTokens.token, input.token));
      await db.insert(devicePushTokens).values({ userId: ctx.user.id, token: input.token, platform: input.platform });
      return { success: true };
    }),

  /** 注销设备 token（退出登录时调用）。 */
  unregisterDeviceToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(devicePushTokens).where(eq(devicePushTokens.token, input.token));
      return { success: true };
    }),
});

/** 发原生推送（Expo Push Service）。失效 token 自动清理。 */
async function sendExpoPush(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  payload: { title: string; body: string; url?: string },
) {
  const tokens = await db.select().from(devicePushTokens).where(eq(devicePushTokens.userId, userId));
  const expoTokens = tokens
    .map((t) => t.token)
    .filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
  if (expoTokens.length === 0) return;
  const messages = expoTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    sound: "default" as const,
    data: { url: payload.url || "/notifications" },
  }));
  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const json = (await resp.json().catch(() => null)) as { data?: Array<{ status?: string; details?: { error?: string } }> } | null;
  const dead = (json?.data ?? [])
    .map((r, i) => (r?.status === "error" && r?.details?.error === "DeviceNotRegistered" ? expoTokens[i] : null))
    .filter((t): t is string => !!t);
  if (dead.length) await db.delete(devicePushTokens).where(inArray(devicePushTokens.token, dead));
}

/** Send a push notification to a specific user (called from server-side code) */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  const db = await getDb();
  if (!db) return;

  // 原生推送（Expo）与下面的 Web Push 并行，互不影响
  void sendExpoPush(db, userId, payload).catch(() => {});

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/(tabs)", // 兜底用 RN 路由(原 /app/chat 是 web 路由,原生点开跳空白页)
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
