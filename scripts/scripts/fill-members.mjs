/**
 * 把每个公开群的人数填到「几百人」(创建静默成员,幂等:只在不足时补)。
 * 静默成员 isBot=TRUE(不算真实用户、不触发自动回复、有人设的氛围机器人也不会选中它们发言)。
 * 每群目标人数在 [GROUP_TARGET_MIN, GROUP_TARGET_MAX] 间随机(看起来更自然)。
 * 跑:node scripts/fill-members.mjs   (可调:GROUP_TARGET_MIN=250 GROUP_TARGET_MAX=500 node scripts/fill-members.mjs)
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const TARGET_MIN = Number(process.env.GROUP_TARGET_MIN || 220);
const TARGET_MAX = Number(process.env.GROUP_TARGET_MAX || 480);

const PRE = ['0x', 'Crypto', 'Web3', 'DeFi', 'Chain', 'Block', 'Token', 'NFT', 'Eth', 'BTC', 'Sol', 'Ape', 'Degen', 'Meta', 'Zk', 'Layer', 'Sui', 'Pump'];
const SUF = ['Whale', 'Degen', 'Hodler', 'Maxi', 'Anon', 'Dev', 'Trader', 'Farmer', 'Bull', 'Bear', 'Ape', 'Fren', 'Chad', 'Wizard', 'Knight', 'Ninja', 'Guru', 'Punk', 'Sniper', 'Builder'];
const rnd = () => Math.random().toString(36).slice(2, 7);
const uname = () => `${PRE[(Math.random() * PRE.length) | 0]}${SUF[(Math.random() * SUF.length) | 0]}_${rnd()}`;
function pastDate(maxDays) { const d = new Date(); d.setDate(d.getDate() - Math.random() * maxDays); return d; }

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`✅ 数据库连接成功(目标每群 ${TARGET_MIN}-${TARGET_MAX} 人)`);
  try {
    const [groups] = await conn.execute('SELECT id, name FROM chat_groups WHERE isPublic=TRUE');
    let totalNew = 0;
    for (const g of groups) {
      const [cur] = await conn.execute('SELECT COUNT(*) AS c FROM group_members WHERE groupId=?', [g.id]);
      const have = cur[0].c;
      const target = TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
      const need = target - have;
      if (need <= 0) { console.log(`  · ${g.name} 已有 ${have} 人(≥目标),跳过`); continue; }
      for (let i = 0; i < need; i++) {
        const u = uname();
        const openId = `silent_${u}_${Date.now()}_${i}_${(Math.random() * 1e6) | 0}`;
        const [r] = await conn.execute(
          `INSERT INTO users (openId, name, loginMethod, role, username, isBot, createdAt, updatedAt, lastSignedIn)
           VALUES (?, ?, 'silent', 'user', ?, TRUE, ?, NOW(), ?)`,
          [openId, u, u, pastDate(90), pastDate(7)]
        );
        await conn.execute(
          'INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, ?, ?)',
          [g.id, r.insertId, 'member', pastDate(60)]
        );
      }
      const [c2] = await conn.execute('SELECT COUNT(*) AS c FROM group_members WHERE groupId=?', [g.id]);
      await conn.execute('UPDATE chat_groups SET memberCount=? WHERE id=?', [c2[0].c, g.id]);
      totalNew += need;
      console.log(`  ✅ ${g.name}: ${have} → ${c2[0].c} 人(+${need})`);
    }
    console.log(`\n✅ 完成:新增 ${totalNew} 名静默成员,覆盖 ${groups.length} 个公开群。`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => { console.error('❌ 错误:', err); process.exit(1); });
