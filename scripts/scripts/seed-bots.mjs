/**
 * NexusChat Bot 冷启动数据注入脚本
 * 1. 创建4个样板群
 * 2. 批量创建静默用户
 * 3. 分配成员到各群
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const BOT_IDS = {
  AlphaHunter: 181472,
  ChainAnalyst: 181473,
  CryptoSkeptic: 181474,
  Web3Newbie: 181475,
  QuantTrader: 181476,
  NexusBot: 181477,
};

// 群组头像（使用Bot头像作为群头像）
const GROUP_AVATARS = {
  alpha: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663385790517/fYL7bQEV8tj27K63dbYKsc/bot_alpha_hunter-ivCHThbjvwergxRpRUSkQa.webp',
  chain: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663385790517/fYL7bQEV8tj27K63dbYKsc/bot_chain_analyst-gp9BPCse9gmpjfWHX9qEqL.webp',
  newbie: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663385790517/fYL7bQEV8tj27K63dbYKsc/bot_web3_newbie-NWXvi7HhdYk5Zo7p2kBFF5.webp',
  nexus: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663385790517/fYL7bQEV8tj27K63dbYKsc/bot_nexus_bot-a6Tg9F9sxqv4WG54p8S5Xp.webp',
};

// 静默用户名称池
const SILENT_PREFIXES = ['0x', 'Crypto', 'Web3', 'DeFi', 'Chain', 'Block', 'Token', 'NFT', 'Eth', 'BTC'];
const SILENT_SUFFIXES = ['Whale', 'Degen', 'Hodler', 'Maxi', 'Anon', 'Dev', 'Trader', 'Farmer', 'Bull', 'Bear', 'Ape', 'Fren'];

function randomSuffix() {
  return Math.random().toString(36).substring(2, 6);
}

function generateSilentUsername(index) {
  const prefix = SILENT_PREFIXES[index % SILENT_PREFIXES.length];
  const suffix = SILENT_SUFFIXES[Math.floor(index / SILENT_PREFIXES.length) % SILENT_SUFFIXES.length];
  return `${prefix}${suffix}_${randomSuffix()}`;
}

// 随机过去N天内的时间
function randomPastDate(maxDaysAgo) {
  const daysAgo = Math.random() * maxDaysAgo;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✅ 数据库连接成功');

  try {
    // ─── 1. 创建4个样板群 ─────────────────────────────────────────────────────
    console.log('\n📦 创建样板群...');
    
    const groups = [
      {
        name: '🔥 Alpha 猎手联盟',
        description: 'DeFi机会讨论 | 链上Alpha发现 | 早期项目预警 | 只分享有数据支撑的机会',
        avatar: GROUP_AVATARS.alpha,
        creatorId: BOT_IDS.AlphaHunter,
        daysAgo: 10,
        activeBots: [BOT_IDS.AlphaHunter, BOT_IDS.ChainAnalyst, BOT_IDS.CryptoSkeptic],
        silentCount: 18,
      },
      {
        name: '📊 链上数据研究院',
        description: '链上数据分析 | 鲸鱼动向追踪 | 资金流向研究 | 专业量化视角',
        avatar: GROUP_AVATARS.chain,
        creatorId: BOT_IDS.ChainAnalyst,
        daysAgo: 10,
        activeBots: [BOT_IDS.ChainAnalyst, BOT_IDS.QuantTrader, BOT_IDS.NexusBot],
        silentCount: 15,
      },
      {
        name: '🌱 Web3 新手村',
        description: '新手友好 | 基础知识学习 | 互助答疑 | 没有蠢问题只有蠢沉默',
        avatar: GROUP_AVATARS.newbie,
        creatorId: BOT_IDS.NexusBot,
        daysAgo: 10,
        activeBots: [BOT_IDS.Web3Newbie, BOT_IDS.NexusBot, BOT_IDS.AlphaHunter],
        silentCount: 22,
      },
      {
        name: '⚡ NexusChat 官方社区',
        description: 'NexusChat官方群 | 平台公告 | 功能讨论 | 用户反馈 | Web3社交新范式',
        avatar: GROUP_AVATARS.nexus,
        creatorId: BOT_IDS.NexusBot,
        daysAgo: 14,
        activeBots: [BOT_IDS.NexusBot, BOT_IDS.AlphaHunter, BOT_IDS.ChainAnalyst, BOT_IDS.CryptoSkeptic, BOT_IDS.Web3Newbie, BOT_IDS.QuantTrader],
        silentCount: 20,
      },
    ];

    const groupIds = [];
    for (const g of groups) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - g.daysAgo);
      
      const [result] = await conn.execute(
        `INSERT INTO chat_groups (name, description, avatar, creatorId, isPublic, memberCount, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, TRUE, 0, ?, NOW())`,
        [g.name, g.description, g.avatar, g.creatorId, createdAt]
      );
      const groupId = result.insertId;
      groupIds.push({ ...g, id: groupId });
      console.log(`  ✅ 创建群组: ${g.name} (ID: ${groupId})`);
    }

    // ─── 2. 批量创建静默用户 ────────────────────────────────────────────────────
    console.log('\n👥 创建静默用户...');
    const totalSilentNeeded = groups.reduce((sum, g) => sum + g.silentCount, 0);
    const silentUserIds = [];

    // 创建75个静默用户（有些会在多个群里）
    const silentCount = 75;
    for (let i = 0; i < silentCount; i++) {
      const username = generateSilentUsername(i);
      const openId = `silent_${username}_${Date.now()}_${i}`;
      const createdAt = randomPastDate(20);
      
      const [result] = await conn.execute(
        `INSERT INTO users (openId, name, loginMethod, role, username, isBot, createdAt, updatedAt, lastSignedIn) 
         VALUES (?, ?, 'silent', 'user', ?, TRUE, ?, NOW(), ?)`,
        [openId, username, username, createdAt, randomPastDate(5)]
      );
      silentUserIds.push(result.insertId);
    }
    console.log(`  ✅ 创建了 ${silentCount} 个静默用户`);

    // ─── 3. 分配成员到各群 ──────────────────────────────────────────────────────
    console.log('\n🔗 分配成员到各群...');
    let silentIndex = 0;
    
    for (const group of groupIds) {
      let memberCount = 0;
      
      // 添加活跃Bot（第一个是owner，其余是member）
      for (let i = 0; i < group.activeBots.length; i++) {
        const role = i === 0 ? 'owner' : 'member';
        const joinedAt = new Date();
        joinedAt.setDate(joinedAt.getDate() - (group.daysAgo - Math.random() * 2));
        
        await conn.execute(
          `INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, ?, ?)`,
          [group.id, group.activeBots[i], role, joinedAt]
        );
        memberCount++;
      }
      
      // 添加静默用户
      const silentForThisGroup = silentUserIds.slice(silentIndex, silentIndex + group.silentCount);
      silentIndex += group.silentCount;
      
      for (const userId of silentForThisGroup) {
        const joinedAt = randomPastDate(group.daysAgo);
        await conn.execute(
          `INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, 'member', ?)`,
          [group.id, userId, joinedAt]
        );
        memberCount++;
      }
      
      // 更新群成员数
      await conn.execute(
        `UPDATE chat_groups SET memberCount = ? WHERE id = ?`,
        [memberCount, group.id]
      );
      
      console.log(`  ✅ ${group.name}: ${memberCount} 名成员（${group.activeBots.length} 活跃Bot + ${group.silentCount} 静默用户）`);
    }

    // 输出群组ID供后续使用
    console.log('\n📋 群组ID汇总:');
    for (const g of groupIds) {
      console.log(`  ${g.name}: ID=${g.id}`);
    }
    
    console.log('\n✅ 样板群和成员创建完成！');
    
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
