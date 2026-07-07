import { z } from "zod";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";

/**
 * 运营数据清零(2026-07-06 运营决策):
 *   清除 —— 全部聊天数据(机器人+真实用户)、真实用户账号及全部从属数据、
 *           推荐/邀请关系(用户重新绑定)、广场内容、全部财务流水(含充值/提现/ICO,决策:一并清)。
 *   保留 —— 机器人账号(isBot)、管理员账号(role=admin)、所有群、群内机器人成员(群人数≈机器人数)、
 *           群公告/群机器人配置、app_config/ico_config/tge_config/nn_pool 等系统配置。
 *   AMM  —— 一并重置回未开市(seeded=false,储备清零;之后在 Swap 后台重新播种开市)。
 *
 * 安全设计:
 *   - dryRun 模式只统计不删,App 后台先看数字再确认;
 *   - execute 需口令 confirm === "清零";
 *   - 执行前对关键财务表做库内快照 bk{时间戳}_{表名}(CREATE TABLE AS),删错可回查;
 *   - 保留名单必须含 ≥1 管理员(且天然含调用者),防自锁;
 *   - 保留的群若群主被删,群主转移给执行操作的管理员。
 */

// 全量清空的表(无外键约束,顺序不敏感;users/group_members 按保留名单另行处理)
const WIPE_ALL = [
  // 聊天(机器人+真实用户)
  "messages", "message_reactions", "message_read_receipts", "group_unread_counts",
  "conversation_prefs", "red_packets", "red_packet_claims", "group_files",
  "voice_rooms", "group_join_requests", "group_invite_links", "group_mutes",
  // 广场
  "posts", "post_comments", "post_likes", "promo_banners",
  // 用户从属/社交
  "notifications", "friend_requests", "contact_metadata", "user_follows", "user_blocklist",
  "user_settings", "user_tasks", "user_daily_np", "user_watchlist", "user_api_keys",
  "password_reset_tokens", "device_push_tokens", "push_subscriptions", "price_alerts",
  "ai_daily_usage", "feedback", "content_violations",
  // 推荐关系(重新绑定)
  "referrals", "referral_milestones",
  // AI 生成内容
  "consulting_reports", "consulting_payments", "research_reports",
  // 财务/经济流水(决策:一并清)
  "calls", "curation_stakes", "nn_transactions", "nn_vesting", "nn_node_orders", "nn_pool_orders",
  "swap_history", "ai_swap_trades", "usdt_deposits", "usdt_withdrawals",
  "ico_orders", "ico_purchases", "ico_accounts", "ico_stake_lots", "ico_reward_runs",
  "tge_claims", "partner_bonuses", "partner_earnings", "partner_payouts", "partner_settle_runs",
  "platform_fee_ledger", "rank_agg_run",
  // 未上线金融模块残留
  "trading_positions", "trading_strategies", "copy_traders", "copy_trader_follows",
] as const;

// 执行前做库内快照的表(删后仍可查"谁曾有多少钱/谁充过值")
const BACKUP_TABLES = ["users", "usdt_deposits", "usdt_withdrawals", "ico_purchases", "ico_orders", "nn_transactions", "referrals"] as const;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function rawRows(db: Db, query: string): Promise<Record<string, unknown>[]> {
  const res: unknown = await db.execute(sql.raw(query));
  // drizzle/mysql2 返回 [rows, fields];防不同版本形态差异,取第一个数组元素
  if (Array.isArray(res)) return (Array.isArray(res[0]) ? res[0] : res) as Record<string, unknown>[];
  return [];
}

async function countRows(db: Db, table: string): Promise<number> {
  const rows = await rawRows(db, `SELECT COUNT(*) AS c FROM \`${table}\``);
  return Number(rows[0]?.c ?? 0);
}

export const adminMaintenanceRouter = router({
  resetOperationalData: adminProcedure
    .input(z.object({
      mode: z.enum(["dryRun", "execute"]),
      confirm: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      // 保留名单:机器人 + 管理员
      const keepRows = await rawRows(db, `SELECT id, isBot, role FROM users WHERE isBot = 1 OR role = 'admin'`);
      const keepIds = keepRows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
      const botCount = keepRows.filter((r) => Number(r.isBot) === 1).length;
      const adminCount = keepRows.filter((r) => String(r.role) === "admin").length;
      if (adminCount === 0 || !keepIds.includes(ctx.user.id)) {
        // 双保险:保留名单必须包含至少一个管理员且包含操作者本人,否则全员失联
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "保留名单校验失败(无管理员),已中止" });
      }
      const idList = keepIds.join(",");

      const usersTotal = await countRows(db, "users");
      const usersToDelete = usersTotal - keepIds.length;
      const gmRows = await rawRows(db, `SELECT COUNT(*) AS c FROM \`group_members\` WHERE userId NOT IN (${idList})`);
      const groupMembersToDelete = Number(gmRows[0]?.c ?? 0);

      const tables: { name: string; rows: number }[] = [];
      for (const t of WIPE_ALL) tables.push({ name: t, rows: await countRows(db, t) });
      const totalRows = tables.reduce((s, t) => s + t.rows, 0) + usersToDelete + groupMembersToDelete;

      const report = {
        mode: input.mode,
        keep: { bots: botCount, admins: adminCount },
        usersToDelete,
        groupMembersToDelete,
        tables,
        totalRows,
      };

      if (input.mode === "dryRun") return { ...report, backups: [] as string[] };

      if (input.confirm !== "清零") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "确认口令不符:需输入「清零」二字" });
      }

      // 用原生 mysql2 连接跑执行:drizzle 的 db.execute 走 prepared 协议,
      // 而 `CREATE TABLE ... AS SELECT` 等 DDL 在 prepared 协议下不被支持(表现为通用报错)。
      // conn.query() 走 text 协议,支持全部语句;手动事务保证删除原子性。
      const url = process.env.DATABASE_URL;
      if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "缺少 DATABASE_URL" });
      const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHmmss(到秒,防同分钟重试撞名)
      const backups: string[] = [];
      const conn = await mysql.createConnection(url);
      try {
        // 1) 库内快照(DDL 会隐式提交,须在事务之前;DROP IF EXISTS 防重试撞名)
        // 注:生产库是 TiDB,不支持 `CREATE TABLE ... AS SELECT`("not implemented yet"),
        //    改用等价两步:LIKE 克隆结构 + INSERT SELECT 拷数据(TiDB/MySQL 都支持)。
        for (const b of BACKUP_TABLES) {
          const bk = `bk${ts}_${b}`;
          await conn.query(`DROP TABLE IF EXISTS \`${bk}\``);
          await conn.query(`CREATE TABLE \`${bk}\` LIKE \`${b}\``);
          await conn.query(`INSERT INTO \`${bk}\` SELECT * FROM \`${b}\``);
          backups.push(bk);
        }
        // 2) 事务内删除 + 收尾
        await conn.beginTransaction();
        for (const t of WIPE_ALL) {
          await conn.query(`DELETE FROM \`${t}\``);
        }
        // 真实用户的群成员行(机器人/管理员保留 → 群人数≈机器人数,满足"群和机器人数量不清零")
        await conn.query(`DELETE FROM \`group_members\` WHERE userId NOT IN (${idList})`);
        // 真实用户本体
        await conn.query(`DELETE FROM \`users\` WHERE id NOT IN (${idList})`);
        // 保留的群:群主/公告作者已被删的转给执行操作的管理员;成员数按实际剩余重算
        await conn.query(`UPDATE \`chat_groups\` SET creatorId = ${ctx.user.id} WHERE creatorId NOT IN (${idList})`);
        await conn.query(`UPDATE \`group_announcements\` SET createdBy = ${ctx.user.id} WHERE createdBy NOT IN (${idList})`);
        await conn.query(`UPDATE \`chat_groups\` SET memberCount = (SELECT COUNT(*) FROM \`group_members\` gm WHERE gm.groupId = chat_groups.id)`);
        // AMM 一并重置回未开市(参数列 theta/tax 保留,之后在 Swap 后台重新播种)
        await conn.query(`UPDATE \`ai_amm_pool\` SET aiReserve=0, usdtReserve=0, reserveR=0, circulatingAi=0, crisisFund=0, divPool=0, cumBoughtUsdt=0, totalVolUsdt=0, peakPrice=0, peakUpdatedAt=NULL, seeded=0, dividendClaimsEnabled=0`);
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch { /* ignore */ }
        // 管理员专用工具:把真实数据库报错透传出来,别让生产 tRPC 吞成通用 "API Error"
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `清零失败(已回滚,数据未变动):${(e as Error).message}` });
      } finally {
        await conn.end();
      }

      return { ...report, backups };
    }),
});
