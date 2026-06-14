import {
  bigint,
  boolean,
  int,
  decimal,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  walletAddress: varchar("walletAddress", { length: 42 }),
  walletChain: varchar("walletChain", { length: 20 }).default("BSC"),
  avatar: text("avatar"),
  bio: text("bio"),
  username: varchar("username", { length: 50 }),
  npPoints: bigint("npPoints", { mode: "number" }).default(0).notNull(),
  // NN 治理代币余额（与 NP 积分区分；NN 用于付费服务/治理，总量 2100 万枚）
  nnBalance: bigint("nnBalance", { mode: "number" }).default(0).notNull(),
  // 内部 USDT 余额（二级市场 Swap 即时结算；充值=转账到官方地址后入账，提现=申请）
  usdtBalance: decimal("usdtBalance", { precision: 30, scale: 8 }).default("0").notNull(),
  // Pro 会员等级与到期（free/plus/pro；proUntil 过期则降级为 free）
  proTier: varchar("proTier", { length: 20 }).default("free").notNull(),
  proUntil: timestamp("proUntil"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  isBot: boolean("isBot").default(false).notNull(),
  // 封禁标记（被封禁用户无法通过鉴权）
  isBanned: boolean("isBanned").default(false).notNull(),
  // Deterministic referral code (see referral router). Indexed for O(1) reverse lookup.
  inviteCode: varchar("inviteCode", { length: 32 }),
  // 声誉/Alpha 分（NP 模型：来自他人认可，参与产出加成、治灌水；Phase 2/3 聚合填充）
  reputation: bigint("reputation", { mode: "number" }).default(0).notNull(),
  // 段位：累积价值分（全网体每日累积，只增不减）+ 当前段位（0=无 1..10=青铜..传奇，永久不降）
  rankScore: bigint("rankScore", { mode: "number" }).default(0).notNull(),
  rankTier: int("rankTier").default(0).notNull(),
  // 连续签到：连签天数 + 最近签到日（YYYY-MM-DD, UTC），用于阶梯签到奖励
  signinStreak: int("signinStreak").default(0).notNull(),
  lastSigninYmd: varchar("lastSigninYmd", { length: 10 }),
  // 设备指纹（防女巫/多号撸NP）：注册/登录时上报；同设备限注册数、限每日NP、禁互绑
  deviceId: varchar("deviceId", { length: 64 }),
  // 合伙人计划：身份档位（partner/super/founder，null=非合伙人）+ 累计已确认认购额（USDT）
  partnerTier: varchar("partnerTier", { length: 20 }),
  partnerStakeUsdt: int("partnerStakeUsdt").default(0).notNull(),
  // ICO 合伙人等级（0=非合伙人 1=种子 2=核心 3=创世；按累计 ICO 认购 USDT 自动授予，聊天/资料页展示徽章）
  icoTier: int("icoTier").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (t) => [index("idx_users_invite_code").on(t.inviteCode), index("idx_users_device").on(t.deviceId)]);

// ─── NP 每日产出台账（防刷：按号龄分级的每日 NP 产出上限）────────────────────
// 每天每用户一行，记录当天已发放的 NP 总额；creditNp() 据此封顶。
export const userDailyNp = mysqlTable("user_daily_np", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ymd: varchar("ymd", { length: 10 }).notNull(), // YYYY-MM-DD (UTC)
  earned: bigint("earned", { mode: "number" }).default(0).notNull(),
}, (t) => [uniqueIndex("uniq_daily_np_user_ymd").on(t.userId, t.ymd)]);
export type UserDailyNp = typeof userDailyNp.$inferSelect;

// ─── 段位每日聚合幂等记录（每个 UTC 日只聚合一次，防重复累加价值分）──────────────
export const rankAggRun = mysqlTable("rank_agg_run", {
  id: int("id").autoincrement().primaryKey(),
  ymd: varchar("ymd", { length: 10 }).notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("uniq_rank_agg_ymd").on(t.ymd)]);

// ─── 邀请里程碑（被邀请人首次达成某高价值动作 → 邀请人一次性奖；每人每里程碑一次）──
export const referralMilestones = mysqlTable("referral_milestones", {
  id: int("id").autoincrement().primaryKey(),
  inviteeId: int("inviteeId").notNull(),
  milestone: varchar("milestone", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("uniq_ref_milestone").on(t.inviteeId, t.milestone)]);

// ─── Alpha 战绩（结构化投资观点/喊单，系统按行情自动判定对错）─────────────────────
export const calls = mysqlTable("calls", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
  direction: mysqlEnum("direction", ["long", "short"]).notNull(), // 看涨/看跌
  horizonHours: int("horizonHours").notNull(),                    // 时间窗（小时）
  entryPrice: varchar("entryPrice", { length: 40 }).notNull(),    // 建仓价（字符串存，保精度）
  resolvedPrice: varchar("resolvedPrice", { length: 40 }),
  changeBp: int("changeBp"),                                      // 结算涨跌（基点 = 万分比）
  status: mysqlEnum("status", ["pending", "win", "lose", "void"]).default("pending").notNull(),
  note: varchar("note", { length: 280 }),
  createdYmd: varchar("createdYmd", { length: 10 }).notNull(),    // 当日 Call 限频用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolveAt: timestamp("resolveAt").notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (t) => [
  index("idx_calls_user").on(t.userId),
  index("idx_calls_pending").on(t.status, t.resolveAt),
]);
export type Call = typeof calls.$inferSelect;

// ─── 策展质押（押某条 Call 会命中；命中分奖励，未中质押销毁 → NP 出口）──────────────
export const curationStakes = mysqlTable("curation_stakes", {
  id: int("id").autoincrement().primaryKey(),
  stakerId: int("stakerId").notNull(),
  callId: int("callId").notNull(),
  amount: int("amount").notNull(),       // 质押 NP
  status: mysqlEnum("status", ["active", "won", "lost", "void"]).default("active").notNull(),
  payout: int("payout").default(0).notNull(), // 结算返还（含奖励）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  settledAt: timestamp("settledAt"),
}, (t) => [
  uniqueIndex("uniq_stake_user_call").on(t.stakerId, t.callId),
  index("idx_stake_call").on(t.callId),
]);
export type CurationStake = typeof curationStakes.$inferSelect;

// ─── TGE：NP→NN 单向兑换（默认关闭，临近发币由管理员快照+开启）────────────────────
// 单例配置（id=1）：nnPool=分给 NP 兑换的 NN 总量；按 NP 持有量快照 pro-rata 兑换。
export const tgeConfig = mysqlTable("tge_config", {
  id: int("id").primaryKey(),               // 固定 1
  enabled: boolean("enabled").default(false).notNull(),
  nnPool: bigint("nnPool", { mode: "number" }).default(0).notNull(),
  totalNpSnapshot: bigint("totalNpSnapshot", { mode: "number" }).default(0).notNull(),
  snapshotAt: timestamp("snapshotAt"),
});
// 每用户快照 + 领取记录
export const tgeClaims = mysqlTable("tge_claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  npSnapshot: bigint("npSnapshot", { mode: "number" }).notNull(),
  nnAmount: bigint("nnAmount", { mode: "number" }).default(0).notNull(),
  claimed: boolean("claimed").default(false).notNull(),
  claimedAt: timestamp("claimedAt"),
}, (t) => [uniqueIndex("uniq_tge_user").on(t.userId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Chat Groups ──────────────────────────────────────────────────────────────
export const chatGroups = mysqlTable("chat_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  avatar: text("avatar"),
  creatorId: int("creatorId").notNull(),
  isTokenGated: boolean("isTokenGated").default(false).notNull(),
  tokenGateAmount: varchar("tokenGateAmount", { length: 50 }).default("0"),
  tokenGateContract: varchar("tokenGateContract", { length: 42 }),
  maxMembers: int("maxMembers").default(500).notNull(),
  memberCount: int("memberCount").default(0).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  category: varchar("category", { length: 30 }).default("community"),
  // true=进群需群主/管理员审批
  joinApproval: boolean("joinApproval").default(false).notNull(),
  // true=禁止群成员互相添加好友（群主/管理员可设）
  forbidAddFriend: boolean("forbidAddFriend").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatGroup = typeof chatGroups.$inferSelect;
export type InsertChatGroup = typeof chatGroups.$inferInsert;

// ─── Group Members ────────────────────────────────────────────────────────────
export const groupMembers = mysqlTable(
  "group_members",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
    alias: varchar("alias", { length: 50 }),   // 群昵称(本人在该群的显示名;空=用全局名)
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  (t) => [index("idx_group_user").on(t.groupId, t.userId)]
);

export type GroupMember = typeof groupMembers.$inferSelect;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = mysqlTable(
  "messages",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    groupId: int("groupId"),
    senderId: int("senderId").notNull(),
    receiverId: int("receiverId"),
    content: text("content").notNull(),
    messageType: mysqlEnum("messageType", ["text", "image", "file", "system", "redpacket", "transfer", "voice", "video"]).default("text").notNull(),
    mediaUrl: text("mediaUrl"),
    // 语音/视频时长（秒），仅 voice/video 类型使用
    durationSeconds: int("durationSeconds"),
    // 引用/回复的目标消息 id（null=非回复）
    replyToId: bigint("replyToId", { mode: "number" }),
    // 转发来源消息 id（null=非转发）
    forwardFromId: bigint("forwardFromId", { mode: "number" }),
    // 群内置顶
    isPinned: boolean("isPinned").default(false).notNull(),
    // 撤回时间（null=未撤回）
    recalledAt: timestamp("recalledAt"),
    isEncrypted: boolean("isEncrypted").default(false).notNull(),
    isDeleted: boolean("isDeleted").default(false).notNull(),
    // 私信已读标记（仅对 receiverId 一方有意义）
    isRead: boolean("isRead").default(false).notNull(),
    // 定时销毁时间（null = 长期保留）；过期消息读取时被过滤
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_group_messages").on(t.groupId, t.createdAt),
    index("idx_dm_messages").on(t.senderId, t.receiverId),
    index("idx_dm_unread").on(t.receiverId, t.isRead),
    index("idx_msg_expires").on(t.expiresAt),
    index("idx_msg_pinned").on(t.groupId, t.isPinned),
  ]
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Conversation Prefs ─────────────────────────────────────────────────────
// 用户级会话偏好：免打扰 / 会话置顶 / 清除历史（隐藏 id <= clearedBeforeId 的消息）
// convKey 形如 "group:{groupId}" 或 "dm:{otherUserId}"
export const conversationPrefs = mysqlTable(
  "conversation_prefs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    convKey: varchar("convKey", { length: 40 }).notNull(),
    isMuted: boolean("isMuted").default(false).notNull(),
    isPinned: boolean("isPinned").default(false).notNull(),
    clearedBeforeId: bigint("clearedBeforeId", { mode: "number" }).default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_convpref_user").on(t.userId, t.convKey)]
);
export type ConversationPref = typeof conversationPrefs.$inferSelect;
export type InsertConversationPref = typeof conversationPrefs.$inferInsert;

// ─── Group Join Requests ────────────────────────────────────────────────────
// 进群审批：joinApproval 群的加入申请
export const groupJoinRequests = mysqlTable(
  "group_join_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    userId: int("userId").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_gjr_group").on(t.groupId, t.status)]
);
export type GroupJoinRequest = typeof groupJoinRequests.$inferSelect;
export type InsertGroupJoinRequest = typeof groupJoinRequests.$inferInsert;

// ─── Message Reactions ───────────────────────────────────────────────────────
export const messageReactions = mysqlTable(
  "message_reactions",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: bigint("messageId", { mode: "number" }).notNull(),
    userId: int("userId").notNull(),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_msg_reactions").on(t.messageId, t.userId, t.emoji),
  ]
);

export type MessageReaction = typeof messageReactions.$inferSelect;

// ─── Discover Posts ───────────────────────────────────────────────────────────
export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    authorId: int("authorId").notNull(),
    content: text("content").notNull(),
    mediaUrls: text("mediaUrls"),
    // 与 mediaUrls 平行的缩略图 URL（JSON 数组）；列表用缩略图，详情用原图
    mediaThumbs: text("mediaThumbs"),
    tags: text("tags"),
    likeCount: int("likeCount").default(0).notNull(),
    commentCount: int("commentCount").default(0).notNull(),
    shareCount: int("shareCount").default(0).notNull(),
    aiScore: int("aiScore").default(0),
    reportId: int("reportId"),
    isPinned: boolean("isPinned").default(false).notNull(),
    // 广场推广：付费推广到期时间（> now 即在信息流置顶展示「推广」）
    promotedUntil: timestamp("promotedUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_posts_author").on(t.authorId, t.createdAt)]
);

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ─── Post Likes ───────────────────────────────────────────────────────────────
export const postLikes = mysqlTable(
  "post_likes",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull(),
    userId: int("userId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_post_user_like").on(t.postId, t.userId)]
);

// ─── Post Comments ────────────────────────────────────────────────────────────
export const postComments = mysqlTable(
  "post_comments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull(),
    authorId: int("authorId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_comments_post").on(t.postId, t.createdAt)]
);

export type PostComment = typeof postComments.$inferSelect;

// ─── Research Reports ─────────────────────────────────────────────────────────
export const researchReports = mysqlTable(
  "research_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
    tokenName: varchar("tokenName", { length: 100 }),
    contractAddress: varchar("contractAddress", { length: 42 }),
    chain: varchar("chain", { length: 20 }).default("BSC").notNull(),
    reportContent: text("reportContent").notNull(),
    priceAtReport: varchar("priceAtReport", { length: 30 }),
    marketCapAtReport: varchar("marketCapAtReport", { length: 30 }),
    sentiment: mysqlEnum("sentiment", ["bullish", "neutral", "bearish"]).default("neutral"),
    riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("medium"),
    nxcCost: int("nxcCost").default(10).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_reports_user").on(t.userId, t.createdAt)]
);

export type ResearchReport = typeof researchReports.$inferSelect;
export type InsertResearchReport = typeof researchReports.$inferInsert;

// ─── Price Alerts ─────────────────────────────────────────────────────────────
export const priceAlerts = mysqlTable(
  "price_alerts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
    tokenId: varchar("tokenId", { length: 100 }).notNull(),
    targetPrice: varchar("targetPrice", { length: 30 }).notNull(),
    condition: mysqlEnum("condition", ["above", "below"]).notNull(),
    isTriggered: boolean("isTriggered").default(false).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_alerts_user").on(t.userId)]
);

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

// ─── User Tasks ───────────────────────────────────────────────────────────────
export const userTasks = mysqlTable(
  "user_tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    taskType: varchar("taskType", { length: 50 }).notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
    npEarned: int("npEarned").default(0).notNull(),
  },
  (t) => [index("idx_tasks_user_type").on(t.userId, t.taskType, t.completedAt)]
);

export type UserTask = typeof userTasks.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),           // recipient
    type: mysqlEnum("type", ["like", "comment", "follow", "mention", "system"]).notNull(),
    fromUserId: int("fromUserId"),             // who triggered it (null for system)
    fromUserName: varchar("fromUserName", { length: 100 }),
    fromUserAvatar: varchar("fromUserAvatar", { length: 200 }),
    postId: int("postId"),                     // related post (optional)
    content: varchar("content", { length: 500 }).notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_notif_user").on(t.userId, t.isRead, t.createdAt)]
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── User Follows ─────────────────────────────────────────────────────────────
export const userFollows = mysqlTable(
  "user_follows",
  {
    id: int("id").autoincrement().primaryKey(),
    followerId: int("followerId").notNull(),   // who is following
    followingId: int("followingId").notNull(), // who is being followed
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_follows_follower").on(t.followerId),
    index("idx_follows_following").on(t.followingId),
  ]
);

export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = typeof userFollows.$inferInsert;

// ─── Friend Requests ──────────────────────────────────────────────────────────
export const friendRequests = mysqlTable(
  "friend_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    receiverId: int("receiverId").notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_friend_req_receiver").on(t.receiverId, t.status),
    index("idx_friend_req_sender").on(t.senderId),
  ]
);

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = typeof friendRequests.$inferInsert;

// ─── Contact Metadata (favorites, notes, tags) ──────────────────────────────
export const contactMetadata = mysqlTable(
  "contact_metadata",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    contactId: int("contactId").notNull(),
    isFavorite: boolean("isFavorite").default(false).notNull(),
    // 好友备注名（显示时替代对方昵称；与 note 描述区分）
    remarkName: varchar("remarkName", { length: 50 }),
    note: text("note"),
    tags: text("tags"), // JSON array of strings
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_contact_meta_user").on(t.userId, t.contactId),
  ]
);

export type ContactMetadata = typeof contactMetadata.$inferSelect;

// ─── User Watchlist ───────────────────────────────────────────────────────────
export const userWatchlist = mysqlTable(
  "user_watchlist",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenId: varchar("tokenId", { length: 100 }).notNull(),
    tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
    tokenName: varchar("tokenName", { length: 100 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_watchlist_user").on(t.userId),
  ]
);

export type UserWatchlistItem = typeof userWatchlist.$inferSelect;
export type InsertUserWatchlistItem = typeof userWatchlist.$inferInsert;

// ─── Trading Positions ────────────────────────────────────────────────
export const tradingPositions = mysqlTable(
  "trading_positions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    pair: varchar("pair", { length: 30 }).notNull(),
    side: mysqlEnum("side", ["long", "short"]).notNull(),
    entryPrice: varchar("entryPrice", { length: 30 }).notNull(),
    amount: varchar("amount", { length: 30 }).notNull(),
    leverage: int("leverage").default(1).notNull(),
    stopLossPrice: varchar("stopLossPrice", { length: 30 }),
    takeProfitPrice: varchar("takeProfitPrice", { length: 30 }),
    liquidationPrice: varchar("liquidationPrice", { length: 30 }),
    strategyName: varchar("strategyName", { length: 100 }),
    status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
    closePrice: varchar("closePrice", { length: 30 }),
    realizedPnl: varchar("realizedPnl", { length: 30 }),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_positions_user").on(t.userId, t.status),
  ]
);
export type TradingPosition = typeof tradingPositions.$inferSelect;
export type InsertTradingPosition = typeof tradingPositions.$inferInsert;

// ─── Copy Traders (users who share their trading strategies) ─────────────────
export const copyTraders = mysqlTable(
  "copy_traders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    avatar: varchar("avatar", { length: 10 }).default("🤖"),
    badge: mysqlEnum("badge", ["gold", "silver", "bronze", "none"]).default("none").notNull(),
    description: text("description"),
    riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("medium").notNull(),
    totalReturn: varchar("totalReturn", { length: 30 }).default("0"),
    winRate: int("winRate").default(0),
    trades30d: int("trades30d").default(0),
    maxDrawdown: varchar("maxDrawdown", { length: 30 }).default("0"),
    topPairs: text("topPairs"), // JSON array
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_copy_traders_user").on(t.userId),
  ]
);
export type CopyTrader = typeof copyTraders.$inferSelect;

// ─── Copy Trader Follows ─────────────────────────────────────────────────────
export const copyTraderFollows = mysqlTable(
  "copy_trader_follows",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    traderId: int("traderId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_ct_follows_user").on(t.userId),
    index("idx_ct_follows_trader").on(t.traderId),
  ]
);

// ─── Trading Strategies ──────────────────────────────────────────────────────
export const tradingStrategies = mysqlTable(
  "trading_strategies",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    type: mysqlEnum("type", ["grid", "dca", "momentum", "arbitrage", "custom"]).default("custom").notNull(),
    pair: varchar("pair", { length: 30 }),
    riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("medium").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    totalReturn: varchar("totalReturn", { length: 30 }).default("0"),
    winRate: int("winRate").default(0),
    totalTrades: int("totalTrades").default(0),
    maxDrawdown: varchar("maxDrawdown", { length: 30 }).default("0"),
    stopLoss: varchar("stopLoss", { length: 30 }),
    takeProfit: varchar("takeProfit", { length: 30 }),
    maxPosition: varchar("maxPosition", { length: 30 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_strategies_user").on(t.userId),
  ]
);
export type TradingStrategy = typeof tradingStrategies.$inferSelect;

// ─── User Settings (privacy & preferences persistence) ──────────────────
export const userSettings = mysqlTable(
  "user_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    showWallet: boolean("showWallet").default(false).notNull(),
    showActivity: boolean("showActivity").default(true).notNull(),
    showNFTs: boolean("showNFTs").default(true).notNull(),
    readReceipts: boolean("readReceipts").default(true).notNull(),
    profileVisible: boolean("profileVisible").default(true).notNull(),
    twoFAEnabled: boolean("twoFAEnabled").default(false).notNull(),
    biometricEnabled: boolean("biometricEnabled").default(false).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ─── User API Keys ────────────────────────────────────────────────────────
export const userApiKeys = mysqlTable(
  "user_api_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    keyPrefix: varchar("keyPrefix", { length: 10 }).notNull(), // "nx_sk_" + first 4 chars
    keyHash: varchar("keyHash", { length: 128 }).notNull(), // SHA-256 hash
    label: varchar("label", { length: 100 }).default("Default"),
    isActive: boolean("isActive").default(true).notNull(),
    lastUsedAt: timestamp("lastUsedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_api_keys_user").on(t.userId),
  ]
);

export type UserApiKey = typeof userApiKeys.$inferSelect;
export type InsertUserApiKey = typeof userApiKeys.$inferInsert;

// ─── Referrals (invite system) ───────────────────────────────────────────
export const referrals = mysqlTable(
  "referrals",
  {
    id: int("id").autoincrement().primaryKey(),
    referrerId: int("referrerId").notNull(),       // the user who invited
    inviteeId: int("inviteeId").notNull(),          // the user who was invited
    status: mysqlEnum("status", ["pending", "active"]).default("pending").notNull(),
    referrerReward: int("referrerReward").default(0).notNull(), // NP rewarded to referrer
    inviteeReward: int("inviteeReward").default(0).notNull(),   // NP rewarded to invitee
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    activatedAt: timestamp("activatedAt"),
  },
  (t) => [
    index("idx_referrals_referrer").on(t.referrerId),
    index("idx_referrals_invitee").on(t.inviteeId),
  ]
);

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Swap History ─────────────────────────────────────────────────────────────
export const swapHistory = mysqlTable(
  "swap_history",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    walletAddress: varchar("walletAddress", { length: 64 }).notNull(),
    fromToken: varchar("fromToken", { length: 20 }).notNull(),
    toToken: varchar("toToken", { length: 20 }).notNull(),
    fromAmount: varchar("fromAmount", { length: 50 }).notNull(),
    toAmount: varchar("toAmount", { length: 50 }).notNull(),
    rate: varchar("rate", { length: 50 }).notNull(),
    dex: varchar("dex", { length: 50 }).notNull(),
    txHash: varchar("txHash", { length: 70 }).notNull(),
    slippage: varchar("slippage", { length: 10 }).default("0.5").notNull(),
    status: mysqlEnum("status", ["pending", "success", "failed"]).default("success").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_swap_user").on(t.userId, t.createdAt)]
);

export type SwapHistory = typeof swapHistory.$inferSelect;
export type InsertSwapHistory = typeof swapHistory.$inferInsert;

// ─── Password Reset Tokens ──────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    token: varchar("token", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_reset_token").on(t.token)]
);
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ── Web Push Subscriptions ──────────────────────────────────────────────────
export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: varchar("auth", { length: 100 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_push_user").on(t.userId)]
);
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Group Unread Counts ─────────────────────────────────────────────────────
// Tracks the last-read message ID per user per group, used to compute unread badge counts
export const groupUnreadCounts = mysqlTable(
  "group_unread_counts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    groupId: int("groupId").notNull(),
    lastReadMessageId: bigint("lastReadMessageId", { mode: "number" }).default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_unread_user_group").on(t.userId, t.groupId)]
);
export type GroupUnreadCount = typeof groupUnreadCounts.$inferSelect;

// ─── Group Invite Links ───────────────────────────────────────────────────────
export const groupInviteLinks = mysqlTable(
  "group_invite_links",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    creatorId: int("creatorId").notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    maxUses: int("maxUses").default(0).notNull(), // 0 = unlimited
    useCount: int("useCount").default(0).notNull(),
    expiresAt: timestamp("expiresAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_invite_token").on(t.token),
    index("idx_invite_group").on(t.groupId),
  ]
);
export type GroupInviteLink = typeof groupInviteLinks.$inferSelect;
export type InsertGroupInviteLink = typeof groupInviteLinks.$inferInsert;

// ─── Group Files ──────────────────────────────────────────────────────────────
export const groupFiles = mysqlTable(
  "group_files",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    uploaderId: int("uploaderId").notNull(),
    messageId: bigint("messageId", { mode: "number" }),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileSize: bigint("fileSize", { mode: "number" }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    fileKey: text("fileKey").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_files_group").on(t.groupId),
    index("idx_files_uploader").on(t.uploaderId),
  ]
);
export type GroupFile = typeof groupFiles.$inferSelect;
export type InsertGroupFile = typeof groupFiles.$inferInsert;

// ─── Message Read Receipts ────────────────────────────────────────────────────
// Tracks which users have read which messages (sampled — only last N messages per group)
export const messageReadReceipts = mysqlTable(
  "message_read_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: bigint("messageId", { mode: "number" }).notNull(),
    groupId: int("groupId").notNull(),
    userId: int("userId").notNull(),
    readAt: timestamp("readAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_receipts_message").on(t.messageId),
    index("idx_receipts_user_group").on(t.userId, t.groupId),
  ]
);
export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect;
export type InsertMessageReadReceipt = typeof messageReadReceipts.$inferInsert;

// ─── Group Mutes ──────────────────────────────────────────────────────────────
// Tracks muted members per group (for group admin mute feature)
export const groupMutes = mysqlTable(
  "group_mutes",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    userId: int("userId").notNull(),
    mutedBy: int("mutedBy").notNull(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_mutes_group_user").on(t.groupId, t.userId)]
);
export type GroupMute = typeof groupMutes.$inferSelect;

// ─── App Version Config ───────────────────────────────────────────────────────
// Stores app version info for OTA update checks
export const appConfig = mysqlTable("app_config", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["android", "ios", "all"]).notNull().default("all"),
  latestVersion: varchar("latestVersion", { length: 20 }).notNull().default("1.0.0"),
  minVersion: varchar("minVersion", { length: 20 }).notNull().default("1.0.0"),
  downloadUrlAndroid: text("downloadUrlAndroid"),
  downloadUrlIos: text("downloadUrlIos"),
  downloadUrlWeb: text("downloadUrlWeb"),
  releaseNotes: text("releaseNotes"),
  isForceUpdate: boolean("isForceUpdate").default(false).notNull(),
  // 与 AI 助手对话每次消耗的 NP 积分（可后台配置，无需改代码）
  aiChatCost: int("aiChatCost").default(10).notNull(),
  // 任务奖励覆盖（JSON: { [taskType]: npReward }），后台可改，无需改代码
  taskRewards: text("taskRewards"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = typeof appConfig.$inferInsert;

// ─── Red Packet Claims ────────────────────────────────────────────────────────
// Tracks who has claimed which red packet (for multi-person grab)
export const redPacketClaims = mysqlTable(
  "red_packet_claims",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: bigint("messageId", { mode: "number" }).notNull(),
    // 群红包为群 id；私信红包为 null
    groupId: int("groupId"),
    claimedBy: int("claimedBy").notNull(),
    // 该次抢到的 NP 金额
    amount: int("amount").default(0).notNull(),
    claimedAt: timestamp("claimedAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_rpc_message").on(t.messageId),
    index("idx_rpc_claimer").on(t.messageId, t.claimedBy),
  ]
);
export type RedPacketClaim = typeof redPacketClaims.$inferSelect;
export type InsertRedPacketClaim = typeof redPacketClaims.$inferInsert;

// ─── Red Packets ──────────────────────────────────────────────────────────────
// 红包本体（NP 积分）：发包时扣发送者积分，抢包时按剩余随机/均分发放并入账。
export const redPackets = mysqlTable(
  "red_packets",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: bigint("messageId", { mode: "number" }).notNull(),
    // 群红包为群 id；私信红包为 null
    groupId: int("groupId"),
    // 私信红包的接收者（群红包为 null）
    receiverId: int("receiverId"),
    senderId: int("senderId").notNull(),
    totalAmount: int("totalAmount").notNull(),
    totalShares: int("totalShares").notNull(),
    remainingAmount: int("remainingAmount").notNull(),
    remainingShares: int("remainingShares").notNull(),
    // true=拼手气随机；false=普通均分
    isRandom: boolean("isRandom").default(true).notNull(),
    blessing: varchar("blessing", { length: 100 }).default("恭喜发财，大吉大利").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_rp_message").on(t.messageId),
    index("idx_rp_group").on(t.groupId),
  ]
);
export type RedPacket = typeof redPackets.$inferSelect;
export type InsertRedPacket = typeof redPackets.$inferInsert;

// ─── Group Announcements ──────────────────────────────────────────────────────
// Stores pinned announcements for groups
export const groupAnnouncements = mysqlTable(
  "group_announcements",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    content: text("content").notNull(),
    createdBy: int("createdBy").notNull(),
    isPinned: boolean("isPinned").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_ann_group").on(t.groupId, t.isPinned)]
);
export type GroupAnnouncement = typeof groupAnnouncements.$inferSelect;
export type InsertGroupAnnouncement = typeof groupAnnouncements.$inferInsert;

// ─── Group Bots ───────────────────────────────────────────────────────────────
// 群机器人服务套餐：每个群开了哪些机器人、配置、订阅到期。
export const groupBots = mysqlTable(
  "group_bots",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    // manage(管理)/welcome(欢迎)/price(行情)/activity(活动)/stats(数据) 等
    botType: varchar("botType", { length: 30 }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    // 各机器人的设置（JSON：关键词/欢迎语/币种/定时等）
    config: text("config"),
    // 订阅到期（null=免费/永久）
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_groupbots").on(t.groupId, t.botType)]
);
export type GroupBot = typeof groupBots.$inferSelect;
export type InsertGroupBot = typeof groupBots.$inferInsert;

// ─── NN 节点认购订单 ────────────────────────────────────────────────────────────
// DAO 私募：用户用 USDT 认购节点，链上转账后填哈希，运营确认到账即发放 NN（节点池）。
export const nnNodeOrders = mysqlTable(
  "nn_node_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tier: varchar("tier", { length: 20 }).notNull(), // genesis/super/standard
    usdtAmount: int("usdtAmount").notNull(),         // 应付 USDT（整数）
    nnAmount: int("nnAmount").notNull(),             // 认购获得 NN
    // pending(待支付/待确认) / confirmed(已确认发放) / cancelled
    status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
    txHash: varchar("txHash", { length: 120 }),      // 用户回填的链上转账哈希
    payAddress: varchar("payAddress", { length: 120 }), // 下单时的收款地址快照
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    confirmedAt: timestamp("confirmedAt"),
  },
  (t) => [index("idx_nodeorder_user").on(t.userId), index("idx_nodeorder_status").on(t.status)]
);
export type NnNodeOrder = typeof nnNodeOrders.$inferSelect;
export type InsertNnNodeOrder = typeof nnNodeOrders.$inferInsert;

// ─── NN 交易流水（账本）─────────────────────────────────────────────────────────
// 每笔 NN 流动都记一条：amount 负=支出(扣费)，正=收入(发放)。用于用户账单 + 运营对账。
export const nnTransactions = mysqlTable(
  "nn_transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    amount: int("amount").notNull(), // 有符号：负=支出，正=收入
    type: varchar("type", { length: 30 }).notNull(), // bot_sub/package/node/grant/...
    refType: varchar("refType", { length: 20 }),       // group/order/admin...
    refId: int("refId"),
    memo: varchar("memo", { length: 200 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_nntx_user").on(t.userId, t.createdAt), index("idx_nntx_type").on(t.type)]
);
export type NnTransaction = typeof nnTransactions.$inferSelect;
export type InsertNnTransaction = typeof nnTransactions.$inferInsert;

// ─── NN 底池（流动性共建）────────────────────────────────────────────────────────
// 单行配置：储备/已售/单价(每 1 USDT 兑多少 NN)/累计募集。普通用户从底池购买 NN。
export const nnPool = mysqlTable("nn_pool", {
  id: int("id").primaryKey(),                                  // 固定 1
  reserveNN: bigint("reserveNN", { mode: "number" }).default(0).notNull(),    // 可售储备
  soldNN: bigint("soldNN", { mode: "number" }).default(0).notNull(),          // 已售出
  priceNnPerUsdt: int("priceNnPerUsdt").default(20).notNull(), // 1 USDT = N 个 NN
  raisedUsdt: bigint("raisedUsdt", { mode: "number" }).default(0).notNull(),  // 累计募集 USDT
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NnPool = typeof nnPool.$inferSelect;

// 底池购买订单（USDT 支付，运营确认到账发 NN）
export const nnPoolOrders = mysqlTable(
  "nn_pool_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    usdtAmount: int("usdtAmount").notNull(),
    nnAmount: int("nnAmount").notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
    txHash: varchar("txHash", { length: 120 }),
    payAddress: varchar("payAddress", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    confirmedAt: timestamp("confirmedAt"),
  },
  (t) => [index("idx_poolorder_user").on(t.userId), index("idx_poolorder_status").on(t.status)]
);
export type NnPoolOrder = typeof nnPoolOrders.$inferSelect;

// ─── AI 每日用量（会员每日免费额度计数）────────────────────────────────────────
export const aiDailyUsage = mysqlTable(
  "ai_daily_usage",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    day: varchar("day", { length: 10 }).notNull(), // YYYY-MM-DD
    count: int("count").default(0).notNull(),
  },
  (t) => [index("idx_aiusage_user_day").on(t.userId, t.day)]
);
export type AiDailyUsage = typeof aiDailyUsage.$inferSelect;

// ─── NN 线性归属（节点认购等按周期解锁，用户自助 claim）────────────────────────────
export const nnVesting = mysqlTable(
  "nn_vesting",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    source: varchar("source", { length: 20 }).notNull(), // node/team/...
    refId: int("refId"),                                 // 关联订单 id
    totalNN: int("totalNN").notNull(),
    claimedNN: int("claimedNN").default(0).notNull(),
    startAt: timestamp("startAt").notNull(),
    cliffMonths: int("cliffMonths").default(0).notNull(),
    durationMonths: int("durationMonths").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_vesting_user").on(t.userId)]
);
export type NnVesting = typeof nnVesting.$inferSelect;

// ─── 合伙人计划（平台共建 · USDT 认购 + 双池分红 + USDT 认购奖励）────────────────
// 认购奖励（USDT）：确认到账后按档位比例（5%/8%/10%）生成，分 6 期按月解锁领取
export const partnerBonuses = mysqlTable(
  "partner_bonuses",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    orderId: int("orderId").notNull(),               // 关联 nn_node_orders.id
    totalUsdt: int("totalUsdt").notNull(),           // 奖励总额（USDT 整数）
    periods: int("periods").default(6).notNull(),    // 解锁期数（月）
    claimedPeriods: int("claimedPeriods").default(0).notNull(),
    claimedUsdt: int("claimedUsdt").default(0).notNull(),
    startAt: timestamp("startAt").notNull(),         // 解锁起算时间（确认到账时刻）
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_pbonus_user").on(t.userId)]
);
export type PartnerBonus = typeof partnerBonuses.$inferSelect;

// USDT 奖励提取申请（链上打款在 App 外，运营核验后标记已支付）
export const partnerPayouts = mysqlTable(
  "partner_payouts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    bonusId: int("bonusId").notNull(),
    period: int("period").notNull(),                 // 第几期（1..periods）
    amountUsdt: int("amountUsdt").notNull(),
    address: varchar("address", { length: 120 }).notNull(), // 收款地址
    status: mysqlEnum("status", ["pending", "paid", "rejected"]).default("pending").notNull(),
    txHash: varchar("txHash", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    paidAt: timestamp("paidAt"),
  },
  (t) => [
    index("idx_ppayout_user").on(t.userId),
    index("idx_ppayout_status").on(t.status),
    uniqueIndex("uniq_ppayout_bonus_period").on(t.bonusId, t.period), // 防同期重复申请
  ]
);
export type PartnerPayout = typeof partnerPayouts.$inferSelect;

// NN 分红台账（每日结算逐人记账：kind=fee 手续费池 / revenue 收益池）
export const partnerEarnings = mysqlTable(
  "partner_earnings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    kind: mysqlEnum("kind", ["fee", "revenue"]).notNull(),
    amountNN: int("amountNN").notNull(),
    ymd: varchar("ymd", { length: 10 }).notNull(),   // 结算自然日（UTC）
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_pearn_user").on(t.userId, t.createdAt), index("idx_pearn_ymd").on(t.ymd)]
);
export type PartnerEarning = typeof partnerEarnings.$inferSelect;

// 分红结算执行记录（幂等闸：每天每池只结一次）
export const partnerSettleRuns = mysqlTable(
  "partner_settle_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    ymd: varchar("ymd", { length: 10 }).notNull(),
    kind: varchar("kind", { length: 10 }).notNull(), // fee / revenue
    poolNN: int("poolNN").default(0).notNull(),      // 当次入池总额（审计）
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uniq_psettle_ymd_kind").on(t.ymd, t.kind)]
);

// ─── 发现页滚动广告位（Pro 会员专属投放，7 天有效，每人同时 1 条）──────────────
export const promoBanners = mysqlTable(
  "promo_banners",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    text: varchar("text", { length: 80 }).notNull(),        // 广告文案（经内容审核）
    targetType: mysqlEnum("targetType", ["group", "post", "none"]).default("none").notNull(),
    targetId: int("targetId"),                               // 跳转目标（自己的公开群/动态）
    status: mysqlEnum("status", ["active", "removed"]).default("active").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_pbanner_status").on(t.status, t.expiresAt), index("idx_pbanner_user").on(t.userId)]
);
export type PromoBanner = typeof promoBanners.$inferSelect;

// 平台手续费台账（生态内收 5% 手续费的交易逐笔记账；其中 3.7% 注入手续费分红池）
export const platformFeeLedger = mysqlTable(
  "platform_fee_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    baseNN: int("baseNN").notNull(),                 // 交易基数（NN）
    poolNN: int("poolNN").notNull(),                 // 入池额 = baseNN × 3.7%
    source: varchar("source", { length: 30 }).notNull(), // 手续费来源（redpacket/transfer/trade/...）
    settled: boolean("settled").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_pfee_settled").on(t.settled)]
);

// ─── 内容违规记录（毒品/赌博/贩卖等违禁内容拦截 + 累犯封禁）──────────────────────
export const contentViolations = mysqlTable(
  "content_violations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    category: varchar("category", { length: 20 }).notNull(), // drugs/gambling/trafficking/...
    source: varchar("source", { length: 20 }).notNull(),     // group/dm/post
    snippet: varchar("snippet", { length: 200 }),            // 命中内容片段（截断）
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_violation_user").on(t.userId, t.createdAt)]
);
export type ContentViolation = typeof contentViolations.$inferSelect;

// ─── AI Consulting Reports ────────────────────────────────────────────────────
// Stores AI-generated consulting reports (paid content)
export const consultingReports = mysqlTable(
  "consulting_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    queryType: mysqlEnum("queryType", ["project", "security", "market"]).notNull().default("project"),
    queryText: text("queryText").notNull(),
    summary: text("summary"),
    fullContent: text("fullContent"),
    status: mysqlEnum("status", ["pending_payment", "generating", "completed", "failed"]).notNull().default("pending_payment"),
    pricePaid: varchar("pricePaid", { length: 20 }).default("10"),
    txHash: varchar("txHash", { length: 100 }),
    cacheKey: varchar("cacheKey", { length: 200 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_consulting_user").on(t.userId),
    index("idx_consulting_cache").on(t.cacheKey),
    index("idx_consulting_tx").on(t.txHash),
  ]
);
export type ConsultingReport = typeof consultingReports.$inferSelect;
export type InsertConsultingReport = typeof consultingReports.$inferInsert;

// ─── Consulting Payment Records ───────────────────────────────────────────────
// Tracks BSC USDT payment records for consulting reports
export const consultingPayments = mysqlTable(
  "consulting_payments",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("reportId").notNull(),
    userId: int("userId").notNull(),
    walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
    txHash: varchar("txHash", { length: 100 }),
    amount: varchar("amount", { length: 20 }).notNull().default("10"),
    chain: varchar("chain", { length: 20 }).notNull().default("BSC"),
    status: mysqlEnum("status", ["pending", "confirmed", "failed"]).notNull().default("pending"),
    confirmedAt: timestamp("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_cpay_report").on(t.reportId),
    index("idx_cpay_user").on(t.userId),
    index("idx_cpay_tx").on(t.txHash),
  ]
);
export type ConsultingPayment = typeof consultingPayments.$inferSelect;
export type InsertConsultingPayment = typeof consultingPayments.$inferInsert;

// 语音房（TRTC 实时音视频房间登记；房间号即 TRTC roomId）
export const voiceRooms = mysqlTable(
  "voice_rooms",
  {
    id: int("id").autoincrement().primaryKey(),
    roomId: int("roomId").notNull(),                          // TRTC 数字房间号（进房用）
    title: varchar("title", { length: 60 }).notNull(),
    topic: varchar("topic", { length: 80 }),
    category: mysqlEnum("category", ["trade", "study", "project", "chat"]).default("chat").notNull(),
    hostUserId: int("hostUserId").notNull(),
    isMembersOnly: boolean("isMembersOnly").default(false).notNull(),
    isPublic: boolean("isPublic").default(true).notNull(),    // 公开=语音房广场可见；私密=仅分享进入
    status: mysqlEnum("status", ["live", "ended"]).default("live").notNull(),
    speakerCount: int("speakerCount").default(1).notNull(),   // 麦上人数（含房主）
    listenerCount: int("listenerCount").default(0).notNull(), // 听众数
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    endedAt: timestamp("endedAt"),
  },
  (t) => [
    uniqueIndex("uq_vroom_roomid").on(t.roomId),
    index("idx_vroom_status").on(t.status, t.createdAt),
    index("idx_vroom_host").on(t.hostUserId),
  ]
);
export type VoiceRoomRow = typeof voiceRooms.$inferSelect;
export type InsertVoiceRoom = typeof voiceRooms.$inferInsert;

// ─── ICO 曲线认购 ───────────────────────────────────────────────────────────
// 配置(单行 id=1,管理员可改;价格/枚数用 decimal 保精度)
export const icoConfig = mysqlTable("ico_config", {
  id: int("id").primaryKey(),                                        // 固定 1
  totalTokens: decimal("totalTokens", { precision: 30, scale: 8 }).notNull(),     // 认购总额度 Q
  tokensSold: decimal("tokensSold", { precision: 30, scale: 8 }).default("0").notNull(),
  startPrice: decimal("startPrice", { precision: 18, scale: 8 }).notNull(),       // 0.8
  endPrice: decimal("endPrice", { precision: 18, scale: 8 }).notNull(),           // 2.0 封顶
  exponent: decimal("exponent", { precision: 8, scale: 4 }).default("1.5000").notNull(),
  listingPrice: decimal("listingPrice", { precision: 18, scale: 8 }).default("3").notNull(), // 预计上线价
  status: mysqlEnum("status", ["paused", "active", "ended"]).default("paused").notNull(),
  perWalletCap: decimal("perWalletCap", { precision: 30, scale: 8 }).default("0").notNull(), // 单钱包上限(0=不限)
  // 质押奖励池(线性·每人目标年化·封顶·年化可线性递减·可随时调)
  rewardPoolTotal: decimal("rewardPoolTotal", { precision: 30, scale: 8 }).default("0").notNull(),
  rewardEmitted: decimal("rewardEmitted", { precision: 30, scale: 8 }).default("0").notNull(),
  aprStart: decimal("aprStart", { precision: 8, scale: 4 }).default("1.0000").notNull(),     // 起始年化(1=100%)
  aprEnd: decimal("aprEnd", { precision: 8, scale: 4 }).default("1.0000").notNull(),         // 结束年化(线性降到此值;=aprStart 则恒定)
  aprDeclineDays: int("aprDeclineDays").default(365).notNull(),       // 从 aprStart 线性降到 aprEnd 的天数
  rewardDays: int("rewardDays").default(730).notNull(),              // (已停用·旧固定释放天数)
  alpha: decimal("alpha", { precision: 6, scale: 3 }).default("0.500").notNull(),     // (已停用·旧开方公平度)
  baseShare: decimal("baseShare", { precision: 6, scale: 3 }).default("0.200").notNull(), // (已停用·旧保底平分)
  vestMonths: int("vestMonths").default(12).notNull(),
  vestCliffMonths: int("vestCliffMonths").default(1).notNull(),
  startAt: timestamp("startAt"),
  endAt: timestamp("endAt"),
});
export type IcoConfigRow = typeof icoConfig.$inferSelect;

// 认购订单(USDT 充值 → 填哈希 → 运营确认 → 按当时曲线成交)
export const icoOrders = mysqlTable("ico_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  usdtAmount: decimal("usdtAmount", { precision: 20, scale: 6 }).notNull(),
  minTokens: decimal("minTokens", { precision: 30, scale: 8 }).default("0").notNull(), // 滑点保护:至少买到
  txHash: varchar("txHash", { length: 120 }),
  payAddress: varchar("payAddress", { length: 120 }),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
  purchaseId: int("purchaseId"),                                   // 确认后关联的成交流水
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
}, (t) => [index("idx_icoord_user").on(t.userId), index("idx_icoord_status").on(t.status)]);
export type IcoOrder = typeof icoOrders.$inferSelect;

// 每笔认购(不可变流水)
export const icoPurchases = mysqlTable("ico_purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  usdtAmount: decimal("usdtAmount", { precision: 20, scale: 6 }).notNull(),
  tokensBought: decimal("tokensBought", { precision: 30, scale: 8 }).notNull(),
  priceFrom: decimal("priceFrom", { precision: 18, scale: 8 }).notNull(),
  priceTo: decimal("priceTo", { precision: 18, scale: 8 }).notNull(),
  avgPrice: decimal("avgPrice", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_icopur_user").on(t.userId)]);
export type IcoPurchase = typeof icoPurchases.$inferSelect;

// 每用户 ICO 账户(锁仓/质押/收益聚合)
export const icoAccounts = mysqlTable("ico_accounts", {
  userId: int("userId").primaryKey(),
  lockedTotal: decimal("lockedTotal", { precision: 30, scale: 8 }).default("0").notNull(),       // 累计认购(全锁)
  withdrawnPrincipal: decimal("withdrawnPrincipal", { precision: 30, scale: 8 }).default("0").notNull(), // 已提取的释放本金
  stakedBalance: decimal("stakedBalance", { precision: 30, scale: 8 }).default("0").notNull(),   // 当前质押中(锁仓+未提)
  pendingReward: decimal("pendingReward", { precision: 30, scale: 8 }).default("0").notNull(),   // 待领质押收益
  claimedReward: decimal("claimedReward", { precision: 30, scale: 8 }).default("0").notNull(),
  autoCompound: boolean("autoCompound").default(true).notNull(),    // 释放本金不提则复投
  firstPurchaseAt: timestamp("firstPurchaseAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IcoAccount = typeof icoAccounts.$inferSelect;

// 质押批次(每笔成交/复投一条,各自计龄;收益按本批次年龄取年化;提取按 FIFO 减老批次)
export const icoStakeLots = mysqlTable("ico_stake_lots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),   // 本批次当前仍质押数量(FIFO 提取会减少)
  stakedAt: timestamp("stakedAt").notNull(),                          // 入场时间(年化计龄起点)
  source: mysqlEnum("source", ["purchase", "compound"]).default("purchase").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_icolot_user").on(t.userId)]);
export type IcoStakeLot = typeof icoStakeLots.$inferSelect;

// 质押收益每日结算日志(幂等)
export const icoRewardRuns = mysqlTable("ico_reward_runs", {
  id: int("id").autoincrement().primaryKey(),
  runDate: varchar("runDate", { length: 10 }).notNull(),           // YYYY-MM-DD
  stakers: int("stakers").default(0).notNull(),
  totalWeight: decimal("totalWeight", { precision: 40, scale: 8 }).default("0").notNull(),
  emitted: decimal("emitted", { precision: 30, scale: 8 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("uq_icorun_date").on(t.runDate)]);

// 用户意见反馈
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: varchar("content", { length: 1000 }).notNull(),
  contact: varchar("contact", { length: 120 }),                  // 可选联系方式
  appVersion: varchar("appVersion", { length: 24 }),
  platform: varchar("platform", { length: 16 }),
  status: mysqlEnum("status", ["new", "read", "resolved"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_feedback_user").on(t.userId), index("idx_feedback_status").on(t.status)]);
export type Feedback = typeof feedback.$inferSelect;

// ─── AI/USDT 二级市场 Swap(链下 x*y=k AMM)──────────────────────────────────────
// 单例池(id=1):储备金支撑的恒定乘积做市;认购完成后由 admin 用募集 USDT + AI 播种开市
export const aiAmmPool = mysqlTable("ai_amm_pool", {
  id: int("id").primaryKey(),
  // x*y=k 市价做市池
  aiReserve: decimal("aiReserve", { precision: 30, scale: 8 }).default("0").notNull(),
  usdtReserve: decimal("usdtReserve", { precision: 30, scale: 8 }).default("0").notNull(),
  // 储备地板(FloorAMM 逻辑):买入 θ 分流进 reserveR;地板价 F=reserveR/circulatingAi;跌到地板走 redeem 兜底
  reserveR: decimal("reserveR", { precision: 30, scale: 8 }).default("0").notNull(),
  circulatingAi: decimal("circulatingAi", { precision: 30, scale: 8 }).default("0").notNull(), // 市场净流通 AI(地板分母)
  crisisFund: decimal("crisisFund", { precision: 30, scale: 8 }).default("0").notNull(),         // 超额卖税注资;深跌补 reserveR
  divPool: decimal("divPool", { precision: 30, scale: 8 }).default("0").notNull(),               // 基础卖税累积(各档分红+技术费,分配走后续)
  // θ 买入分流(基点,早高晚低,按累计买入 USDT 递减)
  thetaStartBps: int("thetaStartBps").default(5200).notNull(),
  thetaEndBps: int("thetaEndBps").default(2700).notNull(),
  thetaHalfBuyUsdt: decimal("thetaHalfBuyUsdt", { precision: 30, scale: 8 }).default("100000").notNull(),
  cumBoughtUsdt: decimal("cumBoughtUsdt", { precision: 40, scale: 8 }).default("0").notNull(),
  // 动态卖税(基点):base→分红池,(税-base)→危机金;按距峰回撤 base→max
  baseTaxBps: int("baseTaxBps").default(500).notNull(),
  maxTaxBps: int("maxTaxBps").default(5000).notNull(),
  peakDecayPerDayBps: int("peakDecayPerDayBps").default(400).notNull(),
  peakPrice: decimal("peakPrice", { precision: 30, scale: 10 }).default("0").notNull(),
  peakUpdatedAt: timestamp("peakUpdatedAt"),
  dividendClaimsEnabled: boolean("dividendClaimsEnabled").default(false).notNull(), // 🔴 合规闸门:USDT持币分红=Howey,律师结论后才开
  seeded: boolean("seeded").default(false).notNull(),
  totalVolUsdt: decimal("totalVolUsdt", { precision: 40, scale: 8 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiAmmPool = typeof aiAmmPool.$inferSelect;

// 内部 USDT 充值(转账到官方地址 → 回填 txHash → admin 确认入账)
export const usdtDeposits = mysqlTable("usdt_deposits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),
  txHash: varchar("txHash", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
}, (t) => [index("idx_usdtdep_user").on(t.userId), index("idx_usdtdep_status").on(t.status)]);
export type UsdtDeposit = typeof usdtDeposits.$inferSelect;

// 内部 USDT 提现(申请即冻结/扣余额 → admin 打款填 txHash;驳回则退回)
export const usdtWithdrawals = mysqlTable("usdt_withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),
  address: varchar("address", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["pending", "done", "rejected"]).default("pending").notNull(),
  txHash: varchar("txHash", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (t) => [index("idx_usdtwd_user").on(t.userId), index("idx_usdtwd_status").on(t.status)]);
export type UsdtWithdrawal = typeof usdtWithdrawals.$inferSelect;

// 每笔成交(供 K线 OHLC 聚合 + 行情 + 最近成交)
export const aiSwapTrades = mysqlTable("ai_swap_trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  aiAmount: decimal("aiAmount", { precision: 30, scale: 8 }).notNull(),
  usdtAmount: decimal("usdtAmount", { precision: 30, scale: 8 }).notNull(),
  price: decimal("price", { precision: 30, scale: 10 }).notNull(),    // USDT per AI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_aiswap_time").on(t.createdAt)]);
export type AiSwapTrade = typeof aiSwapTrades.$inferSelect;
