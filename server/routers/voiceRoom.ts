/**
 * 语音房（LiveKit）：房间登记 + 访问令牌签发。
 * Token 一律服务端签发，API Secret（LIVEKIT_API_SECRET）只存在于服务端环境变量。
 * 客户端拿到 { wsUrl, token, roomName, role } 后用 @livekit/react-native 连接房间。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { voiceRooms, users } from "../../drizzle/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { ENV } from "../_core/env";
import { genLiveKitToken } from "../_core/livekitToken";
import { getBenefits } from "../membership";
import { spendNN, grantNN } from "../token";
import { rateLimitWrite } from "../rateLimit";
import { sanitizeInput } from "../utils/sanitize";
import logger from "../utils/logger";
import { setParticipantCanPublish, listParticipantCount, deleteRoom } from "../_core/livekitService";

const CATEGORIES = ["trade", "study", "project", "chat"] as const;
const VOICE_ROOM_COST = 10; // 超出会员免费额度后，单次开房消耗 AI

/** 当月第一天（用于统计本月开房次数） */
function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 统计某用户本月已开房次数 */
async function roomsThisMonth(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number): Promise<number> {
  const [row] = await db.select({ cnt: sql<number>`count(*)` }).from(voiceRooms)
    .where(and(eq(voiceRooms.hostUserId, userId), gte(voiceRooms.createdAt, startOfMonth())));
  return Number(row?.cnt ?? 0);
}

// 语音房礼物目录（AC 计价）。送礼扣 AC，礼物动画由客户端经 LiveKit 数据通道广播。
export const VOICE_GIFTS = [
  { key: "like", name: "点赞", emoji: "👍", ac: 5 },
  { key: "rose", name: "玫瑰", emoji: "🌹", ac: 10 },
  { key: "beer", name: "啤酒", emoji: "🍺", ac: 20 },
  { key: "rocket", name: "火箭", emoji: "🚀", ac: 100 },
  { key: "crown", name: "皇冠", emoji: "👑", ac: 300 },
  { key: "diamond", name: "钻石", emoji: "💎", ac: 520 },
] as const;

/** 原子扣 AC（npPoints），余额不足返回 false */
async function spendAC(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, cost: number): Promise<boolean> {
  if (cost <= 0) return true;
  const res: any = await db.update(users)
    .set({ npPoints: sql`${users.npPoints} - ${cost}` })
    .where(and(eq(users.id, userId), sql`${users.npPoints} >= ${cost}`));
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  return affected > 0;
}

function liveKitConfigured(): boolean {
  return ENV.livekitUrl.length > 0 && ENV.livekitApiKey.length > 0 && ENV.livekitApiSecret.length > 0;
}

/** LiveKit 房间名：用 TRTC 数字房间号同源（voice_<roomId>），保证唯一可读 */
function roomName(roomId: number): string {
  return `voice_${roomId}`;
}

const MAX_SPEAKERS = 12; // 麦位上限(含房主)

// 在线人数对账:DB 的 listenerCount 只在 enter/leave 显式调用时增减,断线/闪退不会 -1 会漂移。
// 列表展示时改用 LiveKit ListParticipants 的真实人数,15s 内存缓存,避免每次 listRooms 都打 twirp。
const _lastGiftAt = new Map<number, number>(); // 送礼限频:userId → 上次送礼时刻,配合前端防抖挡脚本刷礼
const _onlineCache = new Map<number, { n: number; at: number }>();
async function realOnline(roomIdNum: number): Promise<number | null> {
  const c = _onlineCache.get(roomIdNum);
  const now = Date.now();
  if (c && now - c.at < 15000) return c.n;
  const n = await listParticipantCount(`voice_${roomIdNum}`);
  if (n != null) _onlineCache.set(roomIdNum, { n, at: now });
  return n;
}

/** 为某用户签发进房 token */
function signToken(userId: number, displayName: string, roomId: number, canPublish: boolean): string {
  return genLiveKitToken(ENV.livekitApiKey, ENV.livekitApiSecret, {
    room: roomName(roomId),
    identity: String(userId),
    name: displayName,
    canPublish,
  });
}

/** 生成一个未被占用的数字房间号（TRTC roomId，1..2^31-1） */
async function allocRoomId(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<number> {
  for (let i = 0; i < 8; i++) {
    const candidate = 100000 + Math.floor(Math.random() * 900000000);
    // 唯一索引 uq_vroom_roomid 不分状态:已结束房间的 roomId 仍占位,这里也必须不分状态查,否则 INSERT 撞唯一键报 500
    const [exist] = await db.select({ id: voiceRooms.id }).from(voiceRooms)
      .where(eq(voiceRooms.roomId, candidate)).limit(1);
    if (!exist) return candidate;
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "房间号分配失败，请重试" });
}

export const voiceRoomRouter = router({
  /** LiveKit 是否已配置（未配置时客户端提示「即将开放」，不报错） */
  config: protectedProcedure.query(() => ({ enabled: liveKitConfigured(), wsUrl: ENV.livekitUrl })),

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
        .where(cat === "all"
          ? and(eq(voiceRooms.status, "live"), eq(voiceRooms.isPublic, true))
          : and(eq(voiceRooms.status, "live"), eq(voiceRooms.isPublic, true), eq(voiceRooms.category, cat)))
        .orderBy(desc(voiceRooms.listenerCount), desc(voiceRooms.createdAt))
        .limit(50);
      const lkOn = liveKitConfigured();
      const mapped = await Promise.all(rows.map(async (r) => {
        const real = lkOn ? await realOnline(r.room.roomId) : null; // LiveKit 真实在线
        // 真实在线(含主播+麦上+听众);取不到则用 DB 缓存值(听众+主播)兜底
        const online = real != null ? real : r.room.listenerCount + 1;
        return {
          id: String(r.room.id),
          roomId: r.room.roomId,
          title: r.room.title,
          topic: r.room.topic ?? "",
          category: r.room.category,
          hostName: r.hostName ?? r.hostUsername ?? "主播",
          hostAvatar: r.hostAvatar ?? null,
          listenerCount: online,
          speakerCount: r.room.speakerCount,
          isLive: true,
          isMembersOnly: r.room.isMembersOnly,
        };
      }));
      mapped.sort((a, b) => b.listenerCount - a.listenerCount); // 按真实在线重排(SQL 按 DB 计数排的已不准)
      return mapped;
    }),

  /** 创建语音房（自己为房主）。返回进房所需 sig。 */
  createRoom: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({
      title: z.string().trim().min(1).max(60),
      topic: z.string().trim().max(80).optional(),
      category: z.enum(CATEGORIES).default("chat"),
      isMembersOnly: z.boolean().default(false),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!liveKitConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "语音房即将开放，敬请期待" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 开房额度：会员每月免费 N 次（Plus 10 / Pro 20 / 免费 0），超出按 10 AI/次
      const benefits = await getBenefits(db, ctx.user.id);
      const used = await roomsThisMonth(db, ctx.user.id);
      let charged = false;
      if (used >= benefits.voiceRoomFreeMonthly) {
        const ok = await spendNN(db, ctx.user.id, VOICE_ROOM_COST, { type: "voice_room", refType: "user", refId: ctx.user.id });
        if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: `AI 不足：本月免费开房已用完，单次开房需 ${VOICE_ROOM_COST} AI，或升级会员获更多免费次数` });
        charged = true;
      }
      // 扣费后若建房失败(allocRoomId 撞唯一键 / DB 瞬断),退还已扣 AI,避免钱扣了房没建成
      let roomId: number;
      let row: { id: number } | undefined;
      try {
        roomId = await allocRoomId(db);
        await db.insert(voiceRooms).values({
          roomId,
          title: sanitizeInput(input.title),
          topic: input.topic ? sanitizeInput(input.topic) : null,
          category: input.category,
          hostUserId: ctx.user.id,
          isMembersOnly: input.isMembersOnly,
          isPublic: input.isPublic,
          status: "live",
          speakerCount: 1,
          listenerCount: 0,
        });
        [row] = await db.select({ id: voiceRooms.id }).from(voiceRooms).where(eq(voiceRooms.roomId, roomId)).limit(1);
      } catch (e) {
        if (charged) await grantNN(db, ctx.user.id, VOICE_ROOM_COST, { type: "voice_room", refType: "user", refId: ctx.user.id, memo: "refund:create_failed" });
        throw e;
      }
      const name = ctx.user.name ?? ctx.user.username ?? `用户${ctx.user.id}`;
      const token = signToken(ctx.user.id, name, roomId, /*canPublish*/ true);
      return { id: String(row?.id ?? roomId), roomId, wsUrl: ENV.livekitUrl, roomName: roomName(roomId), token, role: "host" as const, title: input.title, charged };
    }),

  /** 我的开房额度（供前端开房前展示「本月免费 X/Y」或「需 10 AI」） */
  roomQuota: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { freeMonthly: 0, used: 0, freeRemaining: 0, cost: VOICE_ROOM_COST };
    const benefits = await getBenefits(db, ctx.user.id);
    const used = await roomsThisMonth(db, ctx.user.id);
    const free = benefits.voiceRoomFreeMonthly;
    return { freeMonthly: free, used, freeRemaining: Math.max(0, free - used), cost: VOICE_ROOM_COST };
  }),

  /** 进入语音房：会员房做权限校验，返回进房 sig + 当前麦上信息。 */
  enterRoom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!liveKitConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "语音房即将开放，敬请期待" });
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
      // 进房时房主/嘉宾可发声，听众仅收听（举手上麦后由后续接口提权，先以听众身份进）
      const name = ctx.user.name ?? ctx.user.username ?? `用户${ctx.user.id}`;
      const token = signToken(ctx.user.id, name, room.roomId, /*canPublish*/ isHost);
      return {
        id: String(room.id),
        roomId: room.roomId,
        wsUrl: ENV.livekitUrl,
        roomName: roomName(room.roomId),
        token,
        role: isHost ? ("host" as const) : ("audience" as const),
        hostId: room.hostUserId, // 客户端用它校验数据通道里 granted/revoked/roomEnded 是否真来自房主
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
      // 强制清场:不依赖客户端自觉退出。否则残留/断线重连的 token 在 emptyTimeout 前仍能通话(结束不彻底)。
      void deleteRoom(roomName(room.roomId)).catch((err) => logger.warn({ err }, "endRoom: LiveKit DeleteRoom 失败"));
      return { ok: true };
    }),

  /** 礼物目录（供前端礼物面板） */
  gifts: protectedProcedure.query(() => ({ gifts: VOICE_GIFTS })),

  /** 送礼：扣 AC，返回新余额。礼物动画由前端经数据通道广播给房间。 */
  sendGift: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ id: z.string(), giftKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 送礼限频:同一用户最快 600ms 一次,挡住绕过前端的脚本连刷
      const lastGift = _lastGiftAt.get(ctx.user.id) ?? 0;
      const nowGift = Date.now();
      if (nowGift - lastGift < 600) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "送礼太快了,慢一点~" });
      _lastGiftAt.set(ctx.user.id, nowGift);
      const gift = VOICE_GIFTS.find((g) => g.key === input.giftKey);
      if (!gift) throw new TRPCError({ code: "BAD_REQUEST", message: "礼物不存在" });
      const rid = Number.parseInt(input.id, 10);
      const [room] = await db.select({ id: voiceRooms.id }).from(voiceRooms)
        .where(and(eq(voiceRooms.id, rid), eq(voiceRooms.status, "live"))).limit(1);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "该语音房已结束" });
      const ok = await spendAC(db, ctx.user.id, gift.ac);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: `AC 不足，送出${gift.name}需 ${gift.ac} AC` });
      const [u] = await db.select({ npPoints: users.npPoints }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return { ok: true, gift, acRemaining: u?.npPoints ?? 0 };
    }),

  /** 房主抱人上麦：把听众的 LiveKit canPublish 设为 true，实时生效。 */
  grantSpeak: protectedProcedure
    .input(z.object({ id: z.string(), targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const rid = Number.parseInt(input.id, 10);
      const [room] = await db.select().from(voiceRooms)
        .where(and(eq(voiceRooms.id, rid), eq(voiceRooms.status, "live"))).limit(1);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "该语音房已结束" });
      if (room.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有房主可以邀请上麦" });
      if (input.targetUserId === room.hostUserId) return { ok: true }; // 房主本就在麦上,幂等
      if (room.speakerCount >= MAX_SPEAKERS) throw new TRPCError({ code: "BAD_REQUEST", message: `麦位已满（上限 ${MAX_SPEAKERS}）` });
      await setParticipantCanPublish(`voice_${room.roomId}`, String(input.targetUserId), true);
      // 麦位计数封顶,杜绝重复抱同一人把 speakerCount 顶到天上
      await db.update(voiceRooms).set({ speakerCount: sql`LEAST(${voiceRooms.speakerCount} + 1, ${MAX_SPEAKERS})` }).where(eq(voiceRooms.id, rid));
      return { ok: true };
    }),

  /** 房主请人下麦：canPublish=false。 */
  revokeSpeak: protectedProcedure
    .input(z.object({ id: z.string(), targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const rid = Number.parseInt(input.id, 10);
      const [room] = await db.select().from(voiceRooms)
        .where(and(eq(voiceRooms.id, rid), eq(voiceRooms.status, "live"))).limit(1);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "该语音房已结束" });
      if (room.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有房主可以操作" });
      if (input.targetUserId === room.hostUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "不能请房主下麦" });
      await setParticipantCanPublish(`voice_${room.roomId}`, String(input.targetUserId), false);
      await db.update(voiceRooms).set({ speakerCount: sql`GREATEST(${voiceRooms.speakerCount} - 1, 1)` }).where(eq(voiceRooms.id, rid));
      return { ok: true };
    }),
});
