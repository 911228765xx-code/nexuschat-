/**
 * 扩充互动机器人(幂等,可重复跑)。
 *  1. 创建 6 个新机器人账号(openId 与 server/botAutoReply.ts 的 BOT_PERSONAS 对应)。
 *  2. 把「所有机器人」(老的+新的)加入「所有公开群」,并重算群成员数。
 * 跑:node scripts/add-bots.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// 与 botAutoReply.ts BOT_PERSONAS 的新成员一一对应
const NEW_BOTS = [
  { openId: 'bot_meme_king',     name: 'MemeKing',     username: 'meme_king' },
  { openId: 'bot_nft_collector', name: 'NFTCollector', username: 'nft_collector' },
  { openId: 'bot_dev_builder',   name: 'DevBuilder',   username: 'dev_builder' },
  { openId: 'bot_macro_trader',  name: 'MacroTrader',  username: 'macro_trader' },
  { openId: 'bot_yield_farmer',  name: 'YieldFarmer',  username: 'yield_farmer' },
  { openId: 'bot_news_flash',    name: 'NewsFlash',    username: 'news_flash' },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✅ 数据库连接成功');
  try {
    // ── 1. 创建新机器人账号(按 openId 查重,幂等)──
    console.log('\n🤖 创建/确认新机器人账号...');
    for (const b of NEW_BOTS) {
      const [exist] = await conn.execute('SELECT id FROM users WHERE openId=? LIMIT 1', [b.openId]);
      if (exist.length) { console.log(`  · 已存在 ${b.name} (id=${exist[0].id})`); continue; }
      const [r] = await conn.execute(
        `INSERT INTO users (openId, name, loginMethod, role, username, isBot, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, 'bot', 'user', ?, TRUE, NOW(), NOW(), NOW())`,
        [b.openId, b.name, b.username]
      );
      console.log(`  ✅ 新建 ${b.name} (id=${r.insertId})`);
    }

    // ── 2. 所有机器人 → 所有公开群(幂等)──
    console.log('\n🔗 把所有机器人加入所有公开群...');
    const [allBots] = await conn.execute('SELECT id, name FROM users WHERE isBot=TRUE');
    const [pubGroups] = await conn.execute('SELECT id, name FROM chat_groups WHERE isPublic=TRUE');
    let joins = 0;
    for (const g of pubGroups) {
      for (const bot of allBots) {
        const [m] = await conn.execute('SELECT id FROM group_members WHERE groupId=? AND userId=? LIMIT 1', [g.id, bot.id]);
        if (m.length) continue;
        await conn.execute('INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?,?,?,NOW())', [g.id, bot.id, 'member']);
        joins++;
      }
      const [cnt] = await conn.execute('SELECT COUNT(*) AS c FROM group_members WHERE groupId=?', [g.id]);
      await conn.execute('UPDATE chat_groups SET memberCount=? WHERE id=?', [cnt[0].c, g.id]);
      console.log(`  ✅ ${g.name}: 已含 ${allBots.length} 个机器人`);
    }
    console.log(`\n✅ 完成:${allBots.length} 个机器人 × ${pubGroups.length} 个公开群,新增 ${joins} 条入群记录。`);
    console.log('   氛围机器人(botScheduler runAmbientChatter)会自动让它们在群里活跃。');
  } finally {
    await conn.end();
  }
}

main().catch((err) => { console.error('❌ 错误:', err); process.exit(1); });
