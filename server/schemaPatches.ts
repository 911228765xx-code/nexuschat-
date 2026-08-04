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
  // 群模块三列(2026-07-17 审计):alias 无任何 migration 覆盖,新建库缺列会让
  // joinGroup/getMessages/getGroupMembers 的全列 select 集体报 Unknown column;
  // joinApproval/forbidAddFriend 虽有 migration,但 Publish 不跑迁移,补列兜底。
  "ALTER TABLE `group_members` ADD COLUMN IF NOT EXISTS `alias` VARCHAR(50)",
  "ALTER TABLE `chat_groups` ADD COLUMN IF NOT EXISTS `joinApproval` BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE `chat_groups` ADD COLUMN IF NOT EXISTS `forbidAddFriend` BOOLEAN NOT NULL DEFAULT FALSE",
  // BIT 段位空投日结算表（Publish 不跑迁移时兜底建表）
  `CREATE TABLE IF NOT EXISTS \`bit_rank_airdrop_run\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`ymd\` varchar(10) NOT NULL,
    \`monthIndex\` int NOT NULL DEFAULT 0,
    \`dailyPool\` int NOT NULL DEFAULT 0,
    \`paidUsers\` int NOT NULL DEFAULT 0,
    \`paidTotal\` int NOT NULL DEFAULT 0,
    \`processedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uniq_bit_rank_airdrop_ymd\` (\`ymd\`)
  )`,
  // BIT 空投领取：捐献 IT 领 BIT（Publish 不跑迁移时兜底建表）
  `CREATE TABLE IF NOT EXISTS \`bit_rank_airdrop_claim\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`ymd\` varchar(10) NOT NULL,
    \`tier\` int NOT NULL,
    \`itCost\` int NOT NULL,
    \`bitAmount\` int NOT NULL,
    \`claimedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uniq_bit_airdrop_claim_user_ymd\` (\`userId\`, \`ymd\`),
    KEY \`idx_bit_airdrop_claim_ymd\` (\`ymd\`)
  )`,
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
