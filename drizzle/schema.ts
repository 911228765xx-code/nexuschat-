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
