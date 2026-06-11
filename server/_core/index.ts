import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSocketIO } from "../socket";
import { startPriceAlertChecker } from "../priceAlertChecker";
import { startBotScheduler } from "../botScheduler";
import { startMessageCleanup } from "../messageCleanup";
import { startRankAggregation } from "../rankEngine";
import { startCallResolver } from "../callResolver";
import { handleTokenChatStream } from "../express/tokenChatStream";
import { handleVideoUpload } from "../express/videoUpload";
import { handleFileUpload } from "../express/fileUpload";
import { handleResearchStream } from "../express/researchStream";
import compressionMiddleware from "compression";
import cors from "cors";
import { corsOriginDelegate } from "./corsOrigin";
import { ENV } from "./env";
import { getDb } from "../db";
import { backfillInviteCodes } from "../utils/inviteCode";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  // Trust a fixed number of upstream proxies so req.ip reflects the real client IP
  // (and cannot be spoofed via a client-supplied X-Forwarded-For header).
  app.set("trust proxy", ENV.trustProxyHops);
  const server = createServer(app);
  // Enable gzip/deflate compression for all responses (production performance)
  // Skips already-compressed assets (JS/CSS with content hash) — they are served
  // as pre-compressed .gz/.br files by the static middleware
  app.use(compressionMiddleware({
    // Only compress responses larger than 1KB
    threshold: 1024,
    // Skip compression for Server-Sent Events (SSE) streams
    filter: (req, res) => {
      if (req.headers['accept'] === 'text/event-stream') return false;
      return compressionMiddleware.filter(req, res);
    },
  }));
  // CORS: reflect the origin only for allow-listed origins (native app + configured
  // domains). Reflecting arbitrary origins with credentials is a CSRF risk.
  app.use(cors({
    origin: corsOriginDelegate,
    credentials: true, // allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Client-Type'],
  }));
  app.options('*', cors({ origin: corsOriginDelegate, credentials: true }));
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // SSE streaming endpoints (must be before tRPC middleware)
  // 视频直传（raw body，按会员档位限体积；须在 json 解析器之前注册）
  app.post("/api/upload/video", express.raw({ type: () => true, limit: "260mb" }), handleVideoUpload);
  // 文件直传（PPT/PDF 等，按会员档位限体积，Pro 最高 500MB）
  app.post("/api/upload/file", express.raw({ type: () => true, limit: "510mb" }), handleFileUpload);
  app.post("/api/token-chat/stream", handleTokenChatStream);
  app.post("/api/research/stream", handleResearchStream);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Setup Socket.IO for real-time chat
  initSocketIO(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Start background price alert checker (runs every 2 min)
  startPriceAlertChecker();
  // Start Bot scheduler (posts at 09:00 and 21:00 daily)
  startBotScheduler();
  // 定时清理已过期（阅后即焚）消息，每 10 分钟
  startMessageCleanup();
  // NP 段位：每日全网体价值分聚合（每 6h 检查，每个 UTC 日只跑一次）
  startRankAggregation();
  // Alpha 战绩：每 30 分钟结算到期 Call
  startCallResolver();

  // Backfill referral invite codes for any users missing one (best-effort, non-blocking).
  void (async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const n = await backfillInviteCodes(db);
      if (n > 0) console.log(`Backfilled invite codes for ${n} user(s)`);
    } catch (err) {
      console.error("Invite code backfill failed:", err);
    }
  })();
}

startServer().catch(console.error);
