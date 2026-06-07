/**
 * 定时销毁消息的物理清理：每 10 分钟删除已过期（expiresAt < now）的消息，释放空间。
 * 读取接口已做"未过期"过滤，这里负责真正落地删除。
 */
import { getDb } from "./db";
import { messages } from "../drizzle/schema";
import { and, isNotNull, lt } from "drizzle-orm";
import logger from "./utils/logger";

const INTERVAL_MS = 10 * 60 * 1000; // 10 分钟

async function purgeExpired() {
  const db = await getDb();
  if (!db) return;
  const res: any = await db.delete(messages).where(and(isNotNull(messages.expiresAt), lt(messages.expiresAt, new Date())));
  // MySQL2 returns affectedRows; log when something was actually deleted to monitor lag.
  const removed = res?.[0]?.affectedRows ?? res?.rowsAffected ?? res?.affectedRows;
  if (removed) logger.info({ removed }, "MessageCleanup: purged expired messages");
}

export function startMessageCleanup() {
  logger.info("MessageCleanup: started — interval: 10 min");
  purgeExpired().catch((err) => logger.error({ err }, "MessageCleanup: purge failed"));
  setInterval(() => {
    purgeExpired().catch((err) => logger.error({ err }, "MessageCleanup: purge failed"));
  }, INTERVAL_MS);
}
