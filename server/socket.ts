import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "./db";
import { messages, users, groupMembers, conversationPrefs, groupMutes } from "../drizzle/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import logger from "./utils/logger";
import { sdk } from "./_core/sdk";
import { isAllowedOrigin } from "./_core/corsOrigin";
import { sendPushToUser } from "./routers/webPush";
import { triggerBotAutoReply } from "./botAutoReply";
import { runInteractBot } from "./groupBots";
// Socket 路径必须与 tRPC(saveMessage/sendDM)走同样的准入:否则客户端直接发 socket 事件即绕过禁言/拉黑/好友限制/内容审核。
import { sanitizeInput } from "./utils/sanitize";
import { enforceContent } from "./moderation";
import { assertCanDM } from "./utils/relations";

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

    // Send message
    socket.on("send_message", async (data: ChatMessage) => {
      try {
        const db = await getDb();
        if (!db || !userId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        const senderIdNum = typeof userId === "number" ? userId : parseInt(String(userId));

        // Authorization: sender must be a member of the target group.
        if (!(await isGroupMember(db, data.groupId, userId))) {
          socket.emit("error", { message: "Not a member of this group" });
          return;
        }

        // 禁言检查:被 owner/admin 禁言的成员不能发言(tRPC saveMessage 有,socket 之前漏了→禁言形同虚设)
        const [muted] = await db.select({ id: groupMutes.id }).from(groupMutes)
          .where(and(eq(groupMutes.groupId, data.groupId), eq(groupMutes.userId, senderIdNum),
            or(isNull(groupMutes.expiresAt), gt(groupMutes.expiresAt, new Date())))).limit(1);
        if (muted) { socket.emit("error", { message: "你已被禁言，无法发言" }); return; }
        // 内容审核(涉黄涉赌等):基于 content 而非 messageType,防塞进 image/file 类型绕过;违规抛出→下面 catch 拒绝
        if (data.content && data.content.trim()) await enforceContent(db, senderIdNum, data.content, "group");
        const safeContent = sanitizeInput(data.content, 5000);

        // Save to database
        const [result] = await db.insert(messages).values({
          groupId: data.groupId,
          senderId: senderIdNum,
          content: safeContent,
          messageType: (data.messageType || "text") as "text" | "image" | "file" | "system",
          mediaUrl: data.mediaUrl ?? undefined,
        });

        const messageId = (result as any).insertId;
        const timestamp = new Date();

        // Lookup sender's role + 群昵称 in this group
        let senderRole: string = "member";
        let senderDisplayName = userName; // 有群昵称则用群昵称,否则全局名
        try {
          const senderIdNum = typeof userId === "number" ? userId : parseInt(String(userId));
          const [memberRow] = await db.select({ role: groupMembers.role, alias: groupMembers.alias }).from(groupMembers)
            .where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, senderIdNum)))
            .limit(1);
          if (memberRow) { senderRole = memberRow.role; if (memberRow.alias) senderDisplayName = memberRow.alias; }
        } catch (_) { /* fallback to member */ }

        const outgoingMessage = {
          id: messageId,
          groupId: data.groupId,
          senderId: typeof userId === "number" ? userId : parseInt(String(userId)),
          senderName: senderDisplayName,
          senderAvatar: userAvatar ?? null,
          senderRole,
          content: safeContent,
          messageType: data.messageType || "text",
          mediaUrl: data.mediaUrl,
          createdAt: timestamp,
        };

        // Broadcast to all in the group (including sender)
        io.to(`group:${data.groupId}`).emit("new_message", outgoingMessage);

        // Trigger Bot auto-reply (non-blocking, fire-and-forget)
        const triggerUid = typeof userId === "number" ? userId : parseInt(String(userId));
        triggerBotAutoReply(data.groupId, triggerUid, data.content)
          .catch((err: unknown) => logger.warn({ err }, "Socket: BotAutoReply trigger failed"));
        // 互动机器人（订阅驱动的 AI 自由互动，仅文本）
        if ((data.messageType || "text") === "text") {
          runInteractBot(db, data.groupId, triggerUid, data.content)
            .catch((err: unknown) => logger.warn({ err }, "Socket: interact bot failed"));
        }
      } catch (err) {
        logger.error({ err }, "Socket.io: Error saving message");
        socket.emit("error", { message: "Failed to send message" });
      }
    });

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
