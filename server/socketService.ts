/**
 * socketService.ts
 * Singleton Socket.IO service — attach to HTTP server at startup,
 * then call emitToUser() from anywhere on the server side.
 */
import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HttpServer } from "http";

let io: SocketIOServer | null = null;

// userId → Set of socket IDs (one user may have multiple tabs open)
const userSockets = new Map<number, Set<string>>();

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    // Client must send { userId } immediately after connecting
    socket.on("register", (userId: number) => {
      if (!userId || typeof userId !== "number") return;
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
      socket.data.userId = userId;
    });

    socket.on("disconnect", () => {
      const uid = socket.data.userId as number | undefined;
      if (uid && userSockets.has(uid)) {
        userSockets.get(uid)!.delete(socket.id);
        if (userSockets.get(uid)!.size === 0) userSockets.delete(uid);
      }
    });
  });

  console.log("[Socket.IO] Service initialized");
  return io;
}

export function emitToUser(userId: number, event: string, data: unknown): void {
  if (!io) return;
  const sids = userSockets.get(userId);
  if (!sids || sids.size === 0) return;
  for (const sid of Array.from(sids)) {
    io.to(sid).emit(event, data);
  }
}

export function getIO(): SocketIOServer | null {
  return io;
}
