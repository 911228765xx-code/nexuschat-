import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { getDb } from "./db";
import { messages } from "../drizzle/schema";

interface ChatMessage {
  groupId: number;
  content: string;
  messageType: "text" | "image" | "file";
  mediaUrl?: string;
}

// ─── User-level socket registry (for targeted push notifications) ─────────────
let _io: SocketIOServer | null = null;
const userSockets = new Map<number, Set<string>>(); // userId → Set<socketId>

/** Emit an event to all sockets belonging to a specific user */
export function emitToUser(userId: number, event: string, data: unknown): void {
  if (!_io) return;
  const sids = userSockets.get(userId);
  if (!sids || sids.size === 0) return;
  for (const sid of Array.from(sids)) {
    _io.to(sid).emit(event, data);
  }
}

export function initSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket.io",
  });

  _io = io;

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      // For now, allow all connections (auth via cookie handled at HTTP level)
      (socket as any).userId = socket.handshake.auth?.userId;
      (socket as any).userName = socket.handshake.auth?.userName;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId as number | undefined;
    const userName = (socket as any).userName || "Anonymous";

    console.log(`[Socket.io] User connected: ${userId} (${socket.id})`);

    // Register user socket for targeted notifications
    if (userId) {
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
    }

    // Client can also register after connection (e.g., after auth resolves)
    socket.on("register_user", (uid: number) => {
      if (!uid || typeof uid !== "number") return;
      if (!userSockets.has(uid)) userSockets.set(uid, new Set());
      userSockets.get(uid)!.add(socket.id);
      (socket as any).userId = uid;
    });

    // Join a chat room
    socket.on("join_group", (groupId: number) => {
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

        // Save to database
        const [result] = await db.insert(messages).values({
          groupId: data.groupId,
          senderId: typeof userId === "number" ? userId : parseInt(String(userId)),
          content: data.content,
          messageType: (data.messageType || "text") as "text" | "image" | "file" | "system",
          mediaUrl: data.mediaUrl ?? undefined,
        });

        const messageId = (result as any).insertId;
        const timestamp = new Date();

        const outgoingMessage = {
          id: messageId,
          groupId: data.groupId,
          senderId: typeof userId === "number" ? userId : parseInt(String(userId)),
          senderName: userName,
          content: data.content,
          messageType: data.messageType || "text",
          mediaUrl: data.mediaUrl,
          createdAt: timestamp,
        };

        // Broadcast to all in the group (including sender)
        io.to(`group:${data.groupId}`).emit("new_message", outgoingMessage);
      } catch (err) {
        console.error("[Socket.io] Error saving message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing", (data: { groupId: number; isTyping: boolean }) => {
      socket.to(`group:${data.groupId}`).emit("user_typing", {
        userId,
        userName,
        isTyping: data.isTyping,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] User disconnected: ${userId} (${socket.id})`);
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
