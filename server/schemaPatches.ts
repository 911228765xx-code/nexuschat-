/**
 * 启动时幂等 schema 补丁:部署平台的 Publish 不跑 drizzle 迁移,新增列若只改
 * schema.ts,线上表缺列会让 select() 全列查询直接报错(settings 页整个挂掉)。
 * 这里用原生 mysql2 text 协议跑 `ADD COLUMN IF NOT EXISTS`(TiDB 支持;drizzle 的
 * execute 走 prepared 协议,DDL 会报通用错误,同 adminMaintenance 的教训)。
 * 失败仅告警不阻断启动——列已存在/无 DDL 权限时服务照常跑。
 */
import mysql from "mysql2/promise";

const PATCHES: string[] = [
  "ALTER TABLE `user_settings` ADD COLUMN IF NOT EXISTS `dmOnlyFriends` BOOLEAN NOT NULL DEFAULT FALSE",
];

export async function applySchemaPatches(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(url);
    for (const sql of PATCHES) {
      try {
        await conn.query(sql);
      } catch (e) {
        console.error(`[SchemaPatch] failed: ${sql}`, e);
      }
    }
  } catch (e) {
    console.error("[SchemaPatch] connection failed:", e);
  } finally {
    try { await conn?.end(); } catch { /* ignore */ }
  }
}
