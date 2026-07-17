import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "./db";
import { messages, users, groupMembers, conversationPrefs } from "../drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import logger from "./utils/logger";
import { sdk } from "./_core/sdk";
import { isAllowedOrigin } from "./_core/corsOrigin";
import { sendPushToUser } from "./routers/webPush";

interface AuthedUser {
  id: number;
  name: string;
  avatar: string | null;
}

/** 该用户是否对某会话开启了免打扰（开启则不推送）。 */
async function isConversationMuted(userId: number, convKey: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const [p] = await db
      .select({ isMuted: conversationPrefs.isMuted })
      .from(conversationPrefs)
      .where(and(eq(conversationPrefs.userId, userId), eq(conversationPrefs.convKey, convKey)))
      .limit(1);
    return !!p?.isMuted;
  } catch {
    return false;
  }
}

/**
 * Authenticate a Socket.IO connection from its handshake. Trusts only a verified
 * session JWT — taken from the session cookie (web) or an explicit `auth.token`
 * (native clients) — never the client-supplied userId.
 */
async function authenticateSocket(socket: Socket): Promise<AuthedUser | null> {
  const authToken =
    typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
  let token = authToken;
  if (!token) {
    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
      try {
        token = parseCookie(cookieHeader)[COOKIE_NAME];
      } catch {
        /* malformed cookie header — treat as unauthenticated */
      }
    }
  }
  if (!token) return null;

  const session = await sdk.verifySession(token);
  if (!session) return null;

  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
    .where(eq(users.openId, session.openId))
    .limit(1);
  if (!row) return null;
  return { id: row.id, name: row.name ?? "User", avatar: row.avatar ?? null };
}

/** Returns true if the user is a member of the group. */
async function isGroupMember(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  groupId: number,
  userId: number
): Promise<boolean> {
  const [row] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return !!row;
}

interface ChatMessage {
  groupId: number;
  content: string;
  messageType: "text" | "image" | "file";
  mediaUrl?: string;
}

// ─── User-level socket registry (for targeted push notifications) ─────────────
let _io: SocketIOServer | null = null;
const userSockets = new Map<number, Set<string>>(); // userId → Set<socketId>

/** Get the Socket.IO server instance */
export function getSocketIO(): SocketIOServer | null {
  return _io;
}

/** Emit an event to all sockets belonging to a specific user */
export function emitToUser(userId: number, event: string, data: unknown): void {
  if (!_io) return;
  const sids = userSockets.get(userId);
  if (!sids || sids.size === 0) return;
  for (const sid of Array.from(sids)) {
    _io.to(sid).emit(event, data);
  }
}

/** 某用户当前是否有在线 socket 连接。 */
export function isUserOnline(userId: number): boolean {
  const sids = userSockets.get(userId);
  return !!sids && sids.size > 0;
}

/** 把某用户的全部 socket 连接移出指定群房间。踢人/退群后必须调:
 *  否则其 socket 仍留在 group:{id} 房间,继续实时收到私密群新消息广播(越权泄露)。 */
export function evictUserFromGroupRoom(userId: number, groupId: number): void {
  if (!_io) return;
  const sids = userSockets.get(userId);
  if (!sids) return;
  for (const sid of Array.from(sids)) {
    _io.sockets.sockets.get(sid)?.leave(`group:${groupId}`);
  }
}

/**
 * 私信离线推送:接收者不在线且未对该会话免打扰时,发原生/Web 推送。
 * 供 tRPC 各 DM 写入通道(sendDM/红包/转发/名片…)复用——原来这段逻辑只在 socket 的
 * send_dm 死通道里,而 App 实际走 tRPC,导致离线私信收不到推送。
 */
export async function notifyDmOffline(receiverId: number, senderId: number, title: string, body: string): Promise<void> {
  try {
    if (isUserOnline(receiverId)) return;
    if (await isConversationMuted(receiverId, `dm:${senderId}`)) return;
    await sendPushToUser(receiverId, {
      title,
      body: body.length > 80 ? body.slice(0, 80) + "..." : body,
      url: `/direct-message?userId=${senderId}`,
    });
  } catch (err) {
    logger.warn({ err, receiverId }, "notifyDmOffline failed");
  }
}

export function initSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket.io",
  });

  _io = io;

  // Auth middleware — derive identity from a verified session, never from client input.
  io.use(async (socket, next) => {
    try {
      const authed = await authenticateSocket(socket);
      if (authed) {
        (socket as any).userId = authed.id;
        (socket as any).userName = authed.name;
        (socket as any).userAvatar = authed.avatar;
      } else {
        (socket as any).userId = undefined;
      }
      // Allow the connection through; per-event handlers reject unauthenticated actions.
      next();
    } catch (err) {
      logger.warn({ err }, "Socket.io: auth middleware error");
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId as number | undefined;
    const userName = (socket as any).userName || "Anonymous";
    const userAvatar = (socket as any).userAvatar as string | null | undefined;

    logger.debug({ userId, socketId: socket.id }, "Socket.io: User connected");

    // Register user socket for targeted notifications
    if (userId) {
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
    }

    // Client can re-register after connection (e.g., after auth resolves). The
    // client-supplied id is ignored — only the authenticated userId is honored,
    // otherwise a client could register to receive another user's notifications.
    socket.on("register_user", () => {
      if (!userId) return;
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
    });

    // Join a chat room (only members may join and receive the group's messages)
    socket.on("join_group", async (groupId: number) => {
      if (!userId || typeof groupId !== "number") return;
      const db = await getDb();
      if (!db || !(await isGroupMember(db, groupId, userId))) {
        socket.emit("error", { message: "Not a member of this group" });
        return;
      }
      socket.join(`group:${groupId}`);
      socket.to(`group:${groupId}`).emit("user_joined", {
        userId,
        userName,
        groupId,
      });
    });

    // Leave a chat room
    socket.on("leave_group", (groupId: number) => {
      socket.leave(`group:${groupId}`);
    });

    // (已删除 socket "send_message" 死通道,同 send_dm 的理由:App 发群消息只走 tRPC
    //  chat.saveMessage(含 rateLimitWrite 限流 + reviewMessageAsync 异步 AI 复审 + 引用校验),
    //  这条旁路虽有成员/禁言/关键词检查,但缺限流与 AI 复审 → 持 token 的自定义客户端可刷屏、
    //  规避事后删封。广播 new_message 由 saveMessage 落库后统一发,前端不受影响。)

    // (已删除 socket "send_dm" 死通道:App 从不 emit send_dm,发出的 new_dm/dm_sent 也无人监听,
    //  且它缺 rateLimitWrite + reviewMessageAsync 异步审核 → 是一条准入较弱的并行发信路。私信统一走
    //  tRPC chat.sendDM(已含限流+AI审核+离线推送)。离线推送逻辑抽成了导出的 notifyDmOffline。)

    // Typing indicator（群聊）
    socket.on("typing", (data: { groupId: number; isTyping: boolean }) => {
      socket.to(`group:${data.groupId}`).emit("user_typing", {
        userId,
        userName,
        isTyping: data.isTyping,
      });
    });

    // Typing indicator（私信）：直接推给接收者
    socket.on("dm_typing", (data: { receiverId: number; isTyping: boolean }) => {
      emitToUser(data.receiverId, "dm_typing", {
        fromUserId: userId,
        isTyping: data.isTyping,
      });
    });

    socket.on("disconnect", () => {
      logger.debug({ userId, socketId: socket.id }, "Socket.io: User disconnected");
      // Clean up user socket registry
      const uid = (socket as any).userId as number | undefined;
      if (uid && userSockets.has(uid)) {
        userSockets.get(uid)!.delete(socket.id);
        if (userSockets.get(uid)!.size === 0) userSockets.delete(uid);
      }
    });
  });

  return io;
}
