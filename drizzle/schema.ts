import {
  bigint,
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
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
  passwordHash: varchar("passwordHash", { length: 255 }),
  isBot: boolean("isBot").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

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
    messageType: mysqlEnum("messageType", ["text", "image", "file", "system"]).default("text").notNull(),
    mediaUrl: text("mediaUrl"),
    isEncrypted: boolean("isEncrypted").default(false).notNull(),
    isDeleted: boolean("isDeleted").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_group_messages").on(t.groupId, t.createdAt),
    index("idx_dm_messages").on(t.senderId, t.receiverId),
  ]
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

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
    tags: text("tags"),
    likeCount: int("likeCount").default(0).notNull(),
    commentCount: int("commentCount").default(0).notNull(),
    shareCount: int("shareCount").default(0).notNull(),
    aiScore: int("aiScore").default(0),
    reportId: int("reportId"),
    isPinned: boolean("isPinned").default(false).notNull(),
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
