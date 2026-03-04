import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSocketIO } from "../socket";
import { startPriceAlertChecker } from "../priceAlertChecker";
import { startBotScheduler } from "../botScheduler";
import { handleTokenChatStream } from "../express/tokenChatStream";
import { handleResearchStream } from "../express/researchStream";
import compressionMiddleware from "compression";

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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // SSE streaming endpoints (must be before tRPC middleware)
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
}

startServer().catch(console.error);
