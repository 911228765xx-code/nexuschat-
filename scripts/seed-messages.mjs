/**
 * NexusChat 历史消息生成脚本
 * 使用LLM生成7天的真实感群聊消息并注入数据库
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

const BOT_NAMES = {
  AlphaHunter: 'AlphaHunter_0x',
  ChainAnalyst: 'ChainAnalyst',
  CryptoSkeptic: 'CryptoSkeptic',
  Web3Newbie: 'Web3Newbie',
  QuantTrader: 'QuantTrader_Pro',
  NexusBot: 'NexusBot',
};

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM(messages) {
  const response = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.85,
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

// 群组配置
const GROUP_CONFIGS = [
  {
    id: 1,
    name: 'Alpha 猎手联盟',
    bots: ['AlphaHunter', 'ChainAnalyst', 'CryptoSkeptic'],
    topics: [
      { day: 7, topic: '新DeFi协议APY机会讨论', focus: '某Arbitrum上的新协议APY高达340%，讨论是否值得参与' },
      { day: 6, topic: '空投机会分享', focus: '讨论近期几个值得参与的空投项目，包括Layerzero和ZKsync' },
      { day: 5, topic: '某项目跑路风险讨论', focus: '某匿名团队项目TVL突然下降，讨论是否是跑路信号' },
      { day: 4, topic: '牛市仓位策略', focus: '讨论牛市中如何配置仓位，现货vs合约，BTC vs 山寨' },
      { day: 3, topic: '止损策略分享', focus: '讨论各自的止损策略，如何在暴跌中保护本金' },
      { day: 2, topic: '周末行情预测', focus: '周末流动性差，讨论是否会有大行情，如何应对' },
      { day: 1, topic: '下周Alpha预告', focus: '分享下周值得关注的项目和事件，包括代币解锁和主网上线' },
    ],
    messagesPerDay: 17,
  },
  {
    id: 2,
    name: '链上数据研究院',
    bots: ['ChainAnalyst', 'QuantTrader', 'NexusBot'],
    topics: [
      { day: 7, topic: 'BTC链上数据分析', focus: '分析BTC持仓分布、长期持有者比例、交易所流入流出' },
      { day: 6, topic: '鲸鱼钱包追踪', focus: '某鲸鱼地址连续3天转移大量ETH，分析其行为模式' },
      { day: 5, topic: 'DEX vs CEX资金流', focus: '对比DEX和CEX的资金流向，分析去中心化趋势' },
      { day: 4, topic: 'Layer2 TVL对比', focus: '对比Arbitrum、Optimism、Base的TVL变化和用户增长' },
      { day: 3, topic: '稳定币市值变化', focus: '分析USDT、USDC市值变化对市场的影响' },
      { day: 2, topic: '矿工行为分析', focus: '分析矿工持仓和抛售行为，判断市场顶底信号' },
      { day: 1, topic: '周报数据总结', focus: '总结本周链上数据关键指标，展望下周市场走向' },
    ],
    messagesPerDay: 11,
  },
  {
    id: 3,
    name: 'Web3 新手村',
    bots: ['Web3Newbie', 'NexusBot', 'AlphaHunter'],
    topics: [
      { day: 7, topic: '什么是Gas Fee', focus: '新手提问Gas费是什么，为什么会变化，如何节省Gas' },
      { day: 6, topic: '如何选择钱包', focus: '讨论MetaMask、OKX Wallet、Trust Wallet的优缺点' },
      { day: 5, topic: 'NFT入门介绍', focus: '新手询问NFT是什么，如何购买第一个NFT，有什么风险' },
      { day: 4, topic: '如何看白皮书', focus: '讨论如何阅读项目白皮书，重点看哪些部分' },
      { day: 3, topic: '什么是DAO', focus: '解释DAO的概念，如何参与DAO治理，有哪些知名DAO' },
      { day: 2, topic: 'DeFi风险提示', focus: '讨论DeFi的常见风险：智能合约漏洞、无常损失、跑路' },
      { day: 1, topic: '新手常见错误', focus: '分享新手常犯的错误：发错链、私钥泄露、钓鱼网站' },
    ],
    messagesPerDay: 14,
  },
  {
    id: 4,
    name: 'NexusChat 官方社区',
    bots: ['NexusBot', 'AlphaHunter', 'ChainAnalyst', 'CryptoSkeptic', 'Web3Newbie', 'QuantTrader'],
    topics: [
      { day: 7, topic: 'NexusChat平台功能介绍', focus: 'NexusBot介绍平台核心功能：Web3社交、AI投研、去中心化通讯' },
      { day: 6, topic: '行业新闻播报', focus: '讨论本周Web3行业重大新闻：某公链主网上线、某协议被黑' },
      { day: 5, topic: '每周AMA预告', focus: 'NexusBot宣布下周AMA嘉宾，社区成员提问' },
      { day: 4, topic: '平台更新公告', focus: 'NexusBot发布平台新功能公告，社区反馈' },
      { day: 3, topic: '社区投票发起', focus: '发起关于平台功能优先级的投票，讨论用户最需要的功能' },
      { day: 2, topic: '精选内容汇总', focus: '汇总本周各群精彩讨论，推荐优质内容' },
      { day: 1, topic: '下周计划预告', focus: '预告下周平台活动和更新计划，邀请社区参与' },
    ],
    messagesPerDay: 8,
  },
];

// 生成消息时间戳（模拟真实用户行为）
function generateTimestamp(daysAgo, messageIndex, totalMessages) {
  const now = new Date();
  const baseDate = new Date(now);
  baseDate.setDate(baseDate.getDate() - daysAgo);
  
  // 高峰时段权重：早9-11点、午12-13点、晚20-23点
  const peakHours = [9, 10, 11, 12, 20, 21, 22, 23];
  const offHours = [7, 8, 13, 14, 15, 16, 17, 18, 19];
  
  let hour;
  const rand = Math.random();
  if (rand < 0.6) {
    hour = peakHours[Math.floor(Math.random() * peakHours.length)];
  } else if (rand < 0.95) {
    hour = offHours[Math.floor(Math.random() * offHours.length)];
  } else {
    hour = Math.floor(Math.random() * 6); // 深夜0-5点，极少
  }
  
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  baseDate.setHours(hour, minute, second, 0);
  return baseDate;
}

async function generateMessagesForGroup(groupConfig, dayConfig) {
  const botPersonas = {
    AlphaHunter: '你是AlphaHunter_0x，DeFi机会猎手，发言简短直接，喜欢分享链上发现的机会，偶尔用英文缩写（lfg, gm, ngmi等），对高APY项目感兴趣但也会做基本尽调。',
    ChainAnalyst: '你是ChainAnalyst，链上数据分析师，发言理性冷静，喜欢用数据说话，经常引用链上指标（TVL、活跃地址、Gas费等），不轻易下结论。',
    CryptoSkeptic: '你是CryptoSkeptic，经历过多次熊市的老韭菜，对高收益项目持怀疑态度，经常提醒风险，但不是悲观主义者，有时也会认可好的机会。',
    Web3Newbie: '你是Web3Newbie，刚入圈的新手，对一切都很好奇，经常提问，偶尔说错术语，对大佬的解释很感激，语气活泼。',
    QuantTrader: '你是QuantTrader_Pro，量化策略研究员，发言专业，喜欢用技术指标分析，偶尔提到自己的策略模型，对市场结构有独到见解。',
    NexusBot: '你是NexusBot，NexusChat官方助手，发言正式权威，提供准确信息，引导讨论，偶尔发布平台公告，语气友好专业。',
  };
  
  const activeBotPersonas = groupConfig.bots.map(b => `${BOT_NAMES[b]}（${botPersonas[b]}）`).join('\n');
  
  const prompt = `你是一个Web3社区群聊模拟器。请为"${groupConfig.name}"群生成一段真实的群聊对话。

参与者：
${activeBotPersonas}

今日话题：${dayConfig.topic}
具体内容：${dayConfig.focus}

要求：
1. 生成 ${groupConfig.messagesPerDay} 条消息
2. 对话要自然，有来有往，有同意也有质疑
3. 消息长度要自然（15-120字），不要每条都很长
4. 适当使用Web3圈子的用语（gm, wagmi, ngmi, lfg, ser, fren, degen等）
5. 中英文混用，符合Web3圈子习惯
6. 允许口语化，偶尔有错别字或缩写
7. 不要提供具体的投资建议或保证收益
8. 对话要有逻辑连贯性，后面的消息要回应前面的内容

请以JSON格式返回，格式如下：
{
  "messages": [
    {"bot": "AlphaHunter", "content": "消息内容"},
    {"bot": "ChainAnalyst", "content": "消息内容"}
  ]
}

只返回JSON，不要其他内容。`;

  try {
    const response = await invokeLLM([
      { role: 'user', content: prompt }
    ]);
    
    const parsed = JSON.parse(response);
    return parsed.messages || [];
  } catch (err) {
    console.error(`  ⚠️ LLM生成失败，使用备用消息: ${err.message}`);
    return generateFallbackMessages(groupConfig, dayConfig);
  }
}

function generateFallbackMessages(groupConfig, dayConfig) {
  // 备用消息，当LLM失败时使用
  const fallbacks = {
    AlphaHunter: [`刚看到一个新机会，大家注意下`, `链上数据有点意思，值得关注`, `lfg，这个项目基本面不错`],
    ChainAnalyst: [`数据显示资金在持续流入`, `从链上来看，这个信号比较明显`, `TVL在增长，但要注意风险`],
    CryptoSkeptic: [`小心点，这种APY通常撑不久`, `见过太多这种项目了，做好风控`, `不是说不能参与，但仓位要控制`],
    Web3Newbie: [`哇这个我不太懂，能解释一下吗？`, `谢谢大佬解答！学到了`, `我刚入圈，这个对新手友好吗？`],
    QuantTrader: [`从技术面来看，这个位置还可以`, `我的模型显示这个时间窗口比较好`, `量化角度来说，这个风险收益比还行`],
    NexusBot: [`欢迎大家讨论！记得理性投资`, `今日话题：${dayConfig.topic}`, `有任何问题欢迎在群里提问`],
  };
  
  const messages = [];
  for (let i = 0; i < groupConfig.messagesPerDay; i++) {
    const bot = groupConfig.bots[i % groupConfig.bots.length];
    const botFallbacks = fallbacks[bot];
    messages.push({
      bot,
      content: botFallbacks[i % botFallbacks.length],
    });
  }
  return messages;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✅ 数据库连接成功');
  console.log('🤖 开始生成历史消息...\n');

  let totalMessages = 0;

  try {
    for (const group of GROUP_CONFIGS) {
      console.log(`\n📝 处理群组: ${group.name}`);
      
      for (const dayConfig of group.topics) {
        process.stdout.write(`  Day -${dayConfig.day}: ${dayConfig.topic}... `);
        
        // 生成消息
        const messages = await generateMessagesForGroup(group, dayConfig);
        
        // 为每条消息分配时间戳并插入数据库
        const timestamps = [];
        for (let i = 0; i < messages.length; i++) {
          timestamps.push(generateTimestamp(dayConfig.day, i, messages.length));
        }
        // 排序时间戳
        timestamps.sort((a, b) => a - b);
        
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const botId = BOT_IDS[msg.bot];
          if (!botId) continue;
          
          const ts = timestamps[i] || generateTimestamp(dayConfig.day, i, messages.length);
          
          await conn.execute(
            `INSERT INTO messages (groupId, senderId, content, messageType, createdAt) VALUES (?, ?, ?, 'text', ?)`,
            [group.id, botId, msg.content, ts]
          );
          totalMessages++;
        }
        
        console.log(`✅ ${messages.length}条`);
        
        // 避免API限速，每次请求后稍微等待
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    console.log(`\n🎉 完成！共注入 ${totalMessages} 条历史消息`);
    
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
