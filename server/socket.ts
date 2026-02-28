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

export function initSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket.io",
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie;
      // For now, allow all connections (auth via cookie handled at HTTP level)
      // In production, verify JWT here
      (socket as any).userId = socket.handshake.auth?.userId;
      (socket as any).userName = socket.handshake.auth?.userName;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    const userName = (socket as any).userName || "Anonymous";

    console.log(`[Socket.io] User connected: ${userId} (${socket.id})`);

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
          senderId: parseInt(userId),
          content: data.content,
          messageType: (data.messageType || "text") as "text" | "image" | "file" | "system",
          mediaUrl: data.mediaUrl ?? undefined,
        });

        const messageId = (result as any).insertId;
        const timestamp = new Date();

        const outgoingMessage = {
          id: messageId,
          groupId: data.groupId,
          senderId: parseInt(userId),
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
    });
  });

  return io;
}
