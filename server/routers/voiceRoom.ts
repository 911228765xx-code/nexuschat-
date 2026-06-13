/**
 * 语音房（腾讯 TRTC）：房间登记 + UserSig 签发。
 * UserSig 一律服务端签发，密钥（TRTC_SECRET_KEY）只存在于服务端环境变量。
 * 客户端拿到 { sdkAppId, userId, userSig, roomId } 后用 TRTC SDK 进房。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { voiceRooms, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ENV } from "../_core/env";
import { genTRTCUserSig } from "../_core/trtcUserSig";
import { getBenefits } from "../membership";
import { rateLimitWrite } from "../rateLimit";
import { sanitizeInput } from "../utils/sanitize";

const CATEGORIES = ["trade", "study", "project", "chat"] as const;

function trtcConfigured(): boolean {
  return ENV.trtcSdkAppId > 0 && ENV.trtcSecretKey.length > 0;
}

/** 生成一个未被占用的数字房间号（TRTC roomId，1..2^31-1） */
async function allocRoomId(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<number> {
  for (let i = 0; i < 8; i++) {
    const candidate = 100000 + Math.floor(Math.random() * 900000000);
    const [exist] = await db.select({ id: voiceRooms.id }).from(voiceRooms)
      .where(and(eq(voiceRooms.roomId, candidate), eq(voiceRooms.status, "live"))).limit(1);
    if (!exist) return candidate;
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "房间号分配失败，请重试" });
}

export const voiceRoomRouter = router({
  /** TRTC 是否已配置（未配置时客户端提示「即将开放」，不报错） */
  config: protectedProcedure.query(() => ({ enabled: trtcConfigured(), sdkAppId: ENV.trtcSdkAppId })),

  /** 进行中的语音房列表 */
  listRooms: protectedProcedure
    .input(z.object({ category: z.enum(["all", ...CATEGORIES]).default("all") }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const cat = input?.category ?? "all";
      const rows = await db.select({
        room: voiceRooms,
        hostName: users.name,
        hostUsername: users.username,
        hostAvatar: users.avatar,
      })
        .from(voiceRooms)
        .leftJoin(users, eq(users.id, voiceRooms.hostUserId))
        .where(cat === "all" ? eq(voiceRooms.status, "live") : and(eq(voiceRooms.status, "live"), eq(voiceRooms.category, cat)))
        .orderBy(desc(voiceRooms.listenerCount), desc(voiceRooms.createdAt))
        .limit(50);
      return rows.map((r) => ({
        id: String(r.room.id),
        roomId: r.room.roomId,
        title: r.room.title,
        topic: r.room.topic ?? "",
        category: r.room.category,
        hostName: r.hostName ?? r.hostUsername ?? "主播",
        hostAvatar: r.hostAvatar ?? null,
        listenerCount: r.room.listenerCount,
        speakerCount: r.room.speakerCount,
        isLive: true,
        isMembersOnly: r.room.isMembersOnly,
      }));
    }),

  /** 创建语音房（自己为房主）。返回进房所需 sig。 */
  createRoom: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({
      title: z.string().trim().min(1).max(60),
      topic: z.string().trim().max(80).optional(),
      category: z.enum(CATEGORIES).default("chat"),
      isMembersOnly: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!trtcConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "语音房即将开放，敬请期待" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const roomId = await allocRoomId(db);
      await db.insert(voiceRooms).values({
        roomId,
        title: sanitizeInput(input.title),
        topic: input.topic ? sanitizeInput(input.topic) : null,
        category: input.category,
        hostUserId: ctx.user.id,
        isMembersOnly: input.isMembersOnly,
        status: "live",
        speakerCount: 1,
        listenerCount: 0,
      });
      const userSig = genTRTCUserSig(String(ctx.user.id), ENV.trtcSdkAppId, ENV.trtcSecretKey);
      return { roomId, sdkAppId: ENV.trtcSdkAppId, userId: String(ctx.user.id), userSig, role: "host" as const };
    }),

  /** 进入语音房：会员房做权限校验，返回进房 sig + 当前麦上信息。 */
  enterRoom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!trtcConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "语音房即将开放，敬请期待" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const rid = Number.parseInt(input.id, 10);
      const [room] = await db.select().from(voiceRooms)
        .where(and(eq(voiceRooms.id, rid), eq(voiceRooms.status, "live"))).limit(1);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "该语音房已结束" });

      const isHost = room.hostUserId === ctx.user.id;
      // 会员专属房：非房主需有会员徽章（Plus/Pro）
      if (room.isMembersOnly && !isHost) {
        const benefits = await getBenefits(db, ctx.user.id);
        if (!benefits.badge) throw new TRPCError({ code: "FORBIDDEN", message: "该房为会员专属，升级 Plus/Pro 后可进入" });
      }
      // 听众计数 +1（房主已计入 speakerCount）
      if (!isHost) {
        await db.update(voiceRooms).set({ listenerCount: sql`${voiceRooms.listenerCount} + 1` }).where(eq(voiceRooms.id, rid));
      }
      const userSig = genTRTCUserSig(String(ctx.user.id), ENV.trtcSdkAppId, ENV.trtcSecretKey);
      return {
        roomId: room.roomId,
        sdkAppId: ENV.trtcSdkAppId,
        userId: String(ctx.user.id),
        userSig,
        role: isHost ? ("host" as const) : ("audience" as const),
        title: room.title,
        topic: room.topic ?? "",
      };
    }),

  /** 离开语音房（听众计数 -1） */
  leaveRoom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const rid = Number.parseInt(input.id, 10);
      const [room] = await db.select().from(voiceRooms).where(eq(voiceRooms.id, rid)).limit(1);
      if (room && room.hostUserId !== ctx.user.id) {
        await db.update(voiceRooms)
          .set({ listenerCount: sql`GREATEST(${voiceRooms.listenerCount} - 1, 0)` })
          .where(eq(voiceRooms.id, rid));
      }
      return { ok: true };
    }),

  /** 房主结束语音房 */
  endRoom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const rid = Number.parseInt(input.id, 10);
      const [room] = await db.select().from(voiceRooms).where(eq(voiceRooms.id, rid)).limit(1);
      if (!room) return { ok: true };
      if (room.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有房主可以结束语音房" });
      await db.update(voiceRooms).set({ status: "ended", endedAt: new Date() }).where(eq(voiceRooms.id, rid));
      return { ok: true };
    }),
});
