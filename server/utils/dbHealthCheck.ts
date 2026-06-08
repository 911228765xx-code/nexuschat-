/**
 * Database Health Check
 *
 * - Exposes GET /api/health endpoint (returns JSON status)
 * - Tracks consecutive ECONNRESET failures
 * - Sends owner notification after 3 consecutive failures (rate-limited to once per hour)
 */

import { type Express } from "express";
import { getDb, resetDbPool } from "../db";
import { notifyOwner } from "../_core/notification";
import logger from "./logger";

// ─── State ────────────────────────────────────────────────────────────────────
let consecutiveFailures = 0;
let lastAlertSentAt = 0;
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between alerts
const FAILURE_THRESHOLD = 3; // alert after 3 consecutive failures

// ─── Health Check Logic ───────────────────────────────────────────────────────
export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return { ok: false, error: "No DATABASE_URL configured" };
    }
    // Lightweight ping query
    await (db as any).execute("SELECT 1");
    const latencyMs = Date.now() - start;
    consecutiveFailures = 0; // reset on success
    return { ok: true, latencyMs };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    consecutiveFailures++;
    logger.warn({ consecutiveFailures, error }, "DB health check failed");

    // Reset pool so next query reconnects
    resetDbPool();

    // Send owner alert after threshold (rate-limited)
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      const now = Date.now();
      if (now - lastAlertSentAt > ALERT_COOLDOWN_MS) {
        lastAlertSentAt = now;
        notifyOwner({
          title: "⚠️ NexusChat 数据库连接异常",
          content: `数据库连续 ${consecutiveFailures} 次连接失败。\n\n最近错误：${error}\n\n时间：${new Date().toISOString()}\n\n系统已自动重置连接池，请检查数据库服务状态。`,
        }).catch(() => {
          // Notification failure is non-fatal
        });
      }
    }

    return { ok: false, error };
  }
}

// ─── Express Route Registration ───────────────────────────────────────────────
export function registerHealthRoute(app: Express) {
  app.get("/api/health", async (_req, res) => {
    const result = await checkDbHealth();
    const status = result.ok ? 200 : 503;
    res.status(status).json({
      status: result.ok ? "ok" : "degraded",
      database: result.ok ? "connected" : "disconnected",
      latencyMs: result.latencyMs,
      error: result.error,
      timestamp: new Date().toISOString(),
      consecutiveFailures,
    });
  });

  logger.info("Health check route registered: GET /api/health");
}

// ─── Background Health Polling ────────────────────────────────────────────────
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function startDbHealthMonitor() {
  // Run immediately on startup
  checkDbHealth().catch(() => {});

  setInterval(() => {
    checkDbHealth().catch(() => {});
  }, HEALTH_CHECK_INTERVAL_MS);

  logger.info("DB health monitor started — interval: 5 min");
}
