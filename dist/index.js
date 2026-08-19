var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiAmmPool: () => aiAmmPool,
  aiDailyUsage: () => aiDailyUsage,
  aiSwapTrades: () => aiSwapTrades,
  appConfig: () => appConfig,
  bitRankAirdropClaim: () => bitRankAirdropClaim,
  bitRankAirdropRun: () => bitRankAirdropRun,
  calls: () => calls,
  chatGroups: () => chatGroups,
  consultingPayments: () => consultingPayments,
  consultingReports: () => consultingReports,
  contactMetadata: () => contactMetadata,
  contentViolations: () => contentViolations,
  conversationPrefs: () => conversationPrefs,
  copyTraderFollows: () => copyTraderFollows,
  copyTraders: () => copyTraders,
  curationStakes: () => curationStakes,
  devicePushTokens: () => devicePushTokens,
  feedback: () => feedback,
  friendRequests: () => friendRequests,
  groupAnnouncements: () => groupAnnouncements,
  groupBots: () => groupBots,
  groupFiles: () => groupFiles,
  groupInviteLinks: () => groupInviteLinks,
  groupJoinRequests: () => groupJoinRequests,
  groupMembers: () => groupMembers,
  groupMutes: () => groupMutes,
  groupUnreadCounts: () => groupUnreadCounts,
  icoAccounts: () => icoAccounts,
  icoConfig: () => icoConfig,
  icoOrders: () => icoOrders,
  icoPurchases: () => icoPurchases,
  icoRewardRuns: () => icoRewardRuns,
  icoStakeLots: () => icoStakeLots,
  itTransactions: () => itTransactions,
  messageReactions: () => messageReactions,
  messageReadReceipts: () => messageReadReceipts,
  messages: () => messages,
  nnNodeOrders: () => nnNodeOrders,
  nnPool: () => nnPool,
  nnPoolOrders: () => nnPoolOrders,
  nnTransactions: () => nnTransactions,
  nnVesting: () => nnVesting,
  notifications: () => notifications,
  partnerBonuses: () => partnerBonuses,
  partnerEarnings: () => partnerEarnings,
  partnerPayouts: () => partnerPayouts,
  partnerSettleRuns: () => partnerSettleRuns,
  passwordResetTokens: () => passwordResetTokens,
  platformFeeLedger: () => platformFeeLedger,
  postComments: () => postComments,
  postLikes: () => postLikes,
  posts: () => posts,
  priceAlerts: () => priceAlerts,
  promoBanners: () => promoBanners,
  pushSubscriptions: () => pushSubscriptions,
  rankAggRun: () => rankAggRun,
  redPacketClaims: () => redPacketClaims,
  redPackets: () => redPackets,
  referralMilestones: () => referralMilestones,
  referrals: () => referrals,
  researchReports: () => researchReports,
  swapHistory: () => swapHistory,
  tgeClaims: () => tgeClaims,
  tgeConfig: () => tgeConfig,
  tradingPositions: () => tradingPositions,
  tradingStrategies: () => tradingStrategies,
  usdtDeposits: () => usdtDeposits,
  usdtWithdrawals: () => usdtWithdrawals,
  userApiKeys: () => userApiKeys,
  userBlocklist: () => userBlocklist,
  userDailyNp: () => userDailyNp,
  userFollows: () => userFollows,
  userSettings: () => userSettings,
  userTasks: () => userTasks,
  userWatchlist: () => userWatchlist,
  users: () => users,
  voiceRooms: () => voiceRooms
});
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
  uniqueIndex
} from "drizzle-orm/mysql-core";
var users, userDailyNp, rankAggRun, bitRankAirdropRun, bitRankAirdropClaim, referralMilestones, calls, curationStakes, tgeConfig, tgeClaims, chatGroups, groupMembers, messages, conversationPrefs, groupJoinRequests, messageReactions, posts, postLikes, postComments, researchReports, priceAlerts, userTasks, notifications, userFollows, friendRequests, contactMetadata, userBlocklist, userWatchlist, tradingPositions, copyTraders, copyTraderFollows, tradingStrategies, userSettings, userApiKeys, referrals, swapHistory, passwordResetTokens, pushSubscriptions, devicePushTokens, groupUnreadCounts, groupInviteLinks, groupFiles, messageReadReceipts, groupMutes, appConfig, redPacketClaims, redPackets, groupAnnouncements, groupBots, nnNodeOrders, nnTransactions, itTransactions, nnPool, nnPoolOrders, aiDailyUsage, nnVesting, partnerBonuses, partnerPayouts, partnerEarnings, partnerSettleRuns, promoBanners, platformFeeLedger, contentViolations, consultingReports, consultingPayments, voiceRooms, icoConfig, icoOrders, icoPurchases, icoAccounts, icoStakeLots, icoRewardRuns, feedback, aiAmmPool, usdtDeposits, usdtWithdrawals, aiSwapTrades;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
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
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    }, (t3) => [index("idx_users_invite_code").on(t3.inviteCode), index("idx_users_device").on(t3.deviceId)]);
    userDailyNp = mysqlTable("user_daily_np", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      ymd: varchar("ymd", { length: 10 }).notNull(),
      // YYYY-MM-DD (UTC)
      earned: bigint("earned", { mode: "number" }).default(0).notNull()
    }, (t3) => [uniqueIndex("uniq_daily_np_user_ymd").on(t3.userId, t3.ymd)]);
    rankAggRun = mysqlTable("rank_agg_run", {
      id: int("id").autoincrement().primaryKey(),
      ymd: varchar("ymd", { length: 10 }).notNull(),
      processedAt: timestamp("processedAt").defaultNow().notNull()
    }, (t3) => [uniqueIndex("uniq_rank_agg_ymd").on(t3.ymd)]);
    bitRankAirdropRun = mysqlTable("bit_rank_airdrop_run", {
      id: int("id").autoincrement().primaryKey(),
      ymd: varchar("ymd", { length: 10 }).notNull(),
      monthIndex: int("monthIndex").default(0).notNull(),
      dailyPool: int("dailyPool").default(0).notNull(),
      paidUsers: int("paidUsers").default(0).notNull(),
      paidTotal: int("paidTotal").default(0).notNull(),
      processedAt: timestamp("processedAt").defaultNow().notNull()
    }, (t3) => [uniqueIndex("uniq_bit_rank_airdrop_ymd").on(t3.ymd)]);
    bitRankAirdropClaim = mysqlTable("bit_rank_airdrop_claim", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      ymd: varchar("ymd", { length: 10 }).notNull(),
      tier: int("tier").notNull(),
      itCost: int("itCost").notNull(),
      bitAmount: int("bitAmount").notNull(),
      claimedAt: timestamp("claimedAt").defaultNow().notNull()
    }, (t3) => [
      uniqueIndex("uniq_bit_airdrop_claim_user_ymd").on(t3.userId, t3.ymd)
    ]);
    referralMilestones = mysqlTable("referral_milestones", {
      id: int("id").autoincrement().primaryKey(),
      inviteeId: int("inviteeId").notNull(),
      milestone: varchar("milestone", { length: 40 }).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (t3) => [uniqueIndex("uniq_ref_milestone").on(t3.inviteeId, t3.milestone)]);
    calls = mysqlTable("calls", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
      direction: mysqlEnum("direction", ["long", "short"]).notNull(),
      // 看涨/看跌
      horizonHours: int("horizonHours").notNull(),
      // 时间窗（小时）
      entryPrice: varchar("entryPrice", { length: 40 }).notNull(),
      // 建仓价（字符串存，保精度）
      resolvedPrice: varchar("resolvedPrice", { length: 40 }),
      changeBp: int("changeBp"),
      // 结算涨跌（基点 = 万分比）
      status: mysqlEnum("status", ["pending", "win", "lose", "void"]).default("pending").notNull(),
      note: varchar("note", { length: 280 }),
      createdYmd: varchar("createdYmd", { length: 10 }).notNull(),
      // 当日 Call 限频用
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      resolveAt: timestamp("resolveAt").notNull(),
      resolvedAt: timestamp("resolvedAt")
    }, (t3) => [
      index("idx_calls_user").on(t3.userId),
      index("idx_calls_pending").on(t3.status, t3.resolveAt)
    ]);
    curationStakes = mysqlTable("curation_stakes", {
      id: int("id").autoincrement().primaryKey(),
      stakerId: int("stakerId").notNull(),
      callId: int("callId").notNull(),
      amount: int("amount").notNull(),
      // 质押 NP
      status: mysqlEnum("status", ["active", "won", "lost", "void"]).default("active").notNull(),
      payout: int("payout").default(0).notNull(),
      // 结算返还（含奖励）
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      settledAt: timestamp("settledAt")
    }, (t3) => [
      uniqueIndex("uniq_stake_user_call").on(t3.stakerId, t3.callId),
      index("idx_stake_call").on(t3.callId)
    ]);
    tgeConfig = mysqlTable("tge_config", {
      id: int("id").primaryKey(),
      // 固定 1
      enabled: boolean("enabled").default(false).notNull(),
      nnPool: bigint("nnPool", { mode: "number" }).default(0).notNull(),
      totalNpSnapshot: bigint("totalNpSnapshot", { mode: "number" }).default(0).notNull(),
      snapshotAt: timestamp("snapshotAt")
    });
    tgeClaims = mysqlTable("tge_claims", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      npSnapshot: bigint("npSnapshot", { mode: "number" }).notNull(),
      nnAmount: bigint("nnAmount", { mode: "number" }).default(0).notNull(),
      claimed: boolean("claimed").default(false).notNull(),
      claimedAt: timestamp("claimedAt")
    }, (t3) => [uniqueIndex("uniq_tge_user").on(t3.userId)]);
    chatGroups = mysqlTable("chat_groups", {
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
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    groupMembers = mysqlTable(
      "group_members",
      {
        id: int("id").autoincrement().primaryKey(),
        groupId: int("groupId").notNull(),
        userId: int("userId").notNull(),
        role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
        alias: varchar("alias", { length: 50 }),
        // 群昵称(本人在该群的显示名;空=用全局名)
        joinedAt: timestamp("joinedAt").defaultNow().notNull()
      },
      (t3) => [index("idx_group_user").on(t3.groupId, t3.userId)]
    );
    messages = mysqlTable(
      "messages",
      {
        id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
        groupId: int("groupId"),
        senderId: int("senderId").notNull(),
        receiverId: int("receiverId"),
        content: text("content").notNull(),
        messageType: mysqlEnum("messageType", ["text", "image", "file", "system", "redpacket", "transfer", "voice", "video", "contact", "voiceroom"]).default("text").notNull(),
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
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_group_messages").on(t3.groupId, t3.createdAt),
        index("idx_dm_messages").on(t3.senderId, t3.receiverId),
        index("idx_dm_unread").on(t3.receiverId, t3.isRead),
        index("idx_msg_expires").on(t3.expiresAt),
        index("idx_msg_pinned").on(t3.groupId, t3.isPinned)
      ]
    );
    conversationPrefs = mysqlTable(
      "conversation_prefs",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        convKey: varchar("convKey", { length: 40 }).notNull(),
        isMuted: boolean("isMuted").default(false).notNull(),
        isPinned: boolean("isPinned").default(false).notNull(),
        clearedBeforeId: bigint("clearedBeforeId", { mode: "number" }).default(0).notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [index("idx_convpref_user").on(t3.userId, t3.convKey)]
    );
    groupJoinRequests = mysqlTable(
      "group_join_requests",
      {
        id: int("id").autoincrement().primaryKey(),
        groupId: int("groupId").notNull(),
        userId: int("userId").notNull(),
        status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_gjr_group").on(t3.groupId, t3.status)]
    );
    messageReactions = mysqlTable(
      "message_reactions",
      {
        id: int("id").autoincrement().primaryKey(),
        messageId: bigint("messageId", { mode: "number" }).notNull(),
        userId: int("userId").notNull(),
        emoji: varchar("emoji", { length: 10 }).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_msg_reactions").on(t3.messageId, t3.userId, t3.emoji)
      ]
    );
    posts = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [index("idx_posts_author").on(t3.authorId, t3.createdAt)]
    );
    postLikes = mysqlTable(
      "post_likes",
      {
        id: int("id").autoincrement().primaryKey(),
        postId: int("postId").notNull(),
        userId: int("userId").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_post_user_like").on(t3.postId, t3.userId)]
    );
    postComments = mysqlTable(
      "post_comments",
      {
        id: int("id").autoincrement().primaryKey(),
        postId: int("postId").notNull(),
        authorId: int("authorId").notNull(),
        content: text("content").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_comments_post").on(t3.postId, t3.createdAt)]
    );
    researchReports = mysqlTable(
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
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_reports_user").on(t3.userId, t3.createdAt)]
    );
    priceAlerts = mysqlTable(
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
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_alerts_user").on(t3.userId)]
    );
    userTasks = mysqlTable(
      "user_tasks",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        taskType: varchar("taskType", { length: 50 }).notNull(),
        completedAt: timestamp("completedAt").defaultNow().notNull(),
        npEarned: int("npEarned").default(0).notNull()
      },
      (t3) => [index("idx_tasks_user_type").on(t3.userId, t3.taskType, t3.completedAt)]
    );
    notifications = mysqlTable(
      "notifications",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        // recipient
        type: mysqlEnum("type", ["like", "comment", "follow", "mention", "system"]).notNull(),
        fromUserId: int("fromUserId"),
        // who triggered it (null for system)
        fromUserName: varchar("fromUserName", { length: 100 }),
        fromUserAvatar: varchar("fromUserAvatar", { length: 200 }),
        postId: int("postId"),
        // related post (optional)
        content: varchar("content", { length: 500 }).notNull(),
        isRead: boolean("isRead").default(false).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_notif_user").on(t3.userId, t3.isRead, t3.createdAt)]
    );
    userFollows = mysqlTable(
      "user_follows",
      {
        id: int("id").autoincrement().primaryKey(),
        followerId: int("followerId").notNull(),
        // who is following
        followingId: int("followingId").notNull(),
        // who is being followed
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_follows_follower").on(t3.followerId),
        index("idx_follows_following").on(t3.followingId)
      ]
    );
    friendRequests = mysqlTable(
      "friend_requests",
      {
        id: int("id").autoincrement().primaryKey(),
        senderId: int("senderId").notNull(),
        receiverId: int("receiverId").notNull(),
        status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_friend_req_receiver").on(t3.receiverId, t3.status),
        index("idx_friend_req_sender").on(t3.senderId)
      ]
    );
    contactMetadata = mysqlTable(
      "contact_metadata",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        contactId: int("contactId").notNull(),
        isFavorite: boolean("isFavorite").default(false).notNull(),
        // 好友备注名（显示时替代对方昵称；与 note 描述区分）
        remarkName: varchar("remarkName", { length: 50 }),
        note: text("note"),
        tags: text("tags"),
        // JSON array of strings
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_contact_meta_user").on(t3.userId, t3.contactId)
      ]
    );
    userBlocklist = mysqlTable(
      "user_blocklist",
      {
        id: int("id").autoincrement().primaryKey(),
        blockerId: int("blockerId").notNull(),
        // 发起拉黑的人
        blockedId: int("blockedId").notNull(),
        // 被拉黑的人
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        uniqueIndex("uq_block_pair").on(t3.blockerId, t3.blockedId),
        index("idx_block_blocked").on(t3.blockedId)
      ]
    );
    userWatchlist = mysqlTable(
      "user_watchlist",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        tokenId: varchar("tokenId", { length: 100 }).notNull(),
        tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
        tokenName: varchar("tokenName", { length: 100 }).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_watchlist_user").on(t3.userId)
      ]
    );
    tradingPositions = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_positions_user").on(t3.userId, t3.status)
      ]
    );
    copyTraders = mysqlTable(
      "copy_traders",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        displayName: varchar("displayName", { length: 100 }).notNull(),
        avatar: varchar("avatar", { length: 10 }).default("\u{1F916}"),
        badge: mysqlEnum("badge", ["gold", "silver", "bronze", "none"]).default("none").notNull(),
        description: text("description"),
        riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("medium").notNull(),
        totalReturn: varchar("totalReturn", { length: 30 }).default("0"),
        winRate: int("winRate").default(0),
        trades30d: int("trades30d").default(0),
        maxDrawdown: varchar("maxDrawdown", { length: 30 }).default("0"),
        topPairs: text("topPairs"),
        // JSON array
        isActive: boolean("isActive").default(true).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_copy_traders_user").on(t3.userId)
      ]
    );
    copyTraderFollows = mysqlTable(
      "copy_trader_follows",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        traderId: int("traderId").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_ct_follows_user").on(t3.userId),
        index("idx_ct_follows_trader").on(t3.traderId)
      ]
    );
    tradingStrategies = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_strategies_user").on(t3.userId)
      ]
    );
    userSettings = mysqlTable(
      "user_settings",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull().unique(),
        showWallet: boolean("showWallet").default(false).notNull(),
        showActivity: boolean("showActivity").default(true).notNull(),
        showNFTs: boolean("showNFTs").default(true).notNull(),
        readReceipts: boolean("readReceipts").default(true).notNull(),
        profileVisible: boolean("profileVisible").default(true).notNull(),
        // 仅好友可私信我(默认关=任意人可私信,兼顾拉新;开=陌生人私信被拒)。线上列由 schemaPatches 启动时幂等补齐
        dmOnlyFriends: boolean("dmOnlyFriends").default(false).notNull(),
        twoFAEnabled: boolean("twoFAEnabled").default(false).notNull(),
        biometricEnabled: boolean("biometricEnabled").default(false).notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      }
    );
    userApiKeys = mysqlTable(
      "user_api_keys",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        keyPrefix: varchar("keyPrefix", { length: 10 }).notNull(),
        // "nx_sk_" + first 4 chars
        keyHash: varchar("keyHash", { length: 128 }).notNull(),
        // SHA-256 hash
        label: varchar("label", { length: 100 }).default("Default"),
        isActive: boolean("isActive").default(true).notNull(),
        lastUsedAt: timestamp("lastUsedAt"),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_api_keys_user").on(t3.userId)
      ]
    );
    referrals = mysqlTable(
      "referrals",
      {
        id: int("id").autoincrement().primaryKey(),
        referrerId: int("referrerId").notNull(),
        // the user who invited
        inviteeId: int("inviteeId").notNull(),
        // the user who was invited
        status: mysqlEnum("status", ["pending", "active"]).default("pending").notNull(),
        referrerReward: int("referrerReward").default(0).notNull(),
        // NP rewarded to referrer
        inviteeReward: int("inviteeReward").default(0).notNull(),
        // NP rewarded to invitee
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        activatedAt: timestamp("activatedAt")
      },
      (t3) => [
        index("idx_referrals_referrer").on(t3.referrerId),
        index("idx_referrals_invitee").on(t3.inviteeId)
      ]
    );
    swapHistory = mysqlTable(
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
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_swap_user").on(t3.userId, t3.createdAt)]
    );
    passwordResetTokens = mysqlTable(
      "password_reset_tokens",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        token: varchar("token", { length: 128 }).notNull().unique(),
        expiresAt: timestamp("expiresAt").notNull(),
        usedAt: timestamp("usedAt"),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_reset_token").on(t3.token)]
    );
    pushSubscriptions = mysqlTable(
      "push_subscriptions",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        endpoint: text("endpoint").notNull(),
        p256dh: text("p256dh").notNull(),
        auth: varchar("auth", { length: 100 }).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_push_user").on(t3.userId)]
    );
    devicePushTokens = mysqlTable(
      "device_push_tokens",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        token: varchar("token", { length: 255 }).notNull(),
        platform: varchar("platform", { length: 16 }).default("android").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().notNull()
      },
      (t3) => [uniqueIndex("uniq_device_push_token").on(t3.token), index("idx_device_push_user").on(t3.userId)]
    );
    groupUnreadCounts = mysqlTable(
      "group_unread_counts",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        groupId: int("groupId").notNull(),
        lastReadMessageId: bigint("lastReadMessageId", { mode: "number" }).default(0).notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [index("idx_unread_user_group").on(t3.userId, t3.groupId)]
    );
    groupInviteLinks = mysqlTable(
      "group_invite_links",
      {
        id: int("id").autoincrement().primaryKey(),
        groupId: int("groupId").notNull(),
        creatorId: int("creatorId").notNull(),
        token: varchar("token", { length: 64 }).notNull().unique(),
        maxUses: int("maxUses").default(0).notNull(),
        // 0 = unlimited
        useCount: int("useCount").default(0).notNull(),
        expiresAt: timestamp("expiresAt"),
        isActive: boolean("isActive").default(true).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_invite_token").on(t3.token),
        index("idx_invite_group").on(t3.groupId)
      ]
    );
    groupFiles = mysqlTable(
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
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_files_group").on(t3.groupId),
        index("idx_files_uploader").on(t3.uploaderId)
      ]
    );
    messageReadReceipts = mysqlTable(
      "message_read_receipts",
      {
        id: int("id").autoincrement().primaryKey(),
        messageId: bigint("messageId", { mode: "number" }).notNull(),
        groupId: int("groupId").notNull(),
        userId: int("userId").notNull(),
        readAt: timestamp("readAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_receipts_message").on(t3.messageId),
        index("idx_receipts_user_group").on(t3.userId, t3.groupId)
      ]
    );
    groupMutes = mysqlTable(
      "group_mutes",
      {
        id: int("id").autoincrement().primaryKey(),
        groupId: int("groupId").notNull(),
        userId: int("userId").notNull(),
        mutedBy: int("mutedBy").notNull(),
        expiresAt: timestamp("expiresAt"),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_mutes_group_user").on(t3.groupId, t3.userId)]
    );
    appConfig = mysqlTable("app_config", {
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
      // 发现页「社区生态」仪表盘：展示加成 + 额外指标行（JSON，见 stats router）
      dashboardConfig: text("dashboardConfig"),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    redPacketClaims = mysqlTable(
      "red_packet_claims",
      {
        id: int("id").autoincrement().primaryKey(),
        messageId: bigint("messageId", { mode: "number" }).notNull(),
        // 群红包为群 id；私信红包为 null
        groupId: int("groupId"),
        claimedBy: int("claimedBy").notNull(),
        // 该次抢到的 NP 金额
        amount: int("amount").default(0).notNull(),
        claimedAt: timestamp("claimedAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_rpc_message").on(t3.messageId),
        index("idx_rpc_claimer").on(t3.messageId, t3.claimedBy)
      ]
    );
    redPackets = mysqlTable(
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
        blessing: varchar("blessing", { length: 100 }).default("\u606D\u559C\u53D1\u8D22\uFF0C\u5927\u5409\u5927\u5229").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [
        index("idx_rp_message").on(t3.messageId),
        index("idx_rp_group").on(t3.groupId)
      ]
    );
    groupAnnouncements = mysqlTable(
      "group_announcements",
      {
        id: int("id").autoincrement().primaryKey(),
        groupId: int("groupId").notNull(),
        content: text("content").notNull(),
        createdBy: int("createdBy").notNull(),
        isPinned: boolean("isPinned").default(true).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [index("idx_ann_group").on(t3.groupId, t3.isPinned)]
    );
    groupBots = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [index("idx_groupbots").on(t3.groupId, t3.botType)]
    );
    nnNodeOrders = mysqlTable(
      "nn_node_orders",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        tier: varchar("tier", { length: 20 }).notNull(),
        // genesis/super/standard
        usdtAmount: int("usdtAmount").notNull(),
        // 应付 USDT（整数）
        nnAmount: int("nnAmount").notNull(),
        // 认购获得 NN
        // pending(待支付/待确认) / confirmed(已确认发放) / cancelled
        status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
        txHash: varchar("txHash", { length: 120 }),
        // 用户回填的链上转账哈希
        payAddress: varchar("payAddress", { length: 120 }),
        // 下单时的收款地址快照
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        confirmedAt: timestamp("confirmedAt")
      },
      (t3) => [index("idx_nodeorder_user").on(t3.userId), index("idx_nodeorder_status").on(t3.status)]
    );
    nnTransactions = mysqlTable(
      "nn_transactions",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        amount: int("amount").notNull(),
        // 有符号：负=支出，正=收入
        type: varchar("type", { length: 30 }).notNull(),
        // bot_sub/package/node/grant/...
        refType: varchar("refType", { length: 20 }),
        // group/order/admin...
        refId: int("refId"),
        memo: varchar("memo", { length: 200 }),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_nntx_user").on(t3.userId, t3.createdAt), index("idx_nntx_type").on(t3.type)]
    );
    itTransactions = mysqlTable(
      "it_transactions",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        amount: int("amount").notNull(),
        type: varchar("type", { length: 30 }).notNull(),
        refType: varchar("refType", { length: 20 }),
        refId: int("refId"),
        memo: varchar("memo", { length: 200 }),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_ittx_user").on(t3.userId, t3.createdAt)]
    );
    nnPool = mysqlTable("nn_pool", {
      id: int("id").primaryKey(),
      // 固定 1
      reserveNN: bigint("reserveNN", { mode: "number" }).default(0).notNull(),
      // 可售储备
      soldNN: bigint("soldNN", { mode: "number" }).default(0).notNull(),
      // 已售出
      priceNnPerUsdt: int("priceNnPerUsdt").default(20).notNull(),
      // 1 USDT = N 个 NN
      raisedUsdt: bigint("raisedUsdt", { mode: "number" }).default(0).notNull(),
      // 累计募集 USDT
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    nnPoolOrders = mysqlTable(
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
        confirmedAt: timestamp("confirmedAt")
      },
      (t3) => [index("idx_poolorder_user").on(t3.userId), index("idx_poolorder_status").on(t3.status)]
    );
    aiDailyUsage = mysqlTable(
      "ai_daily_usage",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        day: varchar("day", { length: 10 }).notNull(),
        // YYYY-MM-DD
        count: int("count").default(0).notNull()
      },
      (t3) => [index("idx_aiusage_user_day").on(t3.userId, t3.day)]
    );
    nnVesting = mysqlTable(
      "nn_vesting",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        source: varchar("source", { length: 20 }).notNull(),
        // node/team/...
        refId: int("refId"),
        // 关联订单 id
        totalNN: int("totalNN").notNull(),
        claimedNN: int("claimedNN").default(0).notNull(),
        startAt: timestamp("startAt").notNull(),
        cliffMonths: int("cliffMonths").default(0).notNull(),
        durationMonths: int("durationMonths").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_vesting_user").on(t3.userId)]
    );
    partnerBonuses = mysqlTable(
      "partner_bonuses",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        orderId: int("orderId").notNull(),
        // 关联 nn_node_orders.id
        totalUsdt: int("totalUsdt").notNull(),
        // 奖励总额（USDT 整数）
        periods: int("periods").default(6).notNull(),
        // 解锁期数（月）
        claimedPeriods: int("claimedPeriods").default(0).notNull(),
        claimedUsdt: int("claimedUsdt").default(0).notNull(),
        startAt: timestamp("startAt").notNull(),
        // 解锁起算时间（确认到账时刻）
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_pbonus_user").on(t3.userId)]
    );
    partnerPayouts = mysqlTable(
      "partner_payouts",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        bonusId: int("bonusId").notNull(),
        period: int("period").notNull(),
        // 第几期（1..periods）
        amountUsdt: int("amountUsdt").notNull(),
        address: varchar("address", { length: 120 }).notNull(),
        // 收款地址
        status: mysqlEnum("status", ["pending", "paid", "rejected"]).default("pending").notNull(),
        txHash: varchar("txHash", { length: 120 }),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        paidAt: timestamp("paidAt")
      },
      (t3) => [
        index("idx_ppayout_user").on(t3.userId),
        index("idx_ppayout_status").on(t3.status),
        uniqueIndex("uniq_ppayout_bonus_period").on(t3.bonusId, t3.period)
        // 防同期重复申请
      ]
    );
    partnerEarnings = mysqlTable(
      "partner_earnings",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        kind: mysqlEnum("kind", ["fee", "revenue"]).notNull(),
        amountNN: int("amountNN").notNull(),
        ymd: varchar("ymd", { length: 10 }).notNull(),
        // 结算自然日（UTC）
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_pearn_user").on(t3.userId, t3.createdAt), index("idx_pearn_ymd").on(t3.ymd)]
    );
    partnerSettleRuns = mysqlTable(
      "partner_settle_runs",
      {
        id: int("id").autoincrement().primaryKey(),
        ymd: varchar("ymd", { length: 10 }).notNull(),
        kind: varchar("kind", { length: 10 }).notNull(),
        // fee / revenue
        poolNN: int("poolNN").default(0).notNull(),
        // 当次入池总额（审计）
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [uniqueIndex("uniq_psettle_ymd_kind").on(t3.ymd, t3.kind)]
    );
    promoBanners = mysqlTable(
      "promo_banners",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        text: varchar("text", { length: 80 }).notNull(),
        // 广告文案（经内容审核）
        targetType: mysqlEnum("targetType", ["group", "post", "none"]).default("none").notNull(),
        targetId: int("targetId"),
        // 跳转目标（自己的公开群/动态）
        status: mysqlEnum("status", ["active", "removed"]).default("active").notNull(),
        expiresAt: timestamp("expiresAt").notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_pbanner_status").on(t3.status, t3.expiresAt), index("idx_pbanner_user").on(t3.userId)]
    );
    platformFeeLedger = mysqlTable(
      "platform_fee_ledger",
      {
        id: int("id").autoincrement().primaryKey(),
        baseNN: int("baseNN").notNull(),
        // 交易基数（NN）
        poolNN: int("poolNN").notNull(),
        // 入池额 = baseNN × 3.7%
        source: varchar("source", { length: 30 }).notNull(),
        // 手续费来源（redpacket/transfer/trade/...）
        settled: boolean("settled").default(false).notNull(),
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_pfee_settled").on(t3.settled)]
    );
    contentViolations = mysqlTable(
      "content_violations",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("userId").notNull(),
        category: varchar("category", { length: 20 }).notNull(),
        // drugs/gambling/trafficking/...
        source: varchar("source", { length: 20 }).notNull(),
        // group/dm/post
        snippet: varchar("snippet", { length: 200 }),
        // 命中内容片段（截断）
        createdAt: timestamp("createdAt").defaultNow().notNull()
      },
      (t3) => [index("idx_violation_user").on(t3.userId, t3.createdAt)]
    );
    consultingReports = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_consulting_user").on(t3.userId),
        index("idx_consulting_cache").on(t3.cacheKey),
        index("idx_consulting_tx").on(t3.txHash)
      ]
    );
    consultingPayments = mysqlTable(
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
        updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
      },
      (t3) => [
        index("idx_cpay_report").on(t3.reportId),
        index("idx_cpay_user").on(t3.userId),
        index("idx_cpay_tx").on(t3.txHash)
      ]
    );
    voiceRooms = mysqlTable(
      "voice_rooms",
      {
        id: int("id").autoincrement().primaryKey(),
        roomId: int("roomId").notNull(),
        // TRTC 数字房间号（进房用）
        title: varchar("title", { length: 60 }).notNull(),
        topic: varchar("topic", { length: 80 }),
        category: mysqlEnum("category", ["trade", "study", "project", "chat"]).default("chat").notNull(),
        hostUserId: int("hostUserId").notNull(),
        isMembersOnly: boolean("isMembersOnly").default(false).notNull(),
        isPublic: boolean("isPublic").default(true).notNull(),
        // 公开=语音房广场可见；私密=仅分享进入
        status: mysqlEnum("status", ["live", "ended"]).default("live").notNull(),
        speakerCount: int("speakerCount").default(1).notNull(),
        // 麦上人数（含房主）
        listenerCount: int("listenerCount").default(0).notNull(),
        // 听众数
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        endedAt: timestamp("endedAt")
      },
      (t3) => [
        uniqueIndex("uq_vroom_roomid").on(t3.roomId),
        index("idx_vroom_status").on(t3.status, t3.createdAt),
        index("idx_vroom_host").on(t3.hostUserId)
      ]
    );
    icoConfig = mysqlTable("ico_config", {
      id: int("id").primaryKey(),
      // 固定 1
      totalTokens: decimal("totalTokens", { precision: 30, scale: 8 }).notNull(),
      // 认购总额度 Q
      tokensSold: decimal("tokensSold", { precision: 30, scale: 8 }).default("0").notNull(),
      startPrice: decimal("startPrice", { precision: 18, scale: 8 }).notNull(),
      // 0.8
      endPrice: decimal("endPrice", { precision: 18, scale: 8 }).notNull(),
      // 2.0 封顶
      exponent: decimal("exponent", { precision: 8, scale: 4 }).default("1.5000").notNull(),
      listingPrice: decimal("listingPrice", { precision: 18, scale: 8 }).default("3").notNull(),
      // 预计上线价
      status: mysqlEnum("status", ["paused", "active", "ended"]).default("paused").notNull(),
      perWalletCap: decimal("perWalletCap", { precision: 30, scale: 8 }).default("0").notNull(),
      // 单钱包上限(0=不限)
      // 质押奖励池(线性·每人目标年化·封顶·年化可线性递减·可随时调)
      rewardPoolTotal: decimal("rewardPoolTotal", { precision: 30, scale: 8 }).default("0").notNull(),
      rewardEmitted: decimal("rewardEmitted", { precision: 30, scale: 8 }).default("0").notNull(),
      aprStart: decimal("aprStart", { precision: 8, scale: 4 }).default("1.0000").notNull(),
      // 起始年化(1=100%)
      aprEnd: decimal("aprEnd", { precision: 8, scale: 4 }).default("1.0000").notNull(),
      // 结束年化(线性降到此值;=aprStart 则恒定)
      aprDeclineDays: int("aprDeclineDays").default(365).notNull(),
      // 从 aprStart 线性降到 aprEnd 的天数
      rewardDays: int("rewardDays").default(730).notNull(),
      // (已停用·旧固定释放天数)
      alpha: decimal("alpha", { precision: 6, scale: 3 }).default("0.500").notNull(),
      // (已停用·旧开方公平度)
      baseShare: decimal("baseShare", { precision: 6, scale: 3 }).default("0.200").notNull(),
      // (已停用·旧保底平分)
      vestMonths: int("vestMonths").default(12).notNull(),
      vestCliffMonths: int("vestCliffMonths").default(1).notNull(),
      startAt: timestamp("startAt"),
      endAt: timestamp("endAt")
    });
    icoOrders = mysqlTable("ico_orders", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      usdtAmount: decimal("usdtAmount", { precision: 20, scale: 6 }).notNull(),
      minTokens: decimal("minTokens", { precision: 30, scale: 8 }).default("0").notNull(),
      // 滑点保护:至少买到
      txHash: varchar("txHash", { length: 120 }),
      payAddress: varchar("payAddress", { length: 120 }),
      status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
      purchaseId: int("purchaseId"),
      // 确认后关联的成交流水
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      confirmedAt: timestamp("confirmedAt")
    }, (t3) => [
      index("idx_icoord_user").on(t3.userId),
      index("idx_icoord_status").on(t3.status),
      uniqueIndex("uq_icoord_tx").on(t3.txHash)
    ]);
    icoPurchases = mysqlTable("ico_purchases", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      usdtAmount: decimal("usdtAmount", { precision: 20, scale: 6 }).notNull(),
      tokensBought: decimal("tokensBought", { precision: 30, scale: 8 }).notNull(),
      priceFrom: decimal("priceFrom", { precision: 18, scale: 8 }).notNull(),
      priceTo: decimal("priceTo", { precision: 18, scale: 8 }).notNull(),
      avgPrice: decimal("avgPrice", { precision: 18, scale: 8 }).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (t3) => [index("idx_icopur_user").on(t3.userId)]);
    icoAccounts = mysqlTable("ico_accounts", {
      userId: int("userId").primaryKey(),
      lockedTotal: decimal("lockedTotal", { precision: 30, scale: 8 }).default("0").notNull(),
      // 累计认购(全锁)
      withdrawnPrincipal: decimal("withdrawnPrincipal", { precision: 30, scale: 8 }).default("0").notNull(),
      // 已提取的释放本金
      stakedBalance: decimal("stakedBalance", { precision: 30, scale: 8 }).default("0").notNull(),
      // 当前质押中(锁仓+未提)
      pendingReward: decimal("pendingReward", { precision: 30, scale: 8 }).default("0").notNull(),
      // 待领质押收益
      claimedReward: decimal("claimedReward", { precision: 30, scale: 8 }).default("0").notNull(),
      autoCompound: boolean("autoCompound").default(true).notNull(),
      // 释放本金不提则复投
      firstPurchaseAt: timestamp("firstPurchaseAt"),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    icoStakeLots = mysqlTable("ico_stake_lots", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),
      // 本批次当前仍质押数量(FIFO 提取会减少)
      stakedAt: timestamp("stakedAt").notNull(),
      // 入场时间(年化计龄起点)
      source: mysqlEnum("source", ["purchase", "compound"]).default("purchase").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (t3) => [index("idx_icolot_user").on(t3.userId)]);
    icoRewardRuns = mysqlTable("ico_reward_runs", {
      id: int("id").autoincrement().primaryKey(),
      runDate: varchar("runDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      stakers: int("stakers").default(0).notNull(),
      totalWeight: decimal("totalWeight", { precision: 40, scale: 8 }).default("0").notNull(),
      emitted: decimal("emitted", { precision: 30, scale: 8 }).default("0").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (t3) => [uniqueIndex("uq_icorun_date").on(t3.runDate)]);
    feedback = mysqlTable("feedback", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      content: varchar("content", { length: 1e3 }).notNull(),
      contact: varchar("contact", { length: 120 }),
      // 可选联系方式
      appVersion: varchar("appVersion", { length: 24 }),
      platform: varchar("platform", { length: 16 }),
      status: mysqlEnum("status", ["new", "read", "resolved"]).default("new").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (t3) => [index("idx_feedback_user").on(t3.userId), index("idx_feedback_status").on(t3.status)]);
    aiAmmPool = mysqlTable("ai_amm_pool", {
      id: int("id").primaryKey(),
      // x*y=k 市价做市池
      aiReserve: decimal("aiReserve", { precision: 30, scale: 8 }).default("0").notNull(),
      usdtReserve: decimal("usdtReserve", { precision: 30, scale: 8 }).default("0").notNull(),
      // 储备地板(FloorAMM 逻辑):买入 θ 分流进 reserveR;地板价 F=reserveR/circulatingAi;跌到地板走 redeem 兜底
      reserveR: decimal("reserveR", { precision: 30, scale: 8 }).default("0").notNull(),
      circulatingAi: decimal("circulatingAi", { precision: 30, scale: 8 }).default("0").notNull(),
      // 市场净流通 AI(地板分母)
      crisisFund: decimal("crisisFund", { precision: 30, scale: 8 }).default("0").notNull(),
      // 超额卖税注资;深跌补 reserveR
      divPool: decimal("divPool", { precision: 30, scale: 8 }).default("0").notNull(),
      // 基础卖税累积(各档分红+技术费,分配走后续)
      // θ 买入分流(基点,早高晚低,按累计买入 USDT 递减)
      thetaStartBps: int("thetaStartBps").default(5200).notNull(),
      thetaEndBps: int("thetaEndBps").default(2700).notNull(),
      thetaHalfBuyUsdt: decimal("thetaHalfBuyUsdt", { precision: 30, scale: 8 }).default("100000").notNull(),
      cumBoughtUsdt: decimal("cumBoughtUsdt", { precision: 40, scale: 8 }).default("0").notNull(),
      // 动态卖税(基点):base→分红池,(税-base)→危机金;按距峰回撤 base→max
      baseTaxBps: int("baseTaxBps").default(500).notNull(),
      maxTaxBps: int("maxTaxBps").default(5e3).notNull(),
      peakDecayPerDayBps: int("peakDecayPerDayBps").default(400).notNull(),
      peakPrice: decimal("peakPrice", { precision: 30, scale: 10 }).default("0").notNull(),
      peakUpdatedAt: timestamp("peakUpdatedAt"),
      dividendClaimsEnabled: boolean("dividendClaimsEnabled").default(false).notNull(),
      // 🔴 合规闸门:USDT持币分红=Howey,律师结论后才开
      seeded: boolean("seeded").default(false).notNull(),
      totalVolUsdt: decimal("totalVolUsdt", { precision: 40, scale: 8 }).default("0").notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    usdtDeposits = mysqlTable("usdt_deposits", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),
      txHash: varchar("txHash", { length: 120 }).notNull(),
      status: mysqlEnum("status", ["pending", "confirmed", "rejected"]).default("pending").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      confirmedAt: timestamp("confirmedAt")
    }, (t3) => [
      index("idx_usdtdep_user").on(t3.userId),
      index("idx_usdtdep_status").on(t3.status),
      uniqueIndex("uq_usdtdep_tx").on(t3.txHash)
    ]);
    usdtWithdrawals = mysqlTable("usdt_withdrawals", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),
      address: varchar("address", { length: 80 }).notNull(),
      status: mysqlEnum("status", ["pending", "done", "rejected"]).default("pending").notNull(),
      txHash: varchar("txHash", { length: 120 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      processedAt: timestamp("processedAt")
    }, (t3) => [index("idx_usdtwd_user").on(t3.userId), index("idx_usdtwd_status").on(t3.status)]);
    aiSwapTrades = mysqlTable("ai_swap_trades", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      side: mysqlEnum("side", ["buy", "sell"]).notNull(),
      aiAmount: decimal("aiAmount", { precision: 30, scale: 8 }).notNull(),
      usdtAmount: decimal("usdtAmount", { precision: 30, scale: 8 }).notNull(),
      price: decimal("price", { precision: 30, scale: 10 }).notNull(),
      // USDT per AI
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (t3) => [index("idx_aiswap_time").on(t3.createdAt)]);
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      resendApiKey: process.env.RESEND_API_KEY ?? "",
      turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
      /** LiveKit 语音房：livekit.cloud 项目设置拿 API Key/Secret + WS URL（密钥仅服务端，绝不下发客户端） */
      livekitUrl: process.env.LIVEKIT_URL ?? "",
      // wss://xxx.livekit.cloud
      livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
      livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
      /** Comma-separated list of extra origins allowed to send credentialed cross-origin requests. */
      allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      /** Number of trusted reverse proxies/CDN hops in front of the app (for real client IP). */
      trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "1", 10) || 0,
      /**
       * 对外公网域名(拼绝对链接专用:更新下载地址/邀请链接/上传媒体 URL)。
       * ⚠️ 不能用 req.get("host"):Cloudflare→Cloud Run 架构下 Express 看到的 Host 是
       * *.a.run.app(Google 域名,大陆被墙),拼出去的链接国内用户全打不开。
       */
      publicOrigin: (process.env.PUBLIC_ORIGIN ?? "https://nexuschat.best").replace(/\/+$/, ""),
      /**
       * app_config 被误配成本站 /apk 或 /download 时的应急真实 APK 源。
       * 正常发布仍以数据库 downloadUrlAndroid 为准；此值只负责防止下载链路整体熔断。
       */
      androidApkFallbackUrl: process.env.ANDROID_APK_FALLBACK_URL?.trim() || "https://expo.dev/artifacts/eas/78Y8WC0yA6facXvoJT-byD38-Hk0neS09ze6DUjYBC8.apk"
    };
    if (ENV.isProduction && (!ENV.cookieSecret || ENV.cookieSecret.length < 16)) {
      throw new Error("[FATAL] JWT_SECRET \u672A\u914D\u7F6E\u6216\u8FC7\u77ED(\u9700 \u226516 \u5B57\u8282):\u4F1A\u8BDD\u7B7E\u540D\u5BC6\u94A5\u7F3A\u5931\u4F1A\u5BFC\u81F4\u4F1A\u8BDD\u53EF\u88AB\u4F2A\u9020,\u62D2\u7EDD\u542F\u52A8\u3002");
    }
  }
});

// server/utils/logger.ts
import pino from "pino";
var logger, logger_default;
var init_logger = __esm({
  "server/utils/logger.ts"() {
    "use strict";
    logger = pino({
      level: process.env.LOG_LEVEL || "info",
      transport: process.env.NODE_ENV === "development" ? { target: "pino/file", options: { destination: 1 } } : void 0,
      formatters: {
        level(label) {
          return { level: label };
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime
    });
    logger_default = logger;
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  getDb: () => getDb,
  getUserByOpenId: () => getUserByOpenId,
  resetDbPool: () => resetDbPool,
  upsertUser: () => upsertUser,
  withDbRetry: () => withDbRetry
});
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
function resetDbPool() {
  _db = null;
  logger_default.warn("Database: Instance reset \u2014 will reconnect on next query");
}
async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!_db) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      logger_default.info("Database: Connected");
    } catch (error) {
      logger_default.warn({ err: error }, "Database: Failed to connect");
      _db = null;
    }
  }
  return _db;
}
async function withDbRetry(fn, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const db = await getDb();
    if (!db) return null;
    try {
      return await fn(db);
    } catch (err) {
      const isConnErr = err instanceof Error && (err.message.includes("ECONNRESET") || err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT") || err.message.includes("Connection lost"));
      if (isConnErr && attempt < retries) {
        logger_default.warn({ attempt, err }, "Database: Connection error, resetting pool and retrying");
        resetDbPool();
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return null;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    logger_default.warn("Database: Cannot upsert user \u2014 database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    logger_default.error({ err: error }, "Database: Failed to upsert user");
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    logger_default.warn("Database: Cannot get user \u2014 database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_logger();
    _db = null;
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
async function buildDownloadUrl(baseUrl, relKey, apiKey) {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey)
  });
  return (await response.json()).url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
async function storageGet(relKey) {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey)
  };
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/appAdmin.ts
function isAppAdmin(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (typeof user.id === "number" && APP_ADMIN_IDS.has(user.id)) return true;
  return false;
}
var APP_ADMIN_IDS;
var init_appAdmin = __esm({
  "server/appAdmin.ts"() {
    "use strict";
    APP_ADMIN_IDS = /* @__PURE__ */ new Set([180826]);
  }
});

// server/token.ts
import { eq as eq4, sql, desc, and as and3, gte, inArray } from "drizzle-orm";
async function recordTx(db, userId, amount, meta) {
  try {
    await db.insert(nnTransactions).values({
      userId,
      amount,
      type: meta.type,
      refType: meta.refType ?? null,
      refId: meta.refId ?? null,
      memo: meta.memo ?? null
    });
  } catch (e) {
    console.error("[recordTx] \u6D41\u6C34\u5199\u5165\u5931\u8D25(\u4F59\u989D\u5DF2\u53D8,\u8D26\u672C\u7F3A\u5931):", { userId, amount, type: meta.type, refType: meta.refType, refId: meta.refId, err: e?.message });
  }
}
function getNodeTier(key) {
  return NN_NODE_TIERS.find((t3) => t3.key === key);
}
function getTokenomics() {
  return {
    symbol: NN_SYMBOL,
    name: NN_NAME,
    totalSupply: NN_TOTAL_SUPPLY,
    allocation: NN_ALLOCATION
  };
}
async function getCirculating(db) {
  const [r] = await db.select({ s: sql`COALESCE(SUM(${users.nnBalance}), 0)` }).from(users);
  return Number(r?.s ?? 0);
}
async function getTokenInfo(db, userId) {
  const circulating = await getCirculating(db);
  let myBalance = 0;
  if (userId) {
    const [u] = await db.select({ b: users.nnBalance }).from(users).where(eq4(users.id, userId)).limit(1);
    myBalance = Number(u?.b ?? 0);
  }
  return {
    symbol: NN_SYMBOL,
    name: NN_NAME,
    totalSupply: NN_TOTAL_SUPPLY,
    circulating,
    treasury: Math.max(0, NN_TOTAL_SUPPLY - circulating),
    myBalance
  };
}
async function spendNN(db, userId, amount, meta) {
  if (amount <= 0) return true;
  const res = await db.update(users).set({ nnBalance: sql`${users.nnBalance} - ${amount}` }).where(sql`${users.id} = ${userId} AND ${users.nnBalance} >= ${amount}`);
  const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  if (affected2 > 0) await recordTx(db, userId, -amount, meta ?? { type: "spend" });
  return affected2 > 0;
}
async function grantNN(db, userId, amount, meta) {
  if (amount <= 0) return false;
  const circulating = await getCirculating(db);
  if (circulating + amount > NN_TOTAL_SUPPLY) return false;
  await db.update(users).set({ nnBalance: sql`${users.nnBalance} + ${amount}` }).where(eq4(users.id, userId));
  await recordTx(db, userId, amount, meta ?? { type: "grant" });
  return true;
}
async function transferNN(db, fromUserId, toUserId, amount, memo) {
  if (amount <= 0 || fromUserId === toUserId) return false;
  try {
    await db.transaction(async (tx) => {
      const res = await tx.update(users).set({ nnBalance: sql`${users.nnBalance} - ${amount}` }).where(sql`${users.id} = ${fromUserId} AND ${users.nnBalance} >= ${amount}`);
      const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
      if (affected2 <= 0) throw new Error("INSUFFICIENT");
      await tx.update(users).set({ nnBalance: sql`${users.nnBalance} + ${amount}` }).where(eq4(users.id, toUserId));
      await tx.insert(nnTransactions).values({
        userId: fromUserId,
        amount: -amount,
        type: "transfer_out",
        refType: "user",
        refId: toUserId,
        memo: memo ?? `to#${toUserId}`
      });
      await tx.insert(nnTransactions).values({
        userId: toUserId,
        amount,
        type: "transfer_in",
        refType: "user",
        refId: fromUserId,
        memo: memo ?? `from#${fromUserId}`
      });
    });
    return true;
  } catch (e) {
    if (e?.message === "INSUFFICIENT") return false;
    console.error("[transferNN] failed:", e?.message);
    return false;
  }
}
function vestedAmount(v, now = Date.now()) {
  const elapsedMonths = (now - v.startAt.getTime()) / MONTH_MS;
  if (elapsedMonths < v.cliffMonths) return 0;
  if (elapsedMonths >= v.durationMonths) return v.totalNN;
  return Math.floor(v.totalNN * elapsedMonths / v.durationMonths);
}
async function createVesting(db, userId, source, refId, totalNN, cliffMonths, durationMonths) {
  await db.insert(nnVesting).values({
    userId,
    source,
    refId: refId ?? null,
    totalNN,
    claimedNN: 0,
    startAt: /* @__PURE__ */ new Date(),
    cliffMonths,
    durationMonths
  });
}
async function getMyVesting(db, userId) {
  const rows = await db.select().from(nnVesting).where(eq4(nnVesting.userId, userId)).orderBy(desc(nnVesting.createdAt));
  return rows.map((v) => {
    const vested = vestedAmount(v);
    const claimable = Math.max(0, vested - v.claimedNN);
    return {
      id: v.id,
      source: v.source,
      totalNN: v.totalNN,
      claimedNN: v.claimedNN,
      vestedNN: vested,
      claimableNN: claimable,
      startAt: v.startAt.toISOString(),
      cliffMonths: v.cliffMonths,
      durationMonths: v.durationMonths,
      done: v.claimedNN >= v.totalNN
    };
  });
}
async function claimVesting(db, userId, vestingId) {
  const [v] = await db.select().from(nnVesting).where(eq4(nnVesting.id, vestingId)).limit(1);
  if (!v || v.userId !== userId) return { ok: false, claimed: 0 };
  const vested = vestedAmount(v);
  const claimable = Math.max(0, vested - v.claimedNN);
  if (claimable <= 0) return { ok: false, claimed: 0 };
  const upd = await db.update(nnVesting).set({ claimedNN: sql`${nnVesting.claimedNN} + ${claimable}` }).where(and3(eq4(nnVesting.id, v.id), eq4(nnVesting.claimedNN, v.claimedNN)));
  const affected2 = upd?.[0]?.affectedRows ?? upd?.affectedRows ?? upd?.rowsAffected ?? 0;
  if (affected2 < 1) return { ok: false, claimed: 0 };
  const ok = await grantNN(db, userId, claimable, { type: "vesting_claim", refType: "vesting", refId: v.id, memo: v.source });
  if (!ok) {
    await db.update(nnVesting).set({ claimedNN: sql`GREATEST(${nnVesting.claimedNN} - ${claimable}, 0)` }).where(eq4(nnVesting.id, v.id));
    return { ok: false, claimed: 0 };
  }
  return { ok: true, claimed: claimable };
}
async function getMyNNTransactions(db, userId, limit = 50) {
  return db.select().from(nnTransactions).where(eq4(nnTransactions.userId, userId)).orderBy(desc(nnTransactions.createdAt)).limit(limit);
}
async function getNNRevenue(db) {
  const rows = await db.select({
    type: nnTransactions.type,
    total: sql`COALESCE(SUM(-${nnTransactions.amount}), 0)`,
    count: sql`COUNT(*)`
  }).from(nnTransactions).where(and3(inArray(nnTransactions.type, ["bot_sub", "package"]), sql`${nnTransactions.amount} < 0`)).groupBy(nnTransactions.type);
  const byType = {};
  let totalRevenue = 0;
  for (const r of rows) {
    const total = Number(r.total);
    byType[r.type] = { total, count: Number(r.count) };
    totalRevenue += total;
  }
  return { totalRevenue, byType };
}
var NN_TOTAL_SUPPLY, NN_SYMBOL, NN_NAME, ALLOCATION_PCT, NN_ALLOCATION, USDT_DEPOSIT_ADDRESS, USDT_CHAIN, NN_NODE_TIERS, NN_POOL_SEED, MONTH_MS;
var init_token = __esm({
  "server/token.ts"() {
    "use strict";
    init_schema();
    NN_TOTAL_SUPPLY = 21e6;
    NN_SYMBOL = "BIT";
    NN_NAME = "BIT \u6CBB\u7406\u4EE3\u5E01";
    ALLOCATION_PCT = [
      { key: "ico", name: "ICO \u66F2\u7EBF\u8BA4\u8D2D", pct: 15, desc: "\u66F2\u7EBF\u5B9A\u4EF7\u8BA4\u8D2D(0.8U \u8D77/2U \u5C01\u9876)\uFF0C\u8BA4\u8D2D\u5373\u5168\u989D\u9501\u4ED3\u8FDB\u4E8C\u6C60\u8D28\u62BC", vesting: "\u9996\u6708\u60AC\u5D16 + 12 \u6708\u66F2\u7EBF\u91CA\u653E" },
      { key: "staking", name: "\u8D28\u62BC\u6316\u77FF", pct: 70, desc: "\u8D28\u62BC\u6316\u77FF\u5956\u52B1\u6C60\uFF1A\u6BCF\u7B14\u8D44\u91D1\u5404\u81EA\u8BA1\u9F84\uFF0C\u8D77\u6B65\u5E74\u5316\u6CBF\u66F2\u7EBF\u9012\u51CF", vesting: "\u968F\u6316\u77FF\u9010\u6B65\u4EA7\u51FA\xB7\u5956\u52B1\u6C60\u5C01\u9876" },
      { key: "liquidity", name: "\u6D41\u52A8\u6027\u5171\u5EFA", pct: 10, desc: "DEX/\u505A\u5E02\u6D41\u52A8\u6027\u6C60\uFF0C\u793E\u533A\u5171\u5EFA\u4EA4\u6613\u6DF1\u5EA6", vesting: "\u968F\u6D41\u52A8\u6027\u6295\u653E\u91CA\u653E" },
      { key: "community", name: "\u793E\u533A/\u7A7A\u6295", pct: 5, desc: "\u65E9\u671F\u7528\u6237\u6FC0\u52B1\u3001\u4EFB\u52A1\u7A7A\u6295", vesting: "\u6D3B\u52A8\u9010\u6B65\u91CA\u653E" }
    ];
    NN_ALLOCATION = ALLOCATION_PCT.map((b) => ({
      ...b,
      amount: Math.round(NN_TOTAL_SUPPLY * b.pct / 100)
    }));
    USDT_DEPOSIT_ADDRESS = process.env.USDT_DEPOSIT_ADDRESS || "";
    USDT_CHAIN = process.env.USDT_CHAIN || "BEP20";
    NN_NODE_TIERS = [
      {
        key: "genesis",
        name: "\u521B\u4E16\u8282\u70B9",
        badge: "\u521B\u4E16",
        usdtPrice: 1e3,
        nnAmount: 5e4,
        governanceWeight: 3,
        cliffMonths: 1,
        durationMonths: 12,
        benefits: ["\u6CBB\u7406\u6743\u91CD \xD73", "\u65B0\u4EE3\u5E01/\u7A7A\u6295\u4F18\u5148", "\u4E13\u5C5E\u521B\u4E16\u6807\u8BC6", "\u8282\u70B9\u5206\u7EA2\u4F18\u5148\u7EA7\u6700\u9AD8", "1 \u6708\u9501\u4ED3 + 12 \u6708\u7EBF\u6027\u91CA\u653E"]
      },
      {
        key: "super",
        name: "\u8D85\u7EA7\u8282\u70B9",
        badge: "\u8D85\u7EA7",
        usdtPrice: 500,
        nnAmount: 22e3,
        governanceWeight: 2,
        cliffMonths: 1,
        durationMonths: 9,
        benefits: ["\u6CBB\u7406\u6743\u91CD \xD72", "\u7A7A\u6295\u4F18\u5148", "\u8D85\u7EA7\u8282\u70B9\u6807\u8BC6", "\u8282\u70B9\u5206\u7EA2", "1 \u6708\u9501\u4ED3 + 9 \u6708\u7EBF\u6027\u91CA\u653E"]
      },
      {
        key: "standard",
        name: "\u666E\u901A\u8282\u70B9",
        badge: "\u666E\u901A",
        usdtPrice: 100,
        nnAmount: 4e3,
        governanceWeight: 1,
        cliffMonths: 0,
        durationMonths: 6,
        benefits: ["\u6CBB\u7406\u6743\u91CD \xD71", "\u8282\u70B9\u6807\u8BC6", "\u53C2\u4E0E\u8282\u70B9\u5206\u7EA2", "6 \u6708\u7EBF\u6027\u91CA\u653E"]
      }
    ];
    NN_POOL_SEED = Math.round(NN_TOTAL_SUPPLY * 10 / 100);
    MONTH_MS = 30 * 24 * 3600 * 1e3;
  }
});

// server/referralRewards.ts
import { eq as eq5, and as and4, sql as sql2 } from "drizzle-orm";
async function isReferralBound(db, userId) {
  const [r] = await db.select({ id: referrals.id }).from(referrals).where(and4(eq5(referrals.inviteeId, userId), eq5(referrals.status, "active"))).limit(1);
  return !!r;
}
async function directReferrer(db, inviteeId) {
  const [r] = await db.select({ referrerId: referrals.referrerId }).from(referrals).where(and4(eq5(referrals.inviteeId, inviteeId), eq5(referrals.status, "active"))).limit(1);
  return r?.referrerId ?? null;
}
async function awardReferrerMilestone(db, inviteeId, milestone, npAmount) {
  try {
    if (npAmount <= 0) return;
    const referrerId = await directReferrer(db, inviteeId);
    if (!referrerId || referrerId === inviteeId) return;
    try {
      await db.insert(referralMilestones).values({ inviteeId, milestone });
    } catch {
      return;
    }
    await db.update(users).set({ npPoints: sql2`npPoints + ${npAmount}` }).where(eq5(users.id, referrerId));
    logger_default.info({ inviteeId, referrerId, milestone, npAmount }, "referralRewards: \u91CC\u7A0B\u7891\u5956\u53D1\u653E");
  } catch (err) {
    logger_default.warn({ err, milestone }, "referralRewards: \u91CC\u7A0B\u7891\u5956\u5931\u8D25");
  }
}
async function awardMembershipShare(db, inviteeId, tierKey) {
  try {
    const np = tierKey === "pro" ? 500 : tierKey === "plus" ? 200 : 0;
    if (np <= 0) return;
    const referrerId = await directReferrer(db, inviteeId);
    if (!referrerId || referrerId === inviteeId) return;
    await db.update(users).set({ npPoints: sql2`npPoints + ${np}` }).where(eq5(users.id, referrerId));
    logger_default.info({ inviteeId, referrerId, tierKey, np }, "referralRewards: \u4F1A\u5458\u6D88\u8D39\u5206\u6210\u53D1\u653E");
  } catch (err) {
    logger_default.warn({ err }, "referralRewards: \u6D88\u8D39\u5206\u6210\u5931\u8D25");
  }
}
var init_referralRewards = __esm({
  "server/referralRewards.ts"() {
    "use strict";
    init_schema();
    init_logger();
  }
});

// server/membership.ts
import { and as and5, eq as eq6, lt } from "drizzle-orm";
async function syncOwnedGroupMemberCaps(db, userId, maxGroupMembers) {
  if (maxGroupMembers <= 0) return;
  await db.update(chatGroups).set({ maxMembers: maxGroupMembers }).where(and5(eq6(chatGroups.creatorId, userId), lt(chatGroups.maxMembers, maxGroupMembers)));
}
function membershipCost(monthlyNN, months) {
  const term = MEMBERSHIP_TERMS.find((t3) => t3.months === months);
  const discount = term?.discount ?? 1;
  return Math.ceil(monthlyNN * months * discount);
}
function getTier(key) {
  return tierByKey.get(key) ?? MEMBERSHIP_TIERS[0];
}
function effectiveTier(proTier, proUntil) {
  if (!proTier || proTier === "free") return "free";
  if (proUntil && proUntil.getTime() < Date.now()) return "free";
  return proTier ?? "free";
}
async function getMembership(db, userId) {
  const [u] = await db.select({ id: users.id, role: users.role, proTier: users.proTier, proUntil: users.proUntil, nn: users.nnBalance }).from(users).where(eq6(users.id, userId)).limit(1);
  if (isAppAdmin({ id: userId, role: u?.role })) {
    const daysLeft2 = u?.proUntil ? Math.ceil((u.proUntil.getTime() - Date.now()) / (24 * 3600 * 1e3)) : null;
    return {
      tier: "pro",
      name: "\u7BA1\u7406\u5458",
      benefits: ADMIN_BENEFITS,
      proUntil: u?.proUntil ? u.proUntil.toISOString() : null,
      daysLeft: daysLeft2,
      nnBalance: Number(u?.nn ?? 0),
      tiers: MEMBERSHIP_TIERS,
      terms: MEMBERSHIP_TERMS
    };
  }
  const eff = effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null);
  const tier = getTier(eff);
  const daysLeft = u?.proUntil ? Math.ceil((u.proUntil.getTime() - Date.now()) / (24 * 3600 * 1e3)) : null;
  if (eff !== "free") {
    void syncOwnedGroupMemberCaps(db, userId, tier.benefits.maxGroupMembers).catch(() => {
    });
  }
  return {
    tier: eff,
    name: tier.name,
    benefits: tier.benefits,
    proUntil: u?.proUntil ? u.proUntil.toISOString() : null,
    daysLeft: eff === "free" ? null : daysLeft,
    nnBalance: Number(u?.nn ?? 0),
    tiers: MEMBERSHIP_TIERS,
    terms: MEMBERSHIP_TERMS
  };
}
async function getBenefits(db, userId) {
  const [u] = await db.select({ proTier: users.proTier, proUntil: users.proUntil, role: users.role }).from(users).where(eq6(users.id, userId)).limit(1);
  if (isAppAdmin({ id: userId, role: u?.role })) return ADMIN_BENEFITS;
  return getTier(effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null)).benefits;
}
async function buyMembership(db, userId, tierKey, months) {
  const tier = getTier(tierKey);
  if (tier.key === "free" || tier.monthlyNN <= 0) throw new Error("invalid tier");
  const cost = membershipCost(tier.monthlyNN, months);
  const proUntil = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq6(users.id, userId)).for("update").limit(1);
    const [u] = await tx.select({ proTier: users.proTier, proUntil: users.proUntil }).from(users).where(eq6(users.id, userId)).limit(1);
    const curEff = effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null);
    const active = !!(u?.proUntil && u.proUntil.getTime() > Date.now());
    if (active && curEff !== "free" && getTier(curEff).monthlyNN > tier.monthlyNN) {
      throw new Error("\u4F60\u6709\u66F4\u9AD8\u7B49\u7EA7\u4F1A\u5458\u6B63\u5728\u751F\u6548\uFF0C\u5230\u671F\u540E\u518D\u8D2D\u4E70\u8BE5\u7B49\u7EA7\uFF08\u907F\u514D\u5269\u4F59\u65F6\u957F\u88AB\u6E05\u7A7A\uFF09");
    }
    const ok = await spendNN(tx, userId, cost, { type: "membership", refType: "user", refId: userId, memo: `${tier.key}x${months}` });
    if (!ok) throw new Error("insufficient_nn");
    const sameActiveTier = curEff === tierKey && active;
    const base = sameActiveTier ? u.proUntil.getTime() : Date.now();
    const until = new Date(base + months * 30 * 24 * 3600 * 1e3);
    await tx.update(users).set({ proTier: tierKey, proUntil: until }).where(eq6(users.id, userId));
    return until;
  });
  void awardMembershipShare(db, userId, tierKey);
  void awardReferrerMilestone(db, userId, `membership_${tierKey}`, tierKey === "pro" ? 2e3 : 800);
  void syncOwnedGroupMemberCaps(db, userId, tier.benefits.maxGroupMembers).catch(() => {
  });
  return { tier: tierKey, proUntil: proUntil.toISOString() };
}
var MEMBERSHIP_TIERS, MEMBERSHIP_TERMS, tierByKey, ADMIN_BENEFITS;
var init_membership = __esm({
  "server/membership.ts"() {
    "use strict";
    init_schema();
    init_token();
    init_referralRewards();
    init_appAdmin();
    MEMBERSHIP_TIERS = [
      {
        key: "free",
        name: "\u514D\u8D39\u7528\u6237",
        monthlyNN: 0,
        color: "#94A3B8",
        tagline: "\u57FA\u7840\u793E\u4EA4\u4F53\u9A8C",
        benefits: { maxGroups: 5, maxGroupMembers: 100, aiDailyFree: 0, maxFileMB: 60, maxVideoMB: 60, adFree: false, badge: null, publicGroups: false, bannerSlot: false, voiceRoomFreeMonthly: 0 },
        perks: ["\u5EFA\u7FA4\u4E0A\u9650 5 \u4E2A\uFF08\u4EC5\u79C1\u5BC6\u7FA4\uFF09", "\u7FA4\u4EBA\u6570\u4E0A\u9650 100", "\u5BF9\u8BDD\u6309\u6B21\u4ED8\u8D39 10 BIT/\u6B21", "\u667A\u80FD\u4F53\u8BED\u97F3\u623F 10 BIT/\u6B21\u5F00\u623F", "\u6587\u4EF6 \u2264 60MB", "\u89C6\u9891 \u2264 60MB"]
      },
      {
        key: "plus",
        name: "\u4F1A\u5458 Plus",
        monthlyNN: 80,
        color: "#6366F1",
        tagline: "\u8FDB\u9636\u793E\u7FA4\u8FD0\u8425",
        benefits: { maxGroups: 10, maxGroupMembers: 5e4, aiDailyFree: 3, maxFileMB: 100, maxVideoMB: 120, adFree: true, badge: "Plus", publicGroups: true, bannerSlot: false, voiceRoomFreeMonthly: 10 },
        perks: ["\u53EF\u521B\u5EFA\u516C\u5F00\u7FA4\uFF08\u53D1\u73B0\u793E\u533A\u66DD\u5149\uFF09", "\u5EFA\u7FA4\u4E0A\u9650 10 \u4E2A", "\u7FA4\u4EBA\u6570\u4E0A\u9650 5 \u4E07", "\u6BCF\u65E5 3 \u6B21\u514D\u8D39\u5BF9\u8BDD\uFF08\u8D85\u51FA 10 BIT/\u6B21\uFF09", "\u667A\u80FD\u4F53\u8BED\u97F3\u623F\u6BCF\u6708 10 \u6B21\u514D\u8D39\u5F00\u623F", "\u6587\u4EF6 \u2264 100MB", "\u89C6\u9891 \u2264 120MB", "\u514D\u5E7F\u544A", "Plus \u4E13\u5C5E\u5FBD\u7AE0"]
      },
      {
        key: "pro",
        name: "\u9AD8\u7EA7\u4F1A\u5458 Pro",
        monthlyNN: 200,
        color: "#F59E0B",
        tagline: "\u4E13\u4E1A\u73A9\u5BB6 / KOL",
        benefits: { maxGroups: 50, maxGroupMembers: 2e5, aiDailyFree: 10, maxFileMB: 500, maxVideoMB: 250, adFree: true, badge: "Pro", publicGroups: true, bannerSlot: true, voiceRoomFreeMonthly: 20 },
        perks: ["\u53D1\u73B0\u9875\u6EDA\u52A8\u5E7F\u544A\u4F4D\u6295\u653E\uFF08Pro \u4E13\u5C5E\uFF09", "\u53EF\u521B\u5EFA\u516C\u5F00\u7FA4\uFF08\u53D1\u73B0\u793E\u533A\u66DD\u5149\uFF09", "\u5EFA\u7FA4\u4E0A\u9650 50 \u4E2A", "\u7FA4\u4EBA\u6570\u4E0A\u9650 20 \u4E07", "\u6BCF\u65E5 10 \u6B21\u514D\u8D39\u5BF9\u8BDD\uFF08\u8D85\u51FA 10 BIT/\u6B21\uFF09", "\u667A\u80FD\u4F53\u8BED\u97F3\u623F\u6BCF\u6708 20 \u6B21\u514D\u8D39\u5F00\u623F", "\u6587\u4EF6 \u2264 500MB", "\u89C6\u9891 \u2264 250MB", "\u514D\u5E7F\u544A", "Pro \u91D1\u8272\u5FBD\u7AE0", "\u5BF9\u8BDD\u4F18\u5148\u54CD\u5E94"]
      }
    ];
    MEMBERSHIP_TERMS = [
      { months: 1, discount: 1, label: "1 \u4E2A\u6708" },
      { months: 3, discount: 0.8, label: "3 \u4E2A\u6708 \xB7 8 \u6298" },
      { months: 12, discount: 0.5, label: "12 \u4E2A\u6708 \xB7 5 \u6298" }
    ];
    tierByKey = new Map(MEMBERSHIP_TIERS.map((t3) => [t3.key, t3]));
    ADMIN_BENEFITS = {
      maxGroups: 9999,
      maxGroupMembers: 1e6,
      aiDailyFree: 9999,
      maxFileMB: 2e3,
      maxVideoMB: 2e3,
      adFree: true,
      badge: "Admin",
      publicGroups: true,
      bannerSlot: true,
      voiceRoomFreeMonthly: 9999
    };
  }
});

// server/bitRankAirdrop.ts
var bitRankAirdrop_exports = {};
__export(bitRankAirdrop_exports, {
  BIT_AIRDROP_BASE_DAILY: () => BIT_AIRDROP_BASE_DAILY,
  BIT_AIRDROP_IT_COSTS: () => BIT_AIRDROP_IT_COSTS,
  BIT_AIRDROP_MONTHLY_STEP: () => BIT_AIRDROP_MONTHLY_STEP,
  BIT_AIRDROP_MONTH_DAYS: () => BIT_AIRDROP_MONTH_DAYS,
  BIT_AIRDROP_TIER_COUNT: () => BIT_AIRDROP_TIER_COUNT,
  BIT_RANK_AIRDROP_START: () => BIT_RANK_AIRDROP_START,
  bitAirdropDailyPool: () => bitAirdropDailyPool,
  bitAirdropDonateLadder: () => bitAirdropDonateLadder,
  bitAirdropItCost: () => bitAirdropItCost,
  bitAirdropMonthIndex: () => bitAirdropMonthIndex,
  bitAirdropMonthlyTotal: () => bitAirdropMonthlyTotal,
  bitAirdropPerUser: () => bitAirdropPerUser,
  bitAirdropSchedule: () => bitAirdropSchedule,
  bitAirdropTierPot: () => bitAirdropTierPot,
  claimBitRankAirdrop: () => claimBitRankAirdrop,
  getBitAirdropClaimStatus: () => getBitAirdropClaimStatus,
  runBitRankAirdrop: () => runBitRankAirdrop,
  ymdUtc: () => ymdUtc
});
import { and as and6, eq as eq7, gte as gte2, inArray as inArray2, lt as lt2, sql as sql3 } from "drizzle-orm";
async function spendIT(db, userId, cost) {
  if (cost <= 0) return true;
  const res = await db.update(users).set({ npPoints: sql3`${users.npPoints} - ${cost}` }).where(and6(eq7(users.id, userId), sql3`${users.npPoints} >= ${cost}`));
  const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  return affected2 > 0;
}
function ymdUtc(d = /* @__PURE__ */ new Date()) {
  return d.toISOString().slice(0, 10);
}
function bitAirdropMonthIndex(ymd, startYmd = BIT_RANK_AIRDROP_START) {
  const [sy, sm] = startYmd.split("-").map(Number);
  const [y, m] = ymd.split("-").map(Number);
  if (!sy || !sm || !y || !m) return 0;
  const idx = (y - sy) * 12 + (m - sm) + 1;
  return idx > 0 ? idx : 0;
}
function bitAirdropDailyPool(monthIndex) {
  if (monthIndex < 1) return 0;
  return BIT_AIRDROP_BASE_DAILY + (monthIndex - 1) * BIT_AIRDROP_MONTHLY_STEP;
}
function bitAirdropMonthlyTotal(monthIndex) {
  return bitAirdropDailyPool(monthIndex) * BIT_AIRDROP_MONTH_DAYS;
}
function bitAirdropTierPot(dailyPool) {
  return Math.floor(dailyPool / BIT_AIRDROP_TIER_COUNT);
}
function bitAirdropPerUser(tierPot, recipients) {
  if (tierPot <= 0 || recipients <= 0) return 0;
  return Math.floor(tierPot / recipients);
}
function bitAirdropItCost(tier) {
  if (tier < 1 || tier > BIT_AIRDROP_TIER_COUNT) return 0;
  return BIT_AIRDROP_IT_COSTS[tier - 1] ?? 0;
}
function bitAirdropDonateLadder() {
  return RANK_TIERS.map((t3, i) => {
    const tier = i + 1;
    return { tier, name: t3.name, itCost: bitAirdropItCost(tier) };
  });
}
function bitAirdropSchedule(ymd = ymdUtc()) {
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  const tierPot = bitAirdropTierPot(dailyPool);
  const months = Array.from({ length: 10 }, (_, i) => {
    const idx = i + 1;
    const daily = bitAirdropDailyPool(idx);
    return { month: idx, daily, monthly: daily * BIT_AIRDROP_MONTH_DAYS };
  });
  return {
    startYmd: BIT_RANK_AIRDROP_START,
    monthIndex,
    dailyPool,
    monthlyTotal: bitAirdropMonthlyTotal(monthIndex),
    tierPot,
    tierCount: BIT_AIRDROP_TIER_COUNT,
    monthDays: BIT_AIRDROP_MONTH_DAYS,
    tiers: RANK_TIERS.map((t3, i) => ({ idx: i + 1, name: t3.name })),
    donateLadder: bitAirdropDonateLadder(),
    schedule: months
  };
}
async function countActiveInTier(db, ymd, tier) {
  const dayStart = /* @__PURE__ */ new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 864e5);
  const activeRows = await db.selectDistinct({ userId: userTasks.userId }).from(userTasks).where(and6(gte2(userTasks.completedAt, dayStart), lt2(userTasks.completedAt, dayEnd)));
  const activeIds = activeRows.map((r) => r.userId);
  if (activeIds.length === 0) return 0;
  const ranked = await db.select({ id: users.id }).from(users).where(and6(inArray2(users.id, activeIds), eq7(users.rankTier, tier)));
  return ranked.length;
}
async function isUserActiveOn(db, userId, ymd) {
  const dayStart = /* @__PURE__ */ new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 864e5);
  const [row] = await db.select({ id: userTasks.id }).from(userTasks).where(and6(
    eq7(userTasks.userId, userId),
    gte2(userTasks.completedAt, dayStart),
    lt2(userTasks.completedAt, dayEnd)
  )).limit(1);
  return !!row;
}
async function getBitAirdropClaimStatus(db, userId, tier, ymd = ymdUtc()) {
  const schedule = bitAirdropSchedule(ymd);
  const itCost = bitAirdropItCost(tier);
  const [claimed] = await db.select({
    itCost: bitRankAirdropClaim.itCost,
    bitAmount: bitRankAirdropClaim.bitAmount,
    claimedAt: bitRankAirdropClaim.claimedAt
  }).from(bitRankAirdropClaim).where(and6(eq7(bitRankAirdropClaim.userId, userId), eq7(bitRankAirdropClaim.ymd, ymd))).limit(1);
  const activeToday = tier >= 1 ? await isUserActiveOn(db, userId, ymd) : false;
  const peers = tier >= 1 && schedule.dailyPool > 0 ? await countActiveInTier(db, ymd, tier) : 0;
  const peerCount = peers > 0 ? peers : activeToday ? 1 : 0;
  const estimatedBit = bitAirdropPerUser(schedule.tierPot, peerCount);
  const [u] = await db.select({ npPoints: users.npPoints }).from(users).where(eq7(users.id, userId)).limit(1);
  const npPoints = u?.npPoints ?? 0;
  const canClaim = !claimed && tier >= 1 && schedule.dailyPool > 0 && activeToday && estimatedBit > 0 && itCost > 0 && npPoints >= itCost;
  return {
    ymd,
    itCost,
    estimatedBit,
    claimedToday: !!claimed,
    claimedBit: claimed?.bitAmount ?? 0,
    claimedItCost: claimed?.itCost ?? 0,
    activeToday,
    canClaim,
    reason: claimed ? "\u4ECA\u65E5\u5DF2\u9886\u53D6" : tier < 1 ? "\u9700\u5148\u8FBE\u5230\u9752\u94DC\u53CA\u4EE5\u4E0A\u6BB5\u4F4D" : schedule.dailyPool <= 0 ? "\u7A7A\u6295\u5C1A\u672A\u5F00\u59CB" : !activeToday ? "\u4ECA\u65E5\u9700\u5148\u5B8C\u6210\u4EFB\u52A1\u624D\u53EF\u9886\u53D6" : estimatedBit <= 0 ? "\u5F53\u524D\u6BB5\u4F4D\u6682\u65E0\u53EF\u9886\u4EFD\u989D" : npPoints < itCost ? `IT \u4E0D\u8DB3\uFF0C\u9700\u6350\u732E ${itCost.toLocaleString()} IT` : null
  };
}
async function claimBitRankAirdrop(db, userId) {
  const ymd = ymdUtc();
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  if (dailyPool <= 0) {
    throw Object.assign(new Error("\u7A7A\u6295\u5C1A\u672A\u5F00\u59CB"), { code: "BAD_REQUEST" });
  }
  const [u] = await db.select({ rankTier: users.rankTier, npPoints: users.npPoints }).from(users).where(eq7(users.id, userId)).limit(1);
  const tier = u?.rankTier ?? 0;
  if (tier < 1 || tier > BIT_AIRDROP_TIER_COUNT) {
    throw Object.assign(new Error("\u9700\u5148\u8FBE\u5230\u9752\u94DC\u53CA\u4EE5\u4E0A\u6BB5\u4F4D"), { code: "FORBIDDEN" });
  }
  const itCost = bitAirdropItCost(tier);
  if ((u?.npPoints ?? 0) < itCost) {
    throw Object.assign(new Error(`IT \u4E0D\u8DB3\uFF0C\u9700\u6350\u732E ${itCost.toLocaleString()} IT`), { code: "BAD_REQUEST" });
  }
  if (!await isUserActiveOn(db, userId, ymd)) {
    throw Object.assign(new Error("\u4ECA\u65E5\u9700\u5148\u5B8C\u6210\u4EFB\u52A1\u624D\u53EF\u9886\u53D6"), { code: "FORBIDDEN" });
  }
  const [existing] = await db.select({ id: bitRankAirdropClaim.id }).from(bitRankAirdropClaim).where(and6(eq7(bitRankAirdropClaim.userId, userId), eq7(bitRankAirdropClaim.ymd, ymd))).limit(1);
  if (existing) {
    throw Object.assign(new Error("\u4ECA\u65E5\u5DF2\u9886\u53D6"), { code: "CONFLICT" });
  }
  const tierPot = bitAirdropTierPot(dailyPool);
  const peers = await countActiveInTier(db, ymd, tier);
  const bitAmount = bitAirdropPerUser(tierPot, peers);
  if (bitAmount <= 0) {
    throw Object.assign(new Error("\u5F53\u524D\u6BB5\u4F4D\u6682\u65E0\u53EF\u9886\u4EFD\u989D"), { code: "BAD_REQUEST" });
  }
  try {
    await db.insert(bitRankAirdropClaim).values({
      userId,
      ymd,
      tier,
      itCost,
      bitAmount
    });
  } catch {
    throw Object.assign(new Error("\u4ECA\u65E5\u5DF2\u9886\u53D6"), { code: "CONFLICT" });
  }
  const spent = await spendIT(db, userId, itCost);
  if (!spent) {
    await db.delete(bitRankAirdropClaim).where(and6(
      eq7(bitRankAirdropClaim.userId, userId),
      eq7(bitRankAirdropClaim.ymd, ymd)
    ));
    throw Object.assign(new Error(`IT \u4E0D\u8DB3\uFF0C\u9700\u6350\u732E ${itCost.toLocaleString()} IT`), { code: "BAD_REQUEST" });
  }
  const ok = await grantNN(db, userId, bitAmount, {
    type: "rank_bit_airdrop",
    refType: "rank",
    memo: `${ymd}:T${tier}:donate${itCost}`
  });
  if (!ok) {
    await db.update(users).set({ npPoints: sql3`${users.npPoints} + ${itCost}` }).where(eq7(users.id, userId));
    await db.delete(bitRankAirdropClaim).where(and6(
      eq7(bitRankAirdropClaim.userId, userId),
      eq7(bitRankAirdropClaim.ymd, ymd)
    ));
    throw Object.assign(new Error("BIT \u53D1\u653E\u5931\u8D25\uFF0C\u5DF2\u9000\u56DE IT\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"), { code: "INTERNAL_SERVER_ERROR" });
  }
  try {
    await db.insert(bitRankAirdropRun).values({
      ymd,
      monthIndex,
      dailyPool,
      paidUsers: 1,
      paidTotal: bitAmount
    });
  } catch {
    await db.update(bitRankAirdropRun).set({
      paidUsers: sql3`${bitRankAirdropRun.paidUsers} + 1`,
      paidTotal: sql3`${bitRankAirdropRun.paidTotal} + ${bitAmount}`
    }).where(eq7(bitRankAirdropRun.ymd, ymd));
  }
  logger_default.info({ userId, ymd, tier, itCost, bitAmount }, "bitRankAirdrop: \u7528\u6237\u6350\u732E\u9886\u53D6");
  return { ok: true, ymd, tier, itCost, bitAmount };
}
async function runBitRankAirdrop(_db2, targetYmd) {
  const ymd = targetYmd ?? ymdUtc(new Date(Date.now() - 864e5));
  const monthIndex = bitAirdropMonthIndex(ymd);
  const dailyPool = bitAirdropDailyPool(monthIndex);
  logger_default.info({ ymd, monthIndex, dailyPool }, "bitRankAirdrop: \u5DF2\u6539\u4E3A\u6350\u732E\u9886\u53D6\uFF0C\u8DF3\u8FC7\u81EA\u52A8\u53D1\u653E");
  return { ran: false, ymd, paidUsers: 0, paidTotal: 0, dailyPool };
}
var BIT_RANK_AIRDROP_START, BIT_AIRDROP_BASE_DAILY, BIT_AIRDROP_MONTHLY_STEP, BIT_AIRDROP_MONTH_DAYS, BIT_AIRDROP_TIER_COUNT, BIT_AIRDROP_IT_COSTS;
var init_bitRankAirdrop = __esm({
  "server/bitRankAirdrop.ts"() {
    "use strict";
    init_schema();
    init_token();
    init_rankEngine();
    init_logger();
    BIT_RANK_AIRDROP_START = (process.env.BIT_RANK_AIRDROP_START || "2026-08-01").slice(0, 10);
    BIT_AIRDROP_BASE_DAILY = 1e3;
    BIT_AIRDROP_MONTHLY_STEP = 500;
    BIT_AIRDROP_MONTH_DAYS = 30;
    BIT_AIRDROP_TIER_COUNT = 10;
    BIT_AIRDROP_IT_COSTS = [1e3, 2e3, 3e3, 4e3, 5e3, 6e3, 7e3, 8e3, 9e3, 1e4];
  }
});

// server/rankEngine.ts
import { eq as eq8, and as and7, gte as gte3, lt as lt3, inArray as inArray3, sql as sql4 } from "drizzle-orm";
function tierForScore(score) {
  let t3 = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) if (score >= RANK_TIERS[i].min) t3 = i + 1;
  return t3;
}
function tierBonus(tier) {
  return tier >= 1 && tier <= 10 ? RANK_TIERS[tier - 1].bonus : 0;
}
function tierDaily(tier) {
  return tier >= 1 && tier <= 10 ? RANK_TIERS[tier - 1].daily : 0;
}
function tierUpReward(tier) {
  return tier >= 1 && tier <= 10 ? Math.floor(RANK_TIERS[tier - 1].min / 10) : 0;
}
function reputationBonus(rep) {
  return Math.min(0.3, Math.max(0, rep) / 5e4);
}
function startOfUtcDay(ymd) {
  return /* @__PURE__ */ new Date(`${ymd}T00:00:00.000Z`);
}
function ymdUtc2(d) {
  return d.toISOString().slice(0, 10);
}
async function runRankAggregation(db, targetYmd) {
  const ymd = targetYmd ?? ymdUtc2(new Date(Date.now() - 864e5));
  try {
    await db.insert(rankAggRun).values({ ymd });
  } catch {
    return { ran: false, ymd, activeMembers: 0, ancestorsUpdated: 0 };
  }
  const dayStart = startOfUtcDay(ymd);
  const dayEnd = new Date(dayStart.getTime() + 864e5);
  const activeRows = await db.selectDistinct({ userId: userTasks.userId }).from(userTasks).where(and7(gte3(userTasks.completedAt, dayStart), lt3(userTasks.completedAt, dayEnd)));
  const activeIds = activeRows.map((r) => r.userId);
  if (activeIds.length === 0) return { ran: true, ymd, activeMembers: 0, ancestorsUpdated: 0 };
  const memberRows = await db.select({ id: users.id, proTier: users.proTier, proUntil: users.proUntil }).from(users).where(inArray3(users.id, activeIds));
  const ownerRows = await db.selectDistinct({ creatorId: chatGroups.creatorId }).from(chatGroups).where(gte3(chatGroups.memberCount, 10));
  const owners = new Set(ownerRows.map((r) => r.creatorId));
  const weightOf = /* @__PURE__ */ new Map();
  for (const m of memberRows) {
    const eff = effectiveTier(m.proTier ?? "free", m.proUntil ?? null);
    let w = 1;
    if (eff === "pro") w = 6;
    else if (eff === "plus") w = 4;
    else if (owners.has(m.id)) w = 3;
    weightOf.set(m.id, w);
  }
  const refRows = await db.select({ inviteeId: referrals.inviteeId, referrerId: referrals.referrerId }).from(referrals).where(eq8(referrals.status, "active"));
  const parentOf = /* @__PURE__ */ new Map();
  for (const r of refRows) if (!parentOf.has(r.inviteeId)) parentOf.set(r.inviteeId, r.referrerId);
  const dailyScore = /* @__PURE__ */ new Map();
  for (const memberId of activeIds) {
    const w = weightOf.get(memberId) ?? 1;
    let cur = parentOf.get(memberId);
    const seen = /* @__PURE__ */ new Set([memberId]);
    let depth = 0;
    while (cur !== void 0 && !seen.has(cur) && depth < 100) {
      dailyScore.set(cur, (dailyScore.get(cur) ?? 0) + w);
      seen.add(cur);
      cur = parentOf.get(cur);
      depth++;
    }
  }
  const ancestorIds = Array.from(dailyScore.keys());
  let ancestorsUpdated = 0;
  if (ancestorIds.length > 0) {
    const cur = await db.select({ id: users.id, rankScore: users.rankScore, rankTier: users.rankTier }).from(users).where(inArray3(users.id, ancestorIds));
    for (const u of cur) {
      const add = dailyScore.get(u.id) ?? 0;
      if (add <= 0) continue;
      const newScore = (u.rankScore ?? 0) + add;
      const newTier = Math.max(u.rankTier ?? 0, tierForScore(newScore));
      let upReward = 0;
      for (let t3 = (u.rankTier ?? 0) + 1; t3 <= newTier; t3++) upReward += tierUpReward(t3);
      await db.update(users).set({ rankScore: newScore, rankTier: newTier, npPoints: sql4`npPoints + ${upReward}` }).where(eq8(users.id, u.id));
      ancestorsUpdated++;
    }
  }
  const dayuneers = await db.select({ id: users.id, rankTier: users.rankTier }).from(users).where(and7(inArray3(users.id, activeIds), gte3(users.rankTier, 1)));
  for (const u of dayuneers) {
    const pay = tierDaily(u.rankTier ?? 0);
    if (pay > 0) await db.update(users).set({ npPoints: sql4`npPoints + ${pay}` }).where(eq8(users.id, u.id));
  }
  try {
    const { runBitRankAirdrop: runBitRankAirdrop2 } = await Promise.resolve().then(() => (init_bitRankAirdrop(), bitRankAirdrop_exports));
    await runBitRankAirdrop2(db, ymd);
  } catch (err) {
    logger_default.warn({ err, ymd }, "rankEngine: BIT \u6BB5\u4F4D\u7A7A\u6295\u5931\u8D25");
  }
  logger_default.info({ ymd, activeMembers: activeIds.length, ancestorsUpdated }, "rankEngine: \u6BCF\u65E5\u805A\u5408\u5B8C\u6210");
  return { ran: true, ymd, activeMembers: activeIds.length, ancestorsUpdated };
}
function startRankAggregation() {
  const tick = async () => {
    try {
      const db = await getDb();
      if (db) await runRankAggregation(db);
    } catch (err) {
      logger_default.warn({ err }, "rankEngine: \u805A\u5408\u4EFB\u52A1\u5F02\u5E38");
    }
  };
  setInterval(() => {
    void tick();
  }, 6 * 3600 * 1e3);
  void tick();
}
var RANK_TIERS;
var init_rankEngine = __esm({
  "server/rankEngine.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_membership();
    init_logger();
    RANK_TIERS = [
      { name: "\u9752\u94DC", min: 500, bonus: 0.1, daily: 100 },
      { name: "\u767D\u94F6", min: 2e3, bonus: 0.2, daily: 200 },
      { name: "\u9EC4\u91D1", min: 6e3, bonus: 0.3, daily: 300 },
      { name: "\u94C2\u91D1", min: 15e3, bonus: 0.4, daily: 400 },
      { name: "\u94BB\u77F3", min: 4e4, bonus: 0.5, daily: 500 },
      { name: "\u661F\u8000", min: 1e5, bonus: 0.6, daily: 1e3 },
      { name: "\u5927\u5E08", min: 25e4, bonus: 0.7, daily: 2e3 },
      { name: "\u5B97\u5E08", min: 6e5, bonus: 0.8, daily: 3e3 },
      { name: "\u738B\u8005", min: 12e5, bonus: 0.9, daily: 4e3 },
      { name: "\u4F20\u5947", min: 25e5, bonus: 1, daily: 5e3 }
    ];
  }
});

// server/utils/image.ts
var image_exports = {};
__export(image_exports, {
  downscaleImage: () => downscaleImage
});
import { Jimp } from "jimp";
async function downscaleImage(buffer, maxDim, quality = 82, mimeIn) {
  const m = (mimeIn || "").toLowerCase();
  if (m.includes("gif")) return { buffer, mime: mimeIn || "image/gif" };
  try {
    const img = await Jimp.read(buffer);
    if (img.width > maxDim || img.height > maxDim) {
      img.scaleToFit({ w: maxDim, h: maxDim });
    }
    const out = await img.getBuffer("image/jpeg", { quality });
    if (out.length < buffer.length) return { buffer: out, mime: "image/jpeg" };
    return { buffer, mime: "image/jpeg" };
  } catch (err) {
    logger_default.warn({ err }, "downscaleImage failed, using original");
    return { buffer, mime: mimeIn || "image/jpeg" };
  }
}
var init_image = __esm({
  "server/utils/image.ts"() {
    "use strict";
    init_logger();
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import fs4 from "fs";
import path4 from "path";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // SameSite=None requires Secure; over plain HTTP (local dev) browsers reject such
    // cookies, so fall back to Lax there. Cross-site native-app auth still works over HTTPS.
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/utils/inviteCode.ts
init_schema();
import { and, eq as eq2, isNull, ne, or } from "drizzle-orm";
var CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
var CODE_SPACE = 31 ** 4;
var CODE_MULT = 48271;
function generateInviteCode(userId, _name) {
  let n2 = userId * CODE_MULT % CODE_SPACE;
  let tail = "";
  for (let i = 0; i < 4; i++) {
    tail = CODE_ALPHABET[n2 % 31] + tail;
    n2 = Math.floor(n2 / 31);
  }
  return `AI${tail}`;
}
function normalizeInviteCode(raw) {
  return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}
async function ensureInviteCode(db, userId, name) {
  const code = generateInviteCode(userId, name ?? "USER");
  await db.update(users).set({ inviteCode: code }).where(and(eq2(users.id, userId), or(isNull(users.inviteCode), ne(users.inviteCode, code))));
  return code;
}
async function backfillInviteCodes(db) {
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(isNull(users.inviteCode));
  for (const r of rows) {
    await db.update(users).set({ inviteCode: generateInviteCode(r.id, r.name ?? "USER") }).where(eq2(users.id, r.id));
  }
  return rows.length;
}

// server/_core/sdk.ts
init_env();
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const headerToken = typeof req.headers["x-app-session"] === "string" ? req.headers["x-app-session"].trim() : "";
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = headerToken || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
        if (user) {
          const dbInstance = await getDb();
          if (dbInstance) await ensureInviteCode(dbInstance, user.id, user.name).catch(() => {
          });
        }
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      let returnPath = "/";
      try {
        const statePayload = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
        if (statePayload?.returnPath && typeof statePayload.returnPath === "string") {
          const path5 = statePayload.returnPath;
          if (path5.startsWith("/") && !path5.startsWith("//")) {
            returnPath = path5;
          }
        }
      } catch {
      }
      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
init_env();
import { Readable } from "stream";
function registerStorageProxy(app) {
  app.get(["/app-media/*", "/manus-storage/*"], async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const { storageGet: storageGet2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const { url } = await storageGet2(key);
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      const upstreamHeaders = {};
      if (typeof req.headers.range === "string") upstreamHeaders.Range = req.headers.range;
      const upstream = await fetch(url, { headers: upstreamHeaders });
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status === 404 ? 404 : 502).send("Media fetch failed");
        return;
      }
      res.status(upstream.status);
      for (const h of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      const ctype = upstream.headers.get("content-type") || "application/octet-stream";
      const dangerous = /html|svg|xml|javascript|ecmascript/i.test(ctype);
      res.setHeader("Content-Type", dangerous ? "application/octet-stream" : ctype);
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (dangerous) res.setHeader("Content-Disposition", "attachment");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (!upstream.body) {
        res.end();
        return;
      }
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
init_appAdmin();
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (ctx.user.isBanned) {
    throw new TRPCError2({ code: "FORBIDDEN", message: "\u8D26\u53F7\u5DF2\u88AB\u5C01\u7981\uFF0C\u5982\u6709\u7591\u95EE\u8BF7\u8054\u7CFB\u5BA2\u670D" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || !isAppAdmin(ctx.user)) {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/rateLimit.ts
init_appAdmin();
import { TRPCError as TRPCError3 } from "@trpc/server";
import { initTRPC as initTRPC2 } from "@trpc/server";
var store = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  store.forEach((bucket, key) => {
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < 12e4);
    if (bucket.timestamps.length === 0) store.delete(key);
  });
}, 3e5);
function checkRate(key, windowMs, maxHits) {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t3) => now - t3 < windowMs);
  if (bucket.timestamps.length >= maxHits) {
    return false;
  }
  bucket.timestamps.push(now);
  return true;
}
function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}
var t2 = initTRPC2.context().create();
var rateLimitDefault = t2.middleware(async ({ ctx, next }) => {
  if (isAppAdmin(ctx.user)) return next({ ctx });
  const ip = getClientIp(ctx.req);
  const key = `default:${ip}`;
  if (!checkRate(key, 6e4, 60)) {
    throw new TRPCError3({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later."
    });
  }
  return next({ ctx });
});
var rateLimitStrict = t2.middleware(async (opts) => {
  if (isAppAdmin(opts.ctx.user)) return opts.next();
  const identifier = opts.ctx.user?.id?.toString() || getClientIp(opts.ctx.req);
  const key = `strict:${identifier}`;
  if (!checkRate(key, 6e4, 10)) {
    throw new TRPCError3({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded for AI operations. Please wait a moment."
    });
  }
  return opts.next();
});
var rateLimitWrite = t2.middleware(async (opts) => {
  if (isAppAdmin(opts.ctx.user)) return opts.next();
  const identifier = opts.ctx.user?.id?.toString() || getClientIp(opts.ctx.req);
  const key = `write:${identifier}`;
  if (!checkRate(key, 6e4, 30)) {
    throw new TRPCError3({
      code: "TOO_MANY_REQUESTS",
      message: "Too many write operations. Please slow down."
    });
  }
  return opts.next();
});

// server/routers/wallet.ts
import { z as z5 } from "zod";
init_db();
init_schema();
import { eq as eq12, desc as desc4, sql as sql7 } from "drizzle-orm";

// server/utils/coinGeckoCache.ts
init_logger();
var cache = /* @__PURE__ */ new Map();
var TTL = {
  prices: 3e4,
  // 30s for price data (near real-time)
  chart: 18e4,
  // 3 min for chart data
  trending: 3e5,
  // 5 min for trending
  tokenDetail: 3e4,
  // 30s for token detail (near real-time)
  search: 6e4
  // 1 min for search results
};
var inFlight = /* @__PURE__ */ new Map();
async function fetchWithTimeout(url, timeoutMs = 12e3) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}
async function cachedFetch(cacheKey2, url, ttlMs, parser, maxRetries = 2) {
  const cached = cache.get(cacheKey2);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (inFlight.has(cacheKey2)) {
    return inFlight.get(cacheKey2);
  }
  const fetchPromise = (async () => {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetchWithTimeout(url);
        if (res.status === 429) {
          const waitMs = Math.min(2e3 * Math.pow(2, attempt), 15e3);
          logger_default.warn({ cacheKey: cacheKey2, waitMs, attempt: attempt + 1, maxAttempts: maxRetries + 1 }, `CoinGecko: 429 rate limited, retrying in ${waitMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        if (!res.ok) {
          throw new Error(`CoinGecko API error: ${res.status}`);
        }
        const data = await parser(res);
        cache.set(cacheKey2, { data, expiresAt: Date.now() + ttlMs });
        return data;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const waitMs = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }
    if (cached) {
      logger_default.warn({ cacheKey: cacheKey2 }, "CoinGecko: All retries failed, returning stale cache");
      return cached.data;
    }
    logger_default.error({ cacheKey: cacheKey2, err: lastError }, "CoinGecko: All retries failed");
    return null;
  })();
  inFlight.set(cacheKey2, fetchPromise);
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlight.delete(cacheKey2);
  }
}
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of Array.from(cache.entries())) {
    if (entry.expiresAt + 3e5 < now) {
      cache.delete(key);
    }
  }
}
setInterval(cleanupCache, 3e5);

// server/routers/user.ts
import { z as z4 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
init_db();
init_schema();
init_storage();
import { eq as eq11, desc as desc3, sql as sql6, and as and9, gte as gte4, count, ne as ne2, inArray as inArray5 } from "drizzle-orm";

// server/utils/sanitize.ts
function stripHtml(input) {
  if (!input) return "";
  const decoded = input.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/").replace(/&amp;/g, "&");
  let prev;
  let out = decoded;
  do {
    prev = out;
    out = out.replace(/<[^>]*>/g, "");
  } while (out !== prev);
  return out;
}
function sanitizeInput(input, maxLength = 1e4) {
  if (!input) return "";
  const stripped = stripHtml(input.trim());
  return stripped.slice(0, maxLength);
}
function sanitizeUsername(input) {
  if (!input) return "";
  return input.trim().replace(/[^a-zA-Z0-9_.\-]/g, "").slice(0, 50);
}

// server/utils/relations.ts
init_schema();
import { and as and2, eq as eq3, or as or2 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
async function areFriends(db, a, b) {
  if (a === b) return true;
  const [r] = await db.select({ id: friendRequests.id }).from(friendRequests).where(and2(eq3(friendRequests.status, "accepted"), or2(
    and2(eq3(friendRequests.senderId, a), eq3(friendRequests.receiverId, b)),
    and2(eq3(friendRequests.senderId, b), eq3(friendRequests.receiverId, a))
  ))).limit(1);
  return !!r;
}
async function isBlockedEither(db, a, b) {
  const [r] = await db.select({ id: userBlocklist.id }).from(userBlocklist).where(or2(
    and2(eq3(userBlocklist.blockerId, a), eq3(userBlocklist.blockedId, b)),
    and2(eq3(userBlocklist.blockerId, b), eq3(userBlocklist.blockedId, a))
  )).limit(1);
  return !!r;
}
async function hasBlocked(db, blocker, blocked) {
  const [r] = await db.select({ id: userBlocklist.id }).from(userBlocklist).where(and2(eq3(userBlocklist.blockerId, blocker), eq3(userBlocklist.blockedId, blocked))).limit(1);
  return !!r;
}
async function canViewFullProfile(db, viewerId, targetId) {
  if (viewerId === targetId) return true;
  try {
    const [st] = await db.select({ v: userSettings.profileVisible }).from(userSettings).where(eq3(userSettings.userId, targetId)).limit(1);
    if (!st || st.v) return true;
  } catch {
    return true;
  }
  if (viewerId && await areFriends(db, viewerId, targetId)) return true;
  return false;
}
async function assertCanDM(db, from, to) {
  if (from === to) return;
  if (await isBlockedEither(db, from, to)) throw new TRPCError4({ code: "FORBIDDEN", message: "\u65E0\u6CD5\u53D1\u9001(\u5B58\u5728\u62C9\u9ED1\u5173\u7CFB)" });
  let onlyFriends = false;
  try {
    const [s] = await db.select({ v: userSettings.dmOnlyFriends }).from(userSettings).where(eq3(userSettings.userId, to)).limit(1);
    onlyFriends = !!s?.v;
  } catch {
  }
  if (onlyFriends && !await areFriends(db, from, to)) {
    throw new TRPCError4({ code: "FORBIDDEN", message: "\u5BF9\u65B9\u8BBE\u7F6E\u4E86\u4EC5\u597D\u53CB\u53EF\u79C1\u4FE1,\u8BF7\u5148\u52A0\u4E3A\u597D\u53CB" });
  }
}

// server/routers/user.ts
init_rankEngine();
init_bitRankAirdrop();
init_referralRewards();
init_appAdmin();
init_token();

// server/routers/notificationsRouter.ts
import { z as z3 } from "zod";
init_db();
init_schema();
import { eq as eq10, and as and8, desc as desc2, sql as sql5 } from "drizzle-orm";

// server/routers/webPush.ts
init_schema();
import { TRPCError as TRPCError5 } from "@trpc/server";
import webpush from "web-push";
import { eq as eq9, inArray as inArray4 } from "drizzle-orm";
import { z as z2 } from "zod";
init_db();
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BDELsotXx1M-DHSpJ998MHEUIlj8-GzJPzOuDXRaHOGS_9h_-apvpaN4v6cnvaZQr3HwwauehFHRN5ROV77Qh5w";
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "mzHowEZfED1ijF4CN1DsRVH3t0cALTZvmP3uy0UCxL0";
var VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@nexuschat.best";
webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
var webPushRouter = router({
  /** Return the VAPID public key for client-side subscription */
  getPublicKey: publicProcedure.query(() => {
    return { publicKey: VAPID_PUBLIC_KEY };
  }),
  /** Register a push subscription for the current user */
  subscribe: protectedProcedure.input(
    z2.object({
      endpoint: z2.string().url(),
      p256dh: z2.string(),
      auth: z2.string()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    const existing = await db.select().from(pushSubscriptions).where(eq9(pushSubscriptions.userId, ctx.user.id)).limit(10);
    if (existing.length >= 5) {
      await db.delete(pushSubscriptions).where(eq9(pushSubscriptions.userId, ctx.user.id));
    }
    await db.insert(pushSubscriptions).values({
      userId: ctx.user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth
    });
    return { success: true };
  }),
  /** Unsubscribe (remove push subscription) */
  unsubscribe: protectedProcedure.input(z2.object({ endpoint: z2.string() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.delete(pushSubscriptions).where(eq9(pushSubscriptions.userId, ctx.user.id));
    return { success: true };
  }),
  /** 注册原生推送（Expo Push）设备 token。同一 token 改归当前用户（换账号登录），幂等。 */
  registerDeviceToken: protectedProcedure.input(z2.object({ token: z2.string().min(10).max(255), platform: z2.enum(["android", "ios"]).default("android") })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    await db.delete(devicePushTokens).where(eq9(devicePushTokens.token, input.token));
    await db.insert(devicePushTokens).values({ userId: ctx.user.id, token: input.token, platform: input.platform });
    return { success: true };
  }),
  /** 注销设备 token（退出登录时调用）。 */
  unregisterDeviceToken: protectedProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.delete(devicePushTokens).where(eq9(devicePushTokens.token, input.token));
    return { success: true };
  })
});
async function sendExpoPush(db, userId, payload) {
  const tokens = await db.select().from(devicePushTokens).where(eq9(devicePushTokens.userId, userId));
  const expoTokens = tokens.map((t3) => t3.token).filter((t3) => t3.startsWith("ExponentPushToken") || t3.startsWith("ExpoPushToken"));
  if (expoTokens.length === 0) return;
  const messages3 = expoTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    sound: "default",
    data: { url: payload.url || "/notifications" }
  }));
  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(messages3)
  });
  const json = await resp.json().catch(() => null);
  const dead = (json?.data ?? []).map((r, i) => r?.status === "error" && r?.details?.error === "DeviceNotRegistered" ? expoTokens[i] : null).filter((t3) => !!t3);
  if (dead.length) await db.delete(devicePushTokens).where(inArray4(devicePushTokens.token, dead));
}
async function sendPushToUser(userId, payload) {
  const db = await getDb();
  if (!db) return;
  void sendExpoPush(db, userId, payload).catch(() => {
  });
  const subs = await db.select().from(pushSubscriptions).where(eq9(pushSubscriptions.userId, userId));
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/(tabs)",
    // 兜底用 RN 路由(原 /app/chat 是 web 路由,原生点开跳空白页)
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png"
  });
  const results = await Promise.allSettled(
    subs.map(
      (sub) => webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        notificationPayload
      )
    )
  );
  const expiredEndpoints = results.map((r, i) => r.status === "rejected" ? subs[i].endpoint : null).filter(Boolean);
  if (expiredEndpoints.length > 0) {
    await db.delete(pushSubscriptions).where(eq9(pushSubscriptions.userId, userId));
  }
}

// server/routers/notificationsRouter.ts
var notificationsRouter = router({
  // ─── Get notifications for current user ─────────────────────────────────────
  list: protectedProcedure.input(
    z3.object({
      limit: z3.number().min(1).max(50).default(20),
      unreadOnly: z3.boolean().default(false)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { notifications: [], unreadCount: 0 };
    const limit = input?.limit ?? 20;
    const unreadOnly = input?.unreadOnly ?? false;
    const conditions = [eq10(notifications.userId, ctx.user.id)];
    if (unreadOnly) {
      conditions.push(eq10(notifications.isRead, false));
    }
    const rows = await db.select().from(notifications).where(and8(...conditions)).orderBy(desc2(notifications.createdAt)).limit(limit);
    const [unreadRow] = await db.select({ count: sql5`COUNT(*)` }).from(notifications).where(and8(eq10(notifications.userId, ctx.user.id), eq10(notifications.isRead, false)));
    return {
      notifications: rows,
      unreadCount: Number(unreadRow?.count ?? 0)
    };
  }),
  // ─── Get unread count only (for badge) ──────────────────────────────────────
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const [row] = await db.select({ count: sql5`COUNT(*)` }).from(notifications).where(and8(eq10(notifications.userId, ctx.user.id), eq10(notifications.isRead, false)));
    return { count: Number(row?.count ?? 0) };
  }),
  // ─── Mark notification(s) as read ───────────────────────────────────────────
  markRead: protectedProcedure.input(
    z3.object({
      notificationId: z3.number().optional()
      // if omitted, mark all as read
    }).optional()
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (input?.notificationId) {
      await db.update(notifications).set({ isRead: true }).where(
        and8(
          eq10(notifications.id, input.notificationId),
          eq10(notifications.userId, ctx.user.id)
        )
      );
    } else {
      await db.update(notifications).set({ isRead: true }).where(eq10(notifications.userId, ctx.user.id));
    }
    return { success: true };
  }),
  // ─── Create notification (internal helper, called by other routers) ─────────
  // This is a protected procedure so only authenticated users can trigger it
  // In practice, call createNotification() helper from other routers
  create: protectedProcedure.input(
    z3.object({
      targetUserId: z3.number(),
      // 安全:移除 "system"——否则任何用户可伪造"系统/官方"通知(如"账号异常,点此验证…")向任意人钓鱼。
      // system 类通知只能由服务端 createNotification() 内部发起。
      type: z3.enum(["like", "comment", "follow", "mention"]),
      content: z3.string().max(500),
      postId: z3.number().optional()
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    if (input.targetUserId === ctx.user.id) return { success: true };
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(notifications).values({
      userId: input.targetUserId,
      type: input.type,
      fromUserId: ctx.user.id,
      fromUserName: ctx.user.name ?? "Anonymous",
      fromUserAvatar: ctx.user.avatar ?? "\u{1F98A}",
      postId: input.postId,
      content: sanitizeInput(input.content, 500),
      // 之前未净化,存原始 markup 再回显
      isRead: false
    });
    return { success: true };
  }),
  // ─── Delete a notification ───────────────────────────────────────────────────
  delete: protectedProcedure.input(z3.object({ notificationId: z3.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(notifications).where(
      and8(
        eq10(notifications.id, input.notificationId),
        eq10(notifications.userId, ctx.user.id)
      )
    );
    return { success: true };
  })
});
async function createNotification(params) {
  if (!params.db) return;
  if (params.targetUserId === params.fromUserId) return;
  await params.db.insert(notifications).values({
    userId: params.targetUserId,
    type: params.type,
    fromUserId: params.fromUserId,
    fromUserName: params.fromUserName,
    fromUserAvatar: params.fromUserAvatar,
    postId: params.postId,
    content: params.content,
    isRead: false
  });
  const mentionTitle = params.content.startsWith("\u3010@\u6240\u6709\u4EBA\u3011") ? `${params.fromUserName} @\u4E86\u6240\u6709\u4EBA` : `${params.fromUserName} \u63D0\u5230\u4E86\u4F60`;
  const titleMap = {
    like: `${params.fromUserName} \u8D5E\u4E86\u4F60`,
    comment: `${params.fromUserName} \u8BC4\u8BBA\u4E86\u4F60`,
    follow: `${params.fromUserName} \u5173\u6CE8\u4E86\u4F60`,
    mention: mentionTitle,
    system: "AIChat \u901A\u77E5"
  };
  void sendPushToUser(params.targetUserId, {
    title: titleMap[params.type] ?? "AIChat \u901A\u77E5",
    body: params.content,
    url: "/notifications"
  }).catch(() => {
  });
}

// server/routers/user.ts
async function getTaskRewardOverrides(db) {
  try {
    const [row] = await db.select({ tr: appConfig.taskRewards }).from(appConfig).where(eq11(appConfig.platform, "all")).limit(1);
    if (row?.tr) {
      const o = JSON.parse(row.tr);
      if (o && typeof o === "object") return o;
    }
  } catch {
  }
  return {};
}
var IT_PER_BIT = 100;
var TRANSFER_MAX_IT = 1e6;
var TRANSFER_MAX_BIT = 1e5;
var REQUIRES_BINDING = /* @__PURE__ */ new Set(["first_research", "research_daily"]);
function ymdUtc3(d = /* @__PURE__ */ new Date()) {
  return d.toISOString().slice(0, 10);
}
function ymdShanghai(d = /* @__PURE__ */ new Date()) {
  return new Date(d.getTime() + 8 * 3600 * 1e3).toISOString().slice(0, 10);
}
function startOfShanghaiDay(ymd) {
  return /* @__PURE__ */ new Date(`${ymd}T00:00:00+08:00`);
}
function dailyNpCap(createdAt) {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 864e5;
  return ageDays < 7 ? 200 : 2e3;
}
function signinStreakReward(streak) {
  return Math.min(80, 10 + Math.max(0, streak - 1) * 12);
}
async function creditNp(tx, userId, amount, capped) {
  if (amount <= 0) return 0;
  let base = amount;
  let total = amount;
  if (capped) {
    const [u] = await tx.select({ createdAt: users.createdAt, rankTier: users.rankTier, reputation: users.reputation, deviceId: users.deviceId, role: users.role }).from(users).where(eq11(users.id, userId)).limit(1);
    if (!u) return 0;
    const admin = isAppAdmin({ id: userId, role: u.role });
    if (!admin) {
      const cap = dailyNpCap(u.createdAt);
      const ymd = ymdUtc3();
      if (u.deviceId) {
        const [{ c: otherEarners = 0 } = { c: 0 }] = await tx.select({ c: sql6`COUNT(DISTINCT ${userDailyNp.userId})` }).from(userDailyNp).innerJoin(users, eq11(userDailyNp.userId, users.id)).where(and9(
          eq11(users.deviceId, u.deviceId),
          eq11(userDailyNp.ymd, ymd),
          gte4(userDailyNp.earned, 1),
          sql6`${userDailyNp.userId} != ${userId}`
        ));
        if (Number(otherEarners) >= 3) return 0;
      }
      await tx.insert(userDailyNp).values({ userId, ymd, earned: 0 }).onDuplicateKeyUpdate({ set: { earned: sql6`earned` } });
      const [row] = await tx.select({ earned: userDailyNp.earned }).from(userDailyNp).where(and9(eq11(userDailyNp.userId, userId), eq11(userDailyNp.ymd, ymd))).for("update").limit(1);
      const earned = row?.earned ?? 0;
      base = Math.min(amount, Math.max(0, cap - earned));
      if (base <= 0) return 0;
      await tx.update(userDailyNp).set({ earned: earned + base }).where(and9(eq11(userDailyNp.userId, userId), eq11(userDailyNp.ymd, ymd)));
    }
    const mult = 1 + tierBonus(u.rankTier ?? 0) + reputationBonus(u.reputation ?? 0);
    total = Math.round(base * mult);
  }
  await tx.update(users).set({ npPoints: sql6`npPoints + ${total}` }).where(eq11(users.id, userId));
  return total;
}
var TASK_DEFINITIONS = {
  connect_wallet: {
    label: "\u8FDE\u63A5\u94B1\u5305",
    description: "\u9996\u6B21\u8FDE\u63A5 BSC \u94B1\u5305",
    npReward: 50,
    maxCompletions: 1,
    eventOnly: true
  },
  complete_profile: {
    label: "\u5B8C\u5584\u8D44\u6599",
    description: "\u586B\u5199\u5934\u50CF\u548C\u6635\u79F0",
    npReward: 100,
    maxCompletions: 1,
    eventOnly: true
  },
  first_post: {
    label: "\u53D1\u5E03\u7B2C\u4E00\u6761\u52A8\u6001",
    description: "\u5728\u5E7F\u573A\u53D1\u5E03\u4F60\u7684\u7B2C\u4E00\u6761\u52A8\u6001",
    npReward: 100,
    maxCompletions: 1,
    eventOnly: true
  },
  first_message: {
    label: "\u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F",
    description: "\u5728 Chat \u53D1\u9001\u4F60\u7684\u7B2C\u4E00\u6761\u6D88\u606F",
    npReward: 50,
    maxCompletions: 1,
    eventOnly: true
  },
  first_research: {
    label: "\u751F\u6210\u5206\u6790\u62A5\u544A",
    description: "\u751F\u6210\u4E00\u4EFD\u4EE3\u5E01\u5206\u6790\u62A5\u544A\uFF08\u9700\u5148\u7ED1\u5B9A\u9080\u8BF7\u4EBA\uFF09",
    npReward: 200,
    maxCompletions: 1,
    eventOnly: true
  },
  daily_login: {
    label: "\u6BCF\u65E5\u7B7E\u5230",
    description: "\u6BCF\u5929\u7B7E\u5230\uFF0C\u8FDE\u7EED\u7B7E\u5230\u5956\u52B1\u9012\u589E",
    npReward: 10,
    maxCompletions: 999999,
    daily: 1
  },
  // 邀请好友奖励不走任务中心：绑定时邀请人 +100(referral.ts)，
  // 高价值里程碑(开会员/建群等)另发(referralRewards.ts)，避免与任务奖叠加。
  // ── 每日轻松任务（1～3 次即可做完，真实行为触发，eventOnly）──
  chat_daily: {
    label: "\u53D1\u4E00\u6761\u6D88\u606F",
    description: "\u5728\u7FA4\u804A\u6216\u79C1\u4FE1\u91CC\u53D1\u4E00\u6761\u6D88\u606F\uFF08\u6BCF\u65E5 1 \u6B21\uFF09",
    npReward: 15,
    maxCompletions: 999999,
    daily: 1,
    eventOnly: true
  },
  like_given: {
    label: "\u7ED9\u52A8\u6001\u70B9\u4E2A\u8D5E",
    description: "\u5728\u5E7F\u573A\u7ED9\u522B\u4EBA\u7684\u52A8\u6001\u70B9\u8D5E\uFF08\u6BCF\u65E5 3 \u6B21\uFF09",
    npReward: 10,
    maxCompletions: 999999,
    daily: 3,
    eventOnly: true
  },
  follow_daily: {
    label: "\u5173\u6CE8\u4E00\u4F4D\u7528\u6237",
    description: "\u5173\u6CE8\u4E00\u4F4D\u4F60\u611F\u5174\u8DA3\u7684\u4EBA\uFF08\u6BCF\u65E5 1 \u6B21\uFF09",
    npReward: 15,
    maxCompletions: 999999,
    daily: 1,
    eventOnly: true
  },
  join_group_daily: {
    label: "\u52A0\u5165\u4E00\u4E2A\u793E\u533A",
    description: "\u5728\u53D1\u73B0\u9875\u52A0\u5165\u4E00\u4E2A\u516C\u5F00\u793E\u533A\uFF08\u6BCF\u65E5 1 \u6B21\uFF09",
    npReward: 15,
    maxCompletions: 999999,
    daily: 1,
    eventOnly: true
  },
  watchlist_daily: {
    label: "\u6DFB\u52A0\u4E00\u4E2A\u81EA\u9009",
    description: "\u5728 AI \u5206\u6790\u9875\u628A\u4EE3\u5E01\u52A0\u5165\u81EA\u9009\uFF08\u6BCF\u65E5 1 \u6B21\uFF09",
    npReward: 10,
    maxCompletions: 999999,
    daily: 1,
    eventOnly: true
  },
  predict_daily: {
    label: "\u731C\u4E00\u6B21\u6DA8\u8DCC",
    description: "\u7528 IT \u731C\u4E00\u6B21 BTC / ETH \u6DA8\u8DCC\uFF08\u6BCF\u65E5 1 \u6B21\uFF0C\u9700\u5148\u7ED1\u5B9A\u9080\u8BF7\u4EBA\uFF09",
    npReward: 20,
    maxCompletions: 999999,
    daily: 1,
    eventOnly: true
  },
  // ── 每日可重复任务（产出受每日上限约束；仅服务端事件触发，eventOnly）──
  post_daily: {
    label: "\u53D1\u5E03\u52A8\u6001",
    description: "\u5728\u5E7F\u573A\u53D1\u5E03\u52A8\u6001\uFF08\u6BCF\u65E5 3 \u6B21\uFF09",
    npReward: 30,
    maxCompletions: 999999,
    daily: 3,
    eventOnly: true
  },
  like_received: {
    label: "\u5185\u5BB9\u83B7\u8D5E",
    description: "\u4F60\u7684\u5185\u5BB9\u88AB\u70B9\u8D5E\uFF08\u6BCF\u65E5 20 \u6B21\uFF09",
    npReward: 5,
    maxCompletions: 999999,
    daily: 20,
    eventOnly: true
  },
  comment_made: {
    label: "\u6709\u6548\u8BC4\u8BBA",
    description: "\u53D1\u8868\u6709\u4EF7\u503C\u7684\u8BC4\u8BBA\uFF08\u6BCF\u65E5 10 \u6B21\uFF09",
    npReward: 10,
    maxCompletions: 999999,
    daily: 10,
    eventOnly: true
  },
  research_daily: {
    label: "\u5206\u6790\u62A5\u544A",
    description: "\u751F\u6210\u5206\u6790\u62A5\u544A\uFF08\u6BCF\u65E5 3 \u6B21\uFF0C\u9700\u5148\u7ED1\u5B9A\u9080\u8BF7\u4EBA\uFF09",
    npReward: 50,
    maxCompletions: 999999,
    daily: 3,
    eventOnly: true
  }
};
var userRouter = router({
  // ─── Get current user profile ──────────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      role: users.role,
      walletAddress: users.walletAddress,
      walletChain: users.walletChain,
      avatar: users.avatar,
      bio: users.bio,
      username: users.username,
      npPoints: users.npPoints,
      isBot: users.isBot,
      inviteCode: users.inviteCode,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn
    }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    return result[0] ?? null;
  }),
  // ─── Update profile ────────────────────────────────────────────────────────
  updateProfile: protectedProcedure.input(
    z4.object({
      name: z4.string().min(1).max(50).optional(),
      username: z4.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores").optional(),
      bio: z4.string().max(200).optional(),
      avatar: z4.string().max(500).optional()
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const updateData = {};
    if (input.name !== void 0) updateData.name = sanitizeInput(input.name, 50);
    if (input.username !== void 0) updateData.username = sanitizeUsername(input.username);
    if (input.bio !== void 0) updateData.bio = sanitizeInput(input.bio, 200);
    if (input.avatar !== void 0) updateData.avatar = input.avatar;
    await db.update(users).set(updateData).where(eq11(users.id, ctx.user.id));
    const updated = await db.select().from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    const u = updated[0];
    if (u && (u.name || u.username) && u.avatar) {
      await _completeTask(ctx.user.id, "complete_profile", db);
    }
    return { success: true };
  }),
  // ─── Upload avatar to S3 ─────────────────────────────────────────────────
  uploadAvatar: protectedProcedure.input(
    z4.object({
      fileData: z4.string().max(6e6),
      // ~4.5MB base64
      mimeType: z4.string().max(100)
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const { fileData, mimeType } = input;
    const raw = Buffer.from(fileData, "base64");
    if (raw.length > 4 * 1024 * 1024) {
      throw new Error("\u5934\u50CF\u56FE\u7247\u4E0D\u80FD\u8D85\u8FC7 4MB");
    }
    const { downscaleImage: downscaleImage2 } = await Promise.resolve().then(() => (init_image(), image_exports));
    const { buffer, mime } = await downscaleImage2(raw, 512, 85, mimeType);
    const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const key = `avatars/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
    const { url } = await storagePut(key, buffer, mime);
    const db = await getDb();
    if (db) {
      await db.update(users).set({ avatar: url }).where(eq11(users.id, ctx.user.id));
      const [u] = await db.select({ name: users.name, username: users.username, avatar: users.avatar }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
      if (u && (u.name || u.username) && u.avatar) {
        await _completeTask(ctx.user.id, "complete_profile", db);
      }
    }
    return { url };
  }),
  // ─── 公开名片:下载落地页给未登录访客显示"XXX 邀请你加为好友"。只暴露昵称+头像(本就在 searchUsers 公开) ──
  getPublicCard: publicProcedure.input(z4.object({ userId: z4.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const [u] = await db.select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar }).from(users).where(eq11(users.id, input.userId)).limit(1);
    if (!u) return null;
    return { id: u.id, name: u.name || u.username || "\u7528\u6237", avatar: u.avatar ?? null };
  }),
  // ─── Get leaderboard ──────────────────────────────────────────────────────
  leaderboard: publicProcedure.input(
    z4.object({
      limit: z4.number().min(1).max(100).default(50)
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const limit = input?.limit ?? 50;
    const rows = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      npPoints: users.npPoints,
      walletAddress: users.walletAddress
    }).from(users).orderBy(desc3(users.npPoints)).limit(limit);
    return rows.map((u, idx) => {
      const { walletAddress, ...pub } = u;
      return {
        ...pub,
        rank: idx + 1,
        displayName: pub.name ?? pub.username ?? `User #${u.id}`,
        shortAddress: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null
      };
    });
  }),
  // ─── Get current user's rank ───────────────────────────────────────────────
  myRank: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [me] = await db.select({ npPoints: users.npPoints }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    if (!me) return null;
    const [{ count: count8 }] = await db.select({ count: sql6`COUNT(*)` }).from(users).where(sql6`npPoints > ${me.npPoints}`);
    return {
      rank: Number(count8) + 1,
      npPoints: me.npPoints
    };
  }),
  // ─── Get task status for current user ─────────────────────────────────────
  // ─── 管理员：用户封禁 ─────────────────────────────────────────────
  adminGetUser: adminProcedure.input(z4.object({ userId: z4.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const [u] = await db.select({ id: users.id, name: users.name, username: users.username, role: users.role, isBanned: users.isBanned, npPoints: users.npPoints }).from(users).where(eq11(users.id, input.userId)).limit(1);
    return u ?? null;
  }),
  setBanned: adminProcedure.input(z4.object({ userId: z4.number(), banned: z4.boolean() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.user.id) throw new TRPCError6({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u5C01\u7981\u81EA\u5DF1" });
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    if (input.banned) {
      const [target] = await db.select({ id: users.id, role: users.role, isBot: users.isBot }).from(users).where(eq11(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError6({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      if (isAppAdmin(target) || target.isBot) throw new TRPCError6({ code: "FORBIDDEN", message: "\u4E0D\u80FD\u5C01\u7981\u7BA1\u7406\u5458\u6216\u7CFB\u7EDF\u673A\u5668\u4EBA" });
    }
    await db.update(users).set({ isBanned: input.banned }).where(eq11(users.id, input.userId));
    if (!input.banned) {
      try {
        await db.delete(contentViolations).where(eq11(contentViolations.userId, input.userId));
      } catch {
      }
    }
    return { success: true, banned: input.banned };
  }),
  // ─── 管理员：内容违规记录（毒品/赌博/贩卖 等拦截记录，供审查封号）──────────
  adminListViolations: adminProcedure.input(z4.object({ userId: z4.number().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: contentViolations.id,
      userId: contentViolations.userId,
      category: contentViolations.category,
      source: contentViolations.source,
      snippet: contentViolations.snippet,
      createdAt: contentViolations.createdAt,
      userName: users.name,
      isBanned: users.isBanned
    }).from(contentViolations).leftJoin(users, eq11(users.id, contentViolations.userId)).where(input?.userId ? eq11(contentViolations.userId, input.userId) : void 0).orderBy(desc3(contentViolations.createdAt)).limit(100);
    return rows;
  }),
  // ─── 管理员：任务奖励配置 ─────────────────────────────────────────
  adminGetTaskRewards: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const overrides = await getTaskRewardOverrides(db);
    return Object.entries(TASK_DEFINITIONS).map(([taskType, def]) => ({
      taskType,
      label: def.label,
      npReward: Number.isFinite(overrides[taskType]) ? overrides[taskType] : def.npReward,
      defaultReward: def.npReward
    }));
  }),
  setTaskRewards: adminProcedure.input(z4.object({ rewards: z4.record(z4.string(), z4.number().int().min(0).max(1e5)) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const clean = {};
    for (const [k, v] of Object.entries(input.rewards)) {
      if (TASK_DEFINITIONS[k] && Number.isFinite(v)) clean[k] = v;
    }
    const json = JSON.stringify(clean);
    const existing = await db.select({ id: appConfig.id }).from(appConfig).where(eq11(appConfig.platform, "all")).limit(1);
    if (existing.length > 0) {
      await db.update(appConfig).set({ taskRewards: json }).where(eq11(appConfig.platform, "all"));
    } else {
      await db.insert(appConfig).values({ platform: "all", taskRewards: json });
    }
    return { success: true };
  }),
  getTaskStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rewardOverrides = await getTaskRewardOverrides(db);
    const completedTasks = await db.select({
      taskType: userTasks.taskType,
      completedAt: userTasks.completedAt,
      npEarned: userTasks.npEarned
    }).from(userTasks).where(eq11(userTasks.userId, ctx.user.id)).orderBy(desc3(userTasks.completedAt));
    const completionCount = {};
    const todayCount = {};
    const todayStart = startOfShanghaiDay(ymdShanghai());
    completedTasks.forEach((t3) => {
      completionCount[t3.taskType] = (completionCount[t3.taskType] ?? 0) + 1;
      if (t3.completedAt && new Date(t3.completedAt) >= todayStart) {
        todayCount[t3.taskType] = (todayCount[t3.taskType] ?? 0) + 1;
      }
    });
    return Object.entries(TASK_DEFINITIONS).map(([taskType, def]) => {
      const completed = completionCount[taskType] ?? 0;
      const todayDone = todayCount[taskType] ?? 0;
      const isDaily = typeof def.daily === "number";
      const isCompleted = isDaily ? todayDone >= def.daily : completed >= def.maxCompletions;
      const lastCompleted = completedTasks.find((t3) => t3.taskType === taskType);
      const npReward = Number.isFinite(rewardOverrides[taskType]) ? rewardOverrides[taskType] : def.npReward;
      return {
        taskType,
        label: def.label,
        description: def.description,
        npReward,
        maxCompletions: def.maxCompletions,
        completions: completed,
        isCompleted,
        // 前端用：每日任务次数 + 今日进度；事件型任务不显示"领取"按钮（系统自动发放）
        daily: def.daily ?? null,
        eventOnly: def.eventOnly ?? false,
        todayCompletions: todayDone,
        lastCompletedAt: lastCompleted?.completedAt ?? null,
        totalEarned: completedTasks.filter((t3) => t3.taskType === taskType).reduce((s, t3) => s + t3.npEarned, 0)
      };
    });
  }),
  // ─── Complete a task ───────────────────────────────────────────────────────
  completeTask: protectedProcedure.input(z4.object({ taskType: z4.string().max(50) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const def = TASK_DEFINITIONS[input.taskType];
    if (!def) throw new Error("Unknown task type");
    if (def.eventOnly) throw new TRPCError6({ code: "FORBIDDEN", message: "\u8BE5\u4EFB\u52A1\u7531\u7CFB\u7EDF\u81EA\u52A8\u53D1\u653E" });
    return _completeTask(ctx.user.id, input.taskType, db);
  }),
  // ─── 上报设备指纹（防多号撸AC；App 启动后调用）────────────────────────────────
  reportDevice: protectedProcedure.input(z4.object({ deviceId: z4.string().min(8).max(64) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { ok: false };
    await db.update(users).set({ deviceId: input.deviceId.trim() }).where(eq11(users.id, ctx.user.id));
    return { ok: true };
  }),
  // ─── 意见反馈（help.tsx 反馈表单的真实落库）─────────────────────────────────────
  submitFeedback: protectedProcedure.input(z4.object({
    content: z4.string().min(1).max(1e3),
    contact: z4.string().max(120).optional(),
    appVersion: z4.string().max(24).optional(),
    platform: z4.string().max(16).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const content = sanitizeInput(input.content, 1e3).trim();
    if (!content) throw new TRPCError6({ code: "BAD_REQUEST", message: "\u53CD\u9988\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" });
    await db.insert(feedback).values({
      userId: ctx.user.id,
      content,
      contact: input.contact ? sanitizeInput(input.contact, 120) : null,
      appVersion: input.appVersion ? sanitizeInput(input.appVersion, 24) : null,
      platform: input.platform ? sanitizeInput(input.platform, 16) : null
    });
    return { ok: true };
  }),
  adminListFeedback: adminProcedure.input(z4.object({ status: z4.enum(["new", "read", "resolved"]).optional(), limit: z4.number().min(1).max(200).default(100) }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conds = input?.status ? [eq11(feedback.status, input.status)] : [];
    return db.select().from(feedback).where(conds.length ? and9(...conds) : void 0).orderBy(desc3(feedback.createdAt)).limit(input?.limit ?? 100);
  }),
  adminSetFeedbackStatus: adminProcedure.input(z4.object({ id: z4.number(), status: z4.enum(["new", "read", "resolved"]) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(feedback).set({ status: input.status }).where(eq11(feedback.id, input.id));
    return { ok: true };
  }),
  // ─── 段位状态（累积贡献值 / 当前段位 / 加成 / 每日奖励 / 下一段进度 / 我的网体）──────
  getRankStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [u] = await db.select({ score: users.rankScore, tier: users.rankTier, reputation: users.reputation }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    const score = u?.score ?? 0;
    const tier = u?.tier ?? 0;
    const next = tier < RANK_TIERS.length ? RANK_TIERS[tier] : null;
    const refRows = await db.select({ inviteeId: referrals.inviteeId, referrerId: referrals.referrerId }).from(referrals).where(eq11(referrals.status, "active"));
    const children = /* @__PURE__ */ new Map();
    for (const r of refRows) {
      if (!children.has(r.referrerId)) children.set(r.referrerId, []);
      children.get(r.referrerId).push(r.inviteeId);
    }
    const team = [];
    const seen = /* @__PURE__ */ new Set([ctx.user.id]);
    let frontier = children.get(ctx.user.id) ?? [];
    let directCount = frontier.length;
    while (frontier.length > 0 && team.length < 5e4) {
      const nextFrontier = [];
      for (const id of frontier) {
        if (seen.has(id)) continue;
        seen.add(id);
        team.push(id);
        for (const c of children.get(id) ?? []) nextFrontier.push(c);
      }
      frontier = nextFrontier;
    }
    let teamActiveToday = 0;
    if (team.length > 0) {
      const todayStart = startOfShanghaiDay(ymdShanghai());
      const batch = team.slice(0, 1e4);
      const [{ c: activeC = 0 } = { c: 0 }] = await db.select({ c: sql6`COUNT(DISTINCT ${userTasks.userId})` }).from(userTasks).where(and9(inArray5(userTasks.userId, batch), gte4(userTasks.completedAt, todayStart)));
      teamActiveToday = Number(activeC);
    }
    const bitAirdrop = bitAirdropSchedule();
    const claimStatus = await getBitAirdropClaimStatus(db, ctx.user.id, tier);
    const myBitAirdropEstimate = claimStatus.estimatedBit > 0 ? claimStatus.estimatedBit : tier >= 1 ? bitAirdrop.tierPot : 0;
    return {
      score,
      tier,
      tierName: tier >= 1 ? RANK_TIERS[tier - 1].name : "\u65E0\u6BB5\u4F4D",
      bonusPct: Math.round(tierBonus(tier) * 100),
      reputationBonusPct: Math.round(reputationBonus(u?.reputation ?? 0) * 100),
      dailyBonus: tierDaily(tier),
      nextTierName: next?.name ?? null,
      nextTierAt: next?.min ?? null,
      // 我的网体仪表盘
      teamSize: team.length,
      teamDirect: directCount,
      teamActiveToday,
      tiers: RANK_TIERS.map((t3, i) => ({ idx: i + 1, name: t3.name, min: t3.min, bonusPct: Math.round(t3.bonus * 100), daily: t3.daily })),
      // BIT 段位空投：捐献 IT 后领取（V1=1000 … V10=10000）
      bitAirdrop: {
        ...bitAirdrop,
        myTierPot: myBitAirdropEstimate,
        itCost: claimStatus.itCost,
        estimatedBit: claimStatus.estimatedBit,
        claimedToday: claimStatus.claimedToday,
        claimedBit: claimStatus.claimedBit,
        claimedItCost: claimStatus.claimedItCost,
        canClaim: claimStatus.canClaim,
        claimReason: claimStatus.reason,
        note: "\u6350\u732E\u5BF9\u5E94\u6BB5\u4F4D IT \u540E\u9886\u53D6\u5F53\u65E5 BIT \u7A7A\u6295\uFF1B\u65E5\u989D\u5EA6\u5747\u5206 10 \u6BB5\u4F4D\uFF0C\u540C\u6BB5\u4F4D\u6D3B\u8DC3\u7528\u6237\u5747\u5206"
      }
    };
  }),
  // ─── 捐献 IT 领取当日 BIT 段位空投 ───────────────────────────────────────────
  claimBitAirdrop: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    try {
      return await claimBitRankAirdrop(db, ctx.user.id);
    } catch (e) {
      const err = e;
      const code = err.code === "CONFLICT" ? "CONFLICT" : err.code === "FORBIDDEN" ? "FORBIDDEN" : err.code === "INTERNAL_SERVER_ERROR" ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST";
      throw new TRPCError6({ code, message: err.message || "\u9886\u53D6\u5931\u8D25" });
    }
  }),
  // ─── BIT ↔ IT 互转（100 IT = 1 BIT）────────────────────────────────────────
  convertCurrency: protectedProcedure.input(z4.object({
    direction: z4.enum(["it_to_bit", "bit_to_it"]),
    amount: z4.number().int().positive().max(1e7)
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    if (input.direction === "it_to_bit") {
      if (input.amount % IT_PER_BIT !== 0) {
        throw new TRPCError6({ code: "BAD_REQUEST", message: `IT \u6570\u91CF\u9700\u4E3A ${IT_PER_BIT} \u7684\u6574\u6570\u500D` });
      }
      const bitOut = Math.floor(input.amount / IT_PER_BIT);
      if (bitOut <= 0) throw new TRPCError6({ code: "BAD_REQUEST", message: "\u6570\u91CF\u8FC7\u5C0F" });
      try {
        await db.transaction(async (tx) => {
          const spent = await tx.update(users).set({ npPoints: sql6`${users.npPoints} - ${input.amount}` }).where(and9(eq11(users.id, ctx.user.id), sql6`${users.npPoints} >= ${input.amount}`));
          const affected2 = spent?.[0]?.affectedRows ?? spent?.affectedRows ?? spent?.rowsAffected ?? 0;
          if (affected2 <= 0) throw new Error("INSUFFICIENT_IT");
          const ok = await grantNN(tx, ctx.user.id, bitOut, { type: "convert_it_to_bit", memo: `${input.amount}IT` });
          if (!ok) throw new Error("TREASURY");
        });
      } catch (e) {
        if (e?.message === "INSUFFICIENT_IT") throw new TRPCError6({ code: "BAD_REQUEST", message: "IT \u4F59\u989D\u4E0D\u8DB3" });
        if (e?.message === "TREASURY") throw new TRPCError6({ code: "BAD_REQUEST", message: "BIT \u91D1\u5E93\u4E0D\u8DB3\uFF0C\u5151\u6362\u5931\u8D25\u5DF2\u9000\u56DE IT" });
        throw e;
      }
    } else {
      const itOut = input.amount * IT_PER_BIT;
      try {
        await db.transaction(async (tx) => {
          const ok = await spendNN(tx, ctx.user.id, input.amount, { type: "convert_bit_to_it", memo: `${itOut}IT` });
          if (!ok) throw new Error("INSUFFICIENT_BIT");
          await tx.update(users).set({ npPoints: sql6`${users.npPoints} + ${itOut}` }).where(eq11(users.id, ctx.user.id));
        });
      } catch (e) {
        if (e?.message === "INSUFFICIENT_BIT") throw new TRPCError6({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3" });
        throw e;
      }
    }
    const [u] = await db.select({ npPoints: users.npPoints, nnBalance: users.nnBalance }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    return { ok: true, it: u?.npPoints ?? 0, bit: Number(u?.nnBalance ?? 0), rate: IT_PER_BIT };
  }),
  // ─── 用户间转账 BIT / IT ────────────────────────────────────────────────────
  transferCurrency: protectedProcedure.input(z4.object({
    currency: z4.enum(["it", "bit"]),
    toUserId: z4.number().int().positive(),
    amount: z4.number().int().positive().max(1e7),
    memo: z4.string().max(80).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    if (input.toUserId === ctx.user.id) {
      throw new TRPCError6({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8F6C\u7ED9\u81EA\u5DF1" });
    }
    if (input.currency === "it" && input.amount > TRANSFER_MAX_IT) {
      throw new TRPCError6({ code: "BAD_REQUEST", message: `\u5355\u7B14 IT \u6700\u591A ${TRANSFER_MAX_IT.toLocaleString()}` });
    }
    if (input.currency === "bit" && input.amount > TRANSFER_MAX_BIT) {
      throw new TRPCError6({ code: "BAD_REQUEST", message: `\u5355\u7B14 BIT \u6700\u591A ${TRANSFER_MAX_BIT.toLocaleString()}` });
    }
    const [to] = await db.select({ id: users.id, name: users.name, username: users.username, isBanned: users.isBanned }).from(users).where(eq11(users.id, input.toUserId)).limit(1);
    if (!to) throw new TRPCError6({ code: "NOT_FOUND", message: "\u6536\u6B3E\u7528\u6237\u4E0D\u5B58\u5728" });
    if (to.isBanned) throw new TRPCError6({ code: "BAD_REQUEST", message: "\u6536\u6B3E\u7528\u6237\u4E0D\u53EF\u7528" });
    const memo = sanitizeInput(input.memo?.trim() || "", 80) || void 0;
    const toName = to.name ?? to.username ?? `\u7528\u6237 #${to.id}`;
    const fromName = ctx.user.name ?? ctx.user.username ?? `\u7528\u6237 #${ctx.user.id}`;
    if (input.currency === "it") {
      try {
        await db.transaction(async (tx) => {
          const spent = await tx.update(users).set({ npPoints: sql6`${users.npPoints} - ${input.amount}` }).where(and9(eq11(users.id, ctx.user.id), sql6`${users.npPoints} >= ${input.amount}`));
          const affected2 = spent?.[0]?.affectedRows ?? spent?.affectedRows ?? spent?.rowsAffected ?? 0;
          if (affected2 <= 0) throw new Error("INSUFFICIENT_IT");
          await tx.update(users).set({ npPoints: sql6`${users.npPoints} + ${input.amount}` }).where(eq11(users.id, input.toUserId));
          await tx.insert(itTransactions).values({
            userId: ctx.user.id,
            amount: -input.amount,
            type: "transfer_out",
            refType: "user",
            refId: input.toUserId,
            memo: memo ?? `to#${input.toUserId}`
          });
          await tx.insert(itTransactions).values({
            userId: input.toUserId,
            amount: input.amount,
            type: "transfer_in",
            refType: "user",
            refId: ctx.user.id,
            memo: memo ?? `from#${ctx.user.id}`
          });
        });
      } catch (e) {
        if (e?.message === "INSUFFICIENT_IT") {
          throw new TRPCError6({ code: "BAD_REQUEST", message: "IT \u4F59\u989D\u4E0D\u8DB3" });
        }
        throw e;
      }
    } else {
      const ok = await transferNN(db, ctx.user.id, input.toUserId, input.amount, memo ?? `to ${toName}`);
      if (!ok) throw new TRPCError6({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3" });
    }
    const symbol = input.currency === "it" ? "IT" : "BIT";
    void createNotification({
      db,
      targetUserId: input.toUserId,
      fromUserId: ctx.user.id,
      fromUserName: fromName,
      fromUserAvatar: ctx.user.avatar ?? "",
      type: "system",
      content: `${fromName} \u5411\u4F60\u8F6C\u8D26 ${input.amount.toLocaleString()} ${symbol}${memo ? `\uFF1A${memo}` : ""}`
    }).catch(() => {
    });
    const [u] = await db.select({ npPoints: users.npPoints, nnBalance: users.nnBalance }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    return {
      ok: true,
      currency: input.currency,
      amount: input.amount,
      toUserId: input.toUserId,
      toName,
      it: u?.npPoints ?? 0,
      bit: Number(u?.nnBalance ?? 0)
    };
  }),
  /** BIT / IT 转账记录（本人视角） */
  listTransfers: protectedProcedure.input(z4.object({ limit: z4.number().int().min(1).max(100).default(50) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const limit = input?.limit ?? 50;
    const [itRows, bitRows] = await Promise.all([
      db.select().from(itTransactions).where(eq11(itTransactions.userId, ctx.user.id)).orderBy(desc3(itTransactions.createdAt)).limit(limit),
      db.select().from(nnTransactions).where(and9(
        eq11(nnTransactions.userId, ctx.user.id),
        inArray5(nnTransactions.type, ["transfer_in", "transfer_out"])
      )).orderBy(desc3(nnTransactions.createdAt)).limit(limit)
    ]);
    const rows = [
      ...itRows.map((r) => ({
        id: `it-${r.id}`,
        currency: "it",
        amount: r.amount,
        type: r.type,
        peerId: r.refId ?? null,
        memo: r.memo ?? null,
        createdAt: r.createdAt
      })),
      ...bitRows.map((r) => ({
        id: `bit-${r.id}`,
        currency: "bit",
        amount: r.amount,
        type: r.type,
        peerId: r.refId ?? null,
        memo: r.memo ?? null,
        createdAt: r.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows.slice(0, limit);
  }),
  // ─── 管理员：手动触发某日段位聚合（测试/补算用；幂等）────────────────────────────
  adminRunRankAgg: adminProcedure.input(z4.object({ ymd: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return runRankAggregation(db, input.ymd);
  }),
  // ─── Get user stats (posts count, tasks completed, rank) ───────────────────────────
  // ─── Search users ─────────────────────────────────────────────────────────
  // 纯数字 query → 按唯一 ID 精确查找（移动端好友搜索走这条：用户名可重复，ID 唯一）
  // 非数字 query → 按昵称/用户名模糊匹配（保留给 Web 端等按名字搜人的入口）
  searchUsers: protectedProcedure.input(z4.object({ query: z4.string().min(1).max(50) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const raw = input.query.trim();
    if (!raw) return [];
    const cols = {
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio
    };
    if (!/^\d+$/.test(raw)) return [];
    const idNum = Number(raw);
    if (!Number.isSafeInteger(idNum) || idNum <= 0) return [];
    const rows = await db.select(cols).from(users).where(and9(ne2(users.id, ctx.user.id), eq11(users.id, idNum))).limit(1);
    const out = [];
    for (const u of rows) {
      const visible = await canViewFullProfile(db, ctx.user.id, u.id);
      out.push({
        id: u.id,
        name: u.name ?? u.username ?? `User #${u.id}`,
        username: u.username,
        avatar: u.avatar,
        bio: visible ? u.bio : null
      });
    }
    return out;
  }),
  // ─── Invite leaderboard (by referral count) ────────────────────────────
  inviteLeaderboard: publicProcedure.input(z4.object({ limit: z4.number().min(1).max(100).default(50) }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const limit = input?.limit ?? 50;
    const rows = await db.select({
      referrerId: referrals.referrerId,
      cnt: count()
    }).from(referrals).where(eq11(referrals.status, "active")).groupBy(referrals.referrerId).orderBy(desc3(count())).limit(limit);
    if (rows.length === 0) return [];
    const userIds = rows.map((r) => r.referrerId);
    const userRows = await db.select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar }).from(users).where(sql6`${users.id} IN (${sql6.join(userIds.map((id) => sql6`${id}`), sql6`, `)})`);
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    return rows.map((r, idx) => {
      const u = userMap.get(r.referrerId);
      return {
        rank: idx + 1,
        displayName: u?.name ?? u?.username ?? `User #${r.referrerId}`,
        avatar: u?.avatar ?? "\u{1F464}",
        inviteCount: r.cnt
      };
    });
  }),
  // ─── Profit leaderboard (by closed position count as proxy) ────────────
  profitLeaderboard: publicProcedure.input(z4.object({ limit: z4.number().min(1).max(100).default(50) }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const limit = input?.limit ?? 50;
    const rows = await db.select({
      userId: tradingPositions.userId,
      tradeCount: count()
    }).from(tradingPositions).where(eq11(tradingPositions.status, "closed")).groupBy(tradingPositions.userId).orderBy(desc3(count())).limit(limit);
    if (rows.length === 0) return [];
    const userIds = rows.map((r) => r.userId);
    const userRows = await db.select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar }).from(users).where(sql6`${users.id} IN (${sql6.join(userIds.map((id) => sql6`${id}`), sql6`, `)})`);
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    return rows.map((r, idx) => {
      const u = userMap.get(r.userId);
      return {
        rank: idx + 1,
        displayName: u?.name ?? u?.username ?? `User #${r.userId}`,
        avatar: u?.avatar ?? "\u{1F464}",
        tradeCount: r.tradeCount
      };
    });
  }),
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [postCountRow] = await db.select({ count: count() }).from(posts).where(eq11(posts.authorId, ctx.user.id));
    const [taskCountRow] = await db.select({ count: count() }).from(userTasks).where(eq11(userTasks.userId, ctx.user.id));
    const [userRow] = await db.select({ npPoints: users.npPoints }).from(users).where(eq11(users.id, ctx.user.id)).limit(1);
    const [rankRow] = await db.select({ count: count() }).from(users).where(sql6`npPoints > ${userRow?.npPoints ?? 0}`);
    return {
      postCount: postCountRow?.count ?? 0,
      taskCount: taskCountRow?.count ?? 0,
      npPoints: userRow?.npPoints ?? 0,
      rank: (rankRow?.count ?? 0) + 1
    };
  })
});
async function _completeTask(userId, taskType, db) {
  const def = TASK_DEFINITIONS[taskType];
  if (!def) return { success: false, npEarned: 0, alreadyCompleted: false };
  if (REQUIRES_BINDING.has(taskType) && !isAppAdmin({ id: userId }) && !await isReferralBound(db, userId)) {
    return { success: false, npEarned: 0, alreadyCompleted: false };
  }
  const overrides = await getTaskRewardOverrides(db);
  let reward = Number.isFinite(overrides[taskType]) ? overrides[taskType] : def.npReward;
  const isDaily = typeof def.daily === "number";
  const capped = false;
  let granted = 0;
  let blocked = false;
  await db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: users.id, role: users.role }).from(users).where(eq11(users.id, userId)).for("update").limit(1);
    const admin = isAppAdmin({ id: userId, role: locked?.role });
    if (!admin) {
      if (isDaily) {
        const todayStart = startOfShanghaiDay(ymdShanghai());
        const [{ c: todayCount } = { c: 0 }] = await tx.select({ c: count() }).from(userTasks).where(and9(eq11(userTasks.userId, userId), eq11(userTasks.taskType, taskType), gte4(userTasks.completedAt, todayStart)));
        if (Number(todayCount) >= def.daily) {
          blocked = true;
          return;
        }
      } else {
        const existing = await tx.select({ id: userTasks.id }).from(userTasks).where(and9(eq11(userTasks.userId, userId), eq11(userTasks.taskType, taskType)));
        if (existing.length >= def.maxCompletions) {
          blocked = true;
          return;
        }
      }
    }
    let newStreak = null;
    if (taskType === "daily_login") {
      const [u] = await tx.select({ streak: users.signinStreak, last: users.lastSigninYmd }).from(users).where(eq11(users.id, userId)).limit(1);
      const yesterday = ymdShanghai(new Date(Date.now() - 864e5));
      newStreak = u?.last === yesterday ? (u.streak ?? 0) + 1 : 1;
      reward = signinStreakReward(newStreak);
    }
    granted = await creditNp(tx, userId, reward, capped);
    if (taskType === "daily_login" && newStreak != null) {
      await tx.update(users).set({ signinStreak: newStreak, lastSigninYmd: ymdShanghai() }).where(eq11(users.id, userId));
    }
    await tx.insert(userTasks).values({ userId, taskType, npEarned: granted });
  });
  if (blocked) return { success: false, npEarned: 0, alreadyCompleted: true };
  return { success: true, npEarned: granted, alreadyCompleted: false };
}
async function awardTaskEvent(db, userId, taskType) {
  try {
    const r = await _completeTask(userId, taskType, db);
    return r.npEarned;
  } catch {
    return 0;
  }
}

// server/routers/wallet.ts
var BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/"
];
var BSCSCAN_V2_API = "https://api.bscscan.com/v2/api";
var BSCSCAN_KEY = process.env.BSCSCAN_API_KEY ?? "";
var BSC_KNOWN_TOKENS = [
  { symbol: "USDT", name: "Tether USD", contractAddress: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, cgId: "tether" },
  { symbol: "USDC", name: "USD Coin", contractAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, cgId: "usd-coin" },
  { symbol: "BUSD", name: "Binance USD", contractAddress: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, cgId: "binance-usd" },
  { symbol: "CAKE", name: "PancakeSwap Token", contractAddress: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, cgId: "pancakeswap-token" },
  { symbol: "ETH", name: "Ethereum (BSC)", contractAddress: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, cgId: "ethereum" },
  { symbol: "BTC", name: "Bitcoin (BSC)", contractAddress: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, cgId: "bitcoin" },
  { symbol: "XRP", name: "XRP Token (BSC)", contractAddress: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, cgId: "ripple" },
  { symbol: "ADA", name: "Cardano Token (BSC)", contractAddress: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18, cgId: "cardano" },
  { symbol: "DOT", name: "Polkadot Token (BSC)", contractAddress: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", decimals: 18, cgId: "polkadot" },
  { symbol: "LINK", name: "Chainlink (BSC)", contractAddress: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, cgId: "chainlink" },
  { symbol: "LTC", name: "Litecoin Token (BSC)", contractAddress: "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94", decimals: 18, cgId: "litecoin" },
  { symbol: "MATIC", name: "Polygon (BSC)", contractAddress: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD", decimals: 18, cgId: "matic-network" },
  { symbol: "DOGE", name: "Dogecoin (BSC)", contractAddress: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8, cgId: "dogecoin" },
  { symbol: "SOL", name: "Solana (BSC)", contractAddress: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, cgId: "solana" },
  { symbol: "AVAX", name: "Avalanche (BSC)", contractAddress: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, cgId: "avalanche-2" }
];
async function callBscRpc(method, params) {
  for (const endpoint of BSC_RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: AbortSignal.timeout(6e3)
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) continue;
      return json.result ?? null;
    } catch {
    }
  }
  return null;
}
function encodeBalanceOf(address) {
  const addr = address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  return "0x70a08231" + addr;
}
async function fetchBscScanV2(params) {
  if (!BSCSCAN_KEY) return null;
  try {
    const url = new URL(BSCSCAN_V2_API);
    Object.entries({ ...params, chainid: "56", apikey: BSCSCAN_KEY }).forEach(
      ([k, v]) => url.searchParams.set(k, v)
    );
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8e3) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
var walletRouter = router({
  //
  updateAddress: protectedProcedure.input(
    z5.object({
      address: z5.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
      chain: z5.string().default("BSC")
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [taken] = await db.select({ id: users.id }).from(users).where(sql7`LOWER(${users.walletAddress}) = LOWER(${input.address}) AND ${users.id} != ${ctx.user.id}`).limit(1);
    if (taken) throw new Error("\u8BE5\u94B1\u5305\u5730\u5740\u5DF2\u88AB\u5176\u4ED6\u8D26\u53F7\u7ED1\u5B9A");
    await db.update(users).set({ walletAddress: input.address, walletChain: input.chain }).where(eq12(users.id, ctx.user.id));
    await awardTaskEvent(db, ctx.user.id, "connect_wallet");
    return { success: true };
  }),
  // 解绑钱包（清空地址；TGE/空投领取需有效绑定，届时再校验所有权）
  unbindAddress: protectedProcedure.use(rateLimitWrite).mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(users).set({ walletAddress: null }).where(eq12(users.id, ctx.user.id));
    return { success: true };
  }),
  //
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select({
      walletAddress: users.walletAddress,
      walletChain: users.walletChain,
      npPoints: users.npPoints,
      username: users.username,
      bio: users.bio,
      avatar: users.avatar
    }).from(users).where(eq12(users.id, ctx.user.id)).limit(1);
    return result[0] ?? null;
  }),
  //
  getBalance: publicProcedure.input(
    z5.object({
      address: z5.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address")
    })
  ).query(async ({ input }) => {
    const hexBalance = await callBscRpc("eth_getBalance", [input.address, "latest"]);
    if (!hexBalance) {
      return { bnbBalance: "0", bnbBalanceFormatted: "0.0000", usdValue: null };
    }
    const bnbWei = BigInt(hexBalance);
    const bnb = Number(bnbWei) / 1e18;
    const bnbFormatted = bnb.toFixed(4);
    let usdValue = null;
    const bnbPriceData = await cachedFetch(
      "bnb-usd-price",
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
      TTL.prices,
      (res) => res.json()
    );
    if (bnbPriceData?.binancecoin?.usd) {
      usdValue = (bnb * bnbPriceData.binancecoin.usd).toFixed(2);
    }
    return { bnbBalance: hexBalance, bnbBalanceFormatted: bnbFormatted, usdValue };
  }),
  //
  getTokenBalances: publicProcedure.input(
    z5.object({
      address: z5.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address")
    })
  ).query(async ({ input }) => {
    const balanceResults = await Promise.all(
      BSC_KNOWN_TOKENS.map(async (token) => {
        try {
          const hexBal = await callBscRpc("eth_call", [
            { to: token.contractAddress, data: encodeBalanceOf(input.address) },
            "latest"
          ]);
          if (!hexBal || hexBal === "0x" || hexBal === "0x0") return null;
          const rawBal = BigInt(hexBal);
          if (rawBal === BigInt(0)) return null;
          const formatted = (Number(rawBal) / Math.pow(10, token.decimals)).toFixed(6);
          if (parseFloat(formatted) <= 0) return null;
          return { ...token, balanceFormatted: formatted, usdPrice: 0, usdValue: 0, change24h: 0 };
        } catch {
          return null;
        }
      })
    );
    const tokens = balanceResults.filter((t3) => t3 !== null);
    if (tokens.length === 0) return [];
    try {
      const cgIdSet = new Set(tokens.map((t3) => t3.cgId));
      const cgIds = Array.from(cgIdSet).join(",");
      const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`;
      const cacheKey2 = `bsc-token-cg-prices-${cgIds.slice(0, 80)}`;
      const priceData = await cachedFetch(
        cacheKey2,
        priceUrl,
        TTL.prices,
        (res) => res.json()
      );
      if (priceData) {
        for (const token of tokens) {
          const p = priceData[token.cgId];
          if (p?.usd) {
            const bal = parseFloat(token.balanceFormatted);
            token.usdPrice = p.usd;
            token.usdValue = parseFloat((bal * p.usd).toFixed(2));
            token.change24h = parseFloat((p.usd_24h_change ?? 0).toFixed(2));
          }
        }
      }
    } catch {
    }
    return tokens.filter((t3) => t3.usdValue > 0 || parseFloat(t3.balanceFormatted) > 0).sort((a, b) => b.usdValue - a.usdValue).map((t3) => ({
      name: t3.name,
      symbol: t3.symbol,
      decimals: t3.decimals,
      contractAddress: t3.contractAddress.toLowerCase(),
      balance: t3.balanceFormatted,
      balanceFormatted: t3.balanceFormatted,
      usdPrice: t3.usdPrice,
      usdValue: t3.usdValue,
      change24h: t3.change24h
    }));
  }),
  //
  getSwapQuote: publicProcedure.input(
    z5.object({
      fromToken: z5.string(),
      // e.g. "BNB", "ETH", "SOL"
      toToken: z5.string(),
      amount: z5.number().positive()
    })
  ).query(async ({ input }) => {
    const COINGECKO_IDS = {
      BNB: "binancecoin",
      ETH: "ethereum",
      BTC: "bitcoin",
      SOL: "solana",
      USDT: "tether",
      USDC: "usd-coin",
      MATIC: "matic-network",
      AVAX: "avalanche-2",
      DOT: "polkadot",
      ADA: "cardano",
      LINK: "chainlink",
      UNI: "uniswap",
      AAVE: "aave",
      CAKE: "pancakeswap-token",
      ARB: "arbitrum",
      OP: "optimism"
    };
    const fromId = COINGECKO_IDS[input.fromToken.toUpperCase()];
    const toId = COINGECKO_IDS[input.toToken.toUpperCase()];
    const STABLECOINS = /* @__PURE__ */ new Set(["USDT", "USDC", "DAI", "BUSD"]);
    const fromIsStable = STABLECOINS.has(input.fromToken.toUpperCase());
    const toIsStable = STABLECOINS.has(input.toToken.toUpperCase());
    try {
      const idsToFetch = [
        ...fromIsStable ? [] : [fromId],
        ...toIsStable ? [] : [toId]
      ].filter(Boolean);
      let fromUsd = fromIsStable ? 1 : 0;
      let toUsd = toIsStable ? 1 : 0;
      let fromChange24h = 0;
      let toChange24h = 0;
      if (idsToFetch.length > 0) {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(",")}&vs_currencies=usd&include_24hr_change=true`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8e3) });
        if (!res.ok) throw new Error("CoinGecko API error");
        const data = await res.json();
        if (!fromIsStable && fromId) {
          fromUsd = data[fromId]?.usd ?? 0;
          fromChange24h = data[fromId]?.usd_24h_change ?? 0;
        }
        if (!toIsStable && toId) {
          toUsd = data[toId]?.usd ?? 0;
          toChange24h = data[toId]?.usd_24h_change ?? 0;
        }
      }
      if (fromUsd === 0 || toUsd === 0) {
        return { success: false, error: "Token price not available", quote: null };
      }
      const rate = fromUsd / toUsd;
      const toAmount = input.amount * rate;
      const slippage = 5e-3;
      const minReceived = toAmount * (1 - slippage);
      const priceImpact = input.amount * fromUsd > 1e5 ? 0.3 : 0.05;
      const networkFee = 0.8;
      return {
        success: true,
        quote: {
          fromToken: input.fromToken.toUpperCase(),
          toToken: input.toToken.toUpperCase(),
          fromAmount: input.amount,
          toAmount: parseFloat(toAmount.toFixed(6)),
          rate: parseFloat(rate.toFixed(6)),
          fromUsdPrice: fromUsd,
          toUsdPrice: toUsd,
          fromChange24h: parseFloat(fromChange24h.toFixed(2)),
          toChange24h: parseFloat(toChange24h.toFixed(2)),
          priceImpact,
          minReceived: parseFloat(minReceived.toFixed(6)),
          networkFeeUsd: networkFee,
          source: "CoinGecko",
          updatedAt: Date.now()
        },
        error: null
      };
    } catch (err) {
      return { success: false, error: "Failed to fetch price data", quote: null };
    }
  }),
  //
  saveSwapHistory: protectedProcedure.input(
    z5.object({
      walletAddress: z5.string(),
      fromToken: z5.string().max(20),
      toToken: z5.string().max(20),
      fromAmount: z5.string(),
      toAmount: z5.string(),
      rate: z5.string(),
      dex: z5.string().max(50),
      txHash: z5.string().max(70),
      slippage: z5.string().default("0.5")
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(swapHistory).values({
      userId: ctx.user.id,
      walletAddress: input.walletAddress,
      fromToken: input.fromToken,
      toToken: input.toToken,
      fromAmount: input.fromAmount,
      toAmount: input.toAmount,
      rate: input.rate,
      dex: input.dex,
      txHash: input.txHash,
      slippage: input.slippage,
      status: "success"
    });
    return { success: true };
  }),
  //
  getSwapHistory: protectedProcedure.input(
    z5.object({
      limit: z5.number().min(1).max(50).default(20)
    })
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(swapHistory).where(eq12(swapHistory.userId, ctx.user.id)).orderBy(desc4(swapHistory.createdAt)).limit(input.limit);
    return rows;
  }),
  //
  getTransactions: publicProcedure.input(
    z5.object({
      address: z5.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
      page: z5.number().min(1).default(1),
      offset: z5.number().min(1).max(50).default(20)
    })
  ).query(async ({ input }) => {
    const data = await fetchBscScanV2({
      module: "account",
      action: "txlist",
      address: input.address,
      startblock: "0",
      endblock: "99999999",
      page: input.page.toString(),
      offset: input.offset.toString(),
      sort: "desc"
    });
    if (!data || data.status !== "1" || !Array.isArray(data.result)) {
      return [];
    }
    return data.result.map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      valueFormatted: (parseFloat(tx.value) / 1e18).toFixed(6),
      timestamp: parseInt(tx.timeStamp, 10) * 1e3,
      isError: tx.isError === "1",
      isIncoming: tx.to.toLowerCase() === input.address.toLowerCase(),
      gasUsed: tx.gas,
      gasPrice: tx.gasPrice
    }));
  }),
  //
  // Uses Alchemy JSON-RPC for accurate real-time balances.
  // Falls back to Etherscan free API if ALCHEMY_API_KEY is not set.
  // Enriches each token with USD price and 24h change from CoinGecko.
  getEthTokenBalances: publicProcedure.input(
    z5.object({
      address: z5.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address")
    })
  ).query(async ({ input }) => {
    const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
    const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY ?? "";
    const KNOWN_TOKENS = {
      "0xdac17f958d2ee523a2206206994597c13d831ec7": { cgId: "tether", symbol: "USDT", name: "Tether" },
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { cgId: "usd-coin", symbol: "USDC", name: "USD Coin" },
      "0x6b175474e89094c44da98b954eedeac495271d0f": { cgId: "dai", symbol: "DAI", name: "Dai" },
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { cgId: "weth", symbol: "WETH", name: "Wrapped Ether" },
      "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { cgId: "wrapped-bitcoin", symbol: "WBTC", name: "Wrapped Bitcoin" },
      "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { cgId: "uniswap", symbol: "UNI", name: "Uniswap" },
      "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": { cgId: "aave", symbol: "AAVE", name: "Aave" },
      "0x514910771af9ca656af840dff83e8264ecf986ca": { cgId: "chainlink", symbol: "LINK", name: "Chainlink" },
      "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": { cgId: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
      "0x4d224452801aced8b2f0aebe155379bb5d594381": { cgId: "apecoin", symbol: "APE", name: "ApeCoin" },
      "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": { cgId: "staked-ether", symbol: "stETH", name: "Lido Staked Ether" },
      "0xbe9895146f7af43049ca1c1ae358b0541ea49704": { cgId: "coinbase-wrapped-staked-eth", symbol: "cbETH", name: "Coinbase Wrapped Staked ETH" }
    };
    async function alchemyPost(method, params) {
      if (!ALCHEMY_KEY) return null;
      try {
        const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: AbortSignal.timeout(1e4)
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.result ?? null;
      } catch {
        return null;
      }
    }
    async function fetchEthBalance() {
      const hexBal = await alchemyPost("eth_getBalance", [input.address, "latest"]);
      if (hexBal) return parseInt(hexBal, 16) / 1e18;
      try {
        const params = new URLSearchParams({ module: "account", action: "balance", address: input.address, tag: "latest", ...ETHERSCAN_KEY ? { apikey: ETHERSCAN_KEY } : {} });
        const res = await fetch(`https://api.etherscan.io/api?${params}`, { signal: AbortSignal.timeout(8e3) });
        const json = await res.json();
        if (json.status === "1") return parseInt(json.result) / 1e18;
      } catch {
      }
      return 0;
    }
    async function fetchPrices2(ids) {
      if (!ids.length) return {};
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(new Set(ids)).join(",")}&vs_currencies=usd&include_24hr_change=true`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8e3) });
        if (!res.ok) return {};
        return await res.json();
      } catch {
        return {};
      }
    }
    const [rawTokens, ethBalance] = await Promise.all([
      alchemyPost("alchemy_getTokenBalances", [input.address, "erc20"]),
      fetchEthBalance()
    ]);
    const results = [];
    if (rawTokens?.tokenBalances?.length) {
      const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const nonZero = rawTokens.tokenBalances.filter((t3) => t3.tokenBalance && t3.tokenBalance !== ZERO).slice(0, 30);
      const metaResults = await Promise.all(
        nonZero.map(async (t3) => {
          const known = KNOWN_TOKENS[t3.contractAddress.toLowerCase()];
          if (known) return { name: known.name, symbol: known.symbol, decimals: 18, logo: null };
          const meta = await alchemyPost("alchemy_getTokenMetadata", [t3.contractAddress]);
          return meta ? { name: meta.name, symbol: meta.symbol, decimals: meta.decimals, logo: meta.logo ?? null } : null;
        })
      );
      const cgIds = nonZero.map((t3) => KNOWN_TOKENS[t3.contractAddress.toLowerCase()]?.cgId).filter(Boolean);
      cgIds.push("ethereum");
      const prices = await fetchPrices2(cgIds);
      nonZero.forEach((t3, i) => {
        const meta = metaResults[i];
        if (!meta) return;
        const decimals = meta.decimals || 18;
        const rawBal = BigInt(t3.tokenBalance);
        const formatted = (Number(rawBal) / Math.pow(10, decimals)).toFixed(6);
        const known = KNOWN_TOKENS[t3.contractAddress.toLowerCase()];
        const cgId = known?.cgId;
        const price = cgId ? prices[cgId]?.usd ?? 0 : 0;
        const change24h = cgId ? prices[cgId]?.usd_24h_change ?? 0 : 0;
        const usdValue = parseFloat(formatted) * price;
        if (parseFloat(formatted) <= 0) return;
        results.push({
          contractAddress: t3.contractAddress,
          symbol: meta.symbol,
          name: meta.name,
          decimals,
          balanceFormatted: formatted,
          usdPrice: price,
          usdValue,
          change24h,
          logo: meta.logo,
          chain: "ETH"
        });
      });
    } else {
      try {
        const params = new URLSearchParams({
          module: "account",
          action: "tokenlist",
          address: input.address,
          ...ETHERSCAN_KEY ? { apikey: ETHERSCAN_KEY } : {}
        });
        const res = await fetch(`https://api.etherscan.io/api?${params}`, { signal: AbortSignal.timeout(1e4) });
        const json = await res.json();
        if (json.status === "1" && Array.isArray(json.result)) {
          const cgIds = json.result.map((t3) => KNOWN_TOKENS[t3.contractAddress.toLowerCase()]?.cgId).filter(Boolean);
          cgIds.push("ethereum");
          const prices = await fetchPrices2(cgIds);
          json.result.slice(0, 30).forEach((t3) => {
            const decimals = parseInt(t3.tokenDecimal, 10) || 18;
            const formatted = (parseFloat(t3.balance) / Math.pow(10, decimals)).toFixed(6);
            if (parseFloat(formatted) <= 0) return;
            const known = KNOWN_TOKENS[t3.contractAddress.toLowerCase()];
            const cgId = known?.cgId;
            const price = cgId ? prices[cgId]?.usd ?? 0 : 0;
            const change24h = cgId ? prices[cgId]?.usd_24h_change ?? 0 : 0;
            results.push({
              contractAddress: t3.contractAddress,
              symbol: t3.tokenSymbol || known?.symbol || "???",
              name: t3.tokenName || known?.name || "Unknown",
              decimals,
              balanceFormatted: formatted,
              usdPrice: price,
              usdValue: parseFloat(formatted) * price,
              change24h,
              logo: null,
              chain: "ETH"
            });
          });
        }
      } catch {
      }
    }
    const ethPrices = await fetchPrices2(["ethereum"]);
    const ethUsdPrice = ethPrices["ethereum"]?.usd ?? 0;
    const ethChange24h = ethPrices["ethereum"]?.usd_24h_change ?? 0;
    return {
      ethBalance,
      ethUsdPrice,
      ethChange24h,
      ethUsdValue: ethBalance * ethUsdPrice,
      tokens: results
    };
  })
});

// server/routers/chat.ts
import { z as z6 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
init_db();
init_schema();
import { eq as eq17, and as and14, desc as desc7, lt as lt4, sql as sql10, or as or5, ne as ne3, gt as gt3, like, inArray as inArray7, isNull as isNull3 } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

// server/socket.ts
import { Server as SocketIOServer } from "socket.io";
import { parse as parseCookie } from "cookie";
init_db();
init_schema();
init_logger();
import { eq as eq13, and as and10 } from "drizzle-orm";

// server/_core/corsOrigin.ts
init_env();
var STATIC_ALLOWED = /* @__PURE__ */ new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost"
]);
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (STATIC_ALLOWED.has(origin)) return true;
  if (ENV.allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (host === "nexuschat.best" || host.endsWith(".nexuschat.best")) return true;
  } catch {
    return false;
  }
  return false;
}
function corsOriginDelegate(origin, cb) {
  cb(null, isAllowedOrigin(origin));
}

// server/socket.ts
async function isConversationMuted(userId, convKey) {
  try {
    const db = await getDb();
    if (!db) return false;
    const [p] = await db.select({ isMuted: conversationPrefs.isMuted }).from(conversationPrefs).where(and10(eq13(conversationPrefs.userId, userId), eq13(conversationPrefs.convKey, convKey))).limit(1);
    return !!p?.isMuted;
  } catch {
    return false;
  }
}
async function authenticateSocket(socket) {
  const authToken = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : void 0;
  let token = authToken;
  if (!token) {
    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
      try {
        token = parseCookie(cookieHeader)[COOKIE_NAME];
      } catch {
      }
    }
  }
  if (!token) return null;
  const session = await sdk.verifySession(token);
  if (!session) return null;
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(eq13(users.openId, session.openId)).limit(1);
  if (!row) return null;
  return { id: row.id, name: row.name ?? "User", avatar: row.avatar ?? null };
}
async function isGroupMember(db, groupId, userId) {
  const [row] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and10(eq13(groupMembers.groupId, groupId), eq13(groupMembers.userId, userId))).limit(1);
  return !!row;
}
var _io = null;
var userSockets = /* @__PURE__ */ new Map();
function getSocketIO() {
  return _io;
}
function emitToUser(userId, event, data) {
  if (!_io) return;
  const sids = userSockets.get(userId);
  if (!sids || sids.size === 0) return;
  for (const sid of Array.from(sids)) {
    _io.to(sid).emit(event, data);
  }
}
function isUserOnline(userId) {
  const sids = userSockets.get(userId);
  return !!sids && sids.size > 0;
}
function evictUserFromGroupRoom(userId, groupId) {
  if (!_io) return;
  const sids = userSockets.get(userId);
  if (!sids) return;
  for (const sid of Array.from(sids)) {
    _io.sockets.sockets.get(sid)?.leave(`group:${groupId}`);
  }
}
async function notifyDmOffline(receiverId, senderId, title, body) {
  try {
    if (isUserOnline(receiverId)) return;
    if (await isConversationMuted(receiverId, `dm:${senderId}`)) return;
    await sendPushToUser(receiverId, {
      title,
      body: body.length > 80 ? body.slice(0, 80) + "..." : body,
      url: `/direct-message?userId=${senderId}`
    });
  } catch (err) {
    logger_default.warn({ err, receiverId }, "notifyDmOffline failed");
  }
}
function initSocketIO(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
      methods: ["GET", "POST"],
      credentials: true
    },
    path: "/api/socket.io"
  });
  _io = io;
  io.use(async (socket, next) => {
    try {
      const authed = await authenticateSocket(socket);
      if (authed) {
        socket.userId = authed.id;
        socket.userName = authed.name;
        socket.userAvatar = authed.avatar;
      } else {
        socket.userId = void 0;
      }
      next();
    } catch (err) {
      logger_default.warn({ err }, "Socket.io: auth middleware error");
      next(new Error("Authentication failed"));
    }
  });
  io.on("connection", (socket) => {
    const userId = socket.userId;
    const userName = socket.userName || "Anonymous";
    const userAvatar = socket.userAvatar;
    logger_default.debug({ userId, socketId: socket.id }, "Socket.io: User connected");
    if (userId) {
      if (!userSockets.has(userId)) userSockets.set(userId, /* @__PURE__ */ new Set());
      userSockets.get(userId).add(socket.id);
    }
    socket.on("register_user", () => {
      if (!userId) return;
      if (!userSockets.has(userId)) userSockets.set(userId, /* @__PURE__ */ new Set());
      userSockets.get(userId).add(socket.id);
    });
    socket.on("join_group", async (groupId) => {
      if (!userId || typeof groupId !== "number") return;
      const db = await getDb();
      if (!db || !await isGroupMember(db, groupId, userId)) {
        socket.emit("error", { message: "Not a member of this group" });
        return;
      }
      socket.join(`group:${groupId}`);
    });
    socket.on("leave_group", (groupId) => {
      socket.leave(`group:${groupId}`);
    });
    socket.on("typing", (data) => {
      socket.to(`group:${data.groupId}`).emit("user_typing", {
        userId,
        userName,
        isTyping: data.isTyping
      });
    });
    socket.on("dm_typing", (data) => {
      emitToUser(data.receiverId, "dm_typing", {
        fromUserId: userId,
        isTyping: data.isTyping
      });
    });
    socket.on("disconnect", () => {
      logger_default.debug({ userId, socketId: socket.id }, "Socket.io: User disconnected");
      const uid = socket.userId;
      if (uid && userSockets.has(uid)) {
        userSockets.get(uid).delete(socket.id);
        if (userSockets.get(uid).size === 0) userSockets.delete(uid);
      }
    });
  });
  return io;
}

// server/routers/chat.ts
init_logger();
init_schema();

// server/groupBots.ts
init_db();
init_schema();
import { eq as eq14, and as and11, gt, or as or4, isNull as isNull2, desc as desc5, sql as sql8, inArray as inArray6 } from "drizzle-orm";

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages: messages3,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages3.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/botBudget.ts
var DAILY_CAP = Math.max(0, Number(process.env.BOT_LLM_DAILY_CAP || 2e3));
var dayKey = "";
var count2 = 0;
function todayKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function consumeBotLLMBudget() {
  const t3 = todayKey();
  if (t3 !== dayKey) {
    dayKey = t3;
    count2 = 0;
  }
  if (count2 >= DAILY_CAP) return false;
  count2++;
  return true;
}

// server/groupBots.ts
init_logger();
var BOT_CATALOG = [
  {
    type: "welcome",
    name: "\u6B22\u8FCE\u673A\u5668\u4EBA",
    icon: "hand-left",
    tagline: "\u65B0\u6210\u5458\u5165\u7FA4\u81EA\u52A8\u6B22\u8FCE",
    desc: "\u6709\u4EBA\u52A0\u5165\u7FA4\u804A\u65F6\uFF0C\u81EA\u52A8\u53D1\u9001\u4E00\u6761\u6B22\u8FCE\u8BED\uFF0C\u53EF\u5E26\u7FA4\u89C4\u4E0E\u6697\u53F7\u3002",
    monthlyNN: 1e4,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "message", label: "\u6B22\u8FCE\u8BED", type: "textarea", placeholder: "\u6B22\u8FCE {name} \u52A0\u5165\u672C\u7FA4\uFF01\u8FDB\u7FA4\u5148\u770B\u7FA4\u516C\u544A~", hint: "\u53EF\u7528 {name} \u4EE3\u8868\u65B0\u6210\u5458\u6635\u79F0" }
    ],
    defaultConfig: { message: "\u6B22\u8FCE {name} \u52A0\u5165\u672C\u7FA4\uFF01\u{1F389}" }
  },
  {
    type: "manage",
    name: "\u7BA1\u7406\u673A\u5668\u4EBA",
    icon: "shield-checkmark",
    tagline: "\u5173\u952E\u8BCD\u68C0\u6D4B \xB7 \u81EA\u52A8\u63D0\u9192",
    desc: "\u68C0\u6D4B\u5230\u8BBE\u5B9A\u7684\u8FDD\u7981\u5173\u952E\u8BCD\u65F6\u81EA\u52A8\u53D1\u51FA\u63D0\u9192\uFF0C\u51CF\u8F7B\u7FA4\u4E3B\u7BA1\u7406\u8D1F\u62C5\u3002",
    monthlyNN: 3e4,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "keywords", label: "\u8FDD\u7981\u5173\u952E\u8BCD", type: "tags", hint: "\u547D\u4E2D\u4EFB\u4E00\u5173\u952E\u8BCD\u5373\u63D0\u9192\uFF0C\u56DE\u8F66\u6DFB\u52A0" },
      { key: "warnMessage", label: "\u63D0\u9192\u8BED", type: "text", placeholder: "\u8BF7\u6CE8\u610F\u7FA4\u5185\u53D1\u8A00\u89C4\u8303\u54E6~" }
    ],
    defaultConfig: { keywords: [], warnMessage: "\u8BF7\u6CE8\u610F\u7FA4\u5185\u53D1\u8A00\u89C4\u8303\u54E6~" }
  },
  {
    type: "price",
    name: "\u884C\u60C5\u673A\u5668\u4EBA",
    icon: "trending-up",
    tagline: "\u5B9A\u65F6\u64AD\u62A5\u5E01\u4EF7\u884C\u60C5",
    desc: "\u6BCF\u5929\u5B9A\u65F6\u5728\u7FA4\u91CC\u64AD\u62A5\u5173\u6CE8\u5E01\u79CD\u7684\u4EF7\u683C\u4E0E\u6DA8\u8DCC\uFF08\u9700\u540E\u7AEF\u8C03\u5EA6\u5F00\u542F\uFF09\u3002",
    monthlyNN: 8e4,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "tokens", label: "\u5173\u6CE8\u5E01\u79CD", type: "tags", hint: "\u5982 BTC\u3001ETH\u3001SOL\uFF0C\u56DE\u8F66\u6DFB\u52A0" },
      { key: "hour", label: "\u6BCF\u65E5\u64AD\u62A5\u65F6\u95F4(0-23)", type: "number", placeholder: "9" }
    ],
    defaultConfig: { tokens: ["BTC", "ETH"], hour: 9 }
  },
  {
    type: "activity",
    name: "\u6D3B\u52A8\u673A\u5668\u4EBA",
    icon: "sparkles",
    tagline: "\u7B7E\u5230 \xB7 \u5B9A\u65F6\u6D3B\u52A8\u63D0\u9192",
    desc: "\u5B9A\u65F6\u63D0\u9192\u7FA4\u6210\u5458\u7B7E\u5230/\u53C2\u4E0E\u6D3B\u52A8\uFF0C\u6D3B\u8DC3\u7FA4\u6C1B\u56F4\uFF08\u9700\u540E\u7AEF\u8C03\u5EA6\u5F00\u542F\uFF09\u3002",
    monthlyNN: 15e4,
    currency: "AC",
    interactive: true,
    configFields: [
      { key: "message", label: "\u6D3B\u52A8\u63D0\u9192\u8BED", type: "textarea", placeholder: "\u4ECA\u65E5\u7B7E\u5230\u5F00\u59CB\u5566\uFF0C\u56DE\u590D\u300C\u7B7E\u5230\u300D\u53C2\u4E0E\uFF5E" },
      { key: "hour", label: "\u6BCF\u65E5\u63D0\u9192\u65F6\u95F4(0-23)", type: "number", placeholder: "20" }
    ],
    defaultConfig: { message: "\u4ECA\u65E5\u6D3B\u52A8\u5F00\u59CB\u5566\uFF5E", hour: 20 }
  },
  {
    type: "interact",
    name: "\u4E92\u52A8\u673A\u5668\u4EBA",
    icon: "chatbubble-ellipses",
    tagline: "AI \u5728\u7FA4\u91CC\u81EA\u7531\u804A\u5929\u4E92\u52A8",
    desc: "\u4E00\u4E2A\u6709\u4EBA\u8BBE\u7684 AI \u6210\u5458\uFF0C\u4F1A\u6839\u636E\u7FA4\u91CC\u804A\u5929\u5185\u5BB9\u81EA\u7136\u5730\u53C2\u4E0E\u8BA8\u8BBA\u3001\u7B54\u7591\u3001\u6D3B\u8DC3\u6C14\u6C1B\uFF08\u53EF\u8BBE\u4EBA\u8BBE/\u56DE\u590D\u9891\u7387/\u4EC5\u88AB@\u65F6\u56DE\u590D\uFF09\u3002",
    monthlyNN: 49,
    currency: "AI",
    interactive: true,
    configFields: [
      { key: "persona", label: "\u673A\u5668\u4EBA\u4EBA\u8BBE/\u98CE\u683C", type: "textarea", placeholder: "\u4F60\u662F\u672C\u7FA4\u7684 AI \u52A9\u624B\uFF0C\u53CB\u597D\u3001\u4E13\u4E1A\u53C8\u5E7D\u9ED8\uFF0C\u64C5\u957F Web3 \u8BDD\u9898", hint: "\u51B3\u5B9A\u5B83\u7684\u8BF4\u8BDD\u98CE\u683C" },
      { key: "probability", label: "\u4E3B\u52A8\u56DE\u590D\u6982\u7387(0-100)", type: "number", placeholder: "40", hint: "\u8D8A\u9AD8\u8D8A\u7231\u8BF4\u8BDD\uFF1B\u88AB@\u65F6\u5FC5\u56DE" },
      { key: "onlyWhenMentioned", label: "\u4EC5\u88AB @ \u65F6\u56DE\u590D", type: "switch", hint: "\u5F00\u542F\u540E\u5E73\u65F6\u4E0D\u63D2\u8BDD\uFF0C\u53EA\u5728\u88AB@\u65F6\u56DE\u5E94" }
    ],
    defaultConfig: { persona: "\u4F60\u662F\u672C\u7FA4\u7684 AI \u52A9\u624B\uFF0C\u53CB\u597D\u3001\u4E13\u4E1A\u53C8\u5E7D\u9ED8\uFF0C\u64C5\u957F\u6D3B\u8DC3\u7FA4\u6C1B\u56F4", probability: 40, onlyWhenMentioned: false }
  },
  {
    type: "growth",
    name: "\u6DFB\u7C89\u673A\u5668\u4EBA",
    icon: "rocket",
    tagline: "\u62C9\u65B0\u589E\u957F \xB7 \u9080\u8BF7\u5956\u52B1",
    desc: "\u6210\u5458\u901A\u8FC7\u9080\u8BF7\u94FE\u63A5\u62C9\u6765\u65B0\u4EBA\u65F6\uFF0C\u81EA\u52A8\u5956\u52B1\u9080\u8BF7\u4EBA IT \u5E76\u5728\u7FA4\u91CC\u81F4\u8C22\uFF0C\u6FC0\u52B1\u5927\u5BB6\u62C9\u65B0\u6DA8\u7C89\u3002",
    monthlyNN: 35,
    currency: "AI",
    interactive: true,
    configFields: [
      { key: "inviteReward", label: "\u6BCF\u9080\u8BF71\u4EBA\u5956\u52B1(IT)", type: "number", placeholder: "5", hint: "\u4E0A\u9650 100/\u4EBA" },
      { key: "announceInvite", label: "\u7FA4\u5185\u81F4\u8C22\u9080\u8BF7\u4EBA", type: "switch", hint: "\u65B0\u4EBA\u52A0\u5165\u65F6\u81EA\u52A8\u53D1\u611F\u8C22\u6D88\u606F" },
      { key: "promoText", label: "\u63A8\u5E7F\u6587\u6848(\u9009\u586B)", type: "textarea", placeholder: "\u672C\u7FA4\u4E13\u6CE8 Web3 alpha\uFF0C\u6B22\u8FCE\u9080\u8BF7\u597D\u53CB\u4E00\u8D77\u6765\uFF01", hint: "\u7528\u4E8E\u5206\u4EAB/\u672A\u6765\u5B9A\u65F6\u63A8\u5E7F\u5230\u5E7F\u573A" }
    ],
    defaultConfig: { inviteReward: 5, announceInvite: true, promoText: "" }
  },
  {
    type: "stats",
    name: "\u6570\u636E\u673A\u5668\u4EBA",
    icon: "stats-chart",
    tagline: "\u7FA4\u6570\u636E\u5468\u62A5",
    desc: "\u89E3\u9501\u300C\u7FA4\u6570\u636E\u770B\u677F\u300D\u5E76\u6BCF\u5468\u751F\u6210\u589E\u957F/\u6D3B\u8DC3\u5468\u62A5\u3002",
    monthlyNN: 25,
    currency: "AI",
    interactive: false,
    configFields: [],
    defaultConfig: {}
  }
];
var BOT_PACKAGES = [
  {
    key: "starter",
    name: "\u65B0\u7FA4\u542F\u52A8\u5305",
    desc: "\u6B22\u8FCE + \u6D3B\u52A8\uFF0C\u96F6\u95E8\u69DB\u628A\u7FA4\u5E26\u6D3B\u3002",
    bots: ["welcome", "activity"],
    monthlyNN: 135e3,
    // 原价 10000+150000=160000，套餐价（AC）
    currency: "AC",
    badge: "\u5165\u95E8"
  },
  {
    key: "owner",
    name: "\u7FA4\u7BA1\u56DB\u4EF6\u5957",
    desc: "\u6B22\u8FCE + \u7BA1\u7406 + \u884C\u60C5 + \u6D3B\u52A8\uFF0C\u7FA4\u8FD0\u8425\u4E00\u6B65\u5230\u4F4D\u3002",
    bots: ["welcome", "manage", "price", "activity"],
    monthlyNN: 225e3,
    // 原价 10000+30000+80000+150000=270000，套餐价（AC）
    currency: "AC",
    badge: "\u70ED\u95E8"
  },
  {
    key: "growth",
    name: "AI \u589E\u957F\u5305",
    desc: "\u4E92\u52A8 + \u6DFB\u7C89 + \u6570\u636E\uFF0CAI \u4E92\u52A8\u4E0E\u62C9\u65B0\u4E00\u6761\u9F99\u3002",
    bots: ["interact", "growth", "stats"],
    monthlyNN: 89,
    // 原价 49+35+25=109，套餐价（AI）
    currency: "AI",
    badge: "\u6DA8\u7C89"
  }
];
var catalogByType = new Map(BOT_CATALOG.map((b) => [b.type, b]));
function getBotMeta(type) {
  return catalogByType.get(type);
}
async function listGroupBots(db, groupId) {
  const rows = await db.select().from(groupBots).where(eq14(groupBots.groupId, groupId));
  const byType = new Map(rows.map((r) => [r.botType, r]));
  const now = /* @__PURE__ */ new Date();
  return BOT_CATALOG.map((meta) => {
    const row = byType.get(meta.type);
    let config = meta.defaultConfig;
    if (row?.config) {
      try {
        config = { ...meta.defaultConfig, ...JSON.parse(row.config) };
      } catch {
      }
    }
    const expiresAt = row?.expiresAt ?? null;
    const expired = !!expiresAt && expiresAt.getTime() < now.getTime();
    const active = !!row?.enabled && !expired;
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1e3)) : null;
    const expiringSoon = active && daysLeft != null && daysLeft <= 7;
    return {
      type: meta.type,
      name: meta.name,
      icon: meta.icon,
      tagline: meta.tagline,
      desc: meta.desc,
      monthlyNN: meta.monthlyNN,
      currency: meta.currency,
      interactive: meta.interactive,
      configFields: meta.configFields,
      enabled: !!row?.enabled,
      active,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      expired,
      daysLeft,
      expiringSoon,
      config
    };
  });
}
async function isBotActive(db, groupId, type) {
  const now = /* @__PURE__ */ new Date();
  const [row] = await db.select({ enabled: groupBots.enabled, expiresAt: groupBots.expiresAt }).from(groupBots).where(
    and11(
      eq14(groupBots.groupId, groupId),
      eq14(groupBots.botType, type),
      eq14(groupBots.enabled, true),
      or4(isNull2(groupBots.expiresAt), gt(groupBots.expiresAt, now))
    )
  ).limit(1);
  return !!row;
}
var nexusBotId = null;
async function getNexusBotId(db) {
  if (nexusBotId) return nexusBotId;
  const [bot] = await db.select({ id: users.id }).from(users).where(eq14(users.openId, "bot_nexus_bot")).limit(1);
  if (bot) nexusBotId = bot.id;
  return nexusBotId;
}
async function sendGroupBotMessage(db, groupId, content) {
  const botId = await getNexusBotId(db);
  if (!botId) {
    logger_default.warn("groupBots: NexusBot \u672A\u627E\u5230\uFF0C\u8DF3\u8FC7\u53D1\u9001");
    return;
  }
  try {
    const [result] = await db.insert(messages).values({
      groupId,
      senderId: botId,
      content,
      messageType: "text"
    }).$returningId();
    const [bot] = await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(eq14(users.id, botId)).limit(1);
    const io = getSocketIO();
    if (io) {
      io.to(`group:${groupId}`).emit("new_message", {
        id: result.id,
        groupId,
        senderId: botId,
        senderName: bot?.name ?? "NexusBot",
        senderAvatar: bot?.avatar ?? null,
        content,
        messageType: "text",
        createdAt: /* @__PURE__ */ new Date()
      });
    }
  } catch (err) {
    logger_default.warn({ err }, "groupBots: \u53D1\u9001\u673A\u5668\u4EBA\u6D88\u606F\u5931\u8D25\uFF08\u975E\u81F4\u547D\uFF09");
  }
}
async function runWelcomeBot(db, groupId, newMemberName) {
  if (!await isBotActive(db, groupId, "welcome")) return;
  const [row] = await db.select({ config: groupBots.config }).from(groupBots).where(and11(eq14(groupBots.groupId, groupId), eq14(groupBots.botType, "welcome"))).limit(1);
  let template = "\u6B22\u8FCE {name} \u52A0\u5165\u672C\u7FA4\uFF01\u{1F389}";
  if (row?.config) {
    try {
      const c = JSON.parse(row.config);
      if (c.message) template = String(c.message);
    } catch {
    }
  }
  const content = template.replace(/\{name\}/g, newMemberName || "\u65B0\u670B\u53CB");
  await sendGroupBotMessage(db, groupId, content);
}
async function runManageBot(db, groupId, text2) {
  if (!text2) return false;
  if (!await isBotActive(db, groupId, "manage")) return false;
  const [row] = await db.select({ config: groupBots.config }).from(groupBots).where(and11(eq14(groupBots.groupId, groupId), eq14(groupBots.botType, "manage"))).limit(1);
  let keywords = [];
  let warn = "\u8BF7\u6CE8\u610F\u7FA4\u5185\u53D1\u8A00\u89C4\u8303\u54E6~";
  if (row?.config) {
    try {
      const c = JSON.parse(row.config);
      if (Array.isArray(c.keywords)) keywords = c.keywords.map((k) => String(k)).filter(Boolean);
      if (c.warnMessage) warn = String(c.warnMessage);
    } catch {
    }
  }
  if (keywords.length === 0) return false;
  const lower = text2.toLowerCase();
  const hit = keywords.some((k) => k && lower.includes(k.toLowerCase()));
  if (hit) {
    await sendGroupBotMessage(db, groupId, warn);
    return true;
  }
  return false;
}
var GROWTH_MAX_REWARD = 100;
async function runGrowthReward(db, groupId, inviterId, newMemberName) {
  if (!inviterId) return;
  if (!await isBotActive(db, groupId, "growth")) return;
  const [row] = await db.select({ config: groupBots.config }).from(groupBots).where(and11(eq14(groupBots.groupId, groupId), eq14(groupBots.botType, "growth"))).limit(1);
  let reward = 5;
  let announce = true;
  if (row?.config) {
    try {
      const c = JSON.parse(row.config);
      if (typeof c.inviteReward === "number") reward = c.inviteReward;
      if (c.announceInvite !== void 0) announce = !!c.announceInvite;
    } catch {
    }
  }
  reward = Math.max(0, Math.min(GROWTH_MAX_REWARD, Math.floor(reward)));
  if (reward > 0) {
    await db.update(users).set({ npPoints: sql8`${users.npPoints} + ${reward}` }).where(eq14(users.id, inviterId));
  }
  if (announce) {
    const [inv] = await db.select({ name: users.name, username: users.username }).from(users).where(eq14(users.id, inviterId)).limit(1);
    const invName = inv?.name ?? inv?.username ?? "\u7FA4\u53CB";
    await sendGroupBotMessage(
      db,
      groupId,
      `\u{1F389} \u6B22\u8FCE ${newMemberName || "\u65B0\u670B\u53CB"} \u52A0\u5165\uFF01\u611F\u8C22 ${invName} \u7684\u9080\u8BF7${reward > 0 ? `\uFF0C\u5DF2\u5956\u52B1 ${reward} IT` : ""}`
    );
  }
}
var SYMBOL_TO_ID = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  TON: "the-open-network",
  TRX: "tron",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  MATIC: "matic-network",
  DOT: "polkadot",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  APT: "aptos",
  PEPE: "pepe",
  SHIB: "shiba-inu"
};
var lastScheduledFire = {};
function fmtPrice(p) {
  if (p >= 1e3) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toPrecision(3);
}
async function buildPriceMessage(tokens) {
  const syms = (Array.isArray(tokens) ? tokens : []).map((t3) => String(t3).toUpperCase().trim()).filter(Boolean).slice(0, 10);
  if (!syms.length) return null;
  const ids = Array.from(new Set(syms.map((s) => SYMBOL_TO_ID[s]).filter(Boolean)));
  if (!ids.length) return null;
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const lines = syms.map((s) => {
      const id = SYMBOL_TO_ID[s];
      const d = id && data[id];
      if (!d || typeof d.usd !== "number") return null;
      const c = typeof d.usd_24h_change === "number" ? d.usd_24h_change : 0;
      const arrow = c >= 0 ? "\u25B2" : "\u25BC";
      return `${s}  $${fmtPrice(d.usd)}  ${arrow}${Math.abs(c).toFixed(2)}%`;
    }).filter(Boolean);
    if (!lines.length) return null;
    return `\u{1F4CA} \u884C\u60C5\u64AD\u62A5\uFF0824h\uFF09
${lines.join("\n")}

\u6570\u636E\u6765\u6E90 CoinGecko\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE\u3002`;
  } catch {
    return null;
  }
}
async function runDueGroupBots(hour, minute) {
  if (minute !== 0) return;
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  const rows = await db.select({ groupId: groupBots.groupId, botType: groupBots.botType, config: groupBots.config }).from(groupBots).where(and11(
    inArray6(groupBots.botType, ["price", "activity"]),
    eq14(groupBots.enabled, true),
    or4(isNull2(groupBots.expiresAt), gt(groupBots.expiresAt, /* @__PURE__ */ new Date()))
  ));
  for (const r of rows) {
    let cfg = {};
    try {
      cfg = r.config ? JSON.parse(r.config) : {};
    } catch {
    }
    const targetHour = typeof cfg.hour === "number" ? cfg.hour : r.botType === "price" ? 9 : 20;
    if (targetHour !== hour) continue;
    const key = `${r.groupId}:${r.botType}`;
    if (lastScheduledFire[key] && now - lastScheduledFire[key] < 2 * 3600 * 1e3) continue;
    lastScheduledFire[key] = now;
    try {
      if (r.botType === "activity") {
        await sendGroupBotMessage(db, r.groupId, String(cfg.message || "\u4ECA\u65E5\u6D3B\u52A8\u5F00\u59CB\u5566\uFF5E"));
      } else {
        const text2 = await buildPriceMessage(cfg.tokens);
        if (text2) await sendGroupBotMessage(db, r.groupId, text2);
      }
    } catch (err) {
      logger_default.warn({ err, groupId: r.groupId, botType: r.botType }, "scheduled group bot failed");
    }
  }
}

// server/routers/chat.ts
init_token();
init_schema();
init_membership();
init_referralRewards();

// server/moderation.ts
init_schema();
import { eq as eq15, and as and12, gt as gt2, sql as sql9 } from "drizzle-orm";
import { TRPCError as TRPCError7 } from "@trpc/server";
init_logger();
var AUTO_BAN_THRESHOLD = 3;
var AUTO_BAN = false;
var AI_AUTO_DELETE = false;
var AI_MODERATION = true;
var RULES = [
  {
    category: "drugs",
    label: "\u6BD2\u54C1",
    words: [
      "\u51B0\u6BD2",
      "\u6D77\u6D1B\u56E0",
      "\u53EF\u5361\u56E0",
      "\u6447\u5934\u4E38",
      "\u6C2F\u80FA\u916E",
      "k\u7C89",
      "\u9EBB\u53E4",
      "\u9E26\u7247",
      "\u5417\u5561",
      "\u5236\u6BD2",
      "\u8FD0\u6BD2",
      "\u8FF7\u5E7B\u836F",
      "\u81F4\u5E7B\u5242",
      "heroin",
      "cocaine",
      "methamphetamine",
      "ketamine"
    ]
  },
  {
    category: "gambling",
    label: "\u8D4C\u535A",
    words: [
      "\u767E\u5BB6\u4E50",
      "\u65F6\u65F6\u5F69",
      "\u516D\u5408\u5F69",
      "\u5916\u56F4\u8D4C",
      "\u8001\u864E\u673A",
      "\u8F6E\u76D8\u8D4C",
      "\u79C1\u5F69",
      "\u5F00\u8D4C",
      "\u805A\u4F17\u8D4C\u535A",
      "\u7EBF\u4E0A\u8D4C",
      "baccarat"
    ]
  },
  {
    category: "trafficking",
    label: "\u8D29\u5356\u8FDD\u7981\u54C1",
    words: [
      "\u8D29\u5356\u67AA\u652F",
      "\u8D29\u5356\u519B\u706B",
      "\u8D70\u79C1\u519B\u706B",
      "\u67AA\u652F\u5F39\u836F",
      "\u4E70\u5356\u67AA\u652F",
      "\u8D29\u5356\u4EBA\u53E3",
      "\u4EBA\u53E3\u8D29\u5356",
      "\u62D0\u5356",
      "\u8D29\u5356\u91CE\u751F\u52A8\u7269",
      "\u8D29\u5356\u5668\u5B98",
      "\u4E70\u5356\u5668\u5B98",
      "\u5356\u6DEB",
      "\u5AD6\u5A3C",
      "\u62DB\u5AD6"
    ]
  },
  {
    category: "porn",
    label: "\u8272\u60C5",
    words: [
      "\u9EC4\u8272\u89C6\u9891",
      "\u9EC4\u7247",
      "\u6DEB\u79FD",
      "\u4E09\u7EA7\u7247",
      "\u88F8\u804A",
      "\u7EA6\u70AE",
      "\u6210\u4EBA\u5F71\u7247",
      "\u6210\u4EBA\u89C6\u9891",
      "av\u5973\u4F18",
      "\u6027\u670D\u52A1",
      "\u6027\u4EA4\u6613",
      "\u63F4\u4EA4",
      "\u5F00\u623F\u7EA6",
      "\u798F\u5229\u59EC",
      "\u6027\u7231\u89C6\u9891",
      "porn",
      "sex chat"
    ]
  }
];
var FLAT = RULES.flatMap((r) => r.words.map((w) => ({ word: w.toLowerCase(), category: r.category })));
function scanContent(text2) {
  if (!text2) return { blocked: false };
  const lower = text2.toLowerCase();
  for (const { word, category } of FLAT) {
    if (word && lower.includes(word)) return { blocked: true, category, hit: word };
  }
  return { blocked: false };
}
async function moderateWithAI(text2) {
  if (!AI_MODERATION || !text2 || text2.trim().length < 2) return { blocked: false };
  try {
    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content: '\u4F60\u662F\u5185\u5BB9\u5B89\u5168\u5BA1\u6838\u5458\u3002\u5224\u65AD\u7528\u6237\u6587\u672C\u662F\u5426\u5305\u542B\u4E2D\u56FD\u6CD5\u5F8B\u660E\u786E\u7981\u6B62\u7684\u8FDD\u6CD5\u8FDD\u89C4\u4FE1\u606F\uFF0C\u4EC5\u9650\u56DB\u7C7B\uFF1Adrugs(\u6BD2\u54C1\u4EA4\u6613/\u4E70\u5356/\u5438\u8D29)\u3001gambling(\u8D4C\u535A/\u535A\u5F69/\u7F51\u8D4C\u62DB\u63FD)\u3001trafficking(\u8D29\u5356\u67AA\u652F\u519B\u706B/\u4EBA\u53E3/\u5668\u5B98/\u91CE\u751F\u52A8\u7269\u7B49\u8FDD\u7981\u54C1)\u3001porn(\u8272\u60C5/\u6DEB\u79FD/\u6027\u4EA4\u6613\u62DB\u63FD)\u3002\u6CE8\u610F\uFF1A\u53EA\u5BF9\u3010\u5BA3\u4F20\u3001\u62DB\u63FD\u3001\u4EA4\u6613\u3001\u63D0\u4F9B\u3001\u4F20\u64AD\u3011\u8FD9\u7C7B\u8FDD\u6CD5\u884C\u4E3A\u5224\u5B9A\u8FDD\u89C4\uFF1B\u6B63\u5E38\u8BA8\u8BBA\u3001\u65B0\u95FB\u3001\u79D1\u666E\u3001\u53CD\u5BF9\u3001\u73A9\u7B11\u3001\u6A21\u7CCA\u8BCD\u5747\u4E0D\u7B97\u8FDD\u89C4\u3002\u4E25\u683C\u53EA\u8F93\u51FA JSON\uFF0C\u4E0D\u8981\u4EFB\u4F55\u591A\u4F59\u6587\u5B57\uFF1A{"blocked":true\u6216false,"category":"drugs|gambling|trafficking|porn|none"}'
        },
        { role: "user", content: `\u5F85\u5BA1\u6838\u5185\u5BB9\uFF1A
${text2.slice(0, 1e3)}` }
      ]
    });
    const raw = resp.choices?.[0]?.message?.content;
    const s = typeof raw === "string" ? raw : "";
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return { blocked: false };
    const j = JSON.parse(m[0]);
    if (j?.blocked === true && j?.category && j.category !== "none") {
      return { blocked: true, category: String(j.category) };
    }
    return { blocked: false };
  } catch (err) {
    logger_default.warn({ err }, "moderation: AI \u5BA1\u6838\u5931\u8D25\uFF08\u653E\u884C\uFF09");
    return { blocked: false };
  }
}
async function recordAndMaybeBan(db, userId, category, source, snippet) {
  try {
    const recent = new Date(Date.now() - 10 * 60 * 1e3);
    const [dup] = await db.select({ id: contentViolations.id }).from(contentViolations).where(and12(
      eq15(contentViolations.userId, userId),
      eq15(contentViolations.category, category),
      gt2(contentViolations.createdAt, recent)
    )).limit(1);
    if (!dup) {
      await db.insert(contentViolations).values({ userId, category, source, snippet: (snippet ?? "").slice(0, 200) });
    }
  } catch (err) {
    logger_default.warn({ err }, "moderation: \u8BB0\u5F55\u8FDD\u89C4\u5931\u8D25");
  }
  if (!AUTO_BAN) return { banned: false };
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1e3);
    const [cnt] = await db.select({ c: sql9`COUNT(*)` }).from(contentViolations).where(and12(eq15(contentViolations.userId, userId), gt2(contentViolations.createdAt, since)));
    if (Number(cnt?.c ?? 0) >= AUTO_BAN_THRESHOLD) {
      await db.update(users).set({ isBanned: true }).where(eq15(users.id, userId));
      logger_default.warn({ userId, category }, "moderation: \u7D2F\u8BA1\u8FDD\u89C4\u81EA\u52A8\u5C01\u53F7");
      return { banned: true };
    }
  } catch (err) {
    logger_default.warn({ err }, "moderation: \u5C01\u53F7\u5224\u65AD\u5931\u8D25");
  }
  return { banned: false };
}
async function enforceContent(db, userId, text2, source, opts) {
  if (!text2) return;
  const kw = scanContent(text2);
  if (kw.blocked) {
    void (async () => {
      try {
        const ai = await moderateWithAI(text2);
        if (ai.blocked) await recordAndMaybeBan(db, userId, ai.category ?? kw.category ?? "other", source, text2);
      } catch {
      }
    })();
    throw new TRPCError7({
      code: "FORBIDDEN",
      message: "\u5185\u5BB9\u7591\u4F3C\u6D89\u53CA\u8FDD\u89C4\u4FE1\u606F\uFF08\u6BD2\u54C1 / \u8D4C\u535A / \u8D29\u5356 / \u8272\u60C5\u7B49\uFF09\uFF0C\u5DF2\u88AB\u62E6\u622A\u3002\u82E5\u4E3A\u6B63\u5E38\u8BA8\u8BBA\u8BF7\u6362\u4E2A\u8868\u8FF0\uFF1B\u53D1\u5E03\u8FDD\u6CD5\u8FDD\u89C4\u5185\u5BB9\u5C06\u88AB\u5C01\u7981\u3002"
    });
  }
  if (opts?.useAI && AI_MODERATION) {
    void (async () => {
      try {
        const ai = await moderateWithAI(text2);
        if (ai.blocked) await recordAndMaybeBan(db, userId, ai.category ?? "other", source, text2);
      } catch {
      }
    })();
  }
}
async function reviewMessageAsync(db, userId, messageId, text2, source) {
  try {
    if (!AI_MODERATION || !text2) return;
    const r = await moderateWithAI(text2);
    if (!r.blocked) return;
    if (AI_AUTO_DELETE) await db.update(messages).set({ isDeleted: true }).where(eq15(messages.id, messageId));
    await recordAndMaybeBan(db, userId, r.category ?? "other", source, text2);
    logger_default.warn({ userId, messageId, category: r.category, deleted: AI_AUTO_DELETE }, "moderation: \u5F02\u6B65 AI \u5224\u5B9A\u8FDD\u89C4");
  } catch (err) {
    logger_default.warn({ err }, "moderation: \u5F02\u6B65\u5BA1\u6838\u5931\u8D25");
  }
}

// server/botAutoReply.ts
init_db();
init_schema();
import { eq as eq16, and as and13, desc as desc6 } from "drizzle-orm";
init_logger();
var BOT_PERSONAS = {
  AlphaHunter: {
    openId: "bot_alpha_hunter_0x",
    style: "\u4F60\u662FAlphaHunter\uFF0C\u4E00\u4E2A\u7ECF\u9A8C\u4E30\u5BCC\u7684DeFi\u730E\u624B\uFF0C\u8BF4\u8BDD\u76F4\u63A5\u6709\u529B\uFF0C\u559C\u6B22\u5206\u4EABalpha\u673A\u4F1A\uFF0C\u5076\u5C14\u7528\u82F1\u6587\u7F29\u5199\uFF08WAGMI/NGMI/GM/GN/LFG\uFF09\uFF0C\u8BED\u6C14\u81EA\u4FE1\u4F46\u4E0D\u50B2\u6162"
  },
  ChainAnalyst: {
    openId: "bot_chain_analyst",
    style: "\u4F60\u662FChainAnalyst\uFF0C\u4E13\u6CE8\u94FE\u4E0A\u6570\u636E\u5206\u6790\uFF0C\u8BF4\u8BDD\u7406\u6027\u5BA2\u89C2\uFF0C\u559C\u6B22\u5F15\u7528\u6570\u636E\uFF0C\u5076\u5C14\u7528\u4E13\u4E1A\u672F\u8BED\uFF08TVL/Gas/MEV/whale\uFF09\uFF0C\u8BED\u6C14\u51B7\u9759\u4E13\u4E1A"
  },
  CryptoSkeptic: {
    openId: "bot_crypto_skeptic",
    style: "\u4F60\u662FCryptoSkeptic\uFF0C\u7406\u6027\u7684\u6000\u7591\u8005\uFF0C\u559C\u6B22\u63D0\u51FA\u53CD\u5411\u89C2\u70B9\u548C\u98CE\u9669\u63D0\u793A\uFF0C\u4E0D\u76F2\u76EE\u8DDF\u98CE\uFF0C\u8BED\u6C14\u7565\u5E26\u7280\u5229\u4F46\u6709\u5EFA\u8BBE\u6027"
  },
  Web3Newbie: {
    openId: "bot_web3_newbie",
    style: "\u4F60\u662FWeb3Newbie\uFF0C\u70ED\u60C5\u7684\u65B0\u624B\uFF0C\u559C\u6B22\u95EE\u95EE\u9898\u548C\u5206\u4EAB\u5B66\u4E60\u5FC3\u5F97\uFF0C\u8BED\u6C14\u6D3B\u6CFC\u79EF\u6781\uFF0C\u5076\u5C14\u7528emoji\uFF0C\u4E0D\u61C2\u7684\u4F1A\u627F\u8BA4"
  },
  QuantTrader: {
    openId: "bot_quant_trader_pro",
    style: "\u4F60\u662FQuantTrader\uFF0C\u91CF\u5316\u4EA4\u6613\u4E13\u5BB6\uFF0C\u559C\u6B22\u4ECE\u6570\u636E\u548C\u6982\u7387\u89D2\u5EA6\u5206\u6790\uFF0C\u8BF4\u8BDD\u7B80\u6D01\u7CBE\u51C6\uFF0C\u5076\u5C14\u5206\u4EAB\u4EA4\u6613\u7B56\u7565\u601D\u8DEF"
  },
  NexusBot: {
    openId: "bot_nexus_bot",
    style: "\u4F60\u662F\u6BD4\u7279AI\u793E\u4EA4\u5B98\u65B9\u52A9\u624B\uFF0C\u53CB\u597D\u4E13\u4E1A\uFF0C\u8D1F\u8D23\u89E3\u7B54\u95EE\u9898\u548C\u6D3B\u8DC3\u793E\u533A\u6C1B\u56F4\uFF0C\u8BED\u6C14\u6E29\u548C\u79EF\u6781"
  },
  // ── 扩充阵容(需跑 scripts/seed-bots.mjs 建账号+入群)──
  MemeKing: {
    openId: "bot_meme_king",
    style: "\u4F60\u662FMemeKing\uFF0C\u7FA4\u91CC\u7684\u5FEB\u4E50\u6E90\u6CC9\uFF0C\u7231\u73A9\u6897\u6574\u6D3B\uFF0C\u5E38\u7528 emoji \u548C\u7F51\u7EDC\u70ED\u8BCD\uFF0C\u8BED\u6C14\u8F7B\u677E\u641E\u7B11\uFF0C\u80FD\u628A\u4E25\u8083\u8BDD\u9898\u804A\u5F97\u6709\u6897"
  },
  NFTCollector: {
    openId: "bot_nft_collector",
    style: "\u4F60\u662FNFTCollector\uFF0C\u6570\u5B57\u827A\u672F\u4E0ENFT\u6536\u85CF\u5BB6\uFF0C\u5173\u6CE8\u5BA1\u7F8E\u3001\u53D9\u4E8B\u548C\u6587\u5316\uFF0C\u5076\u5C14\u804A\u5730\u677F\u4EF7\u548C\u7A00\u6709\u5EA6\uFF0C\u8BED\u6C14\u4F18\u96C5\u6709\u54C1\u5473"
  },
  DevBuilder: {
    openId: "bot_dev_builder",
    style: "\u4F60\u662FDevBuilder\uFF0C\u94FE\u4E0A\u5F00\u53D1\u8005\uFF0C\u5173\u6CE8\u5408\u7EA6\u5B89\u5168\u3001Gas\u4F18\u5316\u548C\u65B0\u534F\u8BAE\uFF0C\u8BF4\u8BDD\u52A1\u5B9E\uFF0C\u5076\u5C14\u5410\u69FD\u70C2\u4EE3\u7801\uFF0C\u8BED\u6C14\u5DE5\u7A0B\u5E08\u98CE"
  },
  MacroTrader: {
    openId: "bot_macro_trader",
    style: "\u4F60\u662FMacroTrader\uFF0C\u5B8F\u89C2\u4EA4\u6613\u89C6\u89D2\uFF0C\u559C\u6B22\u628A\u52A0\u5BC6\u548C\u4F20\u7EDF\u91D1\u878D\u3001\u7F8E\u8054\u50A8\u3001\u6D41\u52A8\u6027\u8054\u7CFB\u8D77\u6765\uFF0C\u8BED\u6C14\u6C89\u7A33\u8001\u7EC3"
  },
  YieldFarmer: {
    openId: "bot_yield_farmer",
    style: "\u4F60\u662FYieldFarmer\uFF0CDeFi\u6536\u76CA\u519C\u6C11\uFF0C\u70ED\u8877\u6316\u77FF\u3001\u8D28\u62BC\u3001APY\u5BF9\u6BD4\uFF0C\u7231\u7B97\u6536\u76CA\u548C\u65E0\u5E38\u635F\u5931\uFF0C\u8BED\u6C14\u7CBE\u6253\u7EC6\u7B97\u63A5\u5730\u6C14"
  },
  NewsFlash: {
    openId: "bot_news_flash",
    style: "\u4F60\u662FNewsFlash\uFF0C\u884C\u4E1A\u5FEB\u8BAF\u64AD\u62A5\u5458\uFF0C\u7B2C\u4E00\u65F6\u95F4\u5206\u4EAB\u8981\u95FB\u548C\u70ED\u70B9\uFF0C\u8BF4\u8BDD\u7B80\u77ED\u6709\u8282\u594F\uFF0C\u5E38\u7528\u300C\u26A1\u5FEB\u8BAF\u300D\u5F00\u5934"
  }
};

// server/routers/chat.ts
async function assertGroupMember(db, groupId, userId) {
  const [m] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, groupId), eq17(groupMembers.userId, userId))).limit(1);
  if (!m) throw new TRPCError8({ code: "FORBIDDEN", message: "Not a member of this group" });
}
async function initReadCursor(db, groupId, userId) {
  try {
    const [row] = await db.select({ maxId: sql10`COALESCE(MAX(${messages.id}), 0)` }).from(messages).where(eq17(messages.groupId, groupId));
    const maxId = Number(row?.maxId ?? 0);
    const existing = await db.select({ id: groupUnreadCounts.id }).from(groupUnreadCounts).where(and14(eq17(groupUnreadCounts.groupId, groupId), eq17(groupUnreadCounts.userId, userId))).limit(1);
    if (existing[0]) {
      await db.update(groupUnreadCounts).set({ lastReadMessageId: maxId }).where(eq17(groupUnreadCounts.id, existing[0].id));
    } else {
      await db.insert(groupUnreadCounts).values({ groupId, userId, lastReadMessageId: maxId });
    }
  } catch {
  }
}
async function countHumanMembers(db, groupId) {
  const [row] = await db.select({ n: sql10`COUNT(*)` }).from(groupMembers).innerJoin(users, eq17(users.id, groupMembers.userId)).where(and14(eq17(groupMembers.groupId, groupId), eq17(users.isBot, false)));
  return Number(row?.n ?? 0);
}
async function assertGroupHasCapacity(db, groupId, extra = 1) {
  const [grp] = await db.select({ maxMembers: chatGroups.maxMembers }).from(chatGroups).where(eq17(chatGroups.id, groupId)).limit(1);
  if (!grp || grp.maxMembers <= 0) return;
  const humans = await countHumanMembers(db, groupId);
  if (humans + extra > grp.maxMembers) {
    throw new TRPCError8({ code: "FORBIDDEN", message: "\u7FA4\u6210\u5458\u5DF2\u6EE1" });
  }
}
async function filterReadableMessageIds(db, messageIds, userId) {
  if (messageIds.length === 0) return [];
  const msgs = await db.select({ id: messages.id, groupId: messages.groupId, senderId: messages.senderId, receiverId: messages.receiverId }).from(messages).where(inArray7(messages.id, messageIds));
  if (msgs.length === 0) return [];
  const groupIds = Array.from(new Set(msgs.map((m) => m.groupId).filter((g) => g != null)));
  let memberGroupIds = /* @__PURE__ */ new Set();
  if (groupIds.length > 0) {
    const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(and14(eq17(groupMembers.userId, userId), inArray7(groupMembers.groupId, groupIds)));
    memberGroupIds = new Set(memberships.map((r) => r.groupId));
  }
  return msgs.filter(
    (m) => m.groupId != null ? memberGroupIds.has(m.groupId) : m.senderId === userId || m.receiverId === userId
  ).map((m) => m.id);
}
async function getClearedBeforeId(db, userId, convKey) {
  const [p] = await db.select({ c: conversationPrefs.clearedBeforeId }).from(conversationPrefs).where(and14(eq17(conversationPrefs.userId, userId), eq17(conversationPrefs.convKey, convKey))).limit(1);
  return p?.c ?? 0;
}
async function spendNP(db, userId, cost) {
  if (cost <= 0) return true;
  const res = await db.update(users).set({ npPoints: sql10`${users.npPoints} - ${cost}` }).where(and14(eq17(users.id, userId), sql10`${users.npPoints} >= ${cost}`));
  const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  return affected2 > 0;
}
var chatRouter = router({
  // List public groups
  listGroups: publicProcedure.input(
    z6.object({
      limit: z6.number().min(1).max(50).default(20),
      offset: z6.number().min(0).default(0),
      category: z6.string().optional(),
      search: z6.string().max(50).optional()
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq17(chatGroups.isPublic, true)];
    if (input?.category && input.category !== "all") {
      conditions.push(eq17(chatGroups.category, input.category));
    }
    const q = input?.search?.trim();
    if (q) {
      const term = `%${q}%`;
      const match = or5(like(chatGroups.name, term), like(chatGroups.description, term));
      if (match) conditions.push(match);
    }
    return db.select().from(chatGroups).where(and14(...conditions)).orderBy(desc7(chatGroups.memberCount)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
  }),
  // ─── 管理员：列出所有群（含私有），用于平台管理 ─────────────────────────
  adminListGroups: adminProcedure.input(z6.object({ limit: z6.number().min(1).max(50).default(30), offset: z6.number().min(0).default(0), search: z6.string().max(50).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conds = [];
    const q = input?.search?.trim();
    if (q) conds.push(like(chatGroups.name, `%${q}%`));
    return db.select({ id: chatGroups.id, name: chatGroups.name, memberCount: chatGroups.memberCount, isPublic: chatGroups.isPublic, category: chatGroups.category, creatorId: chatGroups.creatorId, createdAt: chatGroups.createdAt }).from(chatGroups).where(conds.length ? and14(...conds) : void 0).orderBy(desc7(chatGroups.createdAt)).limit(input?.limit ?? 30).offset(input?.offset ?? 0);
  }),
  // ─── 管理员：删除群（连带成员/消息/公告）─────────────────────────────
  adminDeleteGroup: adminProcedure.input(z6.object({ groupId: z6.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    await db.transaction(async (tx) => {
      await tx.delete(messages).where(eq17(messages.groupId, input.groupId));
      await tx.delete(groupMembers).where(eq17(groupMembers.groupId, input.groupId));
      await tx.delete(groupAnnouncements).where(eq17(groupAnnouncements.groupId, input.groupId));
      await tx.delete(chatGroups).where(eq17(chatGroups.id, input.groupId));
    });
    return { success: true };
  }),
  // Create a group
  createGroup: protectedProcedure.input(z6.object({
    name: z6.string().min(2).max(100),
    description: z6.string().max(500).optional(),
    isPublic: z6.boolean().default(true),
    isTokenGated: z6.boolean().default(false),
    tokenGateAmount: z6.string().optional(),
    tokenGateContract: z6.string().optional(),
    category: z6.string().max(30).optional().default("community")
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const benefits = await getBenefits(db, ctx.user.id);
    const [owned] = await db.select({ c: sql10`COUNT(*)` }).from(chatGroups).where(eq17(chatGroups.creatorId, ctx.user.id));
    if (Number(owned?.c ?? 0) >= benefits.maxGroups) {
      throw new TRPCError8({ code: "FORBIDDEN", message: `\u5F53\u524D\u4F1A\u5458\u6700\u591A\u53EF\u521B\u5EFA ${benefits.maxGroups} \u4E2A\u7FA4\uFF0C\u5347\u7EA7\u4F1A\u5458\u53EF\u63D0\u5347\u4E0A\u9650` });
    }
    const [result] = await db.insert(chatGroups).values({
      name: input.name,
      description: input.description ?? void 0,
      creatorId: ctx.user.id,
      isPublic: input.isPublic,
      isTokenGated: input.isTokenGated,
      tokenGateAmount: input.tokenGateAmount ?? void 0,
      tokenGateContract: input.tokenGateContract ?? void 0,
      memberCount: 1,
      maxMembers: benefits.maxGroupMembers,
      category: input.category ?? "community"
    });
    const groupId = result.insertId;
    await db.insert(groupMembers).values({
      groupId,
      userId: ctx.user.id,
      role: "owner"
    });
    void awardReferrerMilestone(db, ctx.user.id, "first_group", 500);
    return { groupId };
  }),
  // Join a group
  joinGroup: protectedProcedure.input(z6.object({ groupId: z6.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (existing.length > 0) return { success: true, alreadyMember: true };
    const [grp] = await db.select({ joinApproval: chatGroups.joinApproval, isPublic: chatGroups.isPublic }).from(chatGroups).where(eq17(chatGroups.id, input.groupId)).limit(1);
    if (grp && !grp.isPublic) {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u8BE5\u7FA4\u4E3A\u79C1\u5BC6\u7FA4\uFF0C\u9700\u901A\u8FC7\u7FA4\u6210\u5458\u9080\u8BF7\u6216\u4E8C\u7EF4\u7801\u52A0\u5165" });
    }
    await assertGroupHasCapacity(db, input.groupId);
    if (grp?.joinApproval) {
      const pending = await db.select({ id: groupJoinRequests.id }).from(groupJoinRequests).where(and14(eq17(groupJoinRequests.groupId, input.groupId), eq17(groupJoinRequests.userId, ctx.user.id), eq17(groupJoinRequests.status, "pending"))).limit(1);
      if (pending.length === 0) {
        await db.insert(groupJoinRequests).values({ groupId: input.groupId, userId: ctx.user.id });
      }
      return { success: true, alreadyMember: false, pendingApproval: true };
    }
    await db.insert(groupMembers).values({
      groupId: input.groupId,
      userId: ctx.user.id,
      role: "member"
    });
    await db.update(chatGroups).set({
      memberCount: sql10`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`
    }).where(eq17(chatGroups.id, input.groupId));
    await initReadCursor(db, input.groupId, ctx.user.id);
    void runWelcomeBot(db, input.groupId, ctx.user.name || ctx.user.username || "\u65B0\u670B\u53CB").catch((err) => logger_default.warn({ err }, "welcome bot failed"));
    await awardTaskEvent(db, ctx.user.id, "join_group_daily");
    return { success: true, alreadyMember: false };
  }),
  /** 从好友列表拉人进群（微信式多选）。须为群成员；只能拉自己的好友。 */
  addMembers: protectedProcedure.input(z6.object({
    groupId: z6.number().int().positive(),
    userIds: z6.array(z6.number().int().positive()).min(1).max(50)
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const wanted = Array.from(new Set(input.userIds)).filter((id) => id !== ctx.user.id);
    if (wanted.length === 0) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BF7\u9009\u62E9\u8981\u9080\u8BF7\u7684\u597D\u53CB" });
    const [me] = await db.select({ role: groupMembers.role, alias: groupMembers.alias }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!me) throw new TRPCError8({ code: "FORBIDDEN", message: "\u4F60\u4E0D\u5728\u8BE5\u7FA4\u4E2D" });
    const [grp] = await db.select({
      name: chatGroups.name,
      joinApproval: chatGroups.joinApproval,
      memberCount: chatGroups.memberCount,
      maxMembers: chatGroups.maxMembers
    }).from(chatGroups).where(eq17(chatGroups.id, input.groupId)).limit(1);
    if (!grp) throw new TRPCError8({ code: "NOT_FOUND", message: "\u7FA4\u4E0D\u5B58\u5728" });
    const alreadyRows = await db.select({ userId: groupMembers.userId }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), inArray7(groupMembers.userId, wanted)));
    const already = new Set(alreadyRows.map((r) => r.userId));
    const friendRows = await db.select({
      senderId: friendRequests.senderId,
      receiverId: friendRequests.receiverId
    }).from(friendRequests).where(and14(
      eq17(friendRequests.status, "accepted"),
      or5(
        and14(eq17(friendRequests.senderId, ctx.user.id), inArray7(friendRequests.receiverId, wanted)),
        and14(eq17(friendRequests.receiverId, ctx.user.id), inArray7(friendRequests.senderId, wanted))
      )
    ));
    const friends = /* @__PURE__ */ new Set();
    for (const r of friendRows) {
      friends.add(r.senderId === ctx.user.id ? r.receiverId : r.senderId);
    }
    const candidates = wanted.filter((id) => !already.has(id) && friends.has(id));
    if (candidates.length === 0) {
      throw new TRPCError8({ code: "BAD_REQUEST", message: already.size ? "\u6240\u9009\u597D\u53CB\u5DF2\u5728\u7FA4\u91CC" : "\u53EA\u80FD\u9080\u8BF7\u5DF2\u6DFB\u52A0\u7684\u597D\u53CB" });
    }
    const isManager = me.role === "owner" || me.role === "admin";
    const needApproval = !!grp.joinApproval && !isManager;
    if (needApproval) {
      let pending = 0;
      for (const uid of candidates) {
        const [exist] = await db.select({ id: groupJoinRequests.id }).from(groupJoinRequests).where(and14(
          eq17(groupJoinRequests.groupId, input.groupId),
          eq17(groupJoinRequests.userId, uid),
          eq17(groupJoinRequests.status, "pending")
        )).limit(1);
        if (exist) {
          pending += 1;
          continue;
        }
        await db.insert(groupJoinRequests).values({ groupId: input.groupId, userId: uid });
        pending += 1;
      }
      return { added: 0, pending, skipped: wanted.length - candidates.length };
    }
    const slots = grp.maxMembers > 0 ? Math.max(0, grp.maxMembers - await countHumanMembers(db, input.groupId)) : candidates.length;
    if (slots <= 0) throw new TRPCError8({ code: "FORBIDDEN", message: "\u7FA4\u6210\u5458\u5DF2\u6EE1" });
    const toAdd = candidates.slice(0, slots);
    const profiles = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      isBot: users.isBot
    }).from(users).where(inArray7(users.id, toAdd));
    const addable = profiles.filter((u) => !u.isBot);
    if (addable.length === 0) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u6CA1\u6709\u53EF\u9080\u8BF7\u7684\u597D\u53CB" });
    await db.insert(groupMembers).values(addable.map((u) => ({
      groupId: input.groupId,
      userId: u.id,
      role: "member"
    })));
    await db.update(chatGroups).set({
      memberCount: sql10`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`
    }).where(eq17(chatGroups.id, input.groupId));
    await Promise.all(addable.map((u) => initReadCursor(db, input.groupId, u.id)));
    const myName = me.alias || ctx.user.name || ctx.user.username || "\u6210\u5458";
    const names = addable.map((u) => u.name || u.username || `\u7528\u6237#${u.id}`);
    const content = names.length === 1 ? `${myName} \u9080\u8BF7 ${names[0]} \u52A0\u5165\u4E86\u7FA4\u804A` : `${myName} \u9080\u8BF7 ${names.join("\u3001")} \u52A0\u5165\u4E86\u7FA4\u804A`;
    const [msgIns] = await db.insert(messages).values({
      groupId: input.groupId,
      senderId: ctx.user.id,
      content,
      messageType: "system"
    });
    const messageId = Number(msgIns?.insertId ?? 0);
    try {
      getSocketIO()?.to(`group:${input.groupId}`).emit("new_message", {
        id: messageId,
        groupId: input.groupId,
        senderId: ctx.user.id,
        senderName: myName,
        senderAvatar: ctx.user.avatar ?? null,
        content,
        messageType: "system",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
    }
    const fromName = ctx.user.name || ctx.user.username || "\u597D\u53CB";
    const fromAvatar = ctx.user.avatar ?? "";
    for (const u of addable) {
      void createNotification({
        db,
        targetUserId: u.id,
        fromUserId: ctx.user.id,
        fromUserName: fromName,
        fromUserAvatar: fromAvatar,
        type: "system",
        content: `${fromName} \u9080\u8BF7\u4F60\u52A0\u5165\u4E86\u7FA4\u804A\u300C${grp.name}\u300D`
      }).catch(() => {
      });
    }
    return {
      added: addable.length,
      pending: 0,
      skipped: wanted.length - addable.length,
      truncated: candidates.length > slots
    };
  }),
  // Get messages for a group
  getMessages: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    limit: z6.number().default(50),
    before: z6.number().optional()
    // message id cursor
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const [grp] = await db.select({ isPublic: chatGroups.isPublic }).from(chatGroups).where(eq17(chatGroups.id, input.groupId)).limit(1);
    if (!grp) return [];
    if (!grp.isPublic) await assertGroupMember(db, input.groupId, ctx.user.id);
    const conditions = [
      eq17(messages.groupId, input.groupId),
      eq17(messages.isDeleted, false),
      sql10`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`
    ];
    const clearedG = await getClearedBeforeId(db, ctx.user.id, `group:${input.groupId}`);
    if (clearedG > 0) conditions.push(gt3(messages.id, clearedG));
    if (input.before) {
      conditions.push(lt4(messages.id, input.before));
    }
    const repliedMsg = alias(messages, "replied_msg_g");
    const repliedUser = alias(users, "replied_user_g");
    const rows = await db.select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      durationSeconds: messages.durationSeconds,
      replyToId: messages.replyToId,
      isPinned: messages.isPinned,
      recalledAt: messages.recalledAt,
      createdAt: messages.createdAt,
      expiresAt: messages.expiresAt,
      senderId: messages.senderId,
      senderName: sql10`COALESCE(${groupMembers.alias}, ${users.name})`,
      senderAvatar: users.avatar,
      senderRole: groupMembers.role,
      replyContent: repliedMsg.content,
      replyType: repliedMsg.messageType,
      replySenderName: repliedUser.name
    }).from(messages).leftJoin(users, eq17(messages.senderId, users.id)).leftJoin(groupMembers, and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, messages.senderId))).leftJoin(repliedMsg, eq17(repliedMsg.id, messages.replyToId)).leftJoin(repliedUser, eq17(repliedUser.id, repliedMsg.senderId)).where(and14(...conditions)).orderBy(desc7(messages.id)).limit(input.limit);
    return rows.reverse();
  }),
  // ─── 群聊历史搜索（服务端，不限本地已加载消息）────────────────────────────
  searchMessages: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    query: z6.string().min(1).max(50),
    limit: z6.number().int().min(1).max(50).default(30),
    before: z6.number().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    await assertGroupMember(db, input.groupId, ctx.user.id);
    const q = input.query.trim();
    if (!q) return [];
    const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const conditions = [
      eq17(messages.groupId, input.groupId),
      eq17(messages.isDeleted, false),
      sql10`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
      like(messages.content, `%${escaped}%`),
      sql10`(${messages.recalledAt} IS NULL)`
    ];
    const clearedG = await getClearedBeforeId(db, ctx.user.id, `group:${input.groupId}`);
    if (clearedG > 0) conditions.push(gt3(messages.id, clearedG));
    if (input.before) conditions.push(lt4(messages.id, input.before));
    const rows = await db.select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      durationSeconds: messages.durationSeconds,
      replyToId: messages.replyToId,
      isPinned: messages.isPinned,
      recalledAt: messages.recalledAt,
      createdAt: messages.createdAt,
      expiresAt: messages.expiresAt,
      senderId: messages.senderId,
      senderName: sql10`COALESCE(${groupMembers.alias}, ${users.name})`,
      senderAvatar: users.avatar,
      senderRole: groupMembers.role
    }).from(messages).leftJoin(users, eq17(messages.senderId, users.id)).leftJoin(groupMembers, and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, messages.senderId))).where(and14(...conditions)).orderBy(desc7(messages.id)).limit(input.limit);
    return rows;
  }),
  // Save a message (called from socket handler via REST fallback)
  saveMessage: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    content: z6.string().min(1).max(4e3),
    messageType: z6.enum(["text", "image", "file", "voice", "video"]).default("text"),
    mediaUrl: z6.string().optional(),
    durationSeconds: z6.number().int().min(0).max(600).optional(),
    replyToId: z6.number().int().optional(),
    ttlSeconds: z6.number().int().min(0).max(60 * 60 * 24 * 90).optional(),
    mentionedUserIds: z6.array(z6.number().int()).max(20).optional(),
    // 被 @ 的成员 id,后端据此发提及通知
    /** @所有人：仅群主/管理员可发；通知本群其余成员（上限见下方） */
    mentionAll: z6.boolean().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await assertGroupMember(db, input.groupId, ctx.user.id);
    const [muted] = await db.select({ id: groupMutes.id }).from(groupMutes).where(and14(
      eq17(groupMutes.groupId, input.groupId),
      eq17(groupMutes.userId, ctx.user.id),
      or5(isNull3(groupMutes.expiresAt), gt3(groupMutes.expiresAt, /* @__PURE__ */ new Date()))
    )).limit(1);
    if (muted) throw new TRPCError8({ code: "FORBIDDEN", message: "\u4F60\u5DF2\u88AB\u7981\u8A00,\u6682\u65F6\u65E0\u6CD5\u53D1\u8A00" });
    if (input.replyToId) {
      const [rep] = await db.select({ groupId: messages.groupId }).from(messages).where(eq17(messages.id, input.replyToId)).limit(1);
      if (!rep || rep.groupId !== input.groupId) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u5F15\u7528\u7684\u6D88\u606F\u65E0\u6548" });
    }
    const hasTextContent = !!input.content && input.content.trim().length > 0;
    if (hasTextContent) await enforceContent(db, ctx.user.id, input.content, "group");
    const expiresAt = input.ttlSeconds && input.ttlSeconds > 0 ? new Date(Date.now() + input.ttlSeconds * 1e3) : null;
    const [result] = await db.insert(messages).values({
      groupId: input.groupId,
      senderId: ctx.user.id,
      content: sanitizeInput(input.content, 5e3),
      messageType: input.messageType,
      mediaUrl: input.mediaUrl ?? void 0,
      durationSeconds: input.durationSeconds ?? void 0,
      replyToId: input.replyToId ?? void 0,
      expiresAt
    });
    const messageId = result.insertId;
    let displayName = ctx.user.name ?? ctx.user.username ?? null;
    try {
      const [mr] = await db.select({ alias: groupMembers.alias }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
      if (mr?.alias) displayName = mr.alias;
    } catch {
    }
    try {
      getSocketIO()?.to(`group:${input.groupId}`).emit("new_message", {
        id: messageId,
        groupId: input.groupId,
        senderId: ctx.user.id,
        senderName: displayName,
        senderAvatar: ctx.user.avatar ?? null,
        content: sanitizeInput(input.content, 5e3),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? null,
        durationSeconds: input.durationSeconds ?? null,
        replyToId: input.replyToId ?? null,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
    }
    if (hasTextContent) void reviewMessageAsync(db, ctx.user.id, messageId, input.content, "group");
    if (input.mentionAll || input.mentionedUserIds?.length) {
      void (async () => {
        try {
          const fromName = ctx.user.name ?? ctx.user.username ?? `\u7528\u6237 #${ctx.user.id}`;
          const preview = sanitizeInput(input.content, 120);
          let targetIds = [];
          if (input.mentionAll) {
            const [me] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
            if (me?.role !== "owner" && me?.role !== "admin") {
              return;
            }
            const rows = await db.select({ userId: groupMembers.userId }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), ne3(groupMembers.userId, ctx.user.id))).limit(200);
            targetIds = rows.map((r) => r.userId);
          } else {
            const wanted = Array.from(new Set(input.mentionedUserIds ?? [])).filter((id) => id !== ctx.user.id).slice(0, 20);
            if (!wanted.length) return;
            const rows = await db.select({ userId: groupMembers.userId }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), inArray7(groupMembers.userId, wanted)));
            targetIds = rows.map((r) => r.userId);
          }
          const content = input.mentionAll ? `\u3010@\u6240\u6709\u4EBA\u3011${preview}` : preview;
          for (const uid of targetIds) {
            void createNotification({
              db,
              targetUserId: uid,
              fromUserId: ctx.user.id,
              fromUserName: fromName,
              fromUserAvatar: ctx.user.avatar ?? "",
              type: "mention",
              content
            });
          }
        } catch (err) {
          logger_default.warn({ err }, "mention notify failed");
        }
      })();
    }
    if (input.messageType === "text") {
      void runManageBot(db, input.groupId, input.content).catch((err) => logger_default.warn({ err }, "manage bot failed"));
      await awardTaskEvent(db, ctx.user.id, "first_message");
    }
    await awardTaskEvent(db, ctx.user.id, "chat_daily");
    return { messageId };
  }),
  // ─── DM: Send a direct message ─────────────────────────────────────────────
  sendDM: protectedProcedure.input(z6.object({
    receiverId: z6.number(),
    content: z6.string().min(1).max(4e3),
    messageType: z6.enum(["text", "image", "file", "voice", "video"]).default("text"),
    mediaUrl: z6.string().optional(),
    durationSeconds: z6.number().int().min(0).max(600).optional(),
    replyToId: z6.number().int().optional(),
    ttlSeconds: z6.number().int().min(0).max(60 * 60 * 24 * 90).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await assertCanDM(db, ctx.user.id, input.receiverId);
    const hasTextContent = !!input.content && input.content.trim().length > 0;
    if (hasTextContent) await enforceContent(db, ctx.user.id, input.content, "dm");
    if (input.replyToId) {
      const [rep] = await db.select({ groupId: messages.groupId, senderId: messages.senderId, receiverId: messages.receiverId }).from(messages).where(eq17(messages.id, input.replyToId)).limit(1);
      const inThisDM = rep && !rep.groupId && (rep.senderId === ctx.user.id && rep.receiverId === input.receiverId || rep.senderId === input.receiverId && rep.receiverId === ctx.user.id);
      if (!inThisDM) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u5F15\u7528\u7684\u6D88\u606F\u65E0\u6548" });
    }
    const expiresAt = input.ttlSeconds && input.ttlSeconds > 0 ? new Date(Date.now() + input.ttlSeconds * 1e3) : null;
    const [result] = await db.insert(messages).values({
      senderId: ctx.user.id,
      receiverId: input.receiverId,
      groupId: null,
      content: sanitizeInput(input.content, 5e3),
      messageType: input.messageType,
      mediaUrl: input.mediaUrl ?? void 0,
      durationSeconds: input.durationSeconds ?? void 0,
      replyToId: input.replyToId ?? void 0,
      expiresAt
    });
    const messageId = result.insertId;
    emitToUser(input.receiverId, "dm_message", {
      messageId,
      senderId: ctx.user.id,
      senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
      content: sanitizeInput(input.content, 5e3),
      messageType: input.messageType,
      mediaUrl: input.mediaUrl ?? null,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    void notifyDmOffline(
      input.receiverId,
      ctx.user.id,
      `${ctx.user.name ?? ctx.user.username ?? "\u6709\u4EBA"} \u53D1\u6765\u6D88\u606F`,
      hasTextContent ? sanitizeInput(input.content, 5e3) : "[\u5A92\u4F53\u6D88\u606F]"
    );
    if (hasTextContent) void reviewMessageAsync(db, ctx.user.id, messageId, input.content, "dm");
    if (input.messageType === "text") await awardTaskEvent(db, ctx.user.id, "first_message");
    await awardTaskEvent(db, ctx.user.id, "chat_daily");
    return { messageId };
  }),
  // ─── 推荐好友名片:把某用户的名片以 contact 消息发到群或私信 ──────────────────
  //   名片内容由服务端按 contactUserId 现取(权威,防客户端伪造他人名片)。
  shareContact: protectedProcedure.input(z6.object({
    contactUserId: z6.number().int().positive(),
    targetGroupId: z6.number().int().positive().optional(),
    targetReceiverId: z6.number().int().positive().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!input.targetGroupId === !input.targetReceiverId)
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BF7\u9009\u62E9\u4E14\u4EC5\u9009\u62E9\u4E00\u4E2A\u53D1\u9001\u76EE\u6807" });
    const [c] = await db.select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar, bio: users.bio }).from(users).where(eq17(users.id, input.contactUserId)).limit(1);
    if (!c) throw new TRPCError8({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    const card = JSON.stringify({
      // 防御性净化:name/bio 是自由文本(注册路径未必 stripHtml),入库前清一遍
      contactId: c.id,
      name: sanitizeInput(c.name ?? "", 50),
      username: c.username ?? "",
      avatar: c.avatar ?? "",
      bio: sanitizeInput(c.bio ?? "", 200)
    });
    const senderName = ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`;
    if (input.targetGroupId) {
      await assertGroupMember(db, input.targetGroupId, ctx.user.id);
      const [r2] = await db.insert(messages).values({
        groupId: input.targetGroupId,
        senderId: ctx.user.id,
        content: card,
        messageType: "contact"
      });
      const messageId2 = r2.insertId;
      try {
        getSocketIO()?.to(`group:${input.targetGroupId}`).emit("new_message", {
          id: messageId2,
          groupId: input.targetGroupId,
          senderId: ctx.user.id,
          senderName,
          senderAvatar: ctx.user.avatar ?? null,
          content: card,
          messageType: "contact",
          mediaUrl: null,
          durationSeconds: null,
          replyToId: null,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch {
      }
      return { messageId: messageId2 };
    }
    await assertCanDM(db, ctx.user.id, input.targetReceiverId);
    const [r] = await db.insert(messages).values({
      senderId: ctx.user.id,
      receiverId: input.targetReceiverId,
      groupId: null,
      content: card,
      messageType: "contact"
    });
    const messageId = r.insertId;
    emitToUser(input.targetReceiverId, "dm_message", {
      messageId,
      senderId: ctx.user.id,
      senderName,
      content: card,
      messageType: "contact",
      mediaUrl: null,
      durationSeconds: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { messageId };
  }),
  // ─── 分享语音房:发一条可点进房的 voiceroom 消息到群或私信 ────────────────────
  shareVoiceRoom: protectedProcedure.input(z6.object({
    roomId: z6.string().min(1).max(80),
    title: z6.string().max(60).default(""),
    targetGroupId: z6.number().int().positive().optional(),
    targetReceiverId: z6.number().int().positive().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!input.targetGroupId === !input.targetReceiverId)
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BF7\u9009\u62E9\u4E14\u4EC5\u9009\u62E9\u4E00\u4E2A\u53D1\u9001\u76EE\u6807" });
    const card = JSON.stringify({
      roomId: sanitizeInput(input.roomId, 80),
      title: sanitizeInput(input.title || "\u8BED\u97F3\u623F", 60)
    });
    const senderName = ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`;
    if (input.targetGroupId) {
      await assertGroupMember(db, input.targetGroupId, ctx.user.id);
      const [r2] = await db.insert(messages).values({
        groupId: input.targetGroupId,
        senderId: ctx.user.id,
        content: card,
        messageType: "voiceroom"
      });
      const messageId2 = r2.insertId;
      try {
        getSocketIO()?.to(`group:${input.targetGroupId}`).emit("new_message", {
          id: messageId2,
          groupId: input.targetGroupId,
          senderId: ctx.user.id,
          senderName,
          senderAvatar: ctx.user.avatar ?? null,
          content: card,
          messageType: "voiceroom",
          mediaUrl: null,
          durationSeconds: null,
          replyToId: null,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch {
      }
      return { messageId: messageId2 };
    }
    await assertCanDM(db, ctx.user.id, input.targetReceiverId);
    const [r] = await db.insert(messages).values({
      senderId: ctx.user.id,
      receiverId: input.targetReceiverId,
      groupId: null,
      content: card,
      messageType: "voiceroom"
    });
    const messageId = r.insertId;
    emitToUser(input.targetReceiverId, "dm_message", {
      messageId,
      senderId: ctx.user.id,
      senderName,
      content: card,
      messageType: "voiceroom",
      mediaUrl: null,
      durationSeconds: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { messageId };
  }),
  // ─── DM: Get message history between two users ────────────────────────────
  getDMHistory: protectedProcedure.input(z6.object({
    otherUserId: z6.number(),
    limit: z6.number().default(50),
    before: z6.number().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const myId = ctx.user.id;
    const otherId = input.otherUserId;
    const conditions = [
      or5(
        and14(eq17(messages.senderId, myId), eq17(messages.receiverId, otherId)),
        and14(eq17(messages.senderId, otherId), eq17(messages.receiverId, myId))
      ),
      eq17(messages.isDeleted, false),
      sql10`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`
    ];
    const clearedD = await getClearedBeforeId(db, myId, `dm:${otherId}`);
    if (clearedD > 0) conditions.push(gt3(messages.id, clearedD));
    if (input.before) conditions.push(lt4(messages.id, input.before));
    const repliedMsg = alias(messages, "replied_msg_d");
    const repliedUser = alias(users, "replied_user_d");
    const rows = await db.select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      durationSeconds: messages.durationSeconds,
      replyToId: messages.replyToId,
      recalledAt: messages.recalledAt,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      expiresAt: messages.expiresAt,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      senderName: users.name,
      senderAvatar: users.avatar,
      replyContent: repliedMsg.content,
      replyType: repliedMsg.messageType,
      replySenderName: repliedUser.name
    }).from(messages).leftJoin(users, eq17(messages.senderId, users.id)).leftJoin(repliedMsg, eq17(repliedMsg.id, messages.replyToId)).leftJoin(repliedUser, eq17(repliedUser.id, repliedMsg.senderId)).where(and14(...conditions)).orderBy(desc7(messages.id)).limit(input.limit);
    if (!input.before) {
      try {
        const [mine] = await db.select({ v: userSettings.readReceipts }).from(userSettings).where(eq17(userSettings.userId, myId)).limit(1);
        if (mine?.v !== false) {
          await db.update(messages).set({ isRead: true }).where(
            and14(
              eq17(messages.senderId, otherId),
              eq17(messages.receiverId, myId),
              eq17(messages.isRead, false),
              sql10`${messages.groupId} IS NULL`
            )
          );
        }
      } catch (err) {
        logger_default.warn({ err, otherId, myId }, "markDMsRead failed");
      }
    }
    return rows.reverse();
  }),
  // ─── DM: List all DM conversations for current user ───────────────────────
  listDMConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const myId = ctx.user.id;
    const dmMessages = await db.select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      recalledAt: messages.recalledAt
    }).from(messages).where(
      and14(
        or5(
          eq17(messages.senderId, myId),
          eq17(messages.receiverId, myId)
        ),
        eq17(messages.isDeleted, false),
        sql10`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
        // DM messages have no groupId
        sql10`${messages.groupId} IS NULL`
      )
    ).orderBy(desc7(messages.createdAt)).limit(200);
    const convMap = /* @__PURE__ */ new Map();
    for (const msg of dmMessages) {
      const partnerId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      if (!convMap.has(partnerId)) convMap.set(partnerId, msg);
    }
    if (convMap.size === 0) return [];
    const partnerIds = Array.from(convMap.keys());
    const partnerUsers = await db.select({ id: users.id, name: users.name, avatar: users.avatar, username: users.username }).from(users).where(sql10`${users.id} IN (${sql10.join(partnerIds.map((id) => sql10`${id}`), sql10`, `)})`);
    const unreadRows = await db.select({ senderId: messages.senderId, cnt: sql10`COUNT(*)` }).from(messages).where(
      and14(
        eq17(messages.receiverId, myId),
        eq17(messages.isRead, false),
        eq17(messages.isDeleted, false),
        sql10`${messages.groupId} IS NULL`
      )
    ).groupBy(messages.senderId);
    const unreadMap = new Map(unreadRows.map((r) => [r.senderId, Number(r.cnt)]));
    const prefRows = await db.select({ convKey: conversationPrefs.convKey, cleared: conversationPrefs.clearedBeforeId }).from(conversationPrefs).where(eq17(conversationPrefs.userId, myId));
    const clearedMap = /* @__PURE__ */ new Map();
    for (const p of prefRows) {
      if (p.convKey.startsWith("dm:")) clearedMap.set(parseInt(p.convKey.slice(3), 10), p.cleared ?? 0);
    }
    return partnerUsers.filter((u) => (convMap.get(u.id)?.id ?? 0) > (clearedMap.get(u.id) ?? 0)).map((u) => ({
      userId: u.id,
      name: u.name ?? u.username ?? "User",
      avatar: u.avatar,
      lastMessage: convMap.get(u.id)?.recalledAt ? "[\u6D88\u606F\u5DF2\u64A4\u56DE]" : convMap.get(u.id)?.content ?? "",
      // 撤回后预览不露原文
      lastMessageType: convMap.get(u.id)?.recalledAt ? "text" : convMap.get(u.id)?.messageType ?? "text",
      lastMessageAt: convMap.get(u.id)?.createdAt ?? /* @__PURE__ */ new Date(),
      isMine: convMap.get(u.id)?.senderId === myId,
      unreadCount: unreadMap.get(u.id) ?? 0
    }));
  }),
  // Get user's joined groups with latest message preview
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const groups = await db.select({
      id: chatGroups.id,
      name: chatGroups.name,
      description: chatGroups.description,
      avatar: chatGroups.avatar,
      memberCount: chatGroups.memberCount,
      isTokenGated: chatGroups.isTokenGated,
      isPublic: chatGroups.isPublic,
      category: chatGroups.category,
      // RN ChatGroup 类型要求;listGroups 全列有、这里原来漏了
      role: groupMembers.role,
      updatedAt: chatGroups.updatedAt
    }).from(groupMembers).innerJoin(chatGroups, eq17(groupMembers.groupId, chatGroups.id)).where(eq17(groupMembers.userId, ctx.user.id)).orderBy(desc7(chatGroups.updatedAt));
    const groupIds = groups.map((g) => g.id);
    const latestByGroup = /* @__PURE__ */ new Map();
    if (groupIds.length > 0) {
      const latest = db.select({
        groupId: messages.groupId,
        maxId: sql10`MAX(${messages.id})`.as("max_id")
      }).from(messages).where(and14(
        inArray7(messages.groupId, groupIds),
        eq17(messages.isDeleted, false),
        sql10`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`
        // 阅后即焚过期消息别当列表预览露原文
      )).groupBy(messages.groupId).as("latest");
      const latestRows = await db.select({
        groupId: messages.groupId,
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        recalledAt: messages.recalledAt,
        senderName: users.name,
        senderUsername: users.username
      }).from(messages).innerJoin(latest, eq17(messages.id, latest.maxId)).leftJoin(users, eq17(messages.senderId, users.id));
      for (const r of latestRows) {
        if (r.groupId != null) latestByGroup.set(r.groupId, r);
      }
    }
    const result = groups.map((g) => {
      const m = latestByGroup.get(g.id);
      return {
        ...g,
        lastMessage: m?.recalledAt ? "[\u6D88\u606F\u5DF2\u64A4\u56DE]" : m?.content ?? g.description ?? "",
        // 撤回后列表预览显示"已撤回",不再露原文
        lastMessageType: m?.recalledAt ? "text" : m?.messageType ?? "text",
        lastMessageAt: m?.createdAt ?? g.updatedAt,
        lastSender: m?.senderName ?? m?.senderUsername ?? null
      };
    });
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }),
  // Get members of a group
  getGroupMembers: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    query: z6.string().max(50).optional(),
    limit: z6.number().int().min(1).max(100).optional(),
    offset: z6.number().int().min(0).max(5e3).optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const [me] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!me) return [];
    const q = input.query?.trim() ?? "";
    const limit = input.limit ?? (q ? 50 : 200);
    const offset = input.offset ?? 0;
    const where = [eq17(groupMembers.groupId, input.groupId)];
    if (q) {
      const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      const likeQ = `%${escaped}%`;
      const idNum = /^\d+$/.test(q) ? Number(q) : NaN;
      const nameMatch = or5(
        like(users.name, likeQ),
        like(users.username, likeQ),
        like(groupMembers.alias, likeQ),
        ...Number.isFinite(idNum) ? [eq17(users.id, idNum)] : []
      );
      if (nameMatch) where.push(nameMatch);
    }
    const now = /* @__PURE__ */ new Date();
    const rows = await db.select({
      id: users.id,
      username: users.username,
      name: sql10`COALESCE(${groupMembers.alias}, ${users.name})`,
      alias: groupMembers.alias,
      avatar: users.avatar,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      isBot: users.isBot,
      // 供前端把机器人/静默填充号从 @提及 候选里排除
      muteId: groupMutes.id,
      mutedUntil: groupMutes.expiresAt
    }).from(groupMembers).innerJoin(users, eq17(groupMembers.userId, users.id)).leftJoin(groupMutes, and14(
      eq17(groupMutes.groupId, groupMembers.groupId),
      eq17(groupMutes.userId, groupMembers.userId),
      or5(isNull3(groupMutes.expiresAt), gt3(groupMutes.expiresAt, now))
    )).where(and14(...where)).orderBy(groupMembers.role, groupMembers.joinedAt).limit(limit).offset(offset);
    return rows.map(({ muteId, ...r }) => ({ ...r, isMuted: muteId != null }));
  }),
  // 设置/清除自己在某群的群昵称(仅本人,空字符串=清除回全局名)
  setGroupAlias: protectedProcedure.input(z6.object({ groupId: z6.number(), alias: z6.string().max(50) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const aliasVal = sanitizeInput(input.alias, 50).trim();
    const [m] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!m) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u4F60\u4E0D\u5728\u8BE5\u7FA4" });
    await db.update(groupMembers).set({ alias: aliasVal || null }).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id)));
    return { ok: true, alias: aliasVal || null };
  }),
  // Get group info (name, description, memberCount, avatar)
  getGroupInfo: publicProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select({
      id: chatGroups.id,
      name: chatGroups.name,
      description: chatGroups.description,
      avatar: chatGroups.avatar,
      memberCount: chatGroups.memberCount,
      maxMembers: chatGroups.maxMembers,
      isPublic: chatGroups.isPublic,
      category: chatGroups.category,
      isTokenGated: chatGroups.isTokenGated,
      tokenGateAmount: chatGroups.tokenGateAmount,
      joinApproval: chatGroups.joinApproval,
      forbidAddFriend: chatGroups.forbidAddFriend,
      // 群设置页「禁止群成员互加好友」开关靠它回显——漏投影会让开关每次进来都显示关闭(设了像没生效)
      creatorId: chatGroups.creatorId
      // 客户端 group/[id].tsx 靠它判 isManager;仅创建者 id,不敏感。真正敏感的 tokenGateContract 仍不投影。
    }).from(chatGroups).where(eq17(chatGroups.id, input.groupId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    let myRole = null;
    if (ctx.user?.id) {
      const [m] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
      myRole = m?.role ?? null;
    }
    return { ...row, myRole };
  }),
  // 我在某群的禁言态:客户端进群据此禁用输入框 + 顶部横幅提示,而非打字发出去才被后端拒
  getMyMuteState: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { muted: false, until: null };
    const [m] = await db.select({ expiresAt: groupMutes.expiresAt }).from(groupMutes).where(and14(
      eq17(groupMutes.groupId, input.groupId),
      eq17(groupMutes.userId, ctx.user.id),
      or5(isNull3(groupMutes.expiresAt), gt3(groupMutes.expiresAt, /* @__PURE__ */ new Date()))
    )).limit(1);
    return { muted: !!m, until: m?.expiresAt ?? null };
  }),
  // Get user info by userId (for DM partner display)
  getUserInfo: protectedProcedure.input(z6.object({ userId: z6.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar
    }).from(users).where(eq17(users.id, input.userId)).limit(1);
    return rows[0] ?? null;
  }),
  // Upload chat image to S3
  uploadChatImage: protectedProcedure.input(z6.object({
    base64: z6.string().max(22e6),
    // ~16MB raw file (base64 is ~33% larger)
    mimeType: z6.string().default("image/jpeg")
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const { downscaleImage: downscaleImage2 } = await Promise.resolve().then(() => (init_image(), image_exports));
    const raw = Buffer.from(input.base64, "base64");
    const { buffer, mime } = await downscaleImage2(raw, 1600, 82, input.mimeType);
    const ext = mime.split("/")[1] ?? "jpg";
    const key = `chat-images/${ctx.user.id}/${Date.now()}.${ext}`;
    const { url } = await storagePut2(key, buffer, mime);
    return { url };
  }),
  // Upload chat video to S3 (short clips; stays under the 50MB JSON body limit)
  uploadChatVideo: protectedProcedure.input(z6.object({
    base64: z6.string().max(4e7),
    // ~30MB raw file (base64 ~33% larger)
    mimeType: z6.string().default("video/mp4")
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const buffer = Buffer.from(input.base64, "base64");
    if (buffer.length > 30 * 1024 * 1024) {
      throw new TRPCError8({ code: "PAYLOAD_TOO_LARGE", message: "\u89C6\u9891\u4E0D\u80FD\u8D85\u8FC7 30MB\uFF0C\u8BF7\u5F55\u77ED\u4E00\u70B9" });
    }
    const ext = input.mimeType.split("/")[1]?.split(";")[0] ?? "mp4";
    const key = `chat-videos/${ctx.user.id}/${Date.now()}.${ext}`;
    const { url } = await storagePut2(key, buffer, input.mimeType);
    return { url };
  }),
  // Upload an arbitrary chat file (documents) to S3
  uploadChatFile: protectedProcedure.input(z6.object({
    base64: z6.string().max(2e7),
    // ~15MB raw
    mimeType: z6.string().default("application/octet-stream"),
    fileName: z6.string().max(200).default("file")
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const db0 = await getDb();
    const buffer = Buffer.from(input.base64, "base64");
    const limitMB = db0 ? (await getBenefits(db0, ctx.user.id)).maxFileMB : 20;
    if (buffer.length > limitMB * 1024 * 1024) {
      throw new TRPCError8({ code: "PAYLOAD_TOO_LARGE", message: `\u6587\u4EF6\u8D85\u51FA\u4E0A\u9650\uFF08\u5F53\u524D\u4F1A\u5458 ${limitMB}MB\uFF09\uFF0C\u5347\u7EA7\u4F1A\u5458\u53EF\u4E0A\u4F20\u66F4\u5927\u6587\u4EF6` });
    }
    const safe = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
    const key = `chat-files/${ctx.user.id}/${Date.now()}_${safe}`;
    const { url } = await storagePut2(key, buffer, input.mimeType);
    return { url };
  }),
  // ─── Mark group as read (update lastReadMessageId) ──────────────────────────
  markGroupRead: protectedProcedure.input(z6.object({ groupId: z6.number(), lastMessageId: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { ok: true };
    const existing = await db.select({ id: groupUnreadCounts.id }).from(groupUnreadCounts).where(and14(eq17(groupUnreadCounts.userId, ctx.user.id), eq17(groupUnreadCounts.groupId, input.groupId))).limit(1);
    if (existing.length > 0) {
      await db.update(groupUnreadCounts).set({ lastReadMessageId: input.lastMessageId }).where(and14(eq17(groupUnreadCounts.userId, ctx.user.id), eq17(groupUnreadCounts.groupId, input.groupId)));
    } else {
      await db.insert(groupUnreadCounts).values({
        userId: ctx.user.id,
        groupId: input.groupId,
        lastReadMessageId: input.lastMessageId
      });
    }
    return { ok: true };
  }),
  // ─── Get unread counts for all joined groups ──────────────────────────────
  getUnreadCounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {};
    const joinedGroups = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq17(groupMembers.userId, ctx.user.id));
    if (joinedGroups.length === 0) return {};
    const groupIds = joinedGroups.map((g) => g.groupId);
    const result = {};
    for (const id of groupIds) result[id] = 0;
    const rows = await db.select({
      groupId: messages.groupId,
      count: sql10`count(*)`
    }).from(messages).leftJoin(
      groupUnreadCounts,
      and14(
        eq17(groupUnreadCounts.groupId, messages.groupId),
        eq17(groupUnreadCounts.userId, ctx.user.id)
      )
    ).leftJoin(
      conversationPrefs,
      and14(
        eq17(conversationPrefs.userId, ctx.user.id),
        sql10`${conversationPrefs.convKey} = CONCAT('group:', ${messages.groupId})`
      )
    ).where(and14(
      inArray7(messages.groupId, groupIds),
      eq17(messages.isDeleted, false),
      sql10`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
      // 焚毁消息不计未读(聊天页已看不到)
      gt3(messages.id, sql10`COALESCE(${groupUnreadCounts.lastReadMessageId}, 0)`),
      // 清除聊天记录后只计 clearedBeforeId 之后的消息，否则角标仍是旧未读
      gt3(messages.id, sql10`COALESCE(${conversationPrefs.clearedBeforeId}, 0)`)
    )).groupBy(messages.groupId);
    for (const r of rows) {
      if (r.groupId != null) result[r.groupId] = Number(r.count);
    }
    return result;
  }),
  // ─── Auto-join sample groups for new users ───────────────────────────────
  autoJoinSampleGroups: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { joined: 0 };
    const sampleGroups = await db.select({ id: chatGroups.id }).from(chatGroups).where(eq17(chatGroups.isPublic, true)).orderBy(chatGroups.id).limit(4);
    let joined = 0;
    for (const group of sampleGroups) {
      const existing = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, group.id), eq17(groupMembers.userId, ctx.user.id))).limit(1);
      if (existing.length > 0) continue;
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: ctx.user.id,
        role: "member"
      });
      await db.update(chatGroups).set({ memberCount: sql10`memberCount + 1` }).where(eq17(chatGroups.id, group.id));
      await initReadCursor(db, group.id, ctx.user.id);
      joined++;
    }
    return { joined };
  }),
  // Soft-delete a message (only sender can delete)
  deleteMessage: protectedProcedure.input(z6.object({ messageId: z6.number(), groupId: z6.number().optional() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select({ senderId: messages.senderId, groupId: messages.groupId }).from(messages).where(eq17(messages.id, input.messageId)).limit(1);
    if (!rows[0]) throw new Error("Message not found");
    const isSender = rows[0].senderId === ctx.user.id;
    if (!isSender) {
      const realGroupId = rows[0].groupId;
      if (realGroupId == null) throw new Error("Not authorized");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, realGroupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    }
    await db.update(messages).set({ isDeleted: true }).where(eq17(messages.id, input.messageId));
    return { ok: true };
  }),
  // ─── 撤回消息（2 分钟内，仅发送者）────────────────────────────────────────
  recallMessage: protectedProcedure.input(z6.object({ messageId: z6.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [m] = await db.select({ senderId: messages.senderId, createdAt: messages.createdAt, groupId: messages.groupId, receiverId: messages.receiverId }).from(messages).where(eq17(messages.id, input.messageId)).limit(1);
    if (!m) throw new TRPCError8({ code: "NOT_FOUND", message: "\u6D88\u606F\u4E0D\u5B58\u5728" });
    if (m.senderId !== ctx.user.id) throw new TRPCError8({ code: "FORBIDDEN", message: "\u53EA\u80FD\u64A4\u56DE\u81EA\u5DF1\u7684\u6D88\u606F" });
    if (Date.now() - new Date(m.createdAt).getTime() > 2 * 60 * 1e3) {
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8D85\u8FC7 2 \u5206\u949F\uFF0C\u65E0\u6CD5\u64A4\u56DE" });
    }
    await db.update(messages).set({ recalledAt: /* @__PURE__ */ new Date(), isPinned: false }).where(eq17(messages.id, input.messageId));
    if (m.groupId) {
      getSocketIO()?.to(`group:${m.groupId}`).emit("message_recall", { messageId: input.messageId, groupId: m.groupId });
    } else if (m.receiverId) {
      emitToUser(m.receiverId, "dm_recall", { messageId: input.messageId, fromUserId: ctx.user.id });
    }
    return { ok: true };
  }),
  // ─── 转发消息（到群或私信）───────────────────────────────────────────────
  forwardMessage: protectedProcedure.input(z6.object({
    messageId: z6.number(),
    targetGroupId: z6.number().optional(),
    targetReceiverId: z6.number().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    if (!input.targetGroupId && !input.targetReceiverId) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u7F3A\u5C11\u8F6C\u53D1\u76EE\u6807" });
    const [src] = await db.select({
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      durationSeconds: messages.durationSeconds,
      recalledAt: messages.recalledAt,
      isDeleted: messages.isDeleted,
      groupId: messages.groupId,
      senderId: messages.senderId,
      receiverId: messages.receiverId
    }).from(messages).where(eq17(messages.id, input.messageId)).limit(1);
    if (!src || src.isDeleted || src.recalledAt) throw new TRPCError8({ code: "NOT_FOUND", message: "\u539F\u6D88\u606F\u4E0D\u53EF\u7528" });
    if (src.messageType === "redpacket") throw new TRPCError8({ code: "BAD_REQUEST", message: "\u7EA2\u5305\u4E0D\u80FD\u8F6C\u53D1" });
    if (src.messageType === "contact" || src.messageType === "voiceroom") throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BE5\u6D88\u606F\u4E0D\u652F\u6301\u8F6C\u53D1" });
    if (src.groupId) {
      await assertGroupMember(db, src.groupId, ctx.user.id);
    } else if (src.senderId !== ctx.user.id && src.receiverId !== ctx.user.id) {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u65E0\u6743\u8F6C\u53D1\u8BE5\u6D88\u606F" });
    }
    if (input.targetGroupId) {
      await assertGroupMember(db, input.targetGroupId, ctx.user.id);
      const [r2] = await db.insert(messages).values({
        groupId: input.targetGroupId,
        senderId: ctx.user.id,
        content: src.content,
        messageType: src.messageType,
        mediaUrl: src.mediaUrl ?? void 0,
        durationSeconds: src.durationSeconds ?? void 0,
        forwardFromId: input.messageId
      });
      return { messageId: r2.insertId };
    }
    await assertCanDM(db, ctx.user.id, input.targetReceiverId);
    const [r] = await db.insert(messages).values({
      receiverId: input.targetReceiverId,
      senderId: ctx.user.id,
      groupId: null,
      content: src.content,
      messageType: src.messageType,
      mediaUrl: src.mediaUrl ?? void 0,
      durationSeconds: src.durationSeconds ?? void 0,
      forwardFromId: input.messageId
    });
    const messageId = r.insertId;
    emitToUser(input.targetReceiverId, "dm_message", {
      messageId,
      senderId: ctx.user.id,
      senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
      content: src.content,
      messageType: src.messageType,
      mediaUrl: src.mediaUrl ?? null,
      durationSeconds: src.durationSeconds ?? null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    void notifyDmOffline(input.targetReceiverId, ctx.user.id, `${ctx.user.name ?? ctx.user.username ?? "\u6709\u4EBA"} \u8F6C\u53D1\u4E86\u4E00\u6761\u6D88\u606F`, src.content || "[\u5A92\u4F53\u6D88\u606F]");
    return { messageId };
  }),
  // ─── 置顶消息（群主/管理员）─────────────────────────────────────────────
  pinMessage: protectedProcedure.input(z6.object({ messageId: z6.number(), groupId: z6.number(), pinned: z6.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u4EC5\u7FA4\u4E3B/\u7BA1\u7406\u5458\u53EF\u7F6E\u9876\u6D88\u606F" });
    }
    await db.update(messages).set({ isPinned: input.pinned }).where(and14(eq17(messages.id, input.messageId), eq17(messages.groupId, input.groupId)));
    return { ok: true };
  }),
  getPinnedMessages: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    await assertGroupMember(db, input.groupId, ctx.user.id);
    return db.select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      senderId: messages.senderId,
      senderName: users.name,
      createdAt: messages.createdAt
    }).from(messages).leftJoin(users, eq17(messages.senderId, users.id)).where(and14(
      eq17(messages.groupId, input.groupId),
      eq17(messages.isPinned, true),
      eq17(messages.isDeleted, false),
      sql10`${messages.recalledAt} IS NULL`
    )).orderBy(desc7(messages.id)).limit(10);
  }),
  // ─── Reactions ────────────────────────────────────────────────────────────
  toggleReaction: protectedProcedure.input(z6.object({ messageId: z6.number(), emoji: z6.string().max(10) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select({ id: messageReactions.id }).from(messageReactions).where(and14(eq17(messageReactions.messageId, input.messageId), eq17(messageReactions.userId, ctx.user.id), eq17(messageReactions.emoji, input.emoji))).limit(1);
    if (existing.length > 0) {
      await db.delete(messageReactions).where(eq17(messageReactions.id, existing[0].id));
      return { action: "removed" };
    } else {
      await db.insert(messageReactions).values({ messageId: input.messageId, userId: ctx.user.id, emoji: input.emoji });
      return { action: "added" };
    }
  }),
  getReactions: protectedProcedure.input(z6.object({ messageIds: z6.array(z6.number()) })).query(async ({ ctx, input }) => {
    if (input.messageIds.length === 0) return {};
    const db = await getDb();
    if (!db) return {};
    const rows = await db.select({ messageId: messageReactions.messageId, emoji: messageReactions.emoji, userId: messageReactions.userId }).from(messageReactions).where(sql10`${messageReactions.messageId} IN (${sql10.join(input.messageIds.map((id) => sql10`${id}`), sql10`, `)})`);
    const result = {};
    for (const row of rows) {
      const mid = row.messageId;
      if (!result[mid]) result[mid] = {};
      if (!result[mid][row.emoji]) result[mid][row.emoji] = { count: 0, mine: false };
      result[mid][row.emoji].count++;
      if (row.userId === ctx.user.id) result[mid][row.emoji].mine = true;
    }
    return result;
  }),
  // ─── Invite Links ─────────────────────────────────────────────────────────
  createInviteLink: protectedProcedure.input(z6.object({ groupId: z6.number(), maxUses: z6.number().default(0), expiresInHours: z6.number().optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const member = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!member[0]) throw new Error("\u4EC5\u7FA4\u6210\u5458\u53EF\u751F\u6210\u9080\u8BF7\u7801");
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const expiresAt = input.expiresInHours ? new Date(Date.now() + input.expiresInHours * 36e5) : void 0;
    await db.insert(groupInviteLinks).values({ groupId: input.groupId, creatorId: ctx.user.id, token, maxUses: input.maxUses, expiresAt });
    return { token, url: `${input.groupId}/invite/${token}` };
  }),
  useInviteLink: protectedProcedure.input(z6.object({ token: z6.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const link = await db.select().from(groupInviteLinks).where(and14(eq17(groupInviteLinks.token, input.token), eq17(groupInviteLinks.isActive, true))).limit(1);
    if (!link[0]) throw new Error("Invalid or expired invite link");
    const l = link[0];
    if (l.expiresAt && l.expiresAt < /* @__PURE__ */ new Date()) throw new Error("Invite link has expired");
    if (l.maxUses > 0 && l.useCount >= l.maxUses) throw new Error("Invite link has reached max uses");
    const existing = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, l.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (existing[0]) return { groupId: l.groupId, alreadyMember: true };
    const [cap] = await db.select({ joinApproval: chatGroups.joinApproval }).from(chatGroups).where(eq17(chatGroups.id, l.groupId)).limit(1);
    await assertGroupHasCapacity(db, l.groupId);
    if (cap?.joinApproval) {
      const pending = await db.select({ id: groupJoinRequests.id }).from(groupJoinRequests).where(and14(eq17(groupJoinRequests.groupId, l.groupId), eq17(groupJoinRequests.userId, ctx.user.id), eq17(groupJoinRequests.status, "pending"))).limit(1);
      if (!pending[0]) await db.insert(groupJoinRequests).values({ groupId: l.groupId, userId: ctx.user.id });
      return { groupId: l.groupId, alreadyMember: false, pending: true };
    }
    if (l.maxUses > 0) {
      const upd = await db.update(groupInviteLinks).set({ useCount: sql10`useCount + 1` }).where(and14(eq17(groupInviteLinks.id, l.id), sql10`${groupInviteLinks.useCount} < ${groupInviteLinks.maxUses}`));
      const aff = upd?.[0]?.affectedRows ?? upd?.affectedRows ?? upd?.rowsAffected ?? 0;
      if (aff < 1) throw new TRPCError8({ code: "FORBIDDEN", message: "\u9080\u8BF7\u94FE\u63A5\u5DF2\u8FBE\u4F7F\u7528\u4E0A\u9650" });
    } else {
      await db.update(groupInviteLinks).set({ useCount: sql10`useCount + 1` }).where(eq17(groupInviteLinks.id, l.id));
    }
    await db.insert(groupMembers).values({ groupId: l.groupId, userId: ctx.user.id, role: "member" });
    await db.update(chatGroups).set({
      memberCount: sql10`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${l.groupId})`
    }).where(eq17(chatGroups.id, l.groupId));
    await initReadCursor(db, l.groupId, ctx.user.id);
    const newMemberName = ctx.user.name || ctx.user.username || "\u65B0\u670B\u53CB";
    void runGrowthReward(db, l.groupId, l.creatorId, newMemberName).catch((err) => logger_default.warn({ err }, "growth bot failed"));
    void (async () => {
      try {
        if (await isBotActive(db, l.groupId, "growth")) return;
        await runWelcomeBot(db, l.groupId, newMemberName);
      } catch (err) {
        logger_default.warn({ err }, "welcome bot failed");
      }
    })();
    await awardTaskEvent(db, ctx.user.id, "join_group_daily");
    return { groupId: l.groupId, alreadyMember: false };
  }),
  getGroupInviteLinks: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const member = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!member[0]) return [];
    return db.select().from(groupInviteLinks).where(and14(eq17(groupInviteLinks.groupId, input.groupId), eq17(groupInviteLinks.isActive, true))).orderBy(desc7(groupInviteLinks.createdAt)).limit(5);
  }),
  // ─── File Upload ──────────────────────────────────────────────────────────
  saveGroupFile: protectedProcedure.input(z6.object({ groupId: z6.number(), messageId: z6.number().optional(), fileName: z6.string(), fileSize: z6.number(), mimeType: z6.string(), fileKey: z6.string(), url: z6.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await assertGroupMember(db, input.groupId, ctx.user.id);
    const [result] = await db.insert(groupFiles).values({ groupId: input.groupId, uploaderId: ctx.user.id, messageId: input.messageId, fileName: input.fileName, fileSize: input.fileSize, mimeType: input.mimeType, fileKey: input.fileKey, url: input.url });
    return { id: result.insertId, url: input.url };
  }),
  getGroupFiles: protectedProcedure.input(z6.object({ groupId: z6.number(), limit: z6.number().default(20) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    await assertGroupMember(db, input.groupId, ctx.user.id);
    return db.select({ id: groupFiles.id, fileName: groupFiles.fileName, fileSize: groupFiles.fileSize, mimeType: groupFiles.mimeType, url: groupFiles.url, createdAt: groupFiles.createdAt, uploaderName: users.name }).from(groupFiles).leftJoin(users, eq17(groupFiles.uploaderId, users.id)).where(eq17(groupFiles.groupId, input.groupId)).orderBy(desc7(groupFiles.createdAt)).limit(input.limit);
  }),
  // ─── 群文件库：直接列出群内已发的 图片/视频/文件 消息 ──────────────────────
  getGroupMedia: protectedProcedure.input(z6.object({ groupId: z6.number(), limit: z6.number().default(60) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    await assertGroupMember(db, input.groupId, ctx.user.id);
    return db.select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      mediaUrl: messages.mediaUrl,
      durationSeconds: messages.durationSeconds,
      createdAt: messages.createdAt,
      senderName: users.name
    }).from(messages).leftJoin(users, eq17(messages.senderId, users.id)).where(and14(
      eq17(messages.groupId, input.groupId),
      eq17(messages.isDeleted, false),
      sql10`${messages.recalledAt} IS NULL`,
      inArray7(messages.messageType, ["image", "video", "file"])
    )).orderBy(desc7(messages.id)).limit(input.limit);
  }),
  // ─── Read Receipts ────────────────────────────────────────────────────────
  markMessagesRead: protectedProcedure.input(z6.object({ groupId: z6.number(), messageIds: z6.array(z6.number()) })).mutation(async ({ ctx, input }) => {
    if (input.messageIds.length === 0) return { ok: true };
    const db = await getDb();
    if (!db) return { ok: true };
    await assertGroupMember(db, input.groupId, ctx.user.id);
    const existing = await db.select({ messageId: messageReadReceipts.messageId }).from(messageReadReceipts).where(and14(
      eq17(messageReadReceipts.userId, ctx.user.id),
      eq17(messageReadReceipts.groupId, input.groupId),
      sql10`${messageReadReceipts.messageId} IN (${sql10.join(input.messageIds.map((id) => sql10`${id}`), sql10`, `)})`
    ));
    const existingIds = new Set(existing.map((r) => r.messageId));
    const toInsert = input.messageIds.filter((id) => !existingIds.has(id));
    if (toInsert.length > 0) {
      await db.insert(messageReadReceipts).values(toInsert.map((msgId) => ({ messageId: msgId, groupId: input.groupId, userId: ctx.user.id })));
    }
    return { ok: true };
  }),
  getReadCounts: protectedProcedure.input(z6.object({ messageIds: z6.array(z6.number()) })).query(async ({ ctx, input }) => {
    if (input.messageIds.length === 0) return {};
    const db = await getDb();
    if (!db) return {};
    const allowedIds = await filterReadableMessageIds(db, input.messageIds, ctx.user.id);
    if (allowedIds.length === 0) return {};
    const rows = await db.select({ messageId: messageReadReceipts.messageId, count: sql10`COUNT(*)` }).from(messageReadReceipts).where(inArray7(messageReadReceipts.messageId, allowedIds)).groupBy(messageReadReceipts.messageId);
    return Object.fromEntries(rows.map((r) => [r.messageId, r.count]));
  }),
  // Returns up to 5 readers (with avatar) for a specific message
  getReadReceipts: protectedProcedure.input(z6.object({ messageId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const allowedIds = await filterReadableMessageIds(db, [input.messageId], ctx.user.id);
    if (allowedIds.length === 0) return [];
    const rows = await db.select({
      userId: messageReadReceipts.userId,
      name: users.name,
      avatar: users.avatar
    }).from(messageReadReceipts).innerJoin(users, eq17(users.id, messageReadReceipts.userId)).where(eq17(messageReadReceipts.messageId, input.messageId)).limit(5);
    return rows.map((r) => ({ userId: r.userId, name: r.name ?? "User", avatar: r.avatar ?? null }));
  }),
  // ─── Group Management ─────────────────────────────────────────────────────
  kickMember: protectedProcedure.input(z6.object({ groupId: z6.number(), targetUserId: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    const target = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.targetUserId))).limit(1);
    if (!target[0]) throw new Error("User not in group");
    if (target[0].role === "owner") throw new Error("Cannot kick the owner");
    if (actor[0].role === "admin" && target[0].role === "admin") throw new Error("\u7BA1\u7406\u5458\u4E0D\u80FD\u79FB\u9664\u5176\u4ED6\u7BA1\u7406\u5458");
    await db.delete(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.targetUserId)));
    await db.update(chatGroups).set({
      memberCount: sql10`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`
    }).where(eq17(chatGroups.id, input.groupId));
    try {
      evictUserFromGroupRoom(input.targetUserId, input.groupId);
      emitToUser(input.targetUserId, "group_kicked", { groupId: input.groupId });
    } catch {
    }
    return { ok: true };
  }),
  muteMember: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    targetUserId: z6.number(),
    durationHours: z6.number().min(0).max(24 * 365).optional(),
    durationMinutes: z6.number().int().min(0).max(365 * 24 * 60).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    const mt = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.targetUserId))).limit(1);
    if (!mt[0]) throw new Error("User not in group");
    if (mt[0].role === "owner") throw new Error("\u4E0D\u80FD\u7981\u8A00\u7FA4\u4E3B");
    if (actor[0].role === "admin" && mt[0].role === "admin") throw new Error("\u7BA1\u7406\u5458\u4E0D\u80FD\u7981\u8A00\u5176\u4ED6\u7BA1\u7406\u5458");
    const minutes = input.durationMinutes !== void 0 ? input.durationMinutes : Math.round((input.durationHours ?? 24) * 60);
    const expiresAt = minutes <= 0 ? null : new Date(Date.now() + minutes * 6e4);
    const existing = await db.select({ id: groupMutes.id }).from(groupMutes).where(and14(eq17(groupMutes.groupId, input.groupId), eq17(groupMutes.userId, input.targetUserId))).limit(1);
    if (existing[0]) {
      await db.update(groupMutes).set({ expiresAt, mutedBy: ctx.user.id }).where(eq17(groupMutes.id, existing[0].id));
    } else {
      await db.insert(groupMutes).values({ groupId: input.groupId, userId: input.targetUserId, mutedBy: ctx.user.id, expiresAt });
    }
    return { ok: true, expiresAt };
  }),
  unmuteMember: protectedProcedure.input(z6.object({ groupId: z6.number(), targetUserId: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    await db.delete(groupMutes).where(and14(eq17(groupMutes.groupId, input.groupId), eq17(groupMutes.userId, input.targetUserId)));
    return { ok: true };
  }),
  transferOwnership: protectedProcedure.input(z6.object({ groupId: z6.number(), newOwnerId: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner") throw new Error("Only owner can transfer");
    if (input.newOwnerId === ctx.user.id) throw new Error("\u4E0D\u80FD\u628A\u7FA4\u4E3B\u8F6C\u8BA9\u7ED9\u81EA\u5DF1");
    const target = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.newOwnerId))).limit(1);
    if (!target[0]) throw new Error("New owner must be a member of the group");
    await db.transaction(async (tx) => {
      await tx.update(groupMembers).set({ role: "owner" }).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.newOwnerId)));
      await tx.update(groupMembers).set({ role: "member" }).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id)));
    });
    return { ok: true };
  }),
  // 群主设置/取消管理员
  setMemberRole: protectedProcedure.input(z6.object({ groupId: z6.number(), userId: z6.number(), makeAdmin: z6.boolean() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner") throw new TRPCError8({ code: "FORBIDDEN", message: "\u4EC5\u7FA4\u4E3B\u53EF\u8BBE\u7F6E\u7BA1\u7406\u5458" });
    const [target] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.userId))).limit(1);
    if (!target) throw new TRPCError8({ code: "NOT_FOUND", message: "\u8BE5\u7528\u6237\u4E0D\u5728\u7FA4\u91CC" });
    if (target.role === "owner") throw new TRPCError8({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u4FEE\u6539\u7FA4\u4E3B\u89D2\u8272" });
    await db.update(groupMembers).set({ role: input.makeAdmin ? "admin" : "member" }).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, input.userId)));
    return { ok: true, role: input.makeAdmin ? "admin" : "member" };
  }),
  getMutedMembers: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") return [];
    const now = /* @__PURE__ */ new Date();
    return db.select({ userId: groupMutes.userId, expiresAt: groupMutes.expiresAt, userName: users.name }).from(groupMutes).leftJoin(users, eq17(groupMutes.userId, users.id)).where(and14(
      eq17(groupMutes.groupId, input.groupId),
      sql10`(${groupMutes.expiresAt} IS NULL OR ${groupMutes.expiresAt} > ${now})`
    ));
  }),
  // ─── Leave Group ──────────────────────────────────────────────────────────
  leaveGroup: protectedProcedure.input(z6.object({ groupId: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const member = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!member[0]) throw new Error("Not a member");
    if (member[0].role === "owner") throw new Error("Owner cannot leave. Transfer ownership first.");
    await db.delete(groupMembers).where(
      and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))
    );
    await db.update(chatGroups).set({
      memberCount: sql10`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`
    }).where(eq17(chatGroups.id, input.groupId));
    try {
      evictUserFromGroupRoom(ctx.user.id, input.groupId);
    } catch {
    }
    return { ok: true };
  }),
  // ─── Update Group Info (owner/admin only) ────────────────────────────────
  updateGroupInfo: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    name: z6.string().min(1).max(100).optional(),
    description: z6.string().max(500).optional(),
    avatar: z6.string().max(500).optional(),
    isPublic: z6.boolean().optional(),
    joinApproval: z6.boolean().optional(),
    forbidAddFriend: z6.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    if (actor[0].role !== "owner" && (input.isPublic !== void 0 || input.joinApproval !== void 0)) {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u4EC5\u7FA4\u4E3B\u53EF\u4FEE\u6539\u7FA4\u7684\u516C\u5F00/\u5165\u7FA4\u5BA1\u6279\u8BBE\u7F6E" });
    }
    const updates = {};
    if (input.name !== void 0) updates.name = sanitizeInput(input.name);
    if (input.description !== void 0) updates.description = sanitizeInput(input.description);
    if (input.avatar !== void 0) updates.avatar = input.avatar;
    if (input.isPublic !== void 0) updates.isPublic = input.isPublic;
    if (input.joinApproval !== void 0) updates.joinApproval = input.joinApproval;
    if (input.forbidAddFriend !== void 0) updates.forbidAddFriend = input.forbidAddFriend;
    if (Object.keys(updates).length === 0) return { ok: true };
    await db.update(chatGroups).set(updates).where(eq17(chatGroups.id, input.groupId));
    return { ok: true };
  }),
  // ─── 会话偏好：免打扰 / 置顶 / 清除历史 ──────────────────────────────────
  getConversationPrefs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {};
    const rows = await db.select({
      convKey: conversationPrefs.convKey,
      isMuted: conversationPrefs.isMuted,
      isPinned: conversationPrefs.isPinned
    }).from(conversationPrefs).where(eq17(conversationPrefs.userId, ctx.user.id));
    const map = {};
    for (const r of rows) map[r.convKey] = { isMuted: r.isMuted, isPinned: r.isPinned };
    return map;
  }),
  setConversationPref: protectedProcedure.input(z6.object({
    convKey: z6.string().max(40),
    isMuted: z6.boolean().optional(),
    isPinned: z6.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [existing] = await db.select({ id: conversationPrefs.id }).from(conversationPrefs).where(and14(eq17(conversationPrefs.userId, ctx.user.id), eq17(conversationPrefs.convKey, input.convKey))).limit(1);
    const patch = {};
    if (input.isMuted !== void 0) patch.isMuted = input.isMuted;
    if (input.isPinned !== void 0) patch.isPinned = input.isPinned;
    if (existing) {
      if (Object.keys(patch).length > 0) await db.update(conversationPrefs).set(patch).where(eq17(conversationPrefs.id, existing.id));
    } else {
      await db.insert(conversationPrefs).values({ userId: ctx.user.id, convKey: input.convKey, ...patch });
    }
    return { ok: true };
  }),
  clearConversationHistory: protectedProcedure.input(z6.object({ convKey: z6.string().max(40) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    let maxId = 0;
    if (input.convKey.startsWith("group:")) {
      const gid = parseInt(input.convKey.slice(6), 10);
      const [m] = await db.select({ id: messages.id }).from(messages).where(eq17(messages.groupId, gid)).orderBy(desc7(messages.id)).limit(1);
      maxId = m?.id ?? 0;
    } else if (input.convKey.startsWith("dm:")) {
      const other = parseInt(input.convKey.slice(3), 10);
      const [m] = await db.select({ id: messages.id }).from(messages).where(or5(
        and14(eq17(messages.senderId, ctx.user.id), eq17(messages.receiverId, other)),
        and14(eq17(messages.senderId, other), eq17(messages.receiverId, ctx.user.id))
      )).orderBy(desc7(messages.id)).limit(1);
      maxId = m?.id ?? 0;
    }
    const [existing] = await db.select({ id: conversationPrefs.id }).from(conversationPrefs).where(and14(eq17(conversationPrefs.userId, ctx.user.id), eq17(conversationPrefs.convKey, input.convKey))).limit(1);
    if (existing) {
      await db.update(conversationPrefs).set({ clearedBeforeId: maxId }).where(eq17(conversationPrefs.id, existing.id));
    } else {
      await db.insert(conversationPrefs).values({ userId: ctx.user.id, convKey: input.convKey, clearedBeforeId: maxId });
    }
    if (input.convKey.startsWith("group:")) {
      const gid = parseInt(input.convKey.slice(6), 10);
      if (Number.isFinite(gid)) await initReadCursor(db, gid, ctx.user.id);
    }
    return { ok: true, clearedBeforeId: maxId };
  }),
  // ─── 进群审批 ────────────────────────────────────────────────────────────
  listJoinRequests: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") return [];
    return db.select({
      id: groupJoinRequests.id,
      userId: groupJoinRequests.userId,
      createdAt: groupJoinRequests.createdAt,
      name: users.name,
      username: users.username,
      avatar: users.avatar
    }).from(groupJoinRequests).leftJoin(users, eq17(users.id, groupJoinRequests.userId)).where(and14(eq17(groupJoinRequests.groupId, input.groupId), eq17(groupJoinRequests.status, "pending"))).orderBy(desc7(groupJoinRequests.id));
  }),
  reviewJoinRequest: protectedProcedure.input(z6.object({ requestId: z6.number(), approve: z6.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [req] = await db.select().from(groupJoinRequests).where(eq17(groupJoinRequests.id, input.requestId)).limit(1);
    if (!req || req.status !== "pending") throw new TRPCError8({ code: "NOT_FOUND", message: "\u7533\u8BF7\u4E0D\u5B58\u5728\u6216\u5DF2\u5904\u7406" });
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, req.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u4EC5\u7FA4\u4E3B/\u7BA1\u7406\u5458\u53EF\u5BA1\u6279" });
    }
    if (input.approve) {
      await assertGroupHasCapacity(db, req.groupId);
    }
    const flip = await db.update(groupJoinRequests).set({ status: input.approve ? "approved" : "rejected" }).where(and14(eq17(groupJoinRequests.id, input.requestId), eq17(groupJoinRequests.status, "pending")));
    const flipped = flip?.[0]?.affectedRows ?? flip?.affectedRows ?? flip?.rowsAffected ?? 0;
    if (flipped < 1) throw new TRPCError8({ code: "NOT_FOUND", message: "\u7533\u8BF7\u4E0D\u5B58\u5728\u6216\u5DF2\u5904\u7406" });
    if (input.approve) {
      const already = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, req.groupId), eq17(groupMembers.userId, req.userId))).limit(1);
      if (already.length === 0) {
        await db.insert(groupMembers).values({ groupId: req.groupId, userId: req.userId, role: "member" });
        await db.update(chatGroups).set({
          memberCount: sql10`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${req.groupId})`
        }).where(eq17(chatGroups.id, req.groupId));
        await initReadCursor(db, req.groupId, req.userId);
        await awardTaskEvent(db, req.userId, "join_group_daily");
      }
    }
    return { ok: true };
  }),
  // ─── Red Packet: Send (扣 AC 积分发群红包) ───────────────────────────────
  sendRedPacket: protectedProcedure.input(z6.object({
    groupId: z6.number().optional(),
    receiverId: z6.number().optional(),
    // 私信红包接收者（与 groupId 二选一）
    totalAmount: z6.number().int().min(1).max(1e6),
    totalShares: z6.number().int().min(1).max(100).default(1),
    isRandom: z6.boolean().default(true),
    blessing: z6.string().max(100).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    if (!input.groupId && !input.receiverId) {
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u7F3A\u5C11\u7EA2\u5305\u76EE\u6807" });
    }
    const isDM = !input.groupId && !!input.receiverId;
    if (input.groupId) await assertGroupMember(db, input.groupId, ctx.user.id);
    else if (isDM) await assertCanDM(db, ctx.user.id, input.receiverId);
    const totalShares = isDM ? 1 : input.totalShares;
    const isRandom = isDM ? false : input.isRandom;
    if (totalShares > input.totalAmount) {
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u7EA2\u5305\u4E2A\u6570\u4E0D\u80FD\u8D85\u8FC7\u603B\u79EF\u5206\uFF08\u6BCF\u4EFD\u81F3\u5C11 1 IT\uFF09" });
    }
    const blessing = sanitizeInput(input.blessing?.trim() || "\u606D\u559C\u53D1\u8D22\uFF0C\u5927\u5409\u5927\u5229", 100);
    let messageId = 0;
    await db.transaction(async (tx) => {
      const deduct = await tx.update(users).set({ npPoints: sql10`npPoints - ${input.totalAmount}` }).where(and14(eq17(users.id, ctx.user.id), sql10`npPoints >= ${input.totalAmount}`));
      const affected2 = deduct?.[0]?.affectedRows ?? deduct?.affectedRows ?? 0;
      if (!affected2) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u79EF\u5206\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u53D1\u7EA2\u5305" });
      const [msg] = await tx.insert(messages).values({
        groupId: input.groupId ?? null,
        receiverId: isDM ? input.receiverId : void 0,
        senderId: ctx.user.id,
        content: blessing,
        messageType: "redpacket"
      });
      messageId = msg.insertId;
      await tx.insert(redPackets).values({
        messageId,
        groupId: input.groupId ?? null,
        receiverId: isDM ? input.receiverId : null,
        senderId: ctx.user.id,
        totalAmount: input.totalAmount,
        totalShares,
        remainingAmount: input.totalAmount,
        remainingShares: totalShares,
        isRandom,
        blessing
      });
    });
    if (isDM && input.receiverId) {
      emitToUser(input.receiverId, "dm_message", {
        messageId,
        senderId: ctx.user.id,
        senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
        content: blessing,
        messageType: "redpacket",
        mediaUrl: null,
        durationSeconds: null,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      void notifyDmOffline(input.receiverId, ctx.user.id, `${ctx.user.name ?? ctx.user.username ?? "\u6709\u4EBA"} \u53D1\u6765\u4E00\u4E2A\u7EA2\u5305`, "\u{1F9E7} " + blessing);
    }
    return { messageId, totalAmount: input.totalAmount, totalShares };
  }),
  // ─── Red Packet: Claim (抢红包，随机/均分发放并入账) ───────────────────────
  claimRedPacket: protectedProcedure.input(z6.object({
    messageId: z6.number(),
    groupId: z6.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    let result = { ok: false, reason: "not_found", amount: 0 };
    await db.transaction(async (tx) => {
      const [rp] = await tx.select().from(redPackets).where(eq17(redPackets.messageId, input.messageId)).for("update").limit(1);
      if (!rp) {
        result = { ok: false, reason: "not_found", amount: 0 };
        return;
      }
      if (rp.groupId) {
        const [m] = await tx.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, rp.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
        if (!m) {
          result = { ok: false, reason: "not_member", amount: 0 };
          return;
        }
      } else if (rp.receiverId && rp.receiverId !== ctx.user.id) {
        result = { ok: false, reason: "not_recipient", amount: 0 };
        return;
      }
      const existing = await tx.select({ amount: redPacketClaims.amount }).from(redPacketClaims).where(and14(eq17(redPacketClaims.messageId, input.messageId), eq17(redPacketClaims.claimedBy, ctx.user.id))).limit(1);
      if (existing.length > 0) {
        result = { ok: false, reason: "already_claimed", amount: existing[0].amount };
        return;
      }
      if (rp.remainingShares <= 0 || rp.remainingAmount <= 0) {
        result = { ok: false, reason: "exhausted", amount: 0 };
        return;
      }
      let amount;
      if (rp.remainingShares === 1) {
        amount = rp.remainingAmount;
      } else if (rp.isRandom) {
        const max = Math.max(1, rp.remainingAmount - (rp.remainingShares - 1));
        const avg2 = Math.floor(rp.remainingAmount / rp.remainingShares * 2);
        const hi = Math.max(1, Math.min(max, avg2));
        amount = Math.floor(Math.random() * hi) + 1;
      } else {
        amount = Math.max(1, Math.floor(rp.remainingAmount / rp.remainingShares));
      }
      await tx.insert(redPacketClaims).values({
        messageId: input.messageId,
        groupId: rp.groupId ?? null,
        claimedBy: ctx.user.id,
        amount
      });
      await tx.update(redPackets).set({ remainingAmount: sql10`remainingAmount - ${amount}`, remainingShares: sql10`remainingShares - 1` }).where(eq17(redPackets.id, rp.id));
      await tx.update(users).set({ npPoints: sql10`npPoints + ${amount}` }).where(eq17(users.id, ctx.user.id));
      result = { ok: true, reason: "", amount };
    });
    return result;
  }),
  // ─── Red Packet: Get status (含金额与领取明细) ───────────────────────────
  getRedPacketStatus: protectedProcedure.input(z6.object({ messageId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const [rp] = await db.select().from(redPackets).where(eq17(redPackets.messageId, input.messageId)).limit(1);
    if (!rp) return null;
    if (rp.groupId) {
      const [m] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, rp.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
      if (!m) return null;
    } else if (rp.receiverId && rp.receiverId !== ctx.user.id && rp.senderId !== ctx.user.id) {
      return null;
    }
    const claims = await db.select({
      claimedBy: redPacketClaims.claimedBy,
      amount: redPacketClaims.amount,
      claimedAt: redPacketClaims.claimedAt,
      name: users.name,
      avatar: users.avatar
    }).from(redPacketClaims).leftJoin(users, eq17(users.id, redPacketClaims.claimedBy)).where(eq17(redPacketClaims.messageId, input.messageId)).orderBy(desc7(redPacketClaims.claimedAt));
    const mine = claims.find((c) => c.claimedBy === ctx.user.id);
    return {
      messageId: input.messageId,
      senderId: rp.senderId,
      totalAmount: rp.totalAmount,
      totalShares: rp.totalShares,
      remainingShares: rp.remainingShares,
      remainingAmount: rp.remainingAmount,
      isRandom: rp.isRandom,
      blessing: rp.blessing,
      claimedCount: rp.totalShares - rp.remainingShares,
      claimedByMe: !!mine,
      myAmount: mine?.amount ?? 0,
      claims: claims.map((c) => ({ userId: c.claimedBy, name: c.name, avatar: c.avatar, amount: c.amount }))
    };
  }),
  // ─── Group Announcements: Get ─────────────────────────────────────────────
  getAnnouncement: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const [grp] = await db.select({ isPublic: chatGroups.isPublic }).from(chatGroups).where(eq17(chatGroups.id, input.groupId)).limit(1);
    if (!grp) return null;
    if (!grp.isPublic) await assertGroupMember(db, input.groupId, ctx.user.id);
    const ann = await db.select().from(groupAnnouncements).where(and14(eq17(groupAnnouncements.groupId, input.groupId), eq17(groupAnnouncements.isPinned, true))).orderBy(desc7(groupAnnouncements.updatedAt)).limit(1);
    return ann[0] ?? null;
  }),
  // ─── Group Announcements: Set (owner/admin only) ──────────────────────────
  setAnnouncement: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    content: z6.string().min(1).max(1e3)
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    await db.delete(groupAnnouncements).where(and14(eq17(groupAnnouncements.groupId, input.groupId), eq17(groupAnnouncements.isPinned, true)));
    await db.insert(groupAnnouncements).values({
      groupId: input.groupId,
      content: sanitizeInput(input.content),
      createdBy: ctx.user.id,
      isPinned: true
    });
    const [groupInfo] = await db.select({ name: chatGroups.name }).from(chatGroups).where(eq17(chatGroups.id, input.groupId)).limit(1);
    const members = await db.select({ userId: groupMembers.userId }).from(groupMembers).where(eq17(groupMembers.groupId, input.groupId));
    const senderName = ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`;
    const groupName = groupInfo?.name ?? `Group #${input.groupId}`;
    const safeContent = sanitizeInput(input.content);
    const preview = safeContent.length > 60 ? safeContent.slice(0, 60) + "..." : safeContent;
    try {
      getSocketIO()?.to(`group:${input.groupId}`).emit("group_announcement", {
        groupId: input.groupId,
        content: safeContent,
        deleted: false,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
    }
    for (const member of members) {
      if (member.userId === ctx.user.id) continue;
      emitToUser(member.userId, "group_announcement", {
        groupId: input.groupId,
        groupName,
        content: preview,
        updatedBy: senderName,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return { ok: true };
  }),
  // ─── Group Announcements: Delete (owner/admin only) ───────────────────────
  deleteAnnouncement: protectedProcedure.input(z6.object({ groupId: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const actor = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!actor[0] || actor[0].role !== "owner" && actor[0].role !== "admin") throw new Error("Not authorized");
    await db.delete(groupAnnouncements).where(and14(eq17(groupAnnouncements.groupId, input.groupId), eq17(groupAnnouncements.isPinned, true)));
    try {
      getSocketIO()?.to(`group:${input.groupId}`).emit("group_announcement", {
        groupId: input.groupId,
        content: "",
        deleted: true,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
    }
    return { ok: true };
  }),
  // ─── 群数据看板（群成员可看；数据机器人解锁周报，但实时数据对成员开放） ──────
  getGroupStats: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await assertGroupMember(db, input.groupId, ctx.user.id);
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1e3);
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1e3);
    const prevWeekAgo = new Date(now - 14 * 24 * 3600 * 1e3);
    const [memberCount] = await db.select({ c: sql10`COUNT(*)` }).from(groupMembers).where(eq17(groupMembers.groupId, input.groupId));
    const [newWeek] = await db.select({ c: sql10`COUNT(*)` }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), gt3(groupMembers.joinedAt, weekAgo)));
    const [msgToday] = await db.select({ c: sql10`COUNT(*)` }).from(messages).where(and14(eq17(messages.groupId, input.groupId), gt3(messages.createdAt, dayAgo)));
    const [msgWeek] = await db.select({ c: sql10`COUNT(*)` }).from(messages).where(and14(eq17(messages.groupId, input.groupId), gt3(messages.createdAt, weekAgo)));
    const [msgPrevWeek] = await db.select({ c: sql10`COUNT(*)` }).from(messages).where(and14(eq17(messages.groupId, input.groupId), gt3(messages.createdAt, prevWeekAgo), lt4(messages.createdAt, weekAgo)));
    const [activeWeek] = await db.select({ c: sql10`COUNT(DISTINCT ${messages.senderId})` }).from(messages).where(and14(eq17(messages.groupId, input.groupId), gt3(messages.createdAt, weekAgo)));
    const daily = await db.select({
      day: sql10`DATE(${messages.createdAt})`,
      c: sql10`COUNT(*)`
    }).from(messages).where(and14(eq17(messages.groupId, input.groupId), gt3(messages.createdAt, weekAgo))).groupBy(sql10`DATE(${messages.createdAt})`).orderBy(sql10`DATE(${messages.createdAt})`);
    const topRows = await db.select({
      userId: messages.senderId,
      name: users.name,
      avatar: users.avatar,
      c: sql10`COUNT(*)`
    }).from(messages).leftJoin(users, eq17(users.id, messages.senderId)).where(and14(eq17(messages.groupId, input.groupId), gt3(messages.createdAt, weekAgo))).groupBy(messages.senderId, users.name, users.avatar).orderBy(desc7(sql10`COUNT(*)`)).limit(5);
    const total = Number(memberCount?.c ?? 0);
    const active = Number(activeWeek?.c ?? 0);
    const mw = Number(msgWeek?.c ?? 0);
    const mpw = Number(msgPrevWeek?.c ?? 0);
    const wow = mpw > 0 ? Math.round((mw - mpw) / mpw * 100) : mw > 0 ? 100 : 0;
    return {
      memberCount: total,
      newMembersWeek: Number(newWeek?.c ?? 0),
      messagesToday: Number(msgToday?.c ?? 0),
      messagesWeek: mw,
      messagesPrevWeek: mpw,
      messagesWoW: wow,
      // 周环比 %
      activeMembersWeek: active,
      activeRate: total > 0 ? Math.round(active / total * 100) : 0,
      // 活跃率 %
      daily: daily.map((d) => ({ day: String(d.day), count: Number(d.c) })),
      topMembers: topRows.map((r) => ({
        userId: r.userId,
        name: r.name ?? `\u7528\u6237#${r.userId}`,
        avatar: r.avatar ?? null,
        count: Number(r.c)
      }))
    };
  }),
  // ─── 群机器人：目录 + 套餐 + 本群状态 ──────────────────────────────────────
  getGroupBots: protectedProcedure.input(z6.object({ groupId: z6.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await assertGroupMember(db, input.groupId, ctx.user.id);
    const [me] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    const canManage = !!me && (me.role === "owner" || me.role === "admin");
    const bots = await listGroupBots(db, input.groupId);
    return { canManage, bots, packages: BOT_PACKAGES };
  }),
  // 开通/续费/关闭/改设置（owner/admin；开通按月扣 AC）
  setGroupBot: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    botType: z6.enum(["welcome", "manage", "price", "activity", "stats", "interact", "growth"]),
    enabled: z6.boolean().optional(),
    // 开/关
    months: z6.number().int().min(0).max(12).optional(),
    // >0 表示订阅/续费月数（扣费）
    config: z6.record(z6.string(), z6.any()).optional()
    // 机器人设置
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [me] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!me || me.role !== "owner" && me.role !== "admin") {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u4EC5\u7FA4\u4E3B/\u7BA1\u7406\u5458\u53EF\u8BBE\u7F6E\u673A\u5668\u4EBA" });
    }
    const meta = getBotMeta(input.botType);
    if (!meta) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u672A\u77E5\u673A\u5668\u4EBA" });
    const [existing] = await db.select().from(groupBots).where(and14(eq17(groupBots.groupId, input.groupId), eq17(groupBots.botType, input.botType))).limit(1);
    let expiresAt = void 0;
    const months = input.months ?? 0;
    if (months > 0 && meta.monthlyNN > 0) {
      const cost = meta.monthlyNN * months;
      if (meta.currency === "AC") {
        const ok = await spendNP(db, ctx.user.id, cost);
        if (!ok) throw new TRPCError8({ code: "BAD_REQUEST", message: `IT \u4F59\u989D\u4E0D\u8DB3\uFF08\u9700 ${cost.toLocaleString()} IT\uFF09\uFF0C\u5B8C\u6210\u4EFB\u52A1\u53EF\u83B7\u53D6 IT` });
      } else {
        const ok = await spendNN(db, ctx.user.id, cost, { type: "bot_sub", refType: "group", refId: input.groupId, memo: input.botType });
        if (!ok) throw new TRPCError8({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u5F00\u901A" });
      }
      const base = existing?.expiresAt && existing.expiresAt.getTime() > Date.now() ? existing.expiresAt.getTime() : Date.now();
      expiresAt = new Date(base + months * 30 * 24 * 3600 * 1e3);
    } else if (months > 0 && meta.monthlyNN === 0) {
      expiresAt = null;
    }
    const setFields = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.enabled !== void 0) setFields.enabled = input.enabled;
    if (months > 0) setFields.enabled = true;
    if (expiresAt !== void 0) setFields.expiresAt = expiresAt;
    if (input.config !== void 0) {
      const merged = { ...meta.defaultConfig, ...input.config };
      setFields.config = JSON.stringify(merged);
    }
    if (existing) {
      await db.update(groupBots).set(setFields).where(eq17(groupBots.id, existing.id));
    } else {
      await db.insert(groupBots).values({
        groupId: input.groupId,
        botType: input.botType,
        enabled: setFields.enabled ?? false,
        expiresAt: expiresAt ?? null,
        config: setFields.config ?? JSON.stringify(meta.defaultConfig)
      });
    }
    const [bal] = await db.select({ nn: users.nnBalance }).from(users).where(eq17(users.id, ctx.user.id)).limit(1);
    return { ok: true, nnBalance: Number(bal?.nn ?? 0) };
  }),
  // 开通机器人套餐：按套餐折扣价一次性扣 AI，激活套餐内全部机器人
  buyBotPackage: protectedProcedure.input(z6.object({
    groupId: z6.number(),
    packageKey: z6.string(),
    months: z6.number().int().min(1).max(12).default(1)
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [me] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and14(eq17(groupMembers.groupId, input.groupId), eq17(groupMembers.userId, ctx.user.id))).limit(1);
    if (!me || me.role !== "owner" && me.role !== "admin") {
      throw new TRPCError8({ code: "FORBIDDEN", message: "\u4EC5\u7FA4\u4E3B/\u7BA1\u7406\u5458\u53EF\u5F00\u901A\u5957\u9910" });
    }
    const pkg = BOT_PACKAGES.find((p) => p.key === input.packageKey);
    if (!pkg) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u672A\u77E5\u5957\u9910" });
    const cost = pkg.monthlyNN * input.months;
    if (pkg.currency === "AC") {
      const ok = await spendNP(db, ctx.user.id, cost);
      if (!ok) throw new TRPCError8({ code: "BAD_REQUEST", message: `IT \u4F59\u989D\u4E0D\u8DB3\uFF08\u9700 ${cost.toLocaleString()} IT\uFF09\uFF0C\u5B8C\u6210\u4EFB\u52A1\u53EF\u83B7\u53D6 IT` });
    } else {
      const ok = await spendNN(db, ctx.user.id, cost, { type: "package", refType: "group", refId: input.groupId, memo: pkg.key });
      if (!ok) throw new TRPCError8({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u5F00\u901A\u5957\u9910" });
    }
    const paidExpiry = new Date(Date.now() + input.months * 30 * 24 * 3600 * 1e3);
    for (const bt of pkg.bots) {
      const meta = getBotMeta(bt);
      if (!meta) continue;
      const isFree = meta.monthlyNN === 0;
      const [existing] = await db.select().from(groupBots).where(and14(eq17(groupBots.groupId, input.groupId), eq17(groupBots.botType, bt))).limit(1);
      let expiresAt = isFree ? null : paidExpiry;
      if (!isFree && existing?.expiresAt && existing.expiresAt.getTime() > Date.now()) {
        expiresAt = new Date(existing.expiresAt.getTime() + input.months * 30 * 24 * 3600 * 1e3);
      }
      if (existing) {
        await db.update(groupBots).set({ enabled: true, expiresAt, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(groupBots.id, existing.id));
      } else {
        await db.insert(groupBots).values({
          groupId: input.groupId,
          botType: bt,
          enabled: true,
          expiresAt,
          config: JSON.stringify(meta.defaultConfig)
        });
      }
    }
    const [bal] = await db.select({ nn: users.nnBalance }).from(users).where(eq17(users.id, ctx.user.id)).limit(1);
    return { ok: true, nnBalance: Number(bal?.nn ?? 0), bots: pkg.bots };
  }),
  // ─── AI 治理代币 ──────────────────────────────────────────────────────────
  getTokenInfo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return getTokenInfo(db, ctx.user.id);
  }),
  // 代币经济（总量 + 分配模型，公开）
  getTokenomics: publicProcedure.query(() => getTokenomics()),
  // 发放 AI（空投/运营，管理员）。amount 上限受金库余额约束。
  adminGrantNN: adminProcedure.input(z6.object({ userId: z6.number(), amount: z6.number().int().min(1).max(NN_TOTAL_SUPPLY) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const ok = await grantNN(db, input.userId, input.amount, { type: "grant", refType: "admin" });
    if (!ok) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u91D1\u5E93\u4F59\u989D\u4E0D\u8DB3\u6216\u53C2\u6570\u65E0\u6548" });
    return await getTokenInfo(db, input.userId);
  }),
  // ─── Pro 会员 ─────────────────────────────────────────────────────────────
  getMembership: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return getMembership(db, ctx.user.id);
  }),
  buyMembership: protectedProcedure.input(z6.object({ tier: z6.enum(["plus", "pro"]), months: z6.number().int().min(1).max(12).default(1) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    try {
      const r = await buyMembership(db, ctx.user.id, input.tier, input.months);
      return { ok: true, ...r };
    } catch (e) {
      if (e?.message === "insufficient_nn") throw new TRPCError8({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3" });
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u5F00\u901A\u5931\u8D25" });
    }
  }),
  // 我的归属计划（节点等线性释放）
  getMyVesting: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return getMyVesting(db, ctx.user.id);
  }),
  // 领取当前可解锁的 AI
  claimVesting: protectedProcedure.input(z6.object({ vestingId: z6.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const r = await claimVesting(db, ctx.user.id, input.vestingId);
    if (!r.ok) throw new TRPCError8({ code: "BAD_REQUEST", message: "\u6682\u65E0\u53EF\u9886\u53D6\u7684\u989D\u5EA6" });
    return r;
  }),
  // 我的 AI 流水
  getMyNNTransactions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return getMyNNTransactions(db, ctx.user.id, 50);
  }),
  // 运营：机器人订阅统计 + AI 营收 + 节点订单概览
  // ─── 运营增长:一键填公开群人数 + 一键扩充互动机器人(替代服务器脚本)──────────────
  adminFillGroupMembers: adminProcedure.input(z6.object({
    targetMin: z6.number().int().min(1).max(5e3).default(220),
    targetMax: z6.number().int().min(1).max(5e3).default(480),
    maxPerCall: z6.number().int().min(1).max(2e3).default(800)
    // 单次最多新增,防 HTTP 超时;不够再点一次
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const lo = Math.min(input.targetMin, input.targetMax), hi = Math.max(input.targetMin, input.targetMax);
    const groups = await db.select({ id: chatGroups.id, name: chatGroups.name }).from(chatGroups).where(eq17(chatGroups.isPublic, true)).limit(60);
    const PRE = ["0x", "Crypto", "Web3", "DeFi", "Chain", "Block", "Token", "NFT", "Eth", "BTC", "Sol", "Ape", "Degen", "Meta", "Zk", "Layer"];
    const SUF = ["Whale", "Degen", "Hodler", "Maxi", "Anon", "Dev", "Trader", "Farmer", "Bull", "Bear", "Ape", "Fren", "Chad", "Wizard", "Ninja", "Guru"];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const pastDate = (maxDays) => new Date(Date.now() - Math.random() * maxDays * 864e5);
    let added = 0, remaining = 0, ctr = Date.now() * 1e3;
    const summary = [];
    for (const g of groups) {
      const [cnt] = await db.select({ c: sql10`COUNT(*)` }).from(groupMembers).where(eq17(groupMembers.groupId, g.id));
      const have = Number(cnt?.c ?? 0);
      const target = lo + Math.floor(Math.random() * (hi - lo + 1));
      const want = target - have;
      if (want <= 0) continue;
      const budget = input.maxPerCall - added;
      if (budget <= 0) {
        remaining += want;
        continue;
      }
      const need = Math.min(want, budget);
      let done = 0;
      while (done < need) {
        const n2 = Math.min(100, need - done);
        const rows = Array.from({ length: n2 }, () => {
          const uname = `${pick(PRE)}${pick(SUF)}_${(ctr++).toString(36)}`;
          return { openId: `silent_${ctr}_${Math.floor(Math.random() * 1e6)}`, name: uname, loginMethod: "silent", role: "user", username: uname, isBot: true, lastSignedIn: pastDate(7) };
        });
        const res = await db.insert(users).values(rows);
        const firstId = res?.insertId ?? res?.[0]?.insertId;
        if (!firstId) break;
        await db.insert(groupMembers).values(Array.from({ length: n2 }, (_, i) => ({ groupId: g.id, userId: Number(firstId) + i, role: "member", joinedAt: pastDate(60) })));
        done += n2;
      }
      const [c2] = await db.select({ c: sql10`COUNT(*)` }).from(groupMembers).where(eq17(groupMembers.groupId, g.id));
      await db.update(chatGroups).set({ memberCount: Number(c2?.c ?? 0) }).where(eq17(chatGroups.id, g.id));
      added += done;
      if (want > done) remaining += want - done;
      summary.push({ group: g.name, from: have, to: Number(c2?.c ?? 0) });
    }
    return { added, remaining, summary };
  }),
  adminAddBots: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const NEW_BOTS = [
      { openId: "bot_meme_king", name: "MemeKing", username: "meme_king" },
      { openId: "bot_nft_collector", name: "NFTCollector", username: "nft_collector" },
      { openId: "bot_dev_builder", name: "DevBuilder", username: "dev_builder" },
      { openId: "bot_macro_trader", name: "MacroTrader", username: "macro_trader" },
      { openId: "bot_yield_farmer", name: "YieldFarmer", username: "yield_farmer" },
      { openId: "bot_news_flash", name: "NewsFlash", username: "news_flash" }
    ];
    let created = 0;
    for (const b of NEW_BOTS) {
      const [ex] = await db.select({ id: users.id }).from(users).where(eq17(users.openId, b.openId)).limit(1);
      if (ex) continue;
      await db.insert(users).values({ openId: b.openId, name: b.name, loginMethod: "bot", role: "user", username: b.username, isBot: true, lastSignedIn: /* @__PURE__ */ new Date() });
      created++;
    }
    const bots = await db.select({ id: users.id }).from(users).where(inArray7(users.openId, Object.values(BOT_PERSONAS).map((p) => p.openId)));
    const groups = await db.select({ id: chatGroups.id }).from(chatGroups).where(eq17(chatGroups.isPublic, true)).limit(60);
    let joins = 0;
    for (const g of groups) {
      for (const bot of bots) {
        const [m] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and14(eq17(groupMembers.groupId, g.id), eq17(groupMembers.userId, bot.id))).limit(1);
        if (m) continue;
        await db.insert(groupMembers).values({ groupId: g.id, userId: bot.id, role: "member" });
        joins++;
      }
      const [c2] = await db.select({ c: sql10`COUNT(*)` }).from(groupMembers).where(eq17(groupMembers.groupId, g.id));
      await db.update(chatGroups).set({ memberCount: Number(c2?.c ?? 0) }).where(eq17(chatGroups.id, g.id));
    }
    return { createdBots: created, totalBots: bots.length, groups: groups.length, joins };
  }),
  adminBotStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const now = /* @__PURE__ */ new Date();
    const active = await db.select({ botType: groupBots.botType, c: sql10`COUNT(*)` }).from(groupBots).where(and14(eq17(groupBots.enabled, true), or5(isNull3(groupBots.expiresAt), gt3(groupBots.expiresAt, now)))).groupBy(groupBots.botType);
    const soon = new Date(now.getTime() + 7 * 24 * 3600 * 1e3);
    const [expiring] = await db.select({ c: sql10`COUNT(*)` }).from(groupBots).where(and14(eq17(groupBots.enabled, true), gt3(groupBots.expiresAt, now), lt4(groupBots.expiresAt, soon)));
    const revenue = await getNNRevenue(db);
    const orderAgg = await db.select({ status: nnNodeOrders.status, c: sql10`COUNT(*)` }).from(nnNodeOrders).groupBy(nnNodeOrders.status);
    const token = await getTokenInfo(db);
    return {
      activeBots: active.map((a) => ({ botType: a.botType, count: Number(a.c) })),
      expiringSoon: Number(expiring?.c ?? 0),
      revenue,
      nodeOrders: orderAgg.map((o) => ({ status: o.status, count: Number(o.c) })),
      token
    };
  }),
  // ─── 节点认购（USDT 私募） ─────────────────────────────────────────────────
  // 节点等级 + 收款地址（公开）
  getNodeTiers: publicProcedure.query(() => ({ tiers: NN_NODE_TIERS, payAddress: USDT_DEPOSIT_ADDRESS, chain: USDT_CHAIN })),
  // 下单认购：创建待支付订单，返回收款地址与应付金额
  createNodeOrder: protectedProcedure.input(z6.object({ tier: z6.enum(["genesis", "super", "standard"]) })).use(rateLimitWrite).mutation(async () => {
    throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8282\u70B9\u8BA4\u8D2D\u5DF2\u5347\u7EA7\u4E3A\u300C\u5408\u4F19\u4EBA\u62DB\u52DF\u300D\uFF0C\u8BF7\u524D\u5F80\u4EE3\u5E01\u9875 \u2192 \u5408\u4F19\u4EBA\u62DB\u52DF\u8BA4\u8D2D" });
  }),
  // 回填链上转账哈希（用户支付后提交，等待运营确认）
  submitNodeTx: protectedProcedure.input(z6.object({ orderId: z6.number(), txHash: z6.string().min(6).max(120) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [o] = await db.select().from(nnNodeOrders).where(eq17(nnNodeOrders.id, input.orderId)).limit(1);
    if (!o || o.userId !== ctx.user.id) throw new TRPCError8({ code: "FORBIDDEN", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status !== "pending") throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u72B6\u6001\u4E0D\u53EF\u4FEE\u6539" });
    await db.update(nnNodeOrders).set({ txHash: sanitizeInput(input.txHash, 120) }).where(eq17(nnNodeOrders.id, input.orderId));
    return { ok: true };
  }),
  // 我的节点订单
  getMyNodeOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(nnNodeOrders).where(eq17(nnNodeOrders.userId, ctx.user.id)).orderBy(desc7(nnNodeOrders.createdAt)).limit(50);
  }),
  // 运营：列订单（可按状态）
  adminListNodeOrders: adminProcedure.input(z6.object({ status: z6.enum(["pending", "confirmed", "cancelled"]).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conds = input?.status ? [eq17(nnNodeOrders.status, input.status)] : [];
    return db.select().from(nnNodeOrders).where(conds.length ? and14(...conds) : void 0).orderBy(desc7(nnNodeOrders.createdAt)).limit(100);
  }),
  // 运营：确认到账 → 发放 AI（从金库/节点池），订单置为已确认
  adminConfirmNodeOrder: adminProcedure.input(z6.object({ orderId: z6.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [o] = await db.select().from(nnNodeOrders).where(eq17(nnNodeOrders.id, input.orderId)).limit(1);
    if (!o) throw new TRPCError8({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status !== "pending") throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u5DF2\u5904\u7406" });
    if (getNodeTier(o.tier)) {
      throw new TRPCError8({ code: "BAD_REQUEST", message: "\u65E7\u8282\u70B9\u8BA2\u5355\u5DF2\u505C\u7528\uFF08\u6C47\u7387\u5DF2\u8C03\u6574\u4E3A 1:1\uFF09\uFF0C\u8BF7\u53D6\u6D88\u8BE5\u8BA2\u5355\u5E76\u5F15\u5BFC\u7528\u6237\u901A\u8FC7\u300C\u5408\u4F19\u4EBA\u62DB\u52DF\u300D\u91CD\u65B0\u8BA4\u8D2D" });
    }
    throw new TRPCError8({ code: "BAD_REQUEST", message: "\u8BF7\u4F7F\u7528\u5408\u4F19\u4EBA\u786E\u8BA4\u5165\u53E3\u5904\u7406\u8BE5\u8BA2\u5355" });
  }),
  // 运营：取消订单
  adminCancelNodeOrder: adminProcedure.input(z6.object({ orderId: z6.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [o] = await db.select().from(nnNodeOrders).where(eq17(nnNodeOrders.id, input.orderId)).limit(1);
    if (!o) throw new TRPCError8({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status === "confirmed") throw new TRPCError8({ code: "BAD_REQUEST", message: "\u5DF2\u786E\u8BA4\u8BA2\u5355\u4E0D\u53EF\u53D6\u6D88" });
    await db.update(nnNodeOrders).set({ status: "cancelled" }).where(eq17(nnNodeOrders.id, o.id));
    return { ok: true };
  })
});

// server/routers/research.ts
import { z as z7 } from "zod";
import { TRPCError as TRPCError9 } from "@trpc/server";
init_db();
init_schema();
import { eq as eq18, and as and15, desc as desc8 } from "drizzle-orm";

// server/userAiBudget.ts
var DAILY_CAP2 = Math.max(0, Number(process.env.USER_AI_LLM_DAILY_CAP || 8e3));
var dayKey2 = "";
var count3 = 0;
function todayKey2() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function consumeUserAiBudget() {
  const t3 = todayKey2();
  if (t3 !== dayKey2) {
    dayKey2 = t3;
    count3 = 0;
  }
  if (count3 >= DAILY_CAP2) return false;
  count3++;
  return true;
}

// server/routers/research.ts
init_referralRewards();
init_appAdmin();
async function fetchTokenData(symbol) {
  const cacheKey2 = `token:search:${symbol.toLowerCase()}`;
  const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
  const searchData = await cachedFetch(
    cacheKey2,
    searchUrl,
    TTL.search,
    (res) => res.json()
  );
  const coin = searchData?.coins?.[0];
  if (!coin) return null;
  const detailCacheKey = `token:detail:${coin.id}`;
  const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`;
  const detail = await cachedFetch(
    detailCacheKey,
    detailUrl,
    TTL.tokenDetail,
    (res) => res.json()
  );
  if (!detail) return null;
  return {
    id: coin.id,
    name: detail.name,
    symbol: detail.symbol?.toUpperCase(),
    price: detail.market_data?.current_price?.usd,
    priceChange24h: detail.market_data?.price_change_percentage_24h,
    priceChange7d: detail.market_data?.price_change_percentage_7d,
    priceChange30d: detail.market_data?.price_change_percentage_30d,
    marketCap: detail.market_data?.market_cap?.usd,
    marketCapRank: detail.market_cap_rank,
    volume24h: detail.market_data?.total_volume?.usd,
    volumeToMcapRatio: detail.market_data?.total_volume?.usd && detail.market_data?.market_cap?.usd ? detail.market_data.total_volume.usd / detail.market_data.market_cap.usd : null,
    ath: detail.market_data?.ath?.usd,
    athDate: detail.market_data?.ath_date?.usd,
    athChangePercentage: detail.market_data?.ath_change_percentage?.usd,
    atl: detail.market_data?.atl?.usd,
    circulatingSupply: detail.market_data?.circulating_supply,
    totalSupply: detail.market_data?.total_supply,
    maxSupply: detail.market_data?.max_supply,
    fdv: detail.market_data?.fully_diluted_valuation?.usd,
    description: detail.description?.en?.slice(0, 800),
    categories: detail.categories?.slice(0, 5),
    genesisDate: detail.genesis_date,
    sentimentVotesUpPercentage: detail.sentiment_votes_up_percentage,
    sentimentVotesDownPercentage: detail.sentiment_votes_down_percentage
  };
}
function buildMarketContext(tokenData) {
  const athDrop = tokenData.athChangePercentage ? `\u8DDD\u79BBATH\u4E0B\u8DCC ${Math.abs(tokenData.athChangePercentage).toFixed(1)}%` : "N/A";
  const supplyInfo = tokenData.maxSupply ? `\u6D41\u901A\u91CF: ${fmtNum(tokenData.circulatingSupply)} / \u6700\u5927\u4F9B\u5E94: ${fmtNum(tokenData.maxSupply)} (${((tokenData.circulatingSupply ?? 0) / tokenData.maxSupply * 100).toFixed(1)}% \u5DF2\u91CA\u653E)` : `\u6D41\u901A\u91CF: ${fmtNum(tokenData.circulatingSupply)} / \u603B\u4F9B\u5E94: ${fmtNum(tokenData.totalSupply)}`;
  const volumeMcapRatio = tokenData.volumeToMcapRatio ? `\u6210\u4EA4\u91CF/\u5E02\u503C\u6BD4: ${(tokenData.volumeToMcapRatio * 100).toFixed(2)}% (${tokenData.volumeToMcapRatio > 0.1 ? "\u9AD8\u6362\u624B\uFF0C\u4EA4\u6613\u6D3B\u8DC3" : tokenData.volumeToMcapRatio > 0.03 ? "\u6B63\u5E38\u6362\u624B" : "\u4F4E\u6362\u624B\uFF0C\u6D41\u52A8\u6027\u504F\u5F31"})` : "";
  const sentiment = tokenData.sentimentVotesUpPercentage ? `\u793E\u533A\u60C5\u7EEA: ${tokenData.sentimentVotesUpPercentage.toFixed(0)}% \u770B\u6DA8 / ${tokenData.sentimentVotesDownPercentage?.toFixed(0) ?? "N/A"}% \u770B\u8DCC` : "";
  return `=== \u5B9E\u65F6\u5E02\u573A\u6570\u636E ===
\u4EE3\u5E01: ${tokenData.name} (${tokenData.symbol})
\u5F53\u524D\u4EF7\u683C: $${tokenData.price ?? "N/A"}
24h \u6DA8\u8DCC: ${fmtPct(tokenData.priceChange24h)}
7d \u6DA8\u8DCC: ${fmtPct(tokenData.priceChange7d)}
30d \u6DA8\u8DCC: ${fmtPct(tokenData.priceChange30d)}
\u5E02\u503C: $${fmtUsd(tokenData.marketCap)} (\u6392\u540D #${tokenData.marketCapRank ?? "N/A"})
FDV: $${fmtUsd(tokenData.fdv)}
24h \u6210\u4EA4\u91CF: $${fmtUsd(tokenData.volume24h)}
${volumeMcapRatio}
ATH: $${tokenData.ath ?? "N/A"} (${athDrop})
ATL: $${tokenData.atl ?? "N/A"}
${supplyInfo}
\u521B\u4E16\u65E5\u671F: ${tokenData.genesisDate ?? "N/A"}
${sentiment}
\u7C7B\u522B: ${tokenData.categories?.join(", ") ?? "N/A"}
\u9879\u76EE\u7B80\u4ECB: ${tokenData.description ?? "\u6682\u65E0"}`;
}
function fmtNum(n2) {
  if (n2 == null) return "N/A";
  if (n2 >= 1e9) return (n2 / 1e9).toFixed(2) + "B";
  if (n2 >= 1e6) return (n2 / 1e6).toFixed(2) + "M";
  if (n2 >= 1e3) return (n2 / 1e3).toFixed(2) + "K";
  return n2.toFixed(2);
}
function fmtUsd(n2) {
  if (n2 == null) return "N/A";
  if (n2 >= 1e12) return (n2 / 1e12).toFixed(2) + "T";
  if (n2 >= 1e9) return (n2 / 1e9).toFixed(2) + "B";
  if (n2 >= 1e6) return (n2 / 1e6).toFixed(2) + "M";
  if (n2 >= 1e3) return (n2 / 1e3).toFixed(2) + "K";
  return n2.toFixed(2);
}
function fmtPct(n2) {
  if (n2 == null) return "N/A";
  const sign = n2 >= 0 ? "+" : "";
  return `${sign}${n2.toFixed(2)}%`;
}
function buildQuickPrompt(symbol, marketContext) {
  return `\u4F60\u662F\u4E00\u4F4D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u52A0\u5BC6\u8D27\u5E01\u4EA4\u6613\u5458\u548C\u5206\u6790\u5E08\uFF0C\u62E5\u6709 10 \u5E74\u4EE5\u4E0A\u7684\u5E02\u573A\u7ECF\u9A8C\u3002\u4F60\u4EE5\u6562\u4E8E\u8868\u8FBE\u660E\u786E\u89C2\u70B9\u8457\u79F0\uFF0C\u4E0D\u4F1A\u7ED9\u51FA\u6A21\u68F1\u4E24\u53EF\u7684\u5206\u6790\u3002

\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5B9E\u65F6\u6570\u636E\uFF0C\u5BF9 ${symbol} \u8FDB\u884C\u5FEB\u901F\u5206\u6790\u3002

${marketContext}

**\u8F93\u51FA\u8981\u6C42\uFF08Markdown \u683C\u5F0F\uFF0C\u7EA6 400-500 \u5B57\uFF09\uFF1A**

## \u26A1 ${symbol} \u5FEB\u901F\u7814\u5224

### \u{1F3AF} \u6838\u5FC3\u89C2\u70B9
\u7528 1-2 \u53E5\u8BDD\u7ED9\u51FA\u4F60\u5BF9\u8BE5\u4EE3\u5E01\u5F53\u524D\u9636\u6BB5\u7684**\u660E\u786E\u5224\u65AD**\uFF08\u770B\u591A/\u770B\u7A7A/\u89C2\u671B\uFF09\uFF0C\u4EE5\u53CA\u5224\u65AD\u7684\u6838\u5FC3\u4F9D\u636E\u3002\u4E0D\u8981\u6A21\u68F1\u4E24\u53EF\u3002

### \u{1F4CA} \u5173\u952E\u6570\u636E\u89E3\u8BFB
\u7528\u4E00\u4E2A\u8868\u683C\u603B\u7ED3\u6700\u5173\u952E\u7684 3-5 \u4E2A\u6570\u636E\u70B9\uFF0C\u5E76\u5728\u6BCF\u4E2A\u6570\u636E\u540E\u7ED9\u51FA\u4F60\u7684**\u89E3\u8BFB**\uFF08\u5229\u597D/\u5229\u7A7A/\u4E2D\u6027\uFF09\uFF1A

| \u6307\u6807 | \u6570\u503C | \u89E3\u8BFB |
|------|------|------|

### \u{1F9ED} \u5206\u6790\u601D\u8DEF
\u7ED9\u51FA\u660E\u786E\u7684\u64CD\u4F5C\u601D\u8DEF\uFF1A
- **\u77ED\u7EBF\uFF081-7\u5929\uFF09**\uFF1A\u5177\u4F53\u7684\u65B9\u5411\u5224\u65AD\u548C\u5173\u952E\u4EF7\u4F4D
- **\u4E2D\u7EBF\uFF081-3\u6708\uFF09**\uFF1A\u8D8B\u52BF\u5224\u65AD\u548C\u5173\u6CE8\u7684\u50AC\u5316\u5242
- \u7ED9\u51FA\u5177\u4F53\u7684**\u5173\u6CE8\u4EF7\u4F4D**\uFF08\u652F\u6491\u4F4D/\u963B\u529B\u4F4D\uFF09

### \u26A0\uFE0F \u6838\u5FC3\u98CE\u9669
\u5217\u51FA 2-3 \u4E2A\u6700\u9700\u8981\u8B66\u60D5\u7684\u98CE\u9669\u56E0\u7D20\uFF0C\u6BCF\u4E2A\u7528\u4E00\u53E5\u8BDD\u8BF4\u660E

---
*\u6BD4\u7279AI\u793E\u4EA4 \u7814\u7A76\u52A9\u624B | \u6570\u636E\u6765\u6E90: CoinGecko | \u672C\u5206\u6790\u57FA\u4E8E\u516C\u5F00\u6570\u636E\u7684 AI \u63A8\u7406\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE*`;
}
function buildDeepPrompt(symbol, marketContext) {
  return `\u4F60\u662F\u4E00\u4F4D\u9876\u7EA7\u52A0\u5BC6\u8D27\u5E01\u7814\u7A76\u673A\u6784\u7684\u9996\u5E2D\u5206\u6790\u5E08\uFF0C\u4EE5\u6DF1\u5EA6\u3001\u72EC\u7ACB\u3001\u6709\u89C2\u70B9\u7684\u7814\u7A76\u62A5\u544A\u8457\u79F0\u3002\u4F60\u7684\u62A5\u544A\u98CE\u683C\u7C7B\u4F3C Messari\u3001Delphi Digital \u7684\u4E13\u4E1A\u7814\u62A5\u2014\u2014\u6570\u636E\u9A71\u52A8\u3001\u903B\u8F91\u4E25\u5BC6\u3001\u89C2\u70B9\u9C9C\u660E\u3002

\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5B9E\u65F6\u6570\u636E\uFF0C\u5BF9 ${symbol} \u8FDB\u884C\u5168\u9762\u6DF1\u5EA6\u7814\u7A76\uFF0C\u751F\u6210\u4E00\u4EFD\u673A\u6784\u7EA7 AI \u5206\u6790\u62A5\u544A\u3002

${marketContext}

**\u8F93\u51FA\u8981\u6C42\uFF08Markdown \u683C\u5F0F\uFF0C\u7EA6 1000-1200 \u5B57\uFF09\uFF1A**

## \u{1F4CB} ${symbol} \u6DF1\u5EA6\u5206\u6790\u62A5\u544A

### \u{1F3AF} \u6295\u8D44\u8BBA\u70B9\uFF08Investment Thesis\uFF09
\u7528 2-3 \u53E5\u8BDD\u6982\u62EC\u4F60\u7684**\u6838\u5FC3\u6295\u8D44\u8BBA\u70B9**\u3002\u660E\u786E\u8868\u6001\uFF1A\u5F53\u524D\u9636\u6BB5\u4F60\u5BF9\u8BE5\u4EE3\u5E01\u662F\u770B\u591A\u3001\u770B\u7A7A\u8FD8\u662F\u89C2\u671B\uFF0C\u4EE5\u53CA\u6700\u6838\u5FC3\u7684\u7406\u7531\u3002\u7ED9\u51FA\u4E00\u4E2A 1-10 \u7684**\u7EFC\u5408\u8BC4\u5206**\uFF081=\u5F3A\u70C8\u770B\u7A7A\uFF0C5=\u4E2D\u6027\uFF0C10=\u5F3A\u70C8\u770B\u591A\uFF09\u3002

### \u{1F4CA} \u57FA\u672C\u9762\u5206\u6790
- **\u9879\u76EE\u5B9A\u4F4D\u4E0E\u7ADE\u4E89\u683C\u5C40**\uFF1A\u8BE5\u9879\u76EE\u5728\u5176\u8D5B\u9053\u4E2D\u7684\u4F4D\u7F6E\uFF0C\u4E3B\u8981\u7ADE\u4E89\u5BF9\u624B\u5BF9\u6BD4
- **\u4EE3\u5E01\u7ECF\u6D4E\u5B66\u8BC4\u4F30**\uFF1A\u4F9B\u5E94\u673A\u5236\u3001\u901A\u80C0/\u901A\u7F29\u6A21\u578B\u3001\u4EE3\u5E01\u91CA\u653E\u8282\u594F\u5BF9\u4EF7\u683C\u7684\u5F71\u54CD
- **\u4F30\u503C\u5206\u6790**\uFF1A\u5F53\u524D\u5E02\u503C/FDV \u662F\u5426\u5408\u7406\uFF0C\u4E0E\u540C\u8D5B\u9053\u9879\u76EE\u7684\u4F30\u503C\u5BF9\u6BD4

### \u{1F4C8} \u6280\u672F\u9762\u4E0E\u5E02\u573A\u7ED3\u6784
- **\u4EF7\u683C\u8D8B\u52BF**\uFF1A\u57FA\u4E8E 24h/7d/30d \u6DA8\u8DCC\u5E45\u5224\u65AD\u5F53\u524D\u5904\u4E8E\u4EC0\u4E48\u9636\u6BB5\uFF08\u79EF\u7D2F/\u4E0A\u5347/\u5206\u914D/\u4E0B\u8DCC\uFF09
- **\u6210\u4EA4\u91CF\u5206\u6790**\uFF1A\u91CF\u4EF7\u5173\u7CFB\u662F\u5426\u5065\u5EB7\uFF0C\u662F\u5426\u6709\u5F02\u5E38\u653E\u91CF/\u7F29\u91CF
- **\u5173\u952E\u4EF7\u4F4D**\uFF1A\u660E\u786E\u7ED9\u51FA\u652F\u6491\u4F4D\u548C\u963B\u529B\u4F4D\uFF08\u7528\u5177\u4F53\u6570\u5B57\uFF09

### \u{1F517} \u94FE\u4E0A\u4E0E\u60C5\u7EEA\u5206\u6790
- **\u793E\u533A\u60C5\u7EEA**\uFF1A\u57FA\u4E8E\u6295\u7968\u6570\u636E\u548C\u5E02\u573A\u8868\u73B0\u5224\u65AD\u5E02\u573A\u60C5\u7EEA
- **\u7B79\u7801\u5206\u5E03\u63A8\u65AD**\uFF1A\u57FA\u4E8E\u4F9B\u5E94\u91CF\u6570\u636E\u63A8\u65AD\u5927\u6237\u6301\u4ED3\u60C5\u51B5
- **\u50AC\u5316\u5242\u8FFD\u8E2A**\uFF1A\u8FD1\u671F\u53EF\u80FD\u5F71\u54CD\u4EF7\u683C\u7684\u4E8B\u4EF6\u6216\u5347\u7EA7

### \u{1F9ED} \u5206\u6790\u7B56\u7565

**\u660E\u786E\u7ED9\u51FA\u4EE5\u4E0B\u64CD\u4F5C\u5EFA\u8BAE\uFF1A**

| \u7EF4\u5EA6 | \u5224\u65AD | \u5177\u4F53\u5EFA\u8BAE |
|------|------|----------|
| \u77ED\u7EBF\uFF081-7\u5929\uFF09 | \u65B9\u5411 + \u7F6E\u4FE1\u5EA6 | \u5165\u573A\u4EF7\u4F4D / \u6B62\u635F / \u76EE\u6807\u4EF7 |
| \u4E2D\u7EBF\uFF081-3\u6708\uFF09 | \u65B9\u5411 + \u7F6E\u4FE1\u5EA6 | \u5EFA\u4ED3\u7B56\u7565 / \u5173\u6CE8\u50AC\u5316\u5242 |
| \u957F\u7EBF\uFF086\u6708+\uFF09 | \u65B9\u5411 + \u7F6E\u4FE1\u5EA6 | \u914D\u7F6E\u5EFA\u8BAE / \u5173\u952E\u91CC\u7A0B\u7891 |

**\u4ED3\u4F4D\u5EFA\u8BAE**\uFF1A\u6839\u636E\u98CE\u9669\u8BC4\u4F30\u7ED9\u51FA\u5EFA\u8BAE\u4ED3\u4F4D\u5360\u6BD4\uFF08\u5982\uFF1A\u603B\u4ED3\u4F4D\u7684 X%\uFF09

### \u26A0\uFE0F \u98CE\u9669\u77E9\u9635

| \u98CE\u9669\u7C7B\u578B | \u98CE\u9669\u63CF\u8FF0 | \u53D1\u751F\u6982\u7387 | \u5F71\u54CD\u7A0B\u5EA6 |
|----------|----------|----------|----------|
| \u5E02\u573A\u98CE\u9669 | ... | \u9AD8/\u4E2D/\u4F4E | \u9AD8/\u4E2D/\u4F4E |
| \u9879\u76EE\u98CE\u9669 | ... | \u9AD8/\u4E2D/\u4F4E | \u9AD8/\u4E2D/\u4F4E |
| \u76D1\u7BA1\u98CE\u9669 | ... | \u9AD8/\u4E2D/\u4F4E | \u9AD8/\u4E2D/\u4F4E |

### \u{1F4A1} \u603B\u7ED3
\u7528 2-3 \u53E5\u8BDD\u603B\u7ED3\u4F60\u7684\u6838\u5FC3\u89C2\u70B9\u548C\u6700\u91CD\u8981\u7684\u884C\u52A8\u5EFA\u8BAE\u3002

---
*\u6BD4\u7279AI\u793E\u4EA4 \u7814\u7A76\u52A9\u624B | \u6570\u636E\u6765\u6E90: CoinGecko | \u672C\u62A5\u544A\u57FA\u4E8E\u516C\u5F00\u6570\u636E\u7684 AI \u6DF1\u5EA6\u5206\u6790\uFF0C\u4EC5\u4F9B\u7814\u7A76\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE\u3002\u52A0\u5BC6\u8D27\u5E01\u5E02\u573A\u6CE2\u52A8\u5267\u70C8\uFF0C\u8BF7\u6839\u636E\u81EA\u8EAB\u98CE\u9669\u627F\u53D7\u80FD\u529B\u505A\u51FA\u51B3\u7B56\u3002*`;
}
function extractSentiment(content) {
  const bullishSignals = [
    "\u770B\u591A",
    "\u770B\u6DA8",
    "\u5229\u597D",
    "\u5F3A\u70C8\u770B\u591A",
    "\u79EF\u6781",
    "\u4E0A\u5347\u8D8B\u52BF",
    "\u5EFA\u8BAE\u4E70\u5165",
    "\u5EFA\u8BAE\u5EFA\u4ED3",
    "\u7A81\u7834",
    "\u8BC4\u5206\uFF1A7",
    "\u8BC4\u5206\uFF1A8",
    "\u8BC4\u5206\uFF1A9",
    "\u8BC4\u5206\uFF1A10",
    "\u8BC4\u5206: 7",
    "\u8BC4\u5206: 8",
    "\u8BC4\u5206: 9",
    "\u8BC4\u5206: 10",
    "7/10",
    "8/10",
    "9/10",
    "10/10"
  ];
  const bearishSignals = [
    "\u770B\u7A7A",
    "\u770B\u8DCC",
    "\u5229\u7A7A",
    "\u5F3A\u70C8\u770B\u7A7A",
    "\u4E0B\u8DCC\u8D8B\u52BF",
    "\u5EFA\u8BAE\u5356\u51FA",
    "\u5EFA\u8BAE\u51CF\u4ED3",
    "\u5EFA\u8BAE\u56DE\u907F",
    "\u8BC4\u5206\uFF1A1",
    "\u8BC4\u5206\uFF1A2",
    "\u8BC4\u5206\uFF1A3",
    "\u8BC4\u5206: 1",
    "\u8BC4\u5206: 2",
    "\u8BC4\u5206: 3",
    "1/10",
    "2/10",
    "3/10"
  ];
  let bullScore = 0;
  let bearScore = 0;
  for (const signal of bullishSignals) {
    if (content.includes(signal)) bullScore++;
  }
  for (const signal of bearishSignals) {
    if (content.includes(signal)) bearScore++;
  }
  if (bullScore > bearScore + 1) return "bullish";
  if (bearScore > bullScore + 1) return "bearish";
  return "neutral";
}
function extractRiskLevel(content) {
  const highRiskSignals = ["\u9AD8\u98CE\u9669", "\u98CE\u9669\u6781\u9AD8", "\u98CE\u9669\u8F83\u5927", "\u5F3A\u70C8\u8B66\u60D5", "\u5EFA\u8BAE\u56DE\u907F"];
  const lowRiskSignals = ["\u4F4E\u98CE\u9669", "\u98CE\u9669\u8F83\u4F4E", "\u76F8\u5BF9\u5B89\u5168", "\u84DD\u7B79"];
  for (const signal of highRiskSignals) {
    if (content.includes(signal)) return "high";
  }
  for (const signal of lowRiskSignals) {
    if (content.includes(signal)) return "low";
  }
  return "medium";
}
var researchRouter = router({
  // Generate AI research report (supports quick / deep modes)
  generate: protectedProcedure.use(rateLimitStrict).input(z7.object({
    tokenSymbol: z7.string().min(1).max(20),
    contractAddress: z7.string().optional(),
    chain: z7.string().default("BSC"),
    mode: z7.enum(["quick", "deep"]).default("deep")
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError9({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const tokenData = await fetchTokenData(input.tokenSymbol);
    const marketContext = tokenData ? buildMarketContext(tokenData) : `=== \u5E02\u573A\u6570\u636E ===
\u4EE3\u5E01\u7B26\u53F7: ${input.tokenSymbol.toUpperCase()}
\u94FE: ${input.chain}
\uFF08\u65E0\u6CD5\u83B7\u53D6\u5B9E\u65F6\u6570\u636E\uFF0C\u8BF7\u57FA\u4E8E\u4F60\u7684\u4E13\u4E1A\u77E5\u8BC6\u8FDB\u884C\u5206\u6790\uFF0C\u4F46\u9700\u660E\u786E\u6807\u6CE8\u6570\u636E\u7F3A\u5931\uFF09`;
    const symbol = input.tokenSymbol.toUpperCase();
    const prompt = input.mode === "quick" ? buildQuickPrompt(symbol, marketContext) : buildDeepPrompt(symbol, marketContext);
    const systemMessage = input.mode === "quick" ? "\u4F60\u662F\u4E00\u4F4D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u52A0\u5BC6\u8D27\u5E01\u4EA4\u6613\u5458\uFF0C\u64C5\u957F\u5FEB\u901F\u7814\u5224\u5E02\u573A\u673A\u4F1A\u3002\u4F60\u7684\u5206\u6790\u98CE\u683C\u76F4\u63A5\u3001\u679C\u65AD\uFF0C\u4E0D\u56DE\u907F\u7ED9\u51FA\u660E\u786E\u65B9\u5411\u3002\u56DE\u590D\u4F7F\u7528\u4E2D\u6587\u3002" : "\u4F60\u662F\u4E00\u4F4D\u9876\u7EA7\u52A0\u5BC6\u8D27\u5E01\u7814\u7A76\u673A\u6784\u7684\u9996\u5E2D\u5206\u6790\u5E08\uFF0C\u64C5\u957F\u591A\u7EF4\u5EA6\u6DF1\u5EA6\u5206\u6790\u3002\u4F60\u7684\u62A5\u544A\u4EE5\u6570\u636E\u9A71\u52A8\u3001\u903B\u8F91\u4E25\u5BC6\u3001\u89C2\u70B9\u9C9C\u660E\u8457\u79F0\u3002\u56DE\u590D\u4F7F\u7528\u4E2D\u6587\u3002";
    if (!consumeUserAiBudget()) throw new TRPCError9({ code: "TOO_MANY_REQUESTS", message: "AI \u4ECA\u65E5\u7E41\u5FD9\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" });
    const llmResponse = await invokeLLM({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ]
    });
    const rawContent = llmResponse.choices[0]?.message?.content;
    const reportContent = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((c) => c.text ?? "").join("") : "\u62A5\u544A\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002";
    const sentiment = extractSentiment(reportContent);
    const riskLevel = extractRiskLevel(reportContent);
    const [result] = await db.insert(researchReports).values({
      userId: ctx.user.id,
      tokenSymbol: symbol,
      tokenName: tokenData?.name ?? void 0,
      contractAddress: input.contractAddress ?? void 0,
      chain: input.chain,
      reportContent,
      priceAtReport: tokenData?.price?.toString() ?? void 0,
      marketCapAtReport: tokenData?.marketCap?.toString() ?? void 0,
      sentiment,
      riskLevel,
      nxcCost: input.mode === "quick" ? 5 : 10
    });
    const canAward = isAppAdmin(ctx.user) || await isReferralBound(db, ctx.user.id);
    let npEarned = 0;
    const awardHint = canAward ? "ok" : "need_invite";
    if (canAward) {
      npEarned += await awardTaskEvent(db, ctx.user.id, "first_research");
      npEarned += await awardTaskEvent(db, ctx.user.id, "research_daily");
    }
    return {
      reportId: result.insertId,
      reportContent,
      tokenData,
      sentiment,
      riskLevel,
      mode: input.mode,
      npEarned,
      awardHint
    };
  }),
  // List user's reports
  myReports: protectedProcedure.input(z7.object({ limit: z7.number().default(10) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(researchReports).where(eq18(researchReports.userId, ctx.user.id)).orderBy(desc8(researchReports.createdAt)).limit(input?.limit ?? 10);
  }),
  // Get a single report
  getReport: protectedProcedure.input(z7.object({ reportId: z7.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(researchReports).where(and15(eq18(researchReports.id, input.reportId), eq18(researchReports.userId, ctx.user.id))).limit(1);
    return result[0] ?? null;
  }),
  // Price alerts
  createAlert: protectedProcedure.use(rateLimitWrite).input(z7.object({
    tokenSymbol: z7.string().max(20),
    tokenId: z7.string().max(100),
    targetPrice: z7.string().max(30),
    condition: z7.enum(["above", "below"])
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(priceAlerts).values({
      userId: ctx.user.id,
      ...input
    });
    return { success: true };
  }),
  myAlerts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(priceAlerts).where(eq18(priceAlerts.userId, ctx.user.id)).orderBy(desc8(priceAlerts.createdAt));
  }),
  // Get user's research report history
  getHistory: protectedProcedure.input(z7.object({ limit: z7.number().default(20) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(researchReports).where(eq18(researchReports.userId, ctx.user.id)).orderBy(desc8(researchReports.createdAt)).limit(input?.limit ?? 20);
  }),
  // Fetch live price from CoinGecko (public)
  getPrice: publicProcedure.input(z7.object({ symbol: z7.string().max(20) })).query(async ({ input }) => {
    return fetchTokenData(input.symbol);
  }),
  // ─── Share report to community feed ─────────────────────────────────────
  shareToFeed: protectedProcedure.input(z7.object({
    reportId: z7.number(),
    comment: z7.string().max(500).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [report] = await db.select().from(researchReports).where(eq18(researchReports.id, input.reportId)).limit(1);
    if (!report) throw new Error("Report not found");
    if (report.userId !== ctx.user.id) throw new Error("Not authorized");
    const sentimentEmoji = report.sentiment === "bullish" ? "\u{1F7E2}" : report.sentiment === "bearish" ? "\u{1F534}" : "\u{1F7E1}";
    const sentimentLabel = report.sentiment === "bullish" ? "\u770B\u591A" : report.sentiment === "bearish" ? "\u770B\u7A7A" : "\u4E2D\u6027";
    const riskLabel = report.riskLevel === "low" ? "\u4F4E\u98CE\u9669" : report.riskLevel === "high" ? "\u9AD8\u98CE\u9669" : "\u4E2D\u98CE\u9669";
    const scoreMatch = report.reportContent.match(/(\d+)\s*\/\s*10/);
    const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const lines = report.reportContent.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("---") && !l.startsWith("*Nexus"));
    const summaryLine = lines.find((l) => l.length > 30) ?? `${report.tokenSymbol} \u6295\u7814\u62A5\u544A`;
    const summary = summaryLine.replace(/\*\*/g, "").slice(0, 150);
    const userComment = input.comment?.trim() ? `${sanitizeInput(input.comment.trim(), 500)}

` : "";
    const fmtMcap = (v) => {
      if (!v) return "N/A";
      if (v > 1e9) return (v / 1e9).toFixed(1) + "B";
      if (v > 1e6) return (v / 1e6).toFixed(1) + "M";
      return v.toString();
    };
    const postContent = `${userComment}\u{1F4CA} AI \u6295\u7814\u62A5\u544A | ${report.tokenSymbol} ${sentimentEmoji} ${sentimentLabel}

${summary}${summary.length >= 150 ? "..." : ""}

\u{1F4B0} \u62A5\u544A\u4EF7\u683C: $${report.priceAtReport ?? "N/A"} | \u{1F4C8} \u5E02\u503C: $${fmtMcap(Number(report.marketCapAtReport) || null)} | \u26A0\uFE0F ${riskLabel}${aiScore ? ` | \u{1F3AF} \u8BC4\u5206: ${aiScore}/10` : ""}`;
    const tags = JSON.stringify(["\u6295\u7814\u62A5\u544A", report.tokenSymbol, sentimentLabel]);
    const [result] = await db.insert(posts).values({
      authorId: ctx.user.id,
      content: postContent,
      tags,
      reportId: input.reportId,
      aiScore
    });
    return {
      postId: result.insertId,
      success: true
    };
  }),
  // ─── Get report by ID (public, for viewing shared reports) ─────────────
  getReportPublic: publicProcedure.input(z7.object({ reportId: z7.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const [shared] = await db.select({ id: posts.id }).from(posts).where(eq18(posts.reportId, input.reportId)).limit(1);
    if (!shared) return null;
    const [report] = await db.select({
      id: researchReports.id,
      tokenSymbol: researchReports.tokenSymbol,
      tokenName: researchReports.tokenName,
      reportContent: researchReports.reportContent,
      priceAtReport: researchReports.priceAtReport,
      marketCapAtReport: researchReports.marketCapAtReport,
      sentiment: researchReports.sentiment,
      riskLevel: researchReports.riskLevel,
      createdAt: researchReports.createdAt,
      authorName: users.name,
      authorAvatar: users.avatar
    }).from(researchReports).leftJoin(users, eq18(researchReports.userId, users.id)).where(eq18(researchReports.id, input.reportId)).limit(1);
    return report ?? null;
  })
});

// server/routers/posts.ts
import { z as z8 } from "zod";
init_db();
init_schema();
init_membership();
init_storage();
import { eq as eq19, and as and16, desc as desc9, sql as sql11, gt as gt4 } from "drizzle-orm";
init_token();
import { TRPCError as TRPCError10 } from "@trpc/server";
init_appAdmin();
var GENERIC_IMAGE_CAPTION = "\u5206\u4EAB\u4E86\u4E00\u5F20\u56FE\u7247";
function parseMediaUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  if (typeof raw !== "string") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
async function awardPostPublish(db, userId, opts) {
  let earned = await awardTaskEvent(db, userId, "first_post");
  const todayStart = /* @__PURE__ */ new Date(`${new Date(Date.now() + 8 * 3600 * 1e3).toISOString().slice(0, 10)}T00:00:00+08:00`);
  const content = sanitizeInput(opts.content, 2e3);
  const firstMedia = opts.mediaUrls?.[0];
  const isGenericCaption = !content.trim() || content.trim() === GENERIC_IMAGE_CAPTION;
  const insertId = Number(opts.insertId) || 0;
  const others = await db.select({ id: posts.id, content: posts.content, mediaUrls: posts.mediaUrls }).from(posts).where(and16(eq19(posts.authorId, userId), gt4(posts.createdAt, todayStart)));
  const isDup = others.some((p) => {
    if (insertId > 0 && p.id === insertId) return false;
    const urls = parseMediaUrls(p.mediaUrls);
    if (firstMedia) return urls[0] === firstMedia;
    if (isGenericCaption) return false;
    return p.content === content;
  });
  if (!isDup) earned += await awardTaskEvent(db, userId, "post_daily");
  return earned;
}
var PROMOTE_PLANS = [
  { key: "day1", days: 1, priceNN: 30, label: "1 \u5929" },
  { key: "day3", days: 3, priceNN: 75, label: "3 \u5929" },
  { key: "day7", days: 7, priceNN: 150, label: "7 \u5929" }
];
var postsRouter = router({
  // ─── List posts (public feed) ──────────────────────────────────────────────
  list: publicProcedure.input(
    z8.object({
      limit: z8.number().min(1).max(50).default(20),
      offset: z8.number().min(0).default(0),
      tag: z8.string().optional(),
      authorId: z8.number().int().positive().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { posts: [], hasMore: false };
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const authorId = input?.authorId;
    if (authorId && !await canViewFullProfile(db, ctx.user?.id, authorId)) {
      return { posts: [], hasMore: false };
    }
    const rows = await db.select({
      id: posts.id,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      mediaThumbs: posts.mediaThumbs,
      tags: posts.tags,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      shareCount: posts.shareCount,
      isPinned: posts.isPinned,
      promotedUntil: posts.promotedUntil,
      reportId: posts.reportId,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatar: users.avatar,
      authorUsername: users.username,
      authorWallet: users.walletAddress,
      authorProTier: users.proTier,
      authorProUntil: users.proUntil
    }).from(posts).leftJoin(users, eq19(posts.authorId, users.id)).where(authorId ? eq19(posts.authorId, authorId) : void 0).orderBy(
      desc9(sql11`CASE WHEN ${posts.promotedUntil} > NOW() THEN 1 ELSE 0 END`),
      desc9(posts.isPinned),
      desc9(posts.createdAt),
      desc9(posts.id)
      // 稳定 tie-breaker:多帖 createdAt 同一秒时,不加它跨页(不同 offset)顺序不稳→重复/静默跳过
    ).limit(limit + 1).offset(offset);
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);
    let likedPostIds = /* @__PURE__ */ new Set();
    if (ctx.user) {
      const likes = await db.select({ postId: postLikes.postId }).from(postLikes).where(eq19(postLikes.userId, ctx.user.id));
      likedPostIds = new Set(likes.map((l) => l.postId));
    }
    return {
      posts: data.map((p) => ({
        ...p,
        mediaUrls: p.mediaUrls ? JSON.parse(p.mediaUrls) : [],
        mediaThumbs: p.mediaThumbs ? JSON.parse(p.mediaThumbs) : [],
        tags: p.tags ? JSON.parse(p.tags) : [],
        isLiked: likedPostIds.has(p.id),
        isPromoted: !!p.promotedUntil && p.promotedUntil.getTime() > Date.now(),
        authorBadge: p.authorProTier && p.authorProTier !== "free" && (!p.authorProUntil || p.authorProUntil.getTime() > Date.now()) ? p.authorProTier === "pro" ? "Pro" : "Plus" : null
      })),
      hasMore
    };
  }),
  // ─── 广场推广位（付费置顶，AI 计价） ──────────────────────────────────────
  promotePlans: publicProcedure.query(() => ({ plans: PROMOTE_PLANS })),
  promotePost: protectedProcedure.input(z8.object({ postId: z8.number(), planKey: z8.string() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [post] = await db.select({ authorId: posts.authorId, promotedUntil: posts.promotedUntil }).from(posts).where(eq19(posts.id, input.postId)).limit(1);
    if (!post || post.authorId !== ctx.user.id) throw new TRPCError10({ code: "FORBIDDEN", message: "\u53EA\u80FD\u63A8\u5E7F\u81EA\u5DF1\u7684\u52A8\u6001" });
    const plan = PROMOTE_PLANS.find((p) => p.key === input.planKey);
    if (!plan) throw new TRPCError10({ code: "BAD_REQUEST", message: "\u672A\u77E5\u63A8\u5E7F\u6863\u4F4D" });
    const ok = await spendNN(db, ctx.user.id, plan.priceNN, { type: "promote", refType: "post", refId: input.postId, memo: plan.key });
    if (!ok) throw new TRPCError10({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3" });
    const base = post.promotedUntil && post.promotedUntil.getTime() > Date.now() ? post.promotedUntil.getTime() : Date.now();
    const until = new Date(base + plan.days * 24 * 3600 * 1e3);
    await db.update(posts).set({ promotedUntil: until }).where(eq19(posts.id, input.postId));
    return { ok: true, promotedUntil: until.toISOString() };
  }),
  // ─── 发现页滚动广告位（Pro 专属，7 天有效，每人同时 1 条） ───────────────────
  promoBannerList: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: promoBanners.id,
      text: promoBanners.text,
      targetType: promoBanners.targetType,
      targetId: promoBanners.targetId,
      userId: promoBanners.userId,
      name: users.name,
      username: users.username,
      avatar: users.avatar
    }).from(promoBanners).leftJoin(users, eq19(promoBanners.userId, users.id)).where(and16(eq19(promoBanners.status, "active"), gt4(promoBanners.expiresAt, /* @__PURE__ */ new Date()))).orderBy(desc9(promoBanners.createdAt)).limit(12);
    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      targetType: r.targetType,
      targetId: r.targetId,
      authorName: r.name ?? r.username ?? `\u7528\u6237#${r.userId}`,
      authorAvatar: r.avatar
    }));
  }),
  promoBannerMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [b] = await db.select().from(promoBanners).where(and16(eq19(promoBanners.userId, ctx.user.id), eq19(promoBanners.status, "active"), gt4(promoBanners.expiresAt, /* @__PURE__ */ new Date()))).orderBy(desc9(promoBanners.createdAt)).limit(1);
    return b ? { id: b.id, text: b.text, targetType: b.targetType, targetId: b.targetId, expiresAt: b.expiresAt.toISOString() } : null;
  }),
  promoBannerSubmit: protectedProcedure.input(z8.object({
    text: z8.string().min(4).max(80),
    targetType: z8.enum(["group", "post", "none"]).default("none"),
    targetId: z8.number().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const benefits = await getBenefits(db, ctx.user.id);
    if (!benefits.bannerSlot) throw new TRPCError10({ code: "FORBIDDEN", message: "\u6EDA\u52A8\u5E7F\u544A\u4F4D\u4E3A Pro \u4F1A\u5458\u4E13\u5C5E\u6743\u76CA\uFF0C\u5347\u7EA7\u540E\u5373\u53EF\u6295\u653E" });
    await enforceContent(db, ctx.user.id, input.text, "post", { useAI: true });
    if (input.targetType === "group") {
      if (!input.targetId) throw new TRPCError10({ code: "BAD_REQUEST", message: "\u8BF7\u9009\u62E9\u8981\u63A8\u5E7F\u7684\u7FA4" });
      const [g] = await db.select({ isPublic: chatGroups.isPublic }).from(chatGroups).where(eq19(chatGroups.id, input.targetId)).limit(1);
      if (!g) throw new TRPCError10({ code: "NOT_FOUND", message: "\u7FA4\u4E0D\u5B58\u5728" });
      const [m] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and16(eq19(groupMembers.groupId, input.targetId), eq19(groupMembers.userId, ctx.user.id))).limit(1);
      if (m?.role !== "owner") throw new TRPCError10({ code: "FORBIDDEN", message: "\u53EA\u80FD\u63A8\u5E7F\u81EA\u5DF1\u62C5\u4EFB\u7FA4\u4E3B\u7684\u7FA4" });
      if (!g.isPublic) throw new TRPCError10({ code: "BAD_REQUEST", message: "\u4EC5\u516C\u5F00\u7FA4\u53EF\u6295\u653E\u5E7F\u544A\u4F4D" });
    } else if (input.targetType === "post") {
      if (!input.targetId) throw new TRPCError10({ code: "BAD_REQUEST", message: "\u8BF7\u9009\u62E9\u8981\u63A8\u5E7F\u7684\u52A8\u6001" });
      const [po] = await db.select({ authorId: posts.authorId }).from(posts).where(eq19(posts.id, input.targetId)).limit(1);
      if (!po || po.authorId !== ctx.user.id) throw new TRPCError10({ code: "FORBIDDEN", message: "\u53EA\u80FD\u63A8\u5E7F\u81EA\u5DF1\u7684\u52A8\u6001" });
    }
    await db.update(promoBanners).set({ status: "removed" }).where(and16(eq19(promoBanners.userId, ctx.user.id), eq19(promoBanners.status, "active")));
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1e3);
    await db.insert(promoBanners).values({
      userId: ctx.user.id,
      text: sanitizeInput(input.text, 80),
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      expiresAt
    });
    return { ok: true, expiresAt: expiresAt.toISOString() };
  }),
  promoBannerRemove: protectedProcedure.input(z8.object({ bannerId: z8.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [b] = await db.select().from(promoBanners).where(eq19(promoBanners.id, input.bannerId)).limit(1);
    if (!b) throw new TRPCError10({ code: "NOT_FOUND", message: "\u5E7F\u544A\u4E0D\u5B58\u5728" });
    const isAdmin = isAppAdmin(ctx.user);
    if (b.userId !== ctx.user.id && !isAdmin) throw new TRPCError10({ code: "FORBIDDEN", message: "\u65E0\u6743\u64CD\u4F5C" });
    await db.update(promoBanners).set({ status: "removed" }).where(eq19(promoBanners.id, input.bannerId));
    return { ok: true };
  }),
  // ─── Create post ───────────────────────────────────────────────────────────
  create: protectedProcedure.input(
    z8.object({
      content: z8.string().min(1).max(2e3),
      mediaUrls: z8.array(z8.string().url()).max(4).optional(),
      mediaThumbs: z8.array(z8.string().url()).max(4).optional(),
      tags: z8.array(z8.string().max(30)).max(5).optional()
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await enforceContent(db, ctx.user.id, input.content, "post", { useAI: true });
    const [result] = await db.insert(posts).values({
      authorId: ctx.user.id,
      content: sanitizeInput(input.content, 2e3),
      mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : void 0,
      mediaThumbs: input.mediaThumbs ? JSON.stringify(input.mediaThumbs) : void 0,
      tags: input.tags ? JSON.stringify(input.tags.map((t3) => sanitizeInput(t3, 30))) : void 0
    });
    const insertId = Number(result.insertId) || 0;
    const npEarned = await awardPostPublish(db, ctx.user.id, {
      content: input.content,
      mediaUrls: input.mediaUrls,
      insertId
    });
    return { postId: insertId, npEarned };
  }),
  // ─── Toggle like ───────────────────────────────────────────────────────────
  toggleLike: protectedProcedure.input(z8.object({ postId: z8.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.transaction(async (tx) => {
      const [p] = await tx.select({ authorId: posts.authorId }).from(posts).where(eq19(posts.id, input.postId)).for("update").limit(1);
      if (!p) throw new Error("Post not found");
      const existing = await tx.select({ id: postLikes.id }).from(postLikes).where(and16(eq19(postLikes.postId, input.postId), eq19(postLikes.userId, ctx.user.id))).limit(1);
      if (existing.length > 0) {
        await tx.delete(postLikes).where(and16(eq19(postLikes.postId, input.postId), eq19(postLikes.userId, ctx.user.id)));
        await tx.update(posts).set({ likeCount: sql11`GREATEST(likeCount - 1, 0)` }).where(eq19(posts.id, input.postId));
        return { liked: false, authorId: p.authorId };
      }
      await tx.insert(postLikes).values({ postId: input.postId, userId: ctx.user.id });
      await tx.update(posts).set({ likeCount: sql11`likeCount + 1` }).where(eq19(posts.id, input.postId));
      return { liked: true, authorId: p.authorId };
    });
    if (!result.liked) return { liked: false };
    {
      const post = { authorId: result.authorId };
      if (post && post.authorId !== ctx.user.id) {
        await awardTaskEvent(db, ctx.user.id, "like_given");
        const [seen] = await db.select({ id: notifications.id }).from(notifications).where(and16(
          eq19(notifications.userId, post.authorId),
          eq19(notifications.fromUserId, ctx.user.id),
          eq19(notifications.postId, input.postId),
          eq19(notifications.type, "like")
        )).limit(1);
        if (!seen) {
          await awardTaskEvent(db, post.authorId, "like_received");
          const [liker] = await db.select({ name: users.name, avatar: users.avatar }).from(users).where(eq19(users.id, ctx.user.id)).limit(1);
          await createNotification({
            db,
            targetUserId: post.authorId,
            fromUserId: ctx.user.id,
            fromUserName: liker?.name ?? ctx.user.name ?? "Someone",
            fromUserAvatar: liker?.avatar ?? "\u{1F44D}",
            type: "like",
            content: "\u8D5E\u4E86\u4F60\u7684\u52A8\u6001",
            postId: input.postId
          });
        }
      }
      return { liked: true };
    }
  }),
  // ─── Get single post by ID ──────────────────────────────────────────────────────────────────
  getById: publicProcedure.input(z8.object({ postId: z8.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select({
      id: posts.id,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      mediaThumbs: posts.mediaThumbs,
      tags: posts.tags,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      shareCount: posts.shareCount,
      isPinned: posts.isPinned,
      reportId: posts.reportId,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatar: users.avatar,
      authorUsername: users.username,
      authorWallet: users.walletAddress
    }).from(posts).leftJoin(users, eq19(posts.authorId, users.id)).where(eq19(posts.id, input.postId)).limit(1);
    if (!row) return null;
    let isLiked = false;
    if (ctx.user) {
      const like2 = await db.select({ postId: postLikes.postId }).from(postLikes).where(and16(eq19(postLikes.postId, input.postId), eq19(postLikes.userId, ctx.user.id))).limit(1);
      isLiked = like2.length > 0;
    }
    return {
      ...row,
      mediaUrls: row.mediaUrls ? JSON.parse(row.mediaUrls) : [],
      mediaThumbs: row.mediaThumbs ? JSON.parse(row.mediaThumbs) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      isLiked
    };
  }),
  // ─── Get comments for a post ─────────────────────────────────────────────────────
  getComments: publicProcedure.input(z8.object({ postId: z8.number(), limit: z8.number().default(20) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: postComments.id,
      content: postComments.content,
      createdAt: postComments.createdAt,
      authorId: postComments.authorId,
      authorName: users.name,
      authorAvatar: users.avatar,
      authorUsername: users.username
    }).from(postComments).leftJoin(users, eq19(postComments.authorId, users.id)).where(eq19(postComments.postId, input.postId)).orderBy(desc9(postComments.createdAt)).limit(input.limit);
  }),
  // ─── Add comment ──────────────────────────────────────────────────────────
  addComment: protectedProcedure.input(
    z8.object({
      postId: z8.number(),
      content: z8.string().min(1).max(1e3)
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(postComments).values({
      postId: input.postId,
      authorId: ctx.user.id,
      content: sanitizeInput(input.content, 1e3)
    });
    if (input.content.trim().length >= 2) {
      await awardTaskEvent(db, ctx.user.id, "comment_made");
    }
    await db.update(posts).set({ commentCount: sql11`commentCount + 1` }).where(eq19(posts.id, input.postId));
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq19(posts.id, input.postId)).limit(1);
    if (post && post.authorId !== ctx.user.id) {
      const [commenter] = await db.select({ name: users.name, avatar: users.avatar }).from(users).where(eq19(users.id, ctx.user.id)).limit(1);
      await createNotification({
        db,
        targetUserId: post.authorId,
        fromUserId: ctx.user.id,
        fromUserName: commenter?.name ?? ctx.user.name ?? "Someone",
        fromUserAvatar: commenter?.avatar ?? "\u{1F4AC}",
        type: "comment",
        content: `\u8BC4\u8BBA\u4E86\uFF1A\u300C${sanitizeInput(input.content, 50)}${input.content.length > 50 ? "\u2026" : ""}\u300D`,
        postId: input.postId
      });
    }
    return { commentId: result.insertId };
  }),
  // ─── Upload media to S3 ────────────────────────────────────────────────
  uploadMedia: protectedProcedure.input(
    z8.object({
      // base64-encoded file content
      fileData: z8.string().max(1e7),
      // ~7.5MB base64
      fileName: z8.string().max(200),
      mimeType: z8.string().max(100)
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const { fileData, fileName, mimeType } = input;
    const raw = Buffer.from(fileData, "base64");
    if (raw.length > 8 * 1024 * 1024) {
      throw new Error("\u6587\u4EF6\u5927\u5C0F\u8D85\u8FC7 8MB \u9650\u5236");
    }
    let buffer = raw;
    let mime = mimeType;
    let ext = fileName.split(".").pop() ?? "jpg";
    const stamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    let thumbUrl;
    if (mimeType.startsWith("image/")) {
      const { downscaleImage: downscaleImage2 } = await Promise.resolve().then(() => (init_image(), image_exports));
      const full = await downscaleImage2(raw, 1600, 82, mimeType);
      buffer = full.buffer;
      mime = full.mime;
      ext = mime.split("/")[1] ?? ext;
      const thumb = await downscaleImage2(raw, 400, 70, mimeType);
      const thumbExt = thumb.mime.split("/")[1] ?? "jpg";
      const thumbKey = `posts/${ctx.user.id}/${stamp}-${randomSuffix}_thumb.${thumbExt}`;
      const t3 = await storagePut(thumbKey, thumb.buffer, thumb.mime);
      thumbUrl = t3.url;
    }
    const key = `posts/${ctx.user.id}/${stamp}-${randomSuffix}.${ext}`;
    const { url } = await storagePut(key, buffer, mime);
    return { url, thumbUrl, key };
  }),
  // ─── Delete post ──────────────────────────────────────────────────────────
  delete: protectedProcedure.input(z8.object({ postId: z8.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq19(posts.id, input.postId)).limit(1);
    if (!post || post.authorId !== ctx.user.id) {
      throw new Error("Not authorized to delete this post");
    }
    await db.delete(postComments).where(eq19(postComments.postId, input.postId));
    await db.delete(postLikes).where(eq19(postLikes.postId, input.postId));
    await db.delete(posts).where(eq19(posts.id, input.postId));
    return { success: true };
  }),
  // ─── Delete comment（评论作者或帖子作者）──────────────────────────────────
  deleteComment: protectedProcedure.input(z8.object({ commentId: z8.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [c] = await db.select({ id: postComments.id, authorId: postComments.authorId, postId: postComments.postId }).from(postComments).where(eq19(postComments.id, input.commentId)).limit(1);
    if (!c) throw new TRPCError10({ code: "NOT_FOUND", message: "\u8BC4\u8BBA\u4E0D\u5B58\u5728" });
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq19(posts.id, c.postId)).limit(1);
    if (c.authorId !== ctx.user.id && post?.authorId !== ctx.user.id) {
      throw new TRPCError10({ code: "FORBIDDEN", message: "\u53EA\u80FD\u5220\u9664\u81EA\u5DF1\u7684\u8BC4\u8BBA" });
    }
    await db.delete(postComments).where(eq19(postComments.id, input.commentId));
    await db.update(posts).set({ commentCount: sql11`GREATEST(commentCount - 1, 0)` }).where(eq19(posts.id, c.postId));
    return { ok: true };
  }),
  // ─── Search posts ───────────────────────────────────────────────────────
  // ─── Repost (increment shareCount on original post) ─────────────────────
  repost: protectedProcedure.input(z8.object({ postId: z8.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(posts).set({ shareCount: sql11`${posts.shareCount} + 1` }).where(eq19(posts.id, input.postId));
    const [original] = await db.select({ content: posts.content, authorId: posts.authorId, mediaUrls: posts.mediaUrls, mediaThumbs: posts.mediaThumbs }).from(posts).where(eq19(posts.id, input.postId)).limit(1);
    if (!original) throw new Error("Post not found");
    const [originalAuthor] = await db.select({ name: users.name }).from(users).where(eq19(users.id, original.authorId)).limit(1);
    const repostContent = `\u{1F501} \u8F6C\u53D1\u81EA @${originalAuthor?.name ?? "\u7528\u6237"}:

${original.content.slice(0, 500)}`;
    const [result] = await db.insert(posts).values({
      authorId: ctx.user.id,
      content: repostContent,
      mediaUrls: original.mediaUrls ?? void 0,
      mediaThumbs: original.mediaThumbs ?? void 0,
      tags: JSON.stringify(["#repost"])
    });
    if (original.authorId !== ctx.user.id) {
      try {
        await createNotification({
          db,
          targetUserId: original.authorId,
          fromUserId: ctx.user.id,
          fromUserName: ctx.user.name ?? "Someone",
          fromUserAvatar: ctx.user.avatar ?? "",
          type: "system",
          content: `\u8F6C\u53D1\u4E86\u4F60\u7684\u52A8\u6001`,
          postId: input.postId
        });
      } catch (_) {
      }
    }
    return { success: true, newPostId: result.insertId };
  }),
  // ─── Quote Post (create new post with quote reference) ─────────────────────
  quotePost: protectedProcedure.input(z8.object({
    postId: z8.number(),
    comment: z8.string().min(1).max(280)
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(posts).set({ shareCount: sql11`${posts.shareCount} + 1` }).where(eq19(posts.id, input.postId));
    const [original] = await db.select({ content: posts.content, authorId: posts.authorId, mediaUrls: posts.mediaUrls, mediaThumbs: posts.mediaThumbs }).from(posts).where(eq19(posts.id, input.postId)).limit(1);
    if (!original) throw new Error("Post not found");
    const [originalAuthor] = await db.select({ name: users.name }).from(users).where(eq19(users.id, original.authorId)).limit(1);
    const quoteContent = `${sanitizeInput(input.comment, 280)}

\u{1F4AC} \u5F15\u7528 @${originalAuthor?.name ?? "\u7528\u6237"}:
> ${original.content.slice(0, 300)}`;
    const [result] = await db.insert(posts).values({
      authorId: ctx.user.id,
      content: quoteContent,
      mediaUrls: original.mediaUrls ?? void 0,
      mediaThumbs: original.mediaThumbs ?? void 0,
      tags: JSON.stringify(["#quote"])
    });
    if (original.authorId !== ctx.user.id) {
      try {
        await createNotification({
          db,
          targetUserId: original.authorId,
          fromUserId: ctx.user.id,
          fromUserName: ctx.user.name ?? "Someone",
          fromUserAvatar: ctx.user.avatar ?? "",
          type: "system",
          content: `\u5F15\u7528\u4E86\u4F60\u7684\u52A8\u6001`,
          postId: input.postId
        });
      } catch (_) {
      }
    }
    return { success: true, newPostId: result.insertId };
  }),
  // ─── Search posts ───────────────────────────────────────────────────────
  search: publicProcedure.input(
    z8.object({
      query: z8.string().min(1).max(100),
      limit: z8.number().min(1).max(50).default(20)
    })
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { posts: [] };
    const keyword = `%${input.query}%`;
    const rows = await db.select({
      id: posts.id,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      mediaThumbs: posts.mediaThumbs,
      tags: posts.tags,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      shareCount: posts.shareCount,
      isPinned: posts.isPinned,
      reportId: posts.reportId,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatar: users.avatar,
      authorUsername: users.username,
      authorWallet: users.walletAddress
    }).from(posts).leftJoin(users, eq19(posts.authorId, users.id)).where(sql11`${posts.content} LIKE ${keyword} OR ${posts.tags} LIKE ${keyword}`).orderBy(desc9(posts.createdAt)).limit(input.limit);
    let likedPostIds = /* @__PURE__ */ new Set();
    if (ctx.user) {
      const likes = await db.select({ postId: postLikes.postId }).from(postLikes).where(eq19(postLikes.userId, ctx.user.id));
      likedPostIds = new Set(likes.map((l) => l.postId));
    }
    return {
      posts: rows.map((p) => ({
        ...p,
        mediaUrls: p.mediaUrls ? JSON.parse(p.mediaUrls) : [],
        mediaThumbs: p.mediaThumbs ? JSON.parse(p.mediaThumbs) : [],
        tags: p.tags ? JSON.parse(p.tags) : [],
        isLiked: likedPostIds.has(p.id)
      }))
    };
  })
});

// server/routers/trading.ts
import { z as z9 } from "zod";
init_db();
init_schema();
import { eq as eq20, and as and17, desc as desc10 } from "drizzle-orm";

// server/utils/priceService.ts
init_logger();
var SYMBOL_TO_COINGECKO = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ARB: "arbitrum",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  CAKE: "pancakeswap-token",
  MATIC: "matic-network",
  DOT: "polkadot",
  RENDER: "render-token",
  PEPE: "pepe"
};
var SYMBOL_TO_COINCAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binance-coin",
  SOL: "solana",
  ARB: "arbitrum",
  LINK: "chainlink",
  AVAX: "avalanche",
  CAKE: "pancakeswap",
  MATIC: "polygon",
  DOT: "polkadot",
  RENDER: "render-token",
  PEPE: "pepe"
};
var SYMBOL_TO_BINANCE_PAIR = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  BNB: "BNBUSDT",
  SOL: "SOLUSDT",
  ARB: "ARBUSDT",
  LINK: "LINKUSDT",
  AVAX: "AVAXUSDT",
  CAKE: "CAKEUSDT",
  MATIC: "MATICUSDT",
  DOT: "DOTUSDT",
  RENDER: "RENDERUSDT",
  PEPE: "PEPEUSDT"
};
var CACHE_TTL_MS = 3e4;
var STALE_TTL_MS = 3e5;
var priceCache = /* @__PURE__ */ new Map();
var inFlight2 = /* @__PURE__ */ new Map();
function cacheKey(symbols) {
  return symbols.slice().sort().join(",");
}
function isFresh(entry) {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}
function isUsable(entry) {
  return Date.now() - entry.fetchedAt < STALE_TTL_MS;
}
async function fetchWithTimeout2(url, timeoutMs = 8e3) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}
async function fetchFromCoinGecko(symbols) {
  const ids = symbols.map((s) => SYMBOL_TO_COINGECKO[s]).filter(Boolean);
  if (!ids.length) return null;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
  try {
    const res = await fetchWithTimeout2(url, 8e3);
    if (res.status === 429) {
      logger_default.warn("PriceService: CoinGecko 429 \u2014 switching to fallback");
      return null;
    }
    if (!res.ok) {
      logger_default.warn({ status: res.status }, "PriceService: CoinGecko non-OK");
      return null;
    }
    const data = await res.json();
    return symbols.map((symbol) => {
      const id = SYMBOL_TO_COINGECKO[symbol];
      const coin = id ? data[id] : null;
      return {
        symbol,
        price: coin?.usd ?? 0,
        change: coin ? parseFloat((coin.usd_24h_change ?? 0).toFixed(2)) : 0,
        volume: coin?.usd_24h_vol ?? 0,
        marketCap: coin?.usd_market_cap ?? 0
      };
    });
  } catch (err) {
    logger_default.warn({ err }, "PriceService: CoinGecko fetch error");
    return null;
  }
}
async function fetchFromCoinCap(symbols) {
  try {
    const ids = symbols.map((s) => SYMBOL_TO_COINCAP[s]).filter(Boolean);
    if (!ids.length) return null;
    const url = `https://api.coincap.io/v2/assets?ids=${ids.join(",")}`;
    const res = await fetchWithTimeout2(url, 8e3);
    if (!res.ok) {
      logger_default.warn({ status: res.status }, "PriceService: CoinCap non-OK");
      return null;
    }
    const json = await res.json();
    const byId = {};
    for (const item of json.data ?? []) {
      byId[item.id] = item;
    }
    return symbols.map((symbol) => {
      const id = SYMBOL_TO_COINCAP[symbol];
      const coin = id ? byId[id] : null;
      return {
        symbol,
        price: coin ? parseFloat(coin.priceUsd) : 0,
        change: coin ? parseFloat(parseFloat(coin.changePercent24Hr).toFixed(2)) : 0,
        volume: coin ? parseFloat(coin.volumeUsd24Hr) : 0,
        marketCap: coin ? parseFloat(coin.marketCapUsd) : 0
      };
    });
  } catch (err) {
    logger_default.warn({ err }, "PriceService: CoinCap fetch error");
    return null;
  }
}
async function fetchFromBinance(symbols) {
  try {
    const pairs = symbols.map((s) => SYMBOL_TO_BINANCE_PAIR[s]).filter(Boolean);
    if (!pairs.length) return null;
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
    const res = await fetchWithTimeout2(url, 8e3);
    if (!res.ok) {
      logger_default.warn({ status: res.status }, "PriceService: Binance non-OK");
      return null;
    }
    const tickers = await res.json();
    const byPair = {};
    for (const t3 of tickers) {
      byPair[t3.symbol] = t3;
    }
    return symbols.map((symbol) => {
      const pair = SYMBOL_TO_BINANCE_PAIR[symbol];
      const t3 = pair ? byPair[pair] : null;
      return {
        symbol,
        price: t3 ? parseFloat(t3.lastPrice) : 0,
        change: t3 ? parseFloat(parseFloat(t3.priceChangePercent).toFixed(2)) : 0,
        volume: t3 ? parseFloat(t3.quoteVolume) : 0,
        marketCap: 0
        // Binance doesn't provide market cap
      };
    });
  } catch (err) {
    logger_default.warn({ err }, "PriceService: Binance fetch error");
    return null;
  }
}
async function getPrices(symbols) {
  const key = cacheKey(symbols);
  const cached = priceCache.get(key);
  if (cached && isFresh(cached)) {
    return cached.data;
  }
  if (inFlight2.has(key)) {
    return inFlight2.get(key);
  }
  const fetchPromise = (async () => {
    const sources = [
      { name: "CoinGecko", fn: () => fetchFromCoinGecko(symbols) },
      { name: "CoinCap", fn: () => fetchFromCoinCap(symbols) },
      { name: "Binance", fn: () => fetchFromBinance(symbols) }
    ];
    for (const source of sources) {
      const result = await source.fn();
      if (result && result.some((r) => r.price > 0)) {
        logger_default.info({ source: source.name, symbols }, "PriceService: fetched prices");
        priceCache.set(key, { data: result, fetchedAt: Date.now(), source: source.name });
        return result;
      }
      logger_default.warn({ source: source.name }, "PriceService: source returned no data, trying next");
    }
    if (cached && isUsable(cached)) {
      logger_default.warn({ key }, "PriceService: all sources failed, returning stale cache");
      return cached.data;
    }
    logger_default.error({ key }, "PriceService: all sources failed, no cache available");
    return symbols.map((symbol) => ({ symbol, price: 0, change: 0, volume: 0, marketCap: 0 }));
  })();
  inFlight2.set(key, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlight2.delete(key);
  }
}
function cleanupPriceCache() {
  const now = Date.now();
  for (const [key, entry] of Array.from(priceCache.entries())) {
    if (now - entry.fetchedAt > STALE_TTL_MS) {
      priceCache.delete(key);
    }
  }
}
setInterval(cleanupPriceCache, 3e5);

// server/routers/trading.ts
var COINGECKO_BASE = "https://api.coingecko.com/api/v3";
var SYMBOL_TO_ID2 = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ARB: "arbitrum",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  CAKE: "pancakeswap-token",
  MATIC: "matic-network",
  DOT: "polkadot"
};
var tradingRouter = router({
  // ─── Get live prices for ticker symbols ──────────────────────────────────
  getPrices: publicProcedure.input(
    z9.object({
      symbols: z9.array(z9.string()).min(1).max(20).default(["BTC", "ETH", "BNB", "SOL", "ARB", "LINK", "AVAX", "CAKE"])
    }).optional()
  ).query(async ({ input }) => {
    const symbols = (input?.symbols ?? ["BTC", "ETH", "BNB", "SOL", "ARB", "LINK", "AVAX", "CAKE"]).map((s) => s.toUpperCase());
    return getPrices(symbols);
  }),
  // ─── Get detailed chart data for a single coin ────────────────────────────
  getChart: publicProcedure.input(
    z9.object({
      symbol: z9.string().max(20),
      days: z9.number().min(1).max(365).default(7)
    })
  ).query(async ({ input }) => {
    const id = SYMBOL_TO_ID2[input.symbol.toUpperCase()];
    if (!id) return { prices: [], symbol: input.symbol };
    const cacheKey2 = `chart:${id}:${input.days}`;
    const url = `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${input.days}&interval=${input.days <= 1 ? "hourly" : "daily"}`;
    const data = await cachedFetch(
      cacheKey2,
      url,
      TTL.chart,
      (res) => res.json()
    );
    if (!data) return { prices: [], symbol: input.symbol };
    return {
      symbol: input.symbol.toUpperCase(),
      prices: data.prices.map(([timestamp2, price]) => ({
        time: new Date(timestamp2).toISOString(),
        price: parseFloat(price.toFixed(4))
      }))
    };
  }),
  // ─── Get trending coins ────────────────────────────────────────────────────
  getTrending: publicProcedure.query(async () => {
    const cacheKey2 = "trending";
    const url = `${COINGECKO_BASE}/search/trending`;
    const data = await cachedFetch(
      cacheKey2,
      url,
      TTL.trending,
      (res) => res.json()
    );
    if (!data) return [];
    return data.coins.slice(0, 7).map((c) => ({
      id: c.item.id,
      symbol: c.item.symbol.toUpperCase(),
      name: c.item.name,
      thumb: c.item.thumb,
      priceBtc: c.item.price_btc
    }));
  }),
  // ─── Price Alerts CRUD ─────────────────────────────────────────────────────
  createAlert: protectedProcedure.input(
    z9.object({
      tokenSymbol: z9.string().min(1).max(20),
      tokenId: z9.string().min(1).max(100),
      targetPrice: z9.string().min(1),
      condition: z9.enum(["above", "below"])
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { id: 0, success: false };
    const [result] = await db.insert(priceAlerts).values({
      userId: ctx.user.id,
      tokenSymbol: input.tokenSymbol.toUpperCase(),
      tokenId: input.tokenId,
      targetPrice: input.targetPrice,
      condition: input.condition
    });
    return { id: result.insertId ?? 0, success: true };
  }),
  listAlerts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const alerts = await db.select().from(priceAlerts).where(eq20(priceAlerts.userId, ctx.user.id)).orderBy(desc10(priceAlerts.createdAt)).limit(50);
    return alerts;
  }),
  deleteAlert: protectedProcedure.input(z9.object({ id: z9.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.delete(priceAlerts).where(and17(eq20(priceAlerts.id, input.id), eq20(priceAlerts.userId, ctx.user.id)));
    return { success: true };
  }),
  toggleAlert: protectedProcedure.input(z9.object({ id: z9.number(), isActive: z9.boolean() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.update(priceAlerts).set({ isActive: input.isActive }).where(and17(eq20(priceAlerts.id, input.id), eq20(priceAlerts.userId, ctx.user.id)));
    return { success: true };
  }),
  // ─── Trading Positions CRUD ───────────────────────────────────────────────
  listPositions: protectedProcedure.input(z9.object({ status: z9.enum(["open", "closed", "all"]).default("open") })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq20(tradingPositions.userId, ctx.user.id)];
    if (input.status !== "all") {
      conditions.push(eq20(tradingPositions.status, input.status));
    }
    return db.select().from(tradingPositions).where(and17(...conditions)).orderBy(desc10(tradingPositions.createdAt)).limit(100);
  }),
  openPosition: protectedProcedure.input(z9.object({
    pair: z9.string().max(30),
    side: z9.enum(["long", "short"]),
    entryPrice: z9.string().max(30),
    amount: z9.string().max(30),
    leverage: z9.number().int().min(1).max(100).default(1),
    stopLossPrice: z9.string().optional(),
    takeProfitPrice: z9.string().optional(),
    liquidationPrice: z9.string().optional(),
    strategyName: z9.string().max(100).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false, id: null };
    const [result] = await db.insert(tradingPositions).values({
      userId: ctx.user.id,
      pair: input.pair,
      side: input.side,
      entryPrice: input.entryPrice,
      amount: input.amount,
      leverage: input.leverage,
      stopLossPrice: input.stopLossPrice ?? null,
      takeProfitPrice: input.takeProfitPrice ?? null,
      liquidationPrice: input.liquidationPrice ?? null,
      strategyName: input.strategyName ?? null,
      status: "open"
    });
    return { success: true, id: result.insertId ?? null };
  }),
  closePosition: protectedProcedure.input(z9.object({
    id: z9.number(),
    closePrice: z9.string().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const [pos] = await db.select().from(tradingPositions).where(and17(eq20(tradingPositions.id, input.id), eq20(tradingPositions.userId, ctx.user.id))).limit(1);
    if (!pos) return { success: false };
    let realizedPnl;
    const cp = input.closePrice ? parseFloat(input.closePrice) : void 0;
    if (cp !== void 0) {
      const entry = parseFloat(pos.entryPrice);
      const amt = parseFloat(pos.amount);
      const lev = pos.leverage;
      const pnl = pos.side === "long" ? (cp - entry) * amt * lev : (entry - cp) * amt * lev;
      realizedPnl = pnl.toFixed(2);
    }
    await db.update(tradingPositions).set({
      status: "closed",
      closePrice: input.closePrice ?? void 0,
      realizedPnl,
      closedAt: /* @__PURE__ */ new Date()
    }).where(and17(eq20(tradingPositions.id, input.id), eq20(tradingPositions.userId, ctx.user.id)));
    return { success: true, realizedPnl };
  }),
  // ─── PnL Calendar: aggregate daily PnL from closed positions ──────────
  getPnlCalendar: protectedProcedure.input(z9.object({
    year: z9.number().min(2020).max(2030),
    month: z9.number().min(0).max(11)
    // 0-indexed like JS Date
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const startDate = new Date(input.year, input.month, 1);
    const endDate = new Date(input.year, input.month + 1, 0, 23, 59, 59);
    const daysInMonth = endDate.getDate();
    const closedPositions = await db.select().from(tradingPositions).where(
      and17(
        eq20(tradingPositions.userId, ctx.user.id),
        eq20(tradingPositions.status, "closed")
      )
    ).orderBy(desc10(tradingPositions.closedAt));
    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = { pnl: 0, trades: 0 };
    }
    for (const pos of closedPositions) {
      if (!pos.closedAt || !pos.realizedPnl) continue;
      const closedDate = new Date(pos.closedAt);
      if (closedDate < startDate || closedDate > endDate) continue;
      const day = closedDate.getDate();
      dailyMap[day].pnl += parseFloat(pos.realizedPnl);
      dailyMap[day].trades += 1;
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Array.from({ length: daysInMonth }, (_, i) => ({
      date: `${monthNames[input.month]} ${i + 1}`,
      day: i + 1,
      pnl: parseFloat(dailyMap[i + 1].pnl.toFixed(2)),
      trades: dailyMap[i + 1].trades
    }));
  }),
  // ─── Market Overview (global stats + Fear & Greed) ──────────────────────
  getMarketOverview: publicProcedure.query(async () => {
    const globalData = await cachedFetch("global", `${COINGECKO_BASE}/global`, TTL.prices, (res) => res.json());
    const fgData = await cachedFetch(
      "fear-greed",
      "https://api.alternative.me/fng/?limit=1",
      TTL.prices,
      (res) => res.json()
    );
    const topIds = ["bitcoin", "ethereum", "solana", "binancecoin", "arbitrum", "chainlink", "avalanche-2", "polkadot"];
    const pricesData = await cachedFetch(
      "overview-prices",
      `${COINGECKO_BASE}/simple/price?ids=${topIds.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      TTL.prices,
      (res) => res.json()
    );
    const g = globalData?.data;
    const totalMarketCap = g?.total_market_cap?.usd ?? 0;
    const marketCapChange24h = g?.market_cap_change_percentage_24h_usd ?? 0;
    const btcDominance = g?.market_cap_percentage?.btc ?? 0;
    const fearGreedValue = fgData?.data?.[0] ? parseInt(fgData.data[0].value, 10) : 0;
    const fearGreedLabel = fgData?.data?.[0]?.value_classification ?? "N/A";
    let bullish = 0;
    let total = 0;
    const changes = [];
    if (pricesData) {
      for (const id of topIds) {
        const coin = pricesData[id];
        if (coin) {
          total++;
          if (coin.usd_24h_change > 0) bullish++;
          changes.push(coin.usd_24h_change);
        }
      }
    }
    const avg24hChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    const aiScoreAvg = fearGreedValue > 0 ? Math.round(fearGreedValue / 10 * 10) / 10 : 0;
    return {
      totalMarketCap,
      marketCapChange24h: Math.round(marketCapChange24h * 100) / 100,
      btcDominance: Math.round(btcDominance * 10) / 10,
      fearGreedValue,
      fearGreedLabel,
      bullish,
      total,
      avg24hChange: Math.round(avg24hChange * 100) / 100,
      aiScoreAvg
    };
  })
});

// server/routers/follow.ts
import { z as z10 } from "zod";
init_db();
init_schema();
import { eq as eq21, and as and18, count as count4, sql as sql12, desc as desc11 } from "drizzle-orm";
async function createFollowNotification(db, fromUser, toUserId) {
  if (!db || fromUser.id === toUserId) return;
  await db.insert(notifications).values({
    userId: toUserId,
    type: "follow",
    fromUserId: fromUser.id,
    fromUserName: fromUser.name ?? "\u6709\u4EBA",
    fromUserAvatar: fromUser.avatar ?? null,
    content: "\u5173\u6CE8\u4E86\u4F60",
    isRead: false
  });
}
var followRouter = router({
  // Follow a user
  follow: protectedProcedure.input(z10.object({ targetUserId: z10.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    if (ctx.user.id === input.targetUserId) {
      throw new Error("Cannot follow yourself");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(userFollows).where(
      and18(
        eq21(userFollows.followerId, ctx.user.id),
        eq21(userFollows.followingId, input.targetUserId)
      )
    ).limit(1);
    if (existing.length > 0) {
      return { success: true, following: true };
    }
    await db.insert(userFollows).values({
      followerId: ctx.user.id,
      followingId: input.targetUserId
    });
    await createFollowNotification(
      db,
      { id: ctx.user.id, name: ctx.user.name, avatar: ctx.user.avatar ?? null },
      input.targetUserId
    );
    await awardTaskEvent(db, ctx.user.id, "follow_daily");
    return { success: true, following: true };
  }),
  // Unfollow a user
  unfollow: protectedProcedure.input(z10.object({ targetUserId: z10.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(userFollows).where(
      and18(
        eq21(userFollows.followerId, ctx.user.id),
        eq21(userFollows.followingId, input.targetUserId)
      )
    );
    return { success: true, following: false };
  }),
  // Check if current user follows a target user
  isFollowing: protectedProcedure.input(z10.object({ targetUserId: z10.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { following: false };
    const result = await db.select().from(userFollows).where(
      and18(
        eq21(userFollows.followerId, ctx.user.id),
        eq21(userFollows.followingId, input.targetUserId)
      )
    ).limit(1);
    return { following: result.length > 0 };
  }),
  // Get follower/following/likes counts for a user
  getCounts: publicProcedure.input(z10.object({ userId: z10.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { followers: 0, following: 0, likes: 0, posts: 0 };
    if (!await canViewFullProfile(db, ctx.user?.id, input.userId)) {
      return { followers: 0, following: 0, likes: 0, posts: 0 };
    }
    const [followerResult, followingResult, likeResult, postResult] = await Promise.all([
      db.select({ cnt: count4() }).from(userFollows).where(eq21(userFollows.followingId, input.userId)),
      db.select({ cnt: count4() }).from(userFollows).where(eq21(userFollows.followerId, input.userId)),
      db.select({ cnt: sql12`COALESCE(SUM(${posts.likeCount}), 0)` }).from(posts).where(eq21(posts.authorId, input.userId)),
      db.select({ cnt: count4() }).from(posts).where(eq21(posts.authorId, input.userId))
    ]);
    return {
      followers: Number(followerResult[0]?.cnt ?? 0),
      following: Number(followingResult[0]?.cnt ?? 0),
      likes: Number(likeResult[0]?.cnt ?? 0),
      posts: Number(postResult[0]?.cnt ?? 0)
    };
  }),
  // Get list of users that the current user follows
  getFollowing: protectedProcedure.input(z10.object({ userId: z10.number().optional(), limit: z10.number().default(50) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const uid = input?.userId ?? ctx.user.id;
    if (!await canViewFullProfile(db, ctx.user.id, uid)) return [];
    const rows = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio
    }).from(userFollows).innerJoin(users, eq21(users.id, userFollows.followingId)).where(eq21(userFollows.followerId, uid)).orderBy(desc11(userFollows.id)).limit(input?.limit ?? 50);
    return rows;
  }),
  // Get followers of a user
  getFollowers: protectedProcedure.input(z10.object({ userId: z10.number().optional(), limit: z10.number().default(50) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const uid = input?.userId ?? ctx.user.id;
    if (!await canViewFullProfile(db, ctx.user.id, uid)) return [];
    const rows = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio
    }).from(userFollows).innerJoin(users, eq21(users.id, userFollows.followerId)).where(eq21(userFollows.followingId, uid)).orderBy(desc11(userFollows.id)).limit(input?.limit ?? 50);
    return rows;
  })
});

// server/routers/contacts.ts
import { z as z11 } from "zod";
import { TRPCError as TRPCError11 } from "@trpc/server";
init_db();
init_schema();
import { and as and19, eq as eq22, or as or6, desc as desc12 } from "drizzle-orm";
function pickFriendRel(rows) {
  return rows.find((r) => r.status === "accepted") ?? rows.find((r) => r.status === "pending") ?? rows.find((r) => r.status === "rejected") ?? null;
}
var contactsRouter = router({
  // ─── 看某用户的公开资料(头像/昵称/简介)+ 是否好友 ───────────────────────────
  //   群聊点头像进资料页用。bio 本就在 user.searchUsers 公开,故对所有登录用户可见。
  getProfileById: protectedProcedure.input(z11.object({ userId: z11.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [u] = await db.select({
      // 仅公开字段:绝不外泄 npPoints(他人积分余额)/email/openId 等
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio,
      isBot: users.isBot,
      createdAt: users.createdAt
    }).from(users).where(eq22(users.id, input.userId)).limit(1);
    if (!u) throw new TRPCError11({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    const isSelf = input.userId === ctx.user.id;
    let isFriend = false, requestPending = false, blockedByMe = false;
    let incomingRequestId = null;
    if (!isSelf) {
      const rels = await db.select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId,
        status: friendRequests.status
      }).from(friendRequests).where(or6(
        and19(eq22(friendRequests.senderId, ctx.user.id), eq22(friendRequests.receiverId, input.userId)),
        and19(eq22(friendRequests.senderId, input.userId), eq22(friendRequests.receiverId, ctx.user.id))
      ));
      const rel = pickFriendRel(rels);
      if (rel?.status === "accepted") isFriend = true;
      else if (rel?.status === "pending") {
        if (rel.senderId === ctx.user.id) requestPending = true;
        else incomingRequestId = rel.id;
      }
      blockedByMe = await hasBlocked(db, ctx.user.id, input.userId);
    }
    let canDM = false;
    if (!isSelf) {
      try {
        await assertCanDM(db, ctx.user.id, input.userId);
        canDM = true;
      } catch {
        canDM = false;
      }
    }
    let profileVisible = true;
    try {
      const [st] = await db.select({ v: userSettings.profileVisible }).from(userSettings).where(eq22(userSettings.userId, input.userId)).limit(1);
      if (st) profileVisible = !!st.v;
    } catch {
    }
    const profileHidden = !isSelf && !isFriend && !profileVisible;
    if (profileHidden) {
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: null,
        isBot: u.isBot,
        createdAt: null,
        isSelf,
        isFriend,
        requestPending,
        incomingRequestId,
        blockedByMe,
        profileHidden: true,
        canDM
      };
    }
    return { ...u, isSelf, isFriend, requestPending, incomingRequestId, blockedByMe, profileHidden: false, canDM };
  }),
  // ─── 拉黑 / 解除拉黑 / 黑名单列表 ─────────────────────────────────────────────
  blockUser: protectedProcedure.input(z11.object({ targetId: z11.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (input.targetId === ctx.user.id) throw new TRPCError11({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u62C9\u9ED1\u81EA\u5DF1" });
    try {
      await db.insert(userBlocklist).values({ blockerId: ctx.user.id, blockedId: input.targetId });
    } catch {
    }
    await db.delete(friendRequests).where(or6(
      and19(eq22(friendRequests.senderId, ctx.user.id), eq22(friendRequests.receiverId, input.targetId)),
      and19(eq22(friendRequests.senderId, input.targetId), eq22(friendRequests.receiverId, ctx.user.id))
    ));
    await db.delete(contactMetadata).where(or6(
      and19(eq22(contactMetadata.userId, ctx.user.id), eq22(contactMetadata.contactId, input.targetId)),
      and19(eq22(contactMetadata.userId, input.targetId), eq22(contactMetadata.contactId, ctx.user.id))
    ));
    return { ok: true };
  }),
  unblockUser: protectedProcedure.input(z11.object({ targetId: z11.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(userBlocklist).where(and19(eq22(userBlocklist.blockerId, ctx.user.id), eq22(userBlocklist.blockedId, input.targetId)));
    return { ok: true };
  }),
  listBlocked: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      blockedAt: userBlocklist.createdAt
    }).from(userBlocklist).innerJoin(users, eq22(users.id, userBlocklist.blockedId)).where(eq22(userBlocklist.blockerId, ctx.user.id)).orderBy(desc12(userBlocklist.createdAt));
  }),
  // ─── Send friend request ────────────────────────────────────────────────────
  sendRequest: protectedProcedure.input(z11.object({
    receiverId: z11.number().int().positive(),
    // 只在从某个群的资料/成员列表加时传入。按 ID / 扫码加不传，不受「禁止互加」影响。
    fromGroupId: z11.number().int().positive().optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (input.receiverId === ctx.user.id) throw new TRPCError11({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u6DFB\u52A0\u81EA\u5DF1\u4E3A\u597D\u53CB" });
    const [target] = await db.select({ id: users.id }).from(users).where(eq22(users.id, input.receiverId)).limit(1);
    if (!target) throw new TRPCError11({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    if (await isBlockedEither(db, ctx.user.id, input.receiverId)) throw new TRPCError11({ code: "FORBIDDEN", message: "\u65E0\u6CD5\u6DFB\u52A0\u597D\u53CB(\u5B58\u5728\u62C9\u9ED1\u5173\u7CFB)" });
    if (input.fromGroupId) {
      const [g] = await db.select({ forbid: chatGroups.forbidAddFriend }).from(chatGroups).where(eq22(chatGroups.id, input.fromGroupId)).limit(1);
      if (g?.forbid) {
        const [meM] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and19(eq22(groupMembers.groupId, input.fromGroupId), eq22(groupMembers.userId, ctx.user.id))).limit(1);
        const [themM] = await db.select({ role: groupMembers.role }).from(groupMembers).where(and19(eq22(groupMembers.groupId, input.fromGroupId), eq22(groupMembers.userId, input.receiverId))).limit(1);
        if (meM?.role === "member" && themM?.role === "member") {
          throw new TRPCError11({ code: "FORBIDDEN", message: "\u8BE5\u7FA4\u5DF2\u7981\u6B62\u6210\u5458\u4E92\u52A0\u597D\u53CB" });
        }
      }
    }
    const pair = or6(
      and19(eq22(friendRequests.senderId, ctx.user.id), eq22(friendRequests.receiverId, input.receiverId)),
      and19(eq22(friendRequests.senderId, input.receiverId), eq22(friendRequests.receiverId, ctx.user.id))
    );
    const rels = await db.select({
      id: friendRequests.id,
      senderId: friendRequests.senderId,
      receiverId: friendRequests.receiverId,
      status: friendRequests.status
    }).from(friendRequests).where(pair);
    const rel = pickFriendRel(rels);
    if (rel?.status === "accepted") {
      throw new TRPCError11({ code: "BAD_REQUEST", message: "\u4F60\u4EEC\u5DF2\u7ECF\u662F\u597D\u53CB\u4E86" });
    }
    if (rel?.status === "pending") {
      if (rel.receiverId === ctx.user.id) {
        await db.update(friendRequests).set({ status: "accepted" }).where(eq22(friendRequests.id, rel.id));
        return { success: true, accepted: true };
      }
      throw new TRPCError11({ code: "BAD_REQUEST", message: "\u5DF2\u53D1\u9001\u8FC7\u597D\u53CB\u7533\u8BF7\uFF0C\u7B49\u5F85\u5BF9\u65B9\u5904\u7406" });
    }
    if (rel?.status === "rejected") {
      await db.update(friendRequests).set({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        status: "pending"
      }).where(eq22(friendRequests.id, rel.id));
      for (const extra of rels) {
        if (extra.id !== rel.id) await db.delete(friendRequests).where(eq22(friendRequests.id, extra.id));
      }
    } else {
      await db.insert(friendRequests).values({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        status: "pending"
      });
    }
    try {
      await createNotification({
        db,
        targetUserId: input.receiverId,
        fromUserId: ctx.user.id,
        fromUserName: ctx.user.name ?? ctx.user.username ?? "\u6709\u4EBA",
        fromUserAvatar: ctx.user.avatar ?? "",
        type: "follow",
        content: "\u8BF7\u6C42\u6DFB\u52A0\u4F60\u4E3A\u597D\u53CB"
      });
    } catch {
    }
    return { success: true, accepted: false };
  }),
  // ─── 删除好友（删除两人间已接受的好友关系，任一方向）──────────────────────────
  removeFriend: protectedProcedure.input(z11.object({ friendId: z11.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(friendRequests).where(
      and19(
        eq22(friendRequests.status, "accepted"),
        or6(
          and19(eq22(friendRequests.senderId, ctx.user.id), eq22(friendRequests.receiverId, input.friendId)),
          and19(eq22(friendRequests.senderId, input.friendId), eq22(friendRequests.receiverId, ctx.user.id))
        )
      )
    );
    try {
      await db.delete(contactMetadata).where(
        or6(
          and19(eq22(contactMetadata.userId, ctx.user.id), eq22(contactMetadata.contactId, input.friendId)),
          and19(eq22(contactMetadata.userId, input.friendId), eq22(contactMetadata.contactId, ctx.user.id))
        )
      );
    } catch {
    }
    return { success: true };
  }),
  // ─── Accept friend request ──────────────────────────────────────────────────
  acceptRequest: protectedProcedure.input(z11.object({ requestId: z11.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const upd = await db.update(friendRequests).set({ status: "accepted" }).where(
      and19(
        eq22(friendRequests.id, input.requestId),
        eq22(friendRequests.receiverId, ctx.user.id),
        eq22(friendRequests.status, "pending")
      )
    );
    const affected2 = upd?.[0]?.affectedRows ?? upd?.affectedRows ?? upd?.rowsAffected ?? 0;
    if (!affected2) throw new TRPCError11({ code: "BAD_REQUEST", message: "\u7533\u8BF7\u4E0D\u5B58\u5728\u6216\u5DF2\u5904\u7406" });
    return { success: true };
  }),
  // ─── Reject friend request ──────────────────────────────────────────────────
  rejectRequest: protectedProcedure.input(z11.object({ requestId: z11.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(friendRequests).set({ status: "rejected" }).where(
      and19(
        eq22(friendRequests.id, input.requestId),
        eq22(friendRequests.receiverId, ctx.user.id),
        eq22(friendRequests.status, "pending")
      )
    );
    return { success: true };
  }),
  // ─── List pending incoming requests ─────────────────────────────────────────
  listIncoming: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: friendRequests.id,
      senderId: friendRequests.senderId,
      createdAt: friendRequests.createdAt,
      senderName: users.name,
      senderUsername: users.username,
      senderAvatar: users.avatar
    }).from(friendRequests).leftJoin(users, eq22(users.id, friendRequests.senderId)).where(
      and19(
        eq22(friendRequests.receiverId, ctx.user.id),
        eq22(friendRequests.status, "pending")
      )
    ).orderBy(desc12(friendRequests.createdAt)).limit(50);
    return rows.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      createdAt: r.createdAt,
      displayName: r.senderName ?? r.senderUsername ?? `User #${r.senderId}`,
      avatar: r.senderAvatar
    }));
  }),
  // ─── List pending outgoing requests ─────────────────────────────────────────
  listOutgoing: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: friendRequests.id,
      receiverId: friendRequests.receiverId,
      createdAt: friendRequests.createdAt,
      receiverName: users.name,
      receiverUsername: users.username,
      receiverAvatar: users.avatar
    }).from(friendRequests).leftJoin(users, eq22(users.id, friendRequests.receiverId)).where(
      and19(
        eq22(friendRequests.senderId, ctx.user.id),
        eq22(friendRequests.status, "pending")
      )
    ).orderBy(desc12(friendRequests.createdAt)).limit(50);
    return rows.map((r) => ({
      id: r.id,
      receiverId: r.receiverId,
      createdAt: r.createdAt,
      displayName: r.receiverName ?? r.receiverUsername ?? `User #${r.receiverId}`,
      avatar: r.receiverAvatar
    }));
  }),
  // ─── List accepted friends ───────────────────────────────────────────────────
  listFriends: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const sent = await db.select({
      id: friendRequests.id,
      otherId: friendRequests.receiverId,
      createdAt: friendRequests.createdAt,
      otherName: users.name,
      otherUsername: users.username,
      otherAvatar: users.avatar
    }).from(friendRequests).leftJoin(users, eq22(users.id, friendRequests.receiverId)).where(
      and19(eq22(friendRequests.senderId, ctx.user.id), eq22(friendRequests.status, "accepted"))
    );
    const received = await db.select({
      id: friendRequests.id,
      otherId: friendRequests.senderId,
      createdAt: friendRequests.createdAt,
      otherName: users.name,
      otherUsername: users.username,
      otherAvatar: users.avatar
    }).from(friendRequests).leftJoin(users, eq22(users.id, friendRequests.senderId)).where(
      and19(eq22(friendRequests.receiverId, ctx.user.id), eq22(friendRequests.status, "accepted"))
    );
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const r of [...sent, ...received]) {
      if (r.otherId == null || seen.has(r.otherId)) continue;
      seen.add(r.otherId);
      result.push({
        id: r.id,
        userId: r.otherId,
        displayName: r.otherName ?? r.otherUsername ?? `User #${r.otherId}`,
        remarkName: null,
        avatar: r.otherAvatar,
        createdAt: r.createdAt
      });
    }
    if (result.length > 0) {
      const metas = await db.select({ contactId: contactMetadata.contactId, remarkName: contactMetadata.remarkName }).from(contactMetadata).where(eq22(contactMetadata.userId, ctx.user.id));
      const remarkMap = new Map(metas.filter((m) => m.remarkName).map((m) => [m.contactId, m.remarkName]));
      for (const f of result) f.remarkName = remarkMap.get(f.userId) ?? null;
    }
    return result;
  }),
  // ─── Set friend remark name ──────────────────────────────────────────────
  setRemark: protectedProcedure.input(z11.object({ contactId: z11.number().int().positive(), remarkName: z11.string().max(50) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const remark = input.remarkName.trim() || null;
    const existing = await db.select({ id: contactMetadata.id }).from(contactMetadata).where(and19(eq22(contactMetadata.userId, ctx.user.id), eq22(contactMetadata.contactId, input.contactId))).limit(1);
    if (existing.length > 0) {
      await db.update(contactMetadata).set({ remarkName: remark }).where(eq22(contactMetadata.id, existing[0].id));
    } else {
      await db.insert(contactMetadata).values({ userId: ctx.user.id, contactId: input.contactId, remarkName: remark });
    }
    return { success: true, remarkName: remark };
  }),
  // ─── Get metadata for a contact ──────────────────────────────────────────
  getContactMeta: protectedProcedure.input(z11.object({ contactId: z11.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(contactMetadata).where(
      and19(
        eq22(contactMetadata.userId, ctx.user.id),
        eq22(contactMetadata.contactId, input.contactId)
      )
    ).limit(1);
    const row = rows[0];
    if (!row) return { isFavorite: false, note: "", tags: [] };
    return {
      isFavorite: row.isFavorite,
      note: row.note ?? "",
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }),
  // ─── List all metadata for the user (for batch display) ────────────────
  listContactMeta: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(contactMetadata).where(eq22(contactMetadata.userId, ctx.user.id));
  }),
  // ─── Toggle favorite ─────────────────────────────────────────────────
  toggleFavorite: protectedProcedure.input(z11.object({ contactId: z11.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const existing = await db.select().from(contactMetadata).where(
      and19(
        eq22(contactMetadata.userId, ctx.user.id),
        eq22(contactMetadata.contactId, input.contactId)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(contactMetadata).set({ isFavorite: !existing[0].isFavorite }).where(eq22(contactMetadata.id, existing[0].id));
      return { success: true, isFavorite: !existing[0].isFavorite };
    } else {
      await db.insert(contactMetadata).values({
        userId: ctx.user.id,
        contactId: input.contactId,
        isFavorite: true
      });
      return { success: true, isFavorite: true };
    }
  }),
  // ─── Update note ─────────────────────────────────────────────────────
  updateNote: protectedProcedure.input(z11.object({ contactId: z11.number().int().positive(), note: z11.string().max(500) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const existing = await db.select().from(contactMetadata).where(
      and19(
        eq22(contactMetadata.userId, ctx.user.id),
        eq22(contactMetadata.contactId, input.contactId)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(contactMetadata).set({ note: input.note }).where(eq22(contactMetadata.id, existing[0].id));
    } else {
      await db.insert(contactMetadata).values({
        userId: ctx.user.id,
        contactId: input.contactId,
        note: input.note
      });
    }
    return { success: true };
  }),
  // ─── Update tags ─────────────────────────────────────────────────────
  updateTags: protectedProcedure.input(z11.object({ contactId: z11.number().int().positive(), tags: z11.array(z11.string().max(30)).max(10) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const tagsJson = JSON.stringify(input.tags);
    const existing = await db.select().from(contactMetadata).where(
      and19(
        eq22(contactMetadata.userId, ctx.user.id),
        eq22(contactMetadata.contactId, input.contactId)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(contactMetadata).set({ tags: tagsJson }).where(eq22(contactMetadata.id, existing[0].id));
    } else {
      await db.insert(contactMetadata).values({
        userId: ctx.user.id,
        contactId: input.contactId,
        tags: tagsJson
      });
    }
    return { success: true };
  })
});

// server/routers/watchlist.ts
import { z as z12 } from "zod";
init_db();
init_schema();
import { and as and20, eq as eq23, desc as desc13 } from "drizzle-orm";
var watchlistRouter = router({
  // ─── Get user's watchlist ────────────────────────────────────────────────────
  getWatchlist: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(userWatchlist).where(eq23(userWatchlist.userId, ctx.user.id)).orderBy(desc13(userWatchlist.createdAt));
  }),
  // ─── Add token to watchlist ──────────────────────────────────────────────────
  addToken: protectedProcedure.input(
    z12.object({
      tokenId: z12.string().min(1).max(100),
      tokenSymbol: z12.string().min(1).max(20),
      tokenName: z12.string().min(1).max(100)
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select({ id: userWatchlist.id }).from(userWatchlist).where(
      and20(
        eq23(userWatchlist.userId, ctx.user.id),
        eq23(userWatchlist.tokenId, input.tokenId)
      )
    ).limit(1);
    if (existing.length > 0) return { success: true, alreadyExists: true };
    await db.insert(userWatchlist).values({
      userId: ctx.user.id,
      tokenId: input.tokenId,
      tokenSymbol: input.tokenSymbol,
      tokenName: input.tokenName
    });
    await awardTaskEvent(db, ctx.user.id, "watchlist_daily");
    return { success: true, alreadyExists: false };
  }),
  // ─── Remove token from watchlist ─────────────────────────────────────────────
  removeToken: protectedProcedure.input(z12.object({ tokenId: z12.string().min(1).max(100) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(userWatchlist).where(
      and20(
        eq23(userWatchlist.userId, ctx.user.id),
        eq23(userWatchlist.tokenId, input.tokenId)
      )
    );
    return { success: true };
  }),
  // ─── Check if token is in watchlist ─────────────────────────────────────────
  isWatching: protectedProcedure.input(z12.object({ tokenId: z12.string().min(1).max(100) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return false;
    const existing = await db.select({ id: userWatchlist.id }).from(userWatchlist).where(
      and20(
        eq23(userWatchlist.userId, ctx.user.id),
        eq23(userWatchlist.tokenId, input.tokenId)
      )
    ).limit(1);
    return existing.length > 0;
  })
});

// server/routers/copyTrading.ts
import { z as z13 } from "zod";
init_db();
init_schema();
import { eq as eq24, and as and21, desc as desc14, sql as sql13 } from "drizzle-orm";
var copyTradingRouter = router({
  // ─── List all active copy traders ──────────────────────────────────────────
  listTraders: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: copyTraders.id,
      userId: copyTraders.userId,
      displayName: copyTraders.displayName,
      avatar: copyTraders.avatar,
      badge: copyTraders.badge,
      description: copyTraders.description,
      riskLevel: copyTraders.riskLevel,
      totalReturn: copyTraders.totalReturn,
      winRate: copyTraders.winRate,
      trades30d: copyTraders.trades30d,
      maxDrawdown: copyTraders.maxDrawdown,
      topPairs: copyTraders.topPairs,
      followerCount: sql13`(SELECT COUNT(*) FROM copy_trader_follows WHERE traderId = ${copyTraders.id})`
    }).from(copyTraders).where(eq24(copyTraders.isActive, true)).orderBy(desc14(copyTraders.winRate)).limit(50);
    return rows.map((r) => ({
      ...r,
      topPairs: r.topPairs ? JSON.parse(r.topPairs) : []
    }));
  }),
  // ─── Follow / unfollow a trader ────────────────────────────────────────────
  toggleFollow: protectedProcedure.input(z13.object({ traderId: z13.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false, isFollowing: false };
    const existing = await db.select().from(copyTraderFollows).where(
      and21(
        eq24(copyTraderFollows.userId, ctx.user.id),
        eq24(copyTraderFollows.traderId, input.traderId)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.delete(copyTraderFollows).where(eq24(copyTraderFollows.id, existing[0].id));
      return { success: true, isFollowing: false };
    } else {
      await db.insert(copyTraderFollows).values({
        userId: ctx.user.id,
        traderId: input.traderId
      });
      return { success: true, isFollowing: true };
    }
  }),
  // ─── List traders I follow ─────────────────────────────────────────────────
  myFollowedTraders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({ traderId: copyTraderFollows.traderId }).from(copyTraderFollows).where(eq24(copyTraderFollows.userId, ctx.user.id));
    return rows.map((r) => r.traderId);
  }),
  // ─── Register as a copy trader ─────────────────────────────────────────────
  registerAsTrader: protectedProcedure.input(z13.object({
    displayName: z13.string().min(1).max(100),
    description: z13.string().max(500).optional(),
    riskLevel: z13.enum(["low", "medium", "high"]).default("medium"),
    topPairs: z13.array(z13.string().max(20)).max(5).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const existing = await db.select().from(copyTraders).where(eq24(copyTraders.userId, ctx.user.id)).limit(1);
    if (existing.length > 0) {
      await db.update(copyTraders).set({
        displayName: input.displayName,
        description: input.description ?? null,
        riskLevel: input.riskLevel,
        topPairs: input.topPairs ? JSON.stringify(input.topPairs) : null,
        isActive: true
      }).where(eq24(copyTraders.id, existing[0].id));
      return { success: true, traderId: existing[0].id };
    }
    const user = await db.select({ avatar: users.avatar, name: users.name }).from(users).where(eq24(users.id, ctx.user.id)).limit(1);
    const [result] = await db.insert(copyTraders).values({
      userId: ctx.user.id,
      displayName: input.displayName,
      avatar: user[0]?.name?.slice(0, 1) ?? "\u{1F916}",
      description: input.description ?? null,
      riskLevel: input.riskLevel,
      topPairs: input.topPairs ? JSON.stringify(input.topPairs) : null
    });
    return { success: true, traderId: result.insertId };
  }),
  // ─── List all strategies ───────────────────────────────────────────────────
  listStrategies: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tradingStrategies).where(eq24(tradingStrategies.isActive, true)).orderBy(desc14(tradingStrategies.winRate)).limit(50);
  }),
  // ─── Create / update a strategy ────────────────────────────────────────────
  upsertStrategy: protectedProcedure.input(z13.object({
    id: z13.number().int().positive().optional(),
    name: z13.string().min(1).max(100),
    description: z13.string().max(500).optional(),
    type: z13.enum(["grid", "dca", "momentum", "arbitrage", "custom"]).default("custom"),
    pair: z13.string().max(30).optional(),
    riskLevel: z13.enum(["low", "medium", "high"]).default("medium"),
    stopLoss: z13.string().max(30).optional(),
    takeProfit: z13.string().max(30).optional(),
    maxPosition: z13.string().max(30).optional()
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    if (input.id) {
      await db.update(tradingStrategies).set({
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        pair: input.pair ?? null,
        riskLevel: input.riskLevel,
        stopLoss: input.stopLoss ?? null,
        takeProfit: input.takeProfit ?? null,
        maxPosition: input.maxPosition ?? null
      }).where(
        and21(
          eq24(tradingStrategies.id, input.id),
          eq24(tradingStrategies.userId, ctx.user.id)
        )
      );
      return { success: true, strategyId: input.id };
    }
    const [result] = await db.insert(tradingStrategies).values({
      userId: ctx.user.id,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      pair: input.pair ?? null,
      riskLevel: input.riskLevel,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,
      maxPosition: input.maxPosition ?? null
    });
    return { success: true, strategyId: result.insertId };
  }),
  // ─── My strategies ─────────────────────────────────────────────────────────
  myStrategies: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tradingStrategies).where(eq24(tradingStrategies.userId, ctx.user.id)).orderBy(desc14(tradingStrategies.createdAt));
  }),
  // ─── Toggle strategy active status ─────────────────────────────────────────
  toggleStrategy: protectedProcedure.input(z13.object({ id: z13.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const existing = await db.select().from(tradingStrategies).where(
      and21(
        eq24(tradingStrategies.id, input.id),
        eq24(tradingStrategies.userId, ctx.user.id)
      )
    ).limit(1);
    if (existing.length === 0) return { success: false };
    await db.update(tradingStrategies).set({ isActive: !existing[0].isActive }).where(eq24(tradingStrategies.id, input.id));
    return { success: true, isActive: !existing[0].isActive };
  }),
  // ─── Delete strategy ─────────────────────────────────────────────────────
  deleteStrategy: protectedProcedure.input(z13.object({ id: z13.number().int().positive() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.delete(tradingStrategies).where(
      and21(
        eq24(tradingStrategies.id, input.id),
        eq24(tradingStrategies.userId, ctx.user.id)
      )
    );
    return { success: true };
  })
});

// server/routers/settings.ts
import { z as z14 } from "zod";
init_db();
init_schema();
import { eq as eq25, and as and22, desc as desc15 } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}
function generateApiKeyString() {
  const random = randomBytes(24).toString("hex");
  return `nx_sk_${random}`;
}
var settingsRouter = router({
  // ─── Get user settings (privacy & security preferences) ───────────────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [existing] = await db.select().from(userSettings).where(eq25(userSettings.userId, ctx.user.id)).limit(1);
    if (existing) return existing;
    await db.insert(userSettings).values({ userId: ctx.user.id });
    const [created] = await db.select().from(userSettings).where(eq25(userSettings.userId, ctx.user.id)).limit(1);
    return created;
  }),
  // ─── Update user settings ─────────────────────────────────────────────────
  updateSettings: protectedProcedure.input(
    z14.object({
      showWallet: z14.boolean().optional(),
      showActivity: z14.boolean().optional(),
      showNFTs: z14.boolean().optional(),
      readReceipts: z14.boolean().optional(),
      profileVisible: z14.boolean().optional(),
      dmOnlyFriends: z14.boolean().optional(),
      twoFAEnabled: z14.boolean().optional(),
      biometricEnabled: z14.boolean().optional()
    })
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [existing] = await db.select({ id: userSettings.id }).from(userSettings).where(eq25(userSettings.userId, ctx.user.id)).limit(1);
    const updateData = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== void 0) updateData[key] = val;
    }
    if (existing) {
      await db.update(userSettings).set(updateData).where(eq25(userSettings.userId, ctx.user.id));
    } else {
      await db.insert(userSettings).values({
        userId: ctx.user.id,
        ...updateData
      });
    }
    return { success: true };
  }),
  // ─── List API keys (masked) ───────────────────────────────────────────────
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const keys = await db.select({
      id: userApiKeys.id,
      keyPrefix: userApiKeys.keyPrefix,
      label: userApiKeys.label,
      isActive: userApiKeys.isActive,
      lastUsedAt: userApiKeys.lastUsedAt,
      createdAt: userApiKeys.createdAt
    }).from(userApiKeys).where(eq25(userApiKeys.userId, ctx.user.id)).orderBy(desc15(userApiKeys.createdAt));
    return keys.map((k) => ({
      ...k,
      maskedKey: `${k.keyPrefix}${"\u2022".repeat(40)}`
    }));
  }),
  // ─── Generate new API key ─────────────────────────────────────────────────
  generateApiKey: protectedProcedure.input(
    z14.object({
      label: z14.string().max(100).default("Default")
    }).optional()
  ).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existingKeys = await db.select({ id: userApiKeys.id }).from(userApiKeys).where(
      and22(
        eq25(userApiKeys.userId, ctx.user.id),
        eq25(userApiKeys.isActive, true)
      )
    );
    if (existingKeys.length >= 5) {
      throw new Error("Maximum 5 active API keys allowed. Revoke an existing key first.");
    }
    const rawKey = generateApiKeyString();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 10);
    await db.insert(userApiKeys).values({
      userId: ctx.user.id,
      keyPrefix,
      keyHash,
      label: input?.label ?? "Default"
    });
    return { apiKey: rawKey, keyPrefix };
  }),
  // ─── Revoke (deactivate) an API key ───────────────────────────────────────
  revokeApiKey: protectedProcedure.input(z14.object({ keyId: z14.number() })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(userApiKeys).set({ isActive: false }).where(
      and22(
        eq25(userApiKeys.id, input.keyId),
        eq25(userApiKeys.userId, ctx.user.id)
      )
    );
    return { success: true };
  })
});

// server/routers/referral.ts
import { z as z15 } from "zod";
init_db();
init_schema();
import { eq as eq26, and as and23, or as or7, desc as desc16, count as count5, sql as sql14 } from "drizzle-orm";
init_env();
var REFERRER_REWARD = 100;
var INVITEE_REWARD = 200;
var REWARD_TIERS = [
  { count: 5, reward: "\u7D2F\u8BA1\u7EA6 500 IT", icon: "\u{1F381}" },
  { count: 10, reward: "Exclusive Badge", icon: "\u{1F3C5}" },
  { count: 25, reward: "1% Fee Rebate", icon: "\u{1F4B0}" },
  { count: 50, reward: "VIP Status", icon: "\u{1F451}" },
  { count: 100, reward: "Revenue Share", icon: "\u{1F48E}" }
];
var referralRouter = router({
  // ─── Get invite stats + code ──────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { inviteCode: "", inviteLink: "", totalInvited: 0, activeInvited: 0, totalRewards: 0, tiers: [] };
    const userId = ctx.user.id;
    const userName = ctx.user.name ?? "USER";
    const inviteCode = await ensureInviteCode(db, userId, userName);
    const [totalResult] = await db.select({ cnt: count5() }).from(referrals).where(eq26(referrals.referrerId, userId));
    const [activeResult] = await db.select({ cnt: count5() }).from(referrals).where(and23(eq26(referrals.referrerId, userId), eq26(referrals.status, "active")));
    const [rewardResult] = await db.select({ total: sql14`COALESCE(SUM(${referrals.referrerReward}), 0)` }).from(referrals).where(eq26(referrals.referrerId, userId));
    const totalInvited = totalResult?.cnt ?? 0;
    const activeInvited = activeResult?.cnt ?? 0;
    const totalRewards = rewardResult?.total ?? 0;
    const tiers = REWARD_TIERS.map((tier) => ({
      ...tier,
      unlocked: activeInvited >= tier.count
    }));
    return {
      inviteCode,
      inviteLink: `${ENV.publicOrigin}/i/${inviteCode}`,
      // 别用 req Host:CF→Cloud Run 下是被墙的 *.run.app
      totalInvited,
      activeInvited,
      totalRewards,
      tiers
    };
  }),
  // ─── List invited friends ─────────────────────────────────────────────────
  listReferrals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const userId = ctx.user.id;
    const rows = await db.select({
      id: referrals.id,
      inviteeId: referrals.inviteeId,
      status: referrals.status,
      referrerReward: referrals.referrerReward,
      createdAt: referrals.createdAt,
      activatedAt: referrals.activatedAt,
      inviteeName: users.name,
      inviteeAvatar: users.avatar,
      inviteeUsername: users.username
    }).from(referrals).leftJoin(users, eq26(referrals.inviteeId, users.id)).where(eq26(referrals.referrerId, userId)).orderBy(desc16(referrals.createdAt)).limit(100);
    return rows.map((r) => ({
      id: String(r.id),
      name: r.inviteeUsername || r.inviteeName || `User #${r.inviteeId}`,
      avatar: r.inviteeAvatar || (r.inviteeName?.charAt(0).toUpperCase() ?? "?"),
      status: r.status,
      reward: r.referrerReward,
      joinedAt: r.createdAt,
      activatedAt: r.activatedAt
    }));
  }),
  // ─── 我的绑定状态（是否已被邀请 + 邀请人是谁）────────────────────────────────
  bindStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { bound: false };
    const [r] = await db.select({ referrerId: referrals.referrerId }).from(referrals).where(eq26(referrals.inviteeId, ctx.user.id)).limit(1);
    if (!r) return { bound: false };
    const [ref] = await db.select({ name: users.name, username: users.username }).from(users).where(eq26(users.id, r.referrerId)).limit(1);
    return { bound: true, referrerName: ref?.name ?? ref?.username ?? `\u7528\u6237 #${r.referrerId}` };
  }),
  // ─── Record a referral (called when invitee signs up with code) ───────────
  recordReferral: protectedProcedure.input(z15.object({ inviteCode: z15.string().max(30) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false, message: "Database unavailable" };
    const inviteeId = ctx.user.id;
    const [existing] = await db.select().from(referrals).where(eq26(referrals.inviteeId, inviteeId)).limit(1);
    if (existing) return { success: false, message: "Already referred" };
    const norm = normalizeInviteCode(input.inviteCode);
    const rawUpper = input.inviteCode.trim().toUpperCase();
    const [referrer] = await db.select({ id: users.id }).from(users).where(or7(eq26(users.inviteCode, norm), eq26(users.inviteCode, rawUpper))).limit(1);
    if (!referrer) return { success: false, message: "Invalid invite code" };
    if (referrer.id === inviteeId) return { success: false, message: "Cannot invite yourself" };
    {
      const [pair] = await db.select({ a: users.deviceId }).from(users).where(eq26(users.id, inviteeId)).limit(1);
      const [refDev] = await db.select({ b: users.deviceId }).from(users).where(eq26(users.id, referrer.id)).limit(1);
      if (pair?.a && refDev?.b && pair.a === refDev.b) {
        return { success: false, message: "Cannot bind same-device account" };
      }
      if (pair?.a) {
        const [{ c: boundCount = 0 } = { c: 0 }] = await db.select({ c: count5() }).from(referrals).innerJoin(users, eq26(referrals.inviteeId, users.id)).where(and23(eq26(users.deviceId, pair.a), eq26(referrals.status, "active")));
        if (Number(boundCount) >= 3) {
          return { success: false, message: "Device referral limit reached" };
        }
      }
    }
    {
      const refRows = await db.select({ inviteeId: referrals.inviteeId, referrerId: referrals.referrerId }).from(referrals).where(eq26(referrals.status, "active"));
      const parentOf = /* @__PURE__ */ new Map();
      for (const r of refRows) if (!parentOf.has(r.inviteeId)) parentOf.set(r.inviteeId, r.referrerId);
      let cur = referrer.id;
      for (let depth = 0; cur !== void 0 && depth < 100; depth++) {
        if (cur === inviteeId) return { success: false, message: "Cannot bind your own downline" };
        cur = parentOf.get(cur);
      }
    }
    const outcome = await db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq26(users.id, inviteeId)).for("update").limit(1);
      const [dup] = await tx.select({ id: referrals.id }).from(referrals).where(eq26(referrals.inviteeId, inviteeId)).limit(1);
      if (dup) return "dup";
      await tx.insert(referrals).values({
        referrerId: referrer.id,
        inviteeId,
        status: "active",
        referrerReward: REFERRER_REWARD,
        inviteeReward: INVITEE_REWARD,
        activatedAt: /* @__PURE__ */ new Date()
      });
      await tx.update(users).set({ npPoints: sql14`${users.npPoints} + ${REFERRER_REWARD}` }).where(eq26(users.id, referrer.id));
      await tx.update(users).set({ npPoints: sql14`${users.npPoints} + ${INVITEE_REWARD}` }).where(eq26(users.id, inviteeId));
      return "ok";
    });
    if (outcome === "dup") return { success: false, message: "Already referred" };
    return { success: true, message: `\u9080\u8BF7\u5DF2\u7ED1\u5B9A\uFF0C\u4F60\u83B7\u5F97 ${INVITEE_REWARD} IT` };
  })
});

// server/routers/emailAuth.ts
init_schema();
import { TRPCError as TRPCError12 } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq as eq27, and as and24, gt as gt5, isNull as isNull4, sql as sql15 } from "drizzle-orm";
import { z as z16 } from "zod";
import { randomBytes as randomBytes2, randomInt } from "crypto";
init_db();
init_env();

// server/_core/email.ts
init_env();
import { Resend } from "resend";
var resend = null;
function getResend() {
  if (!ENV.resendApiKey) return null;
  if (!resend) resend = new Resend(ENV.resendApiKey);
  return resend;
}
var FROM_ADDRESS = "\u6BD4\u7279AI\u793E\u4EA4 <onboarding@resend.dev>";
var APP_NAME = "\u6BD4\u7279AI\u793E\u4EA4";
async function sendPasswordResetEmail(params) {
  const client = getResend();
  if (!client) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const { to, resetUrl, code, expiresInMinutes = 60 } = params;
  const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>\u91CD\u7F6E\u5BC6\u7801 \u2014 ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#12121a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#00d4ff,#a855f7);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:24px;">\u{1F4AC}</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.4);font-size:13px;">\u8BA9AI\u793E\u4EA4\u6210\u4E3A\u751F\u6D3B\u4E60\u60EF \xB7 \u6FB3\u6D32 AFT \u96C6\u56E2</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:18px;font-weight:600;">\u5BC6\u7801\u91CD\u7F6E\u9A8C\u8BC1\u7801</h2>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;">
                \u8BF7\u6253\u5F00\u6BD4\u7279AI\u793E\u4EA4 App\uFF0C\u5728\u300C\u91CD\u7F6E\u5BC6\u7801\u300D\u9875\u586B\u5199\u4E0B\u65B9 6 \u4F4D\u9A8C\u8BC1\u7801\u5E76\u8BBE\u7F6E\u65B0\u5BC6\u7801\u3002\u9A8C\u8BC1\u7801 <strong style="color:rgba(255,255,255,0.8);">${expiresInMinutes} \u5206\u949F</strong>\u5185\u6709\u6548\u3002
              </p>
              <div style="text-align:center;margin:8px 0 24px;padding:18px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:14px;">
                <div style="color:rgba(255,255,255,0.45);font-size:12px;letter-spacing:0.12em;margin-bottom:8px;">\u9A8C\u8BC1\u7801</div>
                <div style="color:#ffffff;font-size:32px;font-weight:700;letter-spacing:0.35em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${code}</div>
              </div>
              <p style="margin:0 0 16px;color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;text-align:center;">
                \u4E5F\u53EF\u4EE5\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5728\u7F51\u9875\u5B8C\u6210\u91CD\u7F6E
              </p>
              <div style="text-align:center;margin:0 0 16px;">
                <a href="${resetUrl}"
                   style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00d4ff,#a855f7);border-radius:12px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  \u5728\u7F51\u9875\u91CD\u7F6E\u5BC6\u7801
                </a>
              </div>
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
                \u6309\u94AE\u65E0\u6CD5\u70B9\u51FB\u65F6\uFF0C\u628A\u94FE\u63A5\u590D\u5236\u5230\u7CFB\u7EDF\u6D4F\u89C8\u5668\u6253\u5F00\uFF1A<br/>
                <span style="color:rgba(0,212,255,0.6);word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;">
                \u5982\u679C\u60A8\u6CA1\u6709\u8BF7\u6C42\u91CD\u7F6E\u5BC6\u7801\uFF0C\u8BF7\u5FFD\u7565\u6B64\u90AE\u4EF6\uFF0C\u60A8\u7684\u8D26\u53F7\u4ECD\u7136\u5B89\u5168\u3002<br/>
                \u6B64\u90AE\u4EF6\u7531 ${APP_NAME} \u81EA\u52A8\u53D1\u9001\uFF0C\u8BF7\u52FF\u56DE\u590D\u3002
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `\u4F60\u7684\u6BD4\u7279AI\u793E\u4EA4\u9A8C\u8BC1\u7801\uFF1A${code}`,
      html
    });
    if (result.error) {
      console.warn("[Email] Resend error:", result.error);
      return { success: false, error: result.error.message };
    }
    return { success: true, messageId: result.data?.id ?? "unknown" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[Email] Failed to send email:", message);
    return { success: false, error: message };
  }
}

// server/utils/disposableEmailBlocklist.ts
var DISPOSABLE_EMAIL_DOMAINS = /* @__PURE__ */ new Set([
  // ─── 最常见的临时邮箱服务 ───
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.info",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minemail.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "throwam.com",
  "trashmail.com",
  "trashmail.at",
  "trashmail.io",
  "trashmail.me",
  "trashmail.net",
  "trashmail.org",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "spam4.me",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "mailnull.com",
  "spamfree24.org",
  "spamfree24.de",
  "spamfree24.eu",
  "spamfree24.info",
  "spamfree24.net",
  "spamfree24.com",
  "spamfree.eu",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
  "maildrop.cc",
  "throwaway.email",
  "getnada.com",
  "mohmal.com",
  "getairmail.com",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  // ─── 更多常见临时邮箱 ───
  "mailtemp.info",
  "mailtemp.net",
  "mailtemp.org",
  "tempinbox.com",
  "tempinbox.net",
  "tempr.email",
  "tempr.net",
  "mailsac.com",
  "mailexpire.com",
  "mailscrap.com",
  "mailbucket.org",
  "mailzilla.com",
  "mailzilla.org",
  "mailme.lv",
  "mailme.ir",
  "mailme24.com",
  "mailnew.com",
  "mailnull.net",
  "mailsiphon.com",
  "mailslapping.com",
  "mailslite.com",
  "mailsource.info",
  "mailsquirt.com",
  "mailsucker.net",
  "mailtemp.eu",
  "mailtemporaire.com",
  "mailtemporaire.fr",
  "mailthunder.ml",
  "mailtrash.net",
  "mailtv.net",
  "mailtv.tv",
  "mailzilla.org",
  "meltmail.com",
  "mierdamail.com",
  "mintemail.com",
  "misterpinball.de",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "mt2009.com",
  "mt2014.com",
  "mytrashmail.com",
  "nabuma.com",
  "nada.email",
  "nada.ltd",
  "netzidiot.de",
  "nh3.ro",
  "nice-4u.com",
  "nincsmail.hu",
  "nnh.com",
  "no-spam.ws",
  "noblepioneer.com",
  "nomail.pw",
  "nomail.xl.cx",
  "nomail2me.com",
  "nomorespamemails.com",
  "nonspam.eu",
  "nonspammer.de",
  "noref.in",
  "norseforce.com",
  "nospam.ze.tc",
  "nospamfor.us",
  "nospammail.net",
  "nospamthanks.info",
  "notmailinator.com",
  "nowhere.org",
  "nowmymail.com",
  "nwldx.com",
  "objectmail.com",
  "obobbo.com",
  "odaymail.com",
  "odnorazovoe.ru",
  "one-time.email",
  "oneoffmail.com",
  "onewaymail.com",
  "onlatedotcom.info",
  "online.ms",
  "oopi.org",
  "opayq.com",
  "opentrash.com",
  "ordinaryamerican.net",
  "otherinbox.com",
  "ourklips.com",
  "outlawspam.com",
  "ovpn.to",
  "owlpic.com",
  "pancakemail.com",
  "paplease.com",
  "pcusers.otherinbox.com",
  "pepbot.com",
  "pfui.ru",
  "pimpedupmyspace.com",
  "pjjkp.com",
  "plexolan.de",
  "poczta.onet.pl",
  "politikerclub.de",
  "poofy.org",
  "pookmail.com",
  "pop3.xyz",
  "postac\u0131.com",
  "postalmail.net",
  "postaccesslite.com",
  "postmaster.twitter.com",
  "postpro.net",
  "privacy.net",
  "privatdemail.net",
  "proxymail.eu",
  "prtnx.com",
  "prtz.eu",
  "public-inbox.org",
  "punkass.com",
  "putthisinyourspamdatabase.com",
  "pwrby.com",
  "quickinbox.com",
  "rcpt.at",
  "recode.me",
  "recursor.net",
  "recyclemail.dk",
  "regbypass.com",
  "regbypass.comsafe-mail.net",
  "rejectmail.com",
  "reliable-mail.com",
  "rklips.com",
  "rmqkr.net",
  "royal.net",
  "rppkn.com",
  "rtrtr.com",
  "s0ny.net",
  "safe-mail.net",
  "safersignup.de",
  "safetymail.info",
  "safetypost.de",
  "sandelf.de",
  "saynotospams.com",
  "selfdestructingmail.com",
  "sendspamhere.com",
  "senseless-entertainment.com",
  "services391.com",
  "sharklasers.com",
  "shieldedmail.com",
  "shiftmail.com",
  "shitmail.me",
  "shitware.nl",
  "shmeriously.com",
  "shortmail.net",
  "sibmail.com",
  "sinnlos-mail.de",
  "skeefmail.com",
  "slapsfromlastnight.com",
  "slaskpost.se",
  "slave-auctions.net",
  "smellfear.com",
  "snakemail.com",
  "sneakemail.com",
  "sneakmail.de",
  "snkmail.com",
  "sofimail.com",
  "sofort-mail.de",
  "sogetthis.com",
  "sohai.ml",
  "soisz.com",
  "solar-impact.pro",
  "solvemail.info",
  "soodonims.com",
  "spam.la",
  "spam.mn",
  "spam.org.tr",
  "spam.su",
  "spam4.me",
  "spamail.de",
  "spambox.info",
  "spambox.irishspringrealty.com",
  "spambox.org",
  "spambox.us",
  "spamcannon.com",
  "spamcannon.net",
  "spamcero.com",
  "spamcon.org",
  "spamcorptastic.com",
  "spamcowboy.com",
  "spamcowboy.net",
  "spamcowboy.org",
  "spamday.com",
  "spamex.com",
  "spamfree.eu",
  "spamfree24.com",
  "spamfree24.de",
  "spamfree24.eu",
  "spamfree24.info",
  "spamfree24.net",
  "spamfree24.org",
  "spamgoes.in",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "spamherelots.com",
  "spamhereplease.com",
  "spamhole.com",
  "spamify.com",
  "spaminator.de",
  "spamkill.info",
  "spaml.com",
  "spaml.de",
  "spammotel.com",
  "spamobox.com",
  "spamoff.de",
  "spamslicer.com",
  "spamspot.com",
  "spamthis.co.uk",
  "spamthisplease.com",
  "spamtrail.com",
  "spamtroll.net",
  "speed.1s.fr",
  "spoofmail.de",
  "spybox.de",
  "squizzy.de",
  "squizzy.eu",
  "squizzy.net",
  "ssoia.com",
  "startkeys.com",
  "stinkefinger.net",
  "stop-my-spam.com",
  "streetwisemail.com",
  "stumpfwerk.com",
  "stuffmail.de",
  "super-auswahl.de",
  "supergreatmail.com",
  "supermailer.jp",
  "superrito.com",
  "superstachel.de",
  "suremail.info",
  "svk.jp",
  "sweetxxx.de",
  "tafmail.com",
  "tagyourself.com",
  "talkinator.com",
  "tapchicuoihoi.com",
  "teewars.org",
  "teleworm.com",
  "teleworm.us",
  "temp-mail.de",
  "temp-mail.ru",
  "temp.emeraldwebmail.com",
  "temp.headstrong.de",
  "tempalias.com",
  "tempe-mail.com",
  "tempemail.biz",
  "tempemail.com",
  "tempemail.net",
  "tempinbox.co.uk",
  "tempinbox.com",
  "tempmail.de",
  "tempmail.eu",
  "tempmail.it",
  "tempmail2.com",
  "tempomail.fr",
  "temporaryemail.net",
  "temporaryemail.us",
  "temporaryforwarding.com",
  "temporaryinbox.com",
  "temporarymailaddress.com",
  "tempthe.net",
  "thankyou2010.com",
  "thc.st",
  "thelimestones.com",
  "thisisnotmyrealemail.com",
  "thismail.net",
  "throwam.com",
  "throwaway.email",
  "throwam.net",
  "tilien.com",
  "tittbit.in",
  "tizi.com",
  "tmailinator.com",
  "toiea.com",
  "toomail.biz",
  "topranklist.de",
  "tradermail.info",
  "trash-mail.at",
  "trash-mail.com",
  "trash-mail.de",
  "trash-mail.ga",
  "trash-mail.io",
  "trash-mail.ml",
  "trash-mail.net",
  "trash-me.com",
  "trashdevil.com",
  "trashdevil.de",
  "trashemail.de",
  "trashimail.de",
  "trashmail.at",
  "trashmail.com",
  "trashmail.io",
  "trashmail.me",
  "trashmail.net",
  "trashmail.org",
  "trashmail.xyz",
  "trashmailer.com",
  "trashspam.com",
  "trillianpro.com",
  "trmailbox.com",
  "trommlerbuben.de",
  "tropicalbass.info",
  "trtt.com",
  "turual.com",
  "twinmail.de",
  "tyldd.com",
  "uggsrock.com",
  "umail.net",
  "uroid.com",
  "us.af",
  "utiket.us",
  "uu.gl",
  "uwork4.us",
  "venompen.com",
  "veryrealemail.com",
  "vidchart.com",
  "viditag.com",
  "viewcastmedia.com",
  "viewcastmedia.net",
  "viewcastmedia.org",
  "viralplays.com",
  "vkcode.ru",
  "vomoto.com",
  "vpn.st",
  "vsimcard.com",
  "vubby.com",
  "wasteland.rfc822.org",
  "webemail.me",
  "webm4il.info",
  "wegwerfadresse.de",
  "wegwerfemail.com",
  "wegwerfemail.de",
  "wegwerfemail.net",
  "wegwerfemail.org",
  "wegwerfmail.de",
  "wegwerfmail.info",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "wegwerfnummer.de",
  "wetrainbayarea.com",
  "wetrainbayarea.org",
  "wh4f.org",
  "whyspam.me",
  "wickmail.net",
  "wilemail.com",
  "willhackforfood.biz",
  "willselfdestruct.com",
  "winemaven.info",
  "wronghead.com",
  "wuzupmail.net",
  "www.e4ward.com",
  "www.mailinator.com",
  "wwwnew.eu",
  "x.ip6.li",
  "xagloo.co",
  "xagloo.com",
  "xemaps.com",
  "xents.com",
  "xmaily.com",
  "xoxy.net",
  "xyzfree.net",
  "yapped.net",
  "yeah.net",
  "yep.it",
  "yogamaven.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "yourdomain.com",
  "ypmail.webarnak.fr.eu.org",
  "yuurok.com",
  "z1p.biz",
  "za.com",
  "zehnminuten.de",
  "zehnminutenmail.de",
  "zetmail.com",
  "zippymail.info",
  "zoemail.net",
  "zoemail.org",
  "zomg.info",
  "zxcv.com",
  "zxcvbnm.com",
  "zzz.com"
]);
function isDisposableEmail(email) {
  const lower = email.toLowerCase().trim();
  const atIndex = lower.lastIndexOf("@");
  if (atIndex === -1) return false;
  const domain = lower.slice(atIndex + 1);
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

// server/routers/emailAuth.ts
async function verifyTurnstile(token, remoteip) {
  const secretKey = ENV.turnstileSecretKey;
  if (!secretKey || secretKey === "1x0000000000000000000000000000000AA") return true;
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteip) formData.append("remoteip", remoteip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}
var SALT_ROUNDS = 10;
var RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1e3;
var OTP_TOKEN_PREFIX = "otp:";
function otpToken(userId, code) {
  return `${OTP_TOKEN_PREFIX}${userId}:${code}`;
}
var ipRegisterAttempts = /* @__PURE__ */ new Map();
var IP_REGISTER_LIMIT = 5;
var IP_REGISTER_WINDOW_MS = 24 * 60 * 60 * 1e3;
var loginAttempts = /* @__PURE__ */ new Map();
var LOGIN_ATTEMPT_LIMIT = 10;
var LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1e3;
var resetRequestAttempts = /* @__PURE__ */ new Map();
var RESET_REQUEST_LIMIT = 5;
var RESET_REQUEST_WINDOW_MS = 15 * 60 * 1e3;
var resetCodeAttempts = /* @__PURE__ */ new Map();
var RESET_CODE_LIMIT = 8;
function isLoginLocked(key, now) {
  const rec = loginAttempts.get(key);
  if (!rec) return false;
  if (now >= rec.resetAt) {
    loginAttempts.delete(key);
    return false;
  }
  return rec.count >= LOGIN_ATTEMPT_LIMIT;
}
function registerLoginFailure(key, now) {
  const rec = loginAttempts.get(key);
  if (!rec || now >= rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS });
  } else {
    rec.count++;
  }
}
function clearLoginFailures(...keys) {
  for (const key of keys) loginAttempts.delete(key);
}
function bumpWindow(map, key, now, windowMs) {
  const rec = map.get(key);
  if (!rec || now >= rec.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  rec.count++;
  return rec.count;
}
function isWindowLocked(map, key, now, limit) {
  const rec = map.get(key);
  if (!rec) return false;
  if (now >= rec.resetAt) {
    map.delete(key);
    return false;
  }
  return rec.count >= limit;
}
function clientIpOf(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}
function emailOpenId(email) {
  return `email:${email.toLowerCase().trim()}`;
}
var emailAuthRouter = router({
  /** Register a new account with email + password */
  register: publicProcedure.input(
    z16.object({
      email: z16.string().email("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740").max(320),
      password: z16.string().min(8, "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D").max(128),
      name: z16.string().min(1, "\u8BF7\u8F93\u5165\u6635\u79F0").max(50),
      /** Cloudflare Turnstile token — required in production */
      turnstileToken: z16.string().optional(),
      /** 设备指纹（防多号撸AC）：同设备最多注册 3 个账号 */
      deviceId: z16.string().max(64).optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    if (isDisposableEmail(input.email)) {
      throw new TRPCError12({
        code: "BAD_REQUEST",
        message: "\u8BF7\u4F7F\u7528\u771F\u5B9E\u90AE\u7BB1\u5730\u5740\u6CE8\u518C\uFF08\u4E0D\u652F\u6301\u4E34\u65F6\u90AE\u7BB1\uFF09"
      });
    }
    const clientIp = clientIpOf(ctx.req);
    const now = Date.now();
    const ipRecord = ipRegisterAttempts.get(clientIp);
    if (ipRecord && now < ipRecord.resetAt) {
      if (ipRecord.count >= IP_REGISTER_LIMIT) {
        throw new TRPCError12({
          code: "TOO_MANY_REQUESTS",
          message: `\u540C\u4E00\u7F51\u7EDC\u6CE8\u518C\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF7 24 \u5C0F\u65F6\u540E\u518D\u8BD5`
        });
      }
      ipRecord.count++;
    } else {
      ipRegisterAttempts.set(clientIp, { count: 1, resetAt: now + IP_REGISTER_WINDOW_MS });
    }
    const isMobileApp = ctx.req.headers["x-client-type"] === "mobile-app";
    if (!isMobileApp) {
      if (input.turnstileToken) {
        const turnstileOk = await verifyTurnstile(input.turnstileToken, clientIp);
        if (!turnstileOk) {
          throw new TRPCError12({
            code: "FORBIDDEN",
            message: "\u4EBA\u673A\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u8BD5"
          });
        }
      } else if (process.env.NODE_ENV === "production" && ENV.turnstileSecretKey && ENV.turnstileSecretKey !== "1x0000000000000000000000000000000AA") {
        throw new TRPCError12({
          code: "FORBIDDEN",
          message: "\u8BF7\u5B8C\u6210\u4EBA\u673A\u9A8C\u8BC1\u540E\u518D\u6CE8\u518C"
        });
      }
    }
    const deviceId = input.deviceId?.trim() || null;
    if (deviceId) {
      const [{ c: devCount = 0 } = { c: 0 }] = await db.select({ c: sql15`COUNT(*)` }).from(users).where(eq27(users.deviceId, deviceId));
      if (Number(devCount) >= 3) {
        throw new TRPCError12({ code: "TOO_MANY_REQUESTS", message: "\u8BE5\u8BBE\u5907\u6CE8\u518C\u8D26\u53F7\u6570\u5DF2\u8FBE\u4E0A\u9650" });
      }
    }
    const normalizedEmail = input.email.toLowerCase().trim();
    const openId = emailOpenId(normalizedEmail);
    const existing = await db.select().from(users).where(eq27(users.openId, openId)).limit(1);
    if (existing.length > 0) {
      throw new TRPCError12({ code: "CONFLICT", message: "\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55" });
    }
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const role = openId === ENV.ownerOpenId ? "admin" : "user";
    const safeName = sanitizeInput(input.name, 50);
    const [insertResult] = await db.insert(users).values({
      openId,
      email: normalizedEmail,
      name: safeName,
      loginMethod: "email",
      passwordHash,
      role,
      deviceId,
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const newUserId = insertResult.insertId;
    if (newUserId) {
      await ensureInviteCode(db, newUserId, safeName).catch(() => {
      });
    }
    const sessionToken = await sdk.signSession(
      { openId, appId: ENV.appId, name: safeName },
      { expiresInMs: ONE_YEAR_MS }
    );
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    return { success: true, message: "\u6CE8\u518C\u6210\u529F", sessionToken };
  }),
  /** Login with email + password */
  login: publicProcedure.input(
    z16.object({
      email: z16.string().email("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740").max(320),
      password: z16.string().min(1, "\u8BF7\u8F93\u5165\u5BC6\u7801").max(128)
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    const normalizedEmail = input.email.toLowerCase().trim();
    const openId = emailOpenId(normalizedEmail);
    const now = Date.now();
    const ipKey = `ip:${clientIpOf(ctx.req)}`;
    const emailKey = `email:${normalizedEmail}`;
    if (isLoginLocked(ipKey, now) || isLoginLocked(emailKey, now)) {
      throw new TRPCError12({
        code: "TOO_MANY_REQUESTS",
        message: "\u767B\u5F55\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7 15 \u5206\u949F\u540E\u518D\u8BD5"
      });
    }
    const result = await db.select().from(users).where(eq27(users.openId, openId)).limit(1);
    const user = result[0];
    const invalidError = new TRPCError12({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
    if (!user || !user.passwordHash) {
      registerLoginFailure(ipKey, now);
      registerLoginFailure(emailKey, now);
      throw invalidError;
    }
    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      registerLoginFailure(ipKey, now);
      registerLoginFailure(emailKey, now);
      throw invalidError;
    }
    clearLoginFailures(ipKey, emailKey);
    await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq27(users.openId, openId));
    const sessionToken = await sdk.signSession(
      { openId, appId: ENV.appId, name: user.name || "" },
      { expiresInMs: ONE_YEAR_MS }
    );
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    return { success: true, message: "\u767B\u5F55\u6210\u529F", sessionToken };
  }),
  /**
   * Request a password reset — generates a secure token and returns the reset link.
   * Also notifies the project owner via the built-in notification channel.
   * In production, integrate a real email provider (Resend, SendGrid, etc.) here.
   */
  requestPasswordReset: publicProcedure.input(
    z16.object({
      email: z16.string().email("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740").max(320),
      /** Frontend origin (e.g. https://nexuschat.best) used to build the reset URL */
      origin: z16.string().url().max(200)
    })
  ).use(rateLimitWrite).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    const normalizedEmail = input.email.toLowerCase().trim();
    const now = Date.now();
    if (isWindowLocked(resetRequestAttempts, normalizedEmail, now, RESET_REQUEST_LIMIT)) {
      throw new TRPCError12({ code: "TOO_MANY_REQUESTS", message: "\u53D1\u9001\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" });
    }
    bumpWindow(resetRequestAttempts, normalizedEmail, now, RESET_REQUEST_WINDOW_MS);
    const openId = emailOpenId(normalizedEmail);
    const result = await db.select().from(users).where(eq27(users.openId, openId)).limit(1);
    const user = result[0];
    if (!user || !user.passwordHash) {
      return { success: true, message: "\u5982\u679C\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C\uFF0C\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001" };
    }
    const token = randomBytes2(48).toString("hex");
    const code = String(randomInt(1e5, 1e6));
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(
      and24(
        eq27(passwordResetTokens.userId, user.id),
        isNull4(passwordResetTokens.usedAt)
      )
    );
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });
    await db.insert(passwordResetTokens).values({ userId: user.id, token: otpToken(user.id, code), expiresAt });
    const resetUrl = `${ENV.publicOrigin}/reset-password?token=${token}`;
    const emailResult = await sendPasswordResetEmail({
      to: normalizedEmail,
      resetUrl,
      code,
      expiresInMinutes: 60
    });
    const emailSent = emailResult.success;
    notifyOwner({
      title: "\u6BD4\u7279AI\u793E\u4EA4 \u5BC6\u7801\u91CD\u7F6E\u8BF7\u6C42",
      content: `\u7528\u6237 ${normalizedEmail} \u8BF7\u6C42\u91CD\u7F6E\u5BC6\u7801\u3002
\u90AE\u4EF6\u53D1\u9001\uFF1A${emailSent ? "\u6210\u529F" : "\u5931\u8D25\uFF0C\u964D\u7EA7\u5C55\u793A\u94FE\u63A5"}`
    }).catch(() => {
    });
    return {
      success: true,
      message: emailSent ? "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\u5230\u60A8\u7684\u90AE\u7BB1" : "\u91CD\u7F6E\u94FE\u63A5\u5DF2\u751F\u6210",
      emailSent,
      resetUrl: emailSent ? void 0 : resetUrl
    };
  }),
  /** Verify a reset token is still valid (used for page load check) */
  verifyResetToken: publicProcedure.input(z16.object({ token: z16.string().max(200) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { valid: false };
    const result = await db.select().from(passwordResetTokens).where(
      and24(
        eq27(passwordResetTokens.token, input.token),
        isNull4(passwordResetTokens.usedAt),
        gt5(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
      )
    ).limit(1);
    return { valid: result.length > 0 };
  }),
  /** Reset password using a valid token */
  resetPassword: publicProcedure.input(
    z16.object({
      token: z16.string().max(200),
      newPassword: z16.string().min(8, "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D").max(128)
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    const tokenResult = await db.select().from(passwordResetTokens).where(
      and24(
        eq27(passwordResetTokens.token, input.token),
        isNull4(passwordResetTokens.usedAt),
        gt5(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
      )
    ).limit(1);
    const resetToken = tokenResult[0];
    if (!resetToken) {
      throw new TRPCError12({ code: "BAD_REQUEST", message: "\u91CD\u7F6E\u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u7533\u8BF7" });
    }
    const userResult = await db.select().from(users).where(eq27(users.id, resetToken.userId)).limit(1);
    const user = userResult[0];
    if (!user) {
      throw new TRPCError12({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    }
    const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    await Promise.all([
      db.update(users).set({ passwordHash: newPasswordHash }).where(eq27(users.id, user.id)),
      db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(
        and24(eq27(passwordResetTokens.userId, user.id), isNull4(passwordResetTokens.usedAt))
      )
    ]);
    const sessionToken = await sdk.signSession(
      { openId: user.openId, appId: ENV.appId, name: user.name || "" },
      { expiresInMs: ONE_YEAR_MS }
    );
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    return { success: true, message: "\u5BC6\u7801\u5DF2\u91CD\u7F6E\uFF0C\u6B63\u5728\u767B\u5F55...", sessionToken };
  }),
  /** App / 网页：用邮箱验证码重置密码（不必点邮件链接） */
  resetPasswordWithCode: publicProcedure.input(
    z16.object({
      email: z16.string().email("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740").max(320),
      code: z16.string().regex(/^\d{6}$/, "\u8BF7\u8F93\u5165 6 \u4F4D\u9A8C\u8BC1\u7801"),
      newPassword: z16.string().min(8, "\u5BC6\u7801\u81F3\u5C11 8 \u4F4D").max(128)
    })
  ).use(rateLimitWrite).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    const normalizedEmail = input.email.toLowerCase().trim();
    const now = Date.now();
    if (isWindowLocked(resetCodeAttempts, normalizedEmail, now, RESET_CODE_LIMIT)) {
      throw new TRPCError12({ code: "TOO_MANY_REQUESTS", message: "\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u6216\u91CD\u65B0\u83B7\u53D6\u9A8C\u8BC1\u7801" });
    }
    const invalidError = new TRPCError12({ code: "BAD_REQUEST", message: "\u9A8C\u8BC1\u7801\u9519\u8BEF\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6" });
    const openId = emailOpenId(normalizedEmail);
    const userResult = await db.select().from(users).where(eq27(users.openId, openId)).limit(1);
    const user = userResult[0];
    if (!user) {
      bumpWindow(resetCodeAttempts, normalizedEmail, now, LOGIN_ATTEMPT_WINDOW_MS);
      throw invalidError;
    }
    const tokenResult = await db.select().from(passwordResetTokens).where(
      and24(
        eq27(passwordResetTokens.token, otpToken(user.id, input.code)),
        eq27(passwordResetTokens.userId, user.id),
        isNull4(passwordResetTokens.usedAt),
        gt5(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
      )
    ).limit(1);
    const resetToken = tokenResult[0];
    if (!resetToken) {
      bumpWindow(resetCodeAttempts, normalizedEmail, now, LOGIN_ATTEMPT_WINDOW_MS);
      throw invalidError;
    }
    resetCodeAttempts.delete(normalizedEmail);
    const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    await Promise.all([
      db.update(users).set({ passwordHash: newPasswordHash }).where(eq27(users.id, user.id)),
      db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(
        and24(eq27(passwordResetTokens.userId, user.id), isNull4(passwordResetTokens.usedAt))
      )
    ]);
    const sessionToken = await sdk.signSession(
      { openId: user.openId, appId: ENV.appId, name: user.name || "" },
      { expiresInMs: ONE_YEAR_MS }
    );
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    return { success: true, message: "\u5BC6\u7801\u5DF2\u91CD\u7F6E", sessionToken };
  })
});

// server/routers/voice.ts
import { z as z17 } from "zod";
import { TRPCError as TRPCError13 } from "@trpc/server";

// server/_core/voiceTranscription.ts
init_env();
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/routers/voice.ts
init_storage();
var voiceRouter = router({
  /**
   * Upload audio blob (base64) to S3 and return URL
   * Frontend: record with MediaRecorder, convert to base64, call this
   */
  uploadAudio: protectedProcedure.input(z17.object({
    base64: z17.string().max(22e6),
    // ~16MB raw audio
    mimeType: z17.string().default("audio/webm"),
    durationSeconds: z17.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const buffer = Buffer.from(input.base64, "base64");
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > 16) {
      throw new TRPCError13({ code: "PAYLOAD_TOO_LARGE", message: "Audio file exceeds 16MB limit" });
    }
    const ext = input.mimeType.split("/")[1]?.split(";")[0] ?? "webm";
    const key = `voice-messages/${ctx.user.id}/${Date.now()}.${ext}`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    return { url, key, durationSeconds: input.durationSeconds ?? 0 };
  }),
  /**
   * Transcribe audio from URL using Whisper
   * Returns transcribed text to display in chat
   */
  transcribe: protectedProcedure.use(rateLimitStrict).input(z17.object({
    audioUrl: z17.string().url(),
    language: z17.string().optional()
  })).mutation(async ({ input }) => {
    const result = await transcribeAudio({
      audioUrl: input.audioUrl,
      language: input.language,
      prompt: "Transcribe the voice message in a chat application"
    });
    if ("error" in result) {
      throw new TRPCError13({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error
      });
    }
    return {
      text: result.text,
      language: result.language,
      duration: result.duration
    };
  })
});

// server/routers/voiceRoom.ts
import { z as z18 } from "zod";
import { TRPCError as TRPCError14 } from "@trpc/server";
init_db();
init_schema();
init_env();
import { eq as eq28, and as and25, desc as desc17, sql as sql16, gte as gte6 } from "drizzle-orm";

// server/_core/livekitToken.ts
import crypto2 from "crypto";
function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function genLiveKitToken(apiKey, apiSecret, grant) {
  const now = Math.floor(Date.now() / 1e3);
  const ttl = grant.ttlSeconds ?? 2 * 3600;
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: apiKey,
    sub: grant.identity,
    nbf: now,
    exp: now + ttl,
    jti: crypto2.randomUUID(),
    // 唯一随机(原来=userId 可预测且复用);每次签发不同,缩短被盗/复用窗口
    ...grant.name ? { name: grant.name } : {},
    video: {
      room: grant.room,
      roomJoin: true,
      canPublish: grant.canPublish,
      canSubscribe: true,
      canPublishData: true
    }
  };
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto2.createHmac("sha256", apiSecret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

// server/routers/voiceRoom.ts
init_membership();
init_token();
init_logger();

// server/_core/livekitService.ts
init_env();
import crypto3 from "crypto";
function b64url2(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function adminToken(room) {
  const now = Math.floor(Date.now() / 1e3);
  const h = b64url2(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url2(JSON.stringify({
    iss: ENV.livekitApiKey,
    sub: ENV.livekitApiKey,
    nbf: now,
    exp: now + 600,
    jti: `admin_${now}`,
    video: { room, roomAdmin: true }
  }));
  const s = b64url2(crypto3.createHmac("sha256", ENV.livekitApiSecret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${s}`;
}
function httpsHost() {
  return ENV.livekitUrl.replace(/^wss?:\/\//, "");
}
async function callRoomService(method, room, body) {
  const host = httpsHost();
  if (!host) throw new Error("LiveKit \u672A\u914D\u7F6E");
  const res = await fetch(`https://${host}/twirp/livekit.RoomService/${method}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken(room)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text2 = await res.text().catch(() => res.statusText);
    throw new Error(`LiveKit ${method} ${res.status}: ${text2}`);
  }
  return res.json().catch(() => ({}));
}
async function setParticipantCanPublish(room, identity, canPublish) {
  await callRoomService("UpdateParticipant", room, {
    room,
    identity,
    permission: { canPublish, canSubscribe: true, canPublishData: true }
  });
}
async function deleteRoom(room) {
  await callRoomService("DeleteRoom", room, { room });
}
async function listParticipantCount(room) {
  try {
    const res = await Promise.race([
      callRoomService("ListParticipants", room, { room }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2500))
    ]);
    const ps = res?.participants;
    return Array.isArray(ps) ? ps.length : 0;
  } catch {
    return null;
  }
}

// server/routers/voiceRoom.ts
var CATEGORIES = ["trade", "study", "project", "chat"];
var VOICE_ROOM_COST = 10;
function startOfMonth() {
  const d = /* @__PURE__ */ new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
async function roomsThisMonth(db, userId) {
  const [row] = await db.select({ cnt: sql16`count(*)` }).from(voiceRooms).where(and25(eq28(voiceRooms.hostUserId, userId), gte6(voiceRooms.createdAt, startOfMonth())));
  return Number(row?.cnt ?? 0);
}
var VOICE_GIFTS = [
  { key: "like", name: "\u70B9\u8D5E", emoji: "\u{1F44D}", ac: 5 },
  { key: "rose", name: "\u73AB\u7470", emoji: "\u{1F339}", ac: 10 },
  { key: "beer", name: "\u5564\u9152", emoji: "\u{1F37A}", ac: 20 },
  { key: "rocket", name: "\u706B\u7BAD", emoji: "\u{1F680}", ac: 100 },
  { key: "crown", name: "\u7687\u51A0", emoji: "\u{1F451}", ac: 300 },
  { key: "diamond", name: "\u94BB\u77F3", emoji: "\u{1F48E}", ac: 520 }
];
async function spendAC(db, userId, cost) {
  if (cost <= 0) return true;
  const res = await db.update(users).set({ npPoints: sql16`${users.npPoints} - ${cost}` }).where(and25(eq28(users.id, userId), sql16`${users.npPoints} >= ${cost}`));
  const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  return affected2 > 0;
}
function liveKitConfigured() {
  return ENV.livekitUrl.length > 0 && ENV.livekitApiKey.length > 0 && ENV.livekitApiSecret.length > 0;
}
function roomName(roomId) {
  return `voice_${roomId}`;
}
var MAX_SPEAKERS = 12;
var _lastGiftAt = /* @__PURE__ */ new Map();
var _onlineCache = /* @__PURE__ */ new Map();
async function realOnline(roomIdNum) {
  const c = _onlineCache.get(roomIdNum);
  const now = Date.now();
  if (c && now - c.at < 15e3) return c.n;
  const n2 = await listParticipantCount(`voice_${roomIdNum}`);
  if (n2 != null) _onlineCache.set(roomIdNum, { n: n2, at: now });
  return n2;
}
function signToken(userId, displayName, roomId, canPublish) {
  return genLiveKitToken(ENV.livekitApiKey, ENV.livekitApiSecret, {
    room: roomName(roomId),
    identity: String(userId),
    name: displayName,
    canPublish
  });
}
async function allocRoomId(db) {
  for (let i = 0; i < 8; i++) {
    const candidate = 1e5 + Math.floor(Math.random() * 9e8);
    const [exist] = await db.select({ id: voiceRooms.id }).from(voiceRooms).where(eq28(voiceRooms.roomId, candidate)).limit(1);
    if (!exist) return candidate;
  }
  throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u623F\u95F4\u53F7\u5206\u914D\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
}
var voiceRoomRouter = router({
  /** LiveKit 是否已配置（未配置时客户端提示「即将开放」，不报错） */
  config: protectedProcedure.query(() => ({ enabled: liveKitConfigured(), wsUrl: ENV.livekitUrl })),
  /** 进行中的语音房列表 */
  listRooms: protectedProcedure.input(z18.object({ category: z18.enum(["all", ...CATEGORIES]).default("all") }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const cat = input?.category ?? "all";
    const rows = await db.select({
      room: voiceRooms,
      hostName: users.name,
      hostUsername: users.username,
      hostAvatar: users.avatar
    }).from(voiceRooms).leftJoin(users, eq28(users.id, voiceRooms.hostUserId)).where(cat === "all" ? and25(eq28(voiceRooms.status, "live"), eq28(voiceRooms.isPublic, true)) : and25(eq28(voiceRooms.status, "live"), eq28(voiceRooms.isPublic, true), eq28(voiceRooms.category, cat))).orderBy(desc17(voiceRooms.listenerCount), desc17(voiceRooms.createdAt)).limit(50);
    const lkOn = liveKitConfigured();
    const mapped = await Promise.all(rows.map(async (r) => {
      const real = lkOn ? await realOnline(r.room.roomId) : null;
      const online = real != null ? real : r.room.listenerCount + 1;
      return {
        id: String(r.room.id),
        roomId: r.room.roomId,
        title: r.room.title,
        topic: r.room.topic ?? "",
        category: r.room.category,
        hostName: r.hostName ?? r.hostUsername ?? "\u4E3B\u64AD",
        hostAvatar: r.hostAvatar ?? null,
        listenerCount: online,
        speakerCount: r.room.speakerCount,
        isLive: true,
        isMembersOnly: r.room.isMembersOnly
      };
    }));
    mapped.sort((a, b) => b.listenerCount - a.listenerCount);
    return mapped;
  }),
  /** 创建语音房（自己为房主）。返回进房所需 sig。 */
  createRoom: protectedProcedure.use(rateLimitWrite).input(z18.object({
    title: z18.string().trim().min(1).max(60),
    topic: z18.string().trim().max(80).optional(),
    category: z18.enum(CATEGORIES).default("chat"),
    isMembersOnly: z18.boolean().default(false),
    isPublic: z18.boolean().default(true)
  })).mutation(async ({ ctx, input }) => {
    if (!liveKitConfigured()) throw new TRPCError14({ code: "PRECONDITION_FAILED", message: "\u8BED\u97F3\u623F\u5373\u5C06\u5F00\u653E\uFF0C\u656C\u8BF7\u671F\u5F85" });
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const benefits = await getBenefits(db, ctx.user.id);
    const used = await roomsThisMonth(db, ctx.user.id);
    let charged = false;
    if (used >= benefits.voiceRoomFreeMonthly) {
      const ok = await spendNN(db, ctx.user.id, VOICE_ROOM_COST, { type: "voice_room", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError14({ code: "FORBIDDEN", message: `AI \u4E0D\u8DB3\uFF1A\u672C\u6708\u514D\u8D39\u5F00\u623F\u5DF2\u7528\u5B8C\uFF0C\u5355\u6B21\u5F00\u623F\u9700 ${VOICE_ROOM_COST} AI\uFF0C\u6216\u5347\u7EA7\u4F1A\u5458\u83B7\u66F4\u591A\u514D\u8D39\u6B21\u6570` });
      charged = true;
    }
    let roomId;
    let row;
    try {
      roomId = await allocRoomId(db);
      await db.insert(voiceRooms).values({
        roomId,
        title: sanitizeInput(input.title),
        topic: input.topic ? sanitizeInput(input.topic) : null,
        category: input.category,
        hostUserId: ctx.user.id,
        isMembersOnly: input.isMembersOnly,
        isPublic: input.isPublic,
        status: "live",
        speakerCount: 1,
        listenerCount: 0
      });
      [row] = await db.select({ id: voiceRooms.id }).from(voiceRooms).where(eq28(voiceRooms.roomId, roomId)).limit(1);
    } catch (e) {
      if (charged) await grantNN(db, ctx.user.id, VOICE_ROOM_COST, { type: "voice_room", refType: "user", refId: ctx.user.id, memo: "refund:create_failed" });
      throw e;
    }
    const name = ctx.user.name ?? ctx.user.username ?? `\u7528\u6237${ctx.user.id}`;
    const token = signToken(
      ctx.user.id,
      name,
      roomId,
      /*canPublish*/
      true
    );
    return { id: String(row?.id ?? roomId), roomId, wsUrl: ENV.livekitUrl, roomName: roomName(roomId), token, role: "host", title: input.title, charged };
  }),
  /** 我的开房额度（供前端开房前展示「本月免费 X/Y」或「需 10 AI」） */
  roomQuota: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { freeMonthly: 0, used: 0, freeRemaining: 0, cost: VOICE_ROOM_COST };
    const benefits = await getBenefits(db, ctx.user.id);
    const used = await roomsThisMonth(db, ctx.user.id);
    const free = benefits.voiceRoomFreeMonthly;
    return { freeMonthly: free, used, freeRemaining: Math.max(0, free - used), cost: VOICE_ROOM_COST };
  }),
  /** 进入语音房：会员房做权限校验，返回进房 sig + 当前麦上信息。 */
  enterRoom: protectedProcedure.input(z18.object({ id: z18.string() })).mutation(async ({ ctx, input }) => {
    if (!liveKitConfigured()) throw new TRPCError14({ code: "PRECONDITION_FAILED", message: "\u8BED\u97F3\u623F\u5373\u5C06\u5F00\u653E\uFF0C\u656C\u8BF7\u671F\u5F85" });
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const rid = Number.parseInt(input.id, 10);
    const [room] = await db.select().from(voiceRooms).where(and25(eq28(voiceRooms.id, rid), eq28(voiceRooms.status, "live"))).limit(1);
    if (!room) throw new TRPCError14({ code: "NOT_FOUND", message: "\u8BE5\u8BED\u97F3\u623F\u5DF2\u7ED3\u675F" });
    const isHost = room.hostUserId === ctx.user.id;
    if (room.isMembersOnly && !isHost) {
      const benefits = await getBenefits(db, ctx.user.id);
      if (!benefits.badge) throw new TRPCError14({ code: "FORBIDDEN", message: "\u8BE5\u623F\u4E3A\u4F1A\u5458\u4E13\u5C5E\uFF0C\u5347\u7EA7 Plus/Pro \u540E\u53EF\u8FDB\u5165" });
    }
    if (!isHost) {
      await db.update(voiceRooms).set({ listenerCount: sql16`${voiceRooms.listenerCount} + 1` }).where(eq28(voiceRooms.id, rid));
    }
    const name = ctx.user.name ?? ctx.user.username ?? `\u7528\u6237${ctx.user.id}`;
    const token = signToken(
      ctx.user.id,
      name,
      room.roomId,
      /*canPublish*/
      isHost
    );
    return {
      id: String(room.id),
      roomId: room.roomId,
      wsUrl: ENV.livekitUrl,
      roomName: roomName(room.roomId),
      token,
      role: isHost ? "host" : "audience",
      hostId: room.hostUserId,
      // 客户端用它校验数据通道里 granted/revoked/roomEnded 是否真来自房主
      title: room.title,
      topic: room.topic ?? ""
    };
  }),
  /** 离开语音房（听众计数 -1） */
  leaveRoom: protectedProcedure.input(z18.object({ id: z18.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { ok: true };
    const rid = Number.parseInt(input.id, 10);
    const [room] = await db.select().from(voiceRooms).where(eq28(voiceRooms.id, rid)).limit(1);
    if (room && room.hostUserId !== ctx.user.id) {
      await db.update(voiceRooms).set({ listenerCount: sql16`GREATEST(${voiceRooms.listenerCount} - 1, 0)` }).where(eq28(voiceRooms.id, rid));
    }
    return { ok: true };
  }),
  /** 房主结束语音房 */
  endRoom: protectedProcedure.input(z18.object({ id: z18.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const rid = Number.parseInt(input.id, 10);
    const [room] = await db.select().from(voiceRooms).where(eq28(voiceRooms.id, rid)).limit(1);
    if (!room) return { ok: true };
    if (room.hostUserId !== ctx.user.id) throw new TRPCError14({ code: "FORBIDDEN", message: "\u53EA\u6709\u623F\u4E3B\u53EF\u4EE5\u7ED3\u675F\u8BED\u97F3\u623F" });
    await db.update(voiceRooms).set({ status: "ended", endedAt: /* @__PURE__ */ new Date() }).where(eq28(voiceRooms.id, rid));
    void deleteRoom(roomName(room.roomId)).catch((err) => logger_default.warn({ err }, "endRoom: LiveKit DeleteRoom \u5931\u8D25"));
    return { ok: true };
  }),
  /** 礼物目录（供前端礼物面板） */
  gifts: protectedProcedure.query(() => ({ gifts: VOICE_GIFTS })),
  /** 送礼：扣 AC，返回新余额。礼物动画由前端经数据通道广播给房间。 */
  sendGift: protectedProcedure.use(rateLimitWrite).input(z18.object({ id: z18.string(), giftKey: z18.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const lastGift = _lastGiftAt.get(ctx.user.id) ?? 0;
    const nowGift = Date.now();
    if (nowGift - lastGift < 600) throw new TRPCError14({ code: "TOO_MANY_REQUESTS", message: "\u9001\u793C\u592A\u5FEB\u4E86,\u6162\u4E00\u70B9~" });
    _lastGiftAt.set(ctx.user.id, nowGift);
    const gift = VOICE_GIFTS.find((g) => g.key === input.giftKey);
    if (!gift) throw new TRPCError14({ code: "BAD_REQUEST", message: "\u793C\u7269\u4E0D\u5B58\u5728" });
    const rid = Number.parseInt(input.id, 10);
    const [room] = await db.select({ id: voiceRooms.id }).from(voiceRooms).where(and25(eq28(voiceRooms.id, rid), eq28(voiceRooms.status, "live"))).limit(1);
    if (!room) throw new TRPCError14({ code: "NOT_FOUND", message: "\u8BE5\u8BED\u97F3\u623F\u5DF2\u7ED3\u675F" });
    const ok = await spendAC(db, ctx.user.id, gift.ac);
    if (!ok) throw new TRPCError14({ code: "FORBIDDEN", message: `IT \u4E0D\u8DB3\uFF0C\u9001\u51FA${gift.name}\u9700 ${gift.ac} IT` });
    const [u] = await db.select({ npPoints: users.npPoints }).from(users).where(eq28(users.id, ctx.user.id)).limit(1);
    return { ok: true, gift, acRemaining: u?.npPoints ?? 0 };
  }),
  /** 房主抱人上麦：把听众的 LiveKit canPublish 设为 true，实时生效。 */
  grantSpeak: protectedProcedure.input(z18.object({ id: z18.string(), targetUserId: z18.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const rid = Number.parseInt(input.id, 10);
    const [room] = await db.select().from(voiceRooms).where(and25(eq28(voiceRooms.id, rid), eq28(voiceRooms.status, "live"))).limit(1);
    if (!room) throw new TRPCError14({ code: "NOT_FOUND", message: "\u8BE5\u8BED\u97F3\u623F\u5DF2\u7ED3\u675F" });
    if (room.hostUserId !== ctx.user.id) throw new TRPCError14({ code: "FORBIDDEN", message: "\u53EA\u6709\u623F\u4E3B\u53EF\u4EE5\u9080\u8BF7\u4E0A\u9EA6" });
    if (input.targetUserId === room.hostUserId) return { ok: true };
    if (room.speakerCount >= MAX_SPEAKERS) throw new TRPCError14({ code: "BAD_REQUEST", message: `\u9EA6\u4F4D\u5DF2\u6EE1\uFF08\u4E0A\u9650 ${MAX_SPEAKERS}\uFF09` });
    await setParticipantCanPublish(`voice_${room.roomId}`, String(input.targetUserId), true);
    await db.update(voiceRooms).set({ speakerCount: sql16`LEAST(${voiceRooms.speakerCount} + 1, ${MAX_SPEAKERS})` }).where(eq28(voiceRooms.id, rid));
    return { ok: true };
  }),
  /** 房主请人下麦：canPublish=false。 */
  revokeSpeak: protectedProcedure.input(z18.object({ id: z18.string(), targetUserId: z18.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const rid = Number.parseInt(input.id, 10);
    const [room] = await db.select().from(voiceRooms).where(and25(eq28(voiceRooms.id, rid), eq28(voiceRooms.status, "live"))).limit(1);
    if (!room) throw new TRPCError14({ code: "NOT_FOUND", message: "\u8BE5\u8BED\u97F3\u623F\u5DF2\u7ED3\u675F" });
    if (room.hostUserId !== ctx.user.id) throw new TRPCError14({ code: "FORBIDDEN", message: "\u53EA\u6709\u623F\u4E3B\u53EF\u4EE5\u64CD\u4F5C" });
    if (input.targetUserId === room.hostUserId) throw new TRPCError14({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8BF7\u623F\u4E3B\u4E0B\u9EA6" });
    await setParticipantCanPublish(`voice_${room.roomId}`, String(input.targetUserId), false);
    await db.update(voiceRooms).set({ speakerCount: sql16`GREATEST(${voiceRooms.speakerCount} - 1, 1)` }).where(eq28(voiceRooms.id, rid));
    return { ok: true };
  })
});

// server/routers/ico.ts
import { z as z19 } from "zod";
import { TRPCError as TRPCError15 } from "@trpc/server";
init_db();
init_schema();
init_token();
import { eq as eq29, and as and26, desc as desc18, gt as gt6, asc as asc2, inArray as inArray8, sql as sql17, ne as ne4 } from "drizzle-orm";

// server/ico/pricing.ts
function priceAtFraction(c, x) {
  const xc = Math.min(1, Math.max(0, x));
  return c.startPrice + (c.endPrice - c.startPrice) * Math.pow(xc, c.exponent);
}
function priceAtSold(c, soldTokens) {
  return priceAtFraction(c, soldTokens / c.totalTokens);
}
function antideriv(c, x) {
  return c.startPrice * x + (c.endPrice - c.startPrice) * Math.pow(x, c.exponent + 1) / (c.exponent + 1);
}
function costForTokens(c, sold, buy) {
  if (buy <= 0) return 0;
  const x1 = sold / c.totalTokens;
  const x2 = (sold + buy) / c.totalTokens;
  return c.totalTokens * (antideriv(c, x2) - antideriv(c, x1));
}
function tokensForBudget(c, sold, budget) {
  const remaining = c.totalTokens - sold;
  if (remaining <= 0 || budget <= 0) return 0;
  if (costForTokens(c, sold, remaining) <= budget) return remaining;
  let lo = 0, hi = remaining;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (costForTokens(c, sold, mid) <= budget) lo = mid;
    else hi = mid;
  }
  return lo;
}
function quote(c, sold, buy) {
  const cost = costForTokens(c, sold, buy);
  return {
    cost,
    priceFrom: priceAtSold(c, sold),
    priceTo: priceAtSold(c, sold + buy),
    avgPrice: buy > 0 ? cost / buy : priceAtSold(c, sold)
  };
}

// server/ico/rewards.ts
function vestedFraction(elapsedMonths, vestMonths, cliffMonths) {
  if (elapsedMonths <= cliffMonths) return 0;
  if (elapsedMonths >= vestMonths) return 1;
  const p = (elapsedMonths - cliffMonths) / (vestMonths - cliffMonths);
  return Math.min(1, Math.max(0, p * p));
}
function effectiveApr(aprStart, aprEnd, declineDays, elapsedDays) {
  if (declineDays <= 0) return aprEnd;
  const f = Math.min(1, Math.max(0, elapsedDays / declineDays));
  return aprStart + (aprEnd - aprStart) * f;
}
function distributeAprLots(lots, aprStart, aprEnd, declineDays, remainingPool) {
  const active = lots.filter((l) => l.amount > 0);
  const lotReward = active.map((l) => l.amount * effectiveApr(aprStart, aprEnd, declineDays, l.ageDays) / 365);
  const uncapped = lotReward.reduce((a, b) => a + b, 0);
  const perUser = /* @__PURE__ */ new Map();
  if (active.length === 0 || uncapped <= 0 || remainingPool <= 0) {
    return { perUser, emitted: 0, uncapped, factor: 0 };
  }
  const factor = remainingPool >= uncapped ? 1 : remainingPool / uncapped;
  let emitted = 0;
  active.forEach((l, i) => {
    const r = lotReward[i] * factor;
    perUser.set(l.userId, (perUser.get(l.userId) ?? 0) + r);
    emitted += r;
  });
  return { perUser, emitted, uncapped, factor };
}

// server/ico/tiers.ts
var ICO_TIERS = [
  { level: 1, key: "seed", name: "\u79CD\u5B50\u5408\u4F19\u4EBA", badge: "\u79CD\u5B50", color: "#10B981", bonusPct: 0.03, minUsdt: 1e3, maxUsdt: 3e3, perks: [
    "\u8BA4\u8D2D\u4EE3\u5E01 +3% \u52A0\u6210",
    "Plus \u4F1A\u5458 1 \u4E2A\u6708",
    "AI \u670D\u52A1 9 \u6298",
    "\u8BED\u97F3\u623F\u5F00\u623F\u989D\u5EA6 +5/\u6708",
    "\u4E13\u5C5E\u300C\u79CD\u5B50\u5408\u4F19\u4EBA\u300D\u5FBD\u7AE0(\u804A\u5929/\u8D44\u6599\u9875\u5C55\u793A)",
    "\u79CD\u5B50\u5408\u4F19\u4EBA\u4E13\u5C5E\u793E\u533A\u7FA4"
  ] },
  { level: 2, key: "core", name: "\u6838\u5FC3\u5408\u4F19\u4EBA", badge: "\u6838\u5FC3", color: "#3B82F6", bonusPct: 0.06, minUsdt: 3e3, maxUsdt: 1e4, perks: [
    "\u8BA4\u8D2D\u4EE3\u5E01 +6% \u52A0\u6210",
    "Pro \u4F1A\u5458 3 \u4E2A\u6708",
    "AI \u670D\u52A1 8 \u6298 + \u89E3\u9501\u9AD8\u9636 AI \u6A21\u578B",
    "\u8BED\u97F3\u623F +20/\u6708 + \u667A\u80FD\u4F53\u9AD8\u7EA7\u529F\u80FD",
    "AI \u6295\u7814\u62A5\u544A\u8BBF\u95EE\u6743",
    "DAO \u6CBB\u7406\u7968\u6743 \xD71.5",
    "\u6838\u5FC3\u5408\u4F19\u4EBA\u7FA4(\u8D34\u8FD1\u56E2\u961F)"
  ] },
  { level: 3, key: "genesis", name: "\u521B\u4E16\u5408\u4F19\u4EBA", badge: "\u521B\u4E16", color: "#F0B95C", bonusPct: 0.12, minUsdt: 1e4, maxUsdt: null, perks: [
    "\u8BA4\u8D2D\u4EE3\u5E01 +12% \u52A0\u6210",
    "Pro \u4F1A\u5458 12 \u4E2A\u6708",
    "AI \u670D\u52A1 7 \u6298 + \u7B97\u529B\u62C9\u6EE1 + \u4F18\u5148\u7B97\u529B",
    "\u8BED\u97F3\u623F\u65E0\u9650\u5F00\u623F + \u5168\u90E8\u9AD8\u7EA7\u529F\u80FD",
    "AI \u6295\u7814 + 1\u5BF91 \u54A8\u8BE2",
    "DAO \u7968\u6743 \xD72 + \u63D0\u6848\u6743",
    "\u521B\u4E16\u79C1\u8463\u4F1A(\u56E2\u961F 1\u5BF91 + \u4EA7\u54C1\u5171\u5EFA)",
    "\u65B0\u529F\u80FD\u4F18\u5148\u5185\u6D4B \xB7 VIP \u5BA2\u670D \xB7 \u7EBF\u4E0B\u6D3B\u52A8 \xB7 \u751F\u6001\u5BF9\u63A5"
  ] }
];
function deriveIcoTier(subscribedUsdt) {
  let cur = null;
  for (const t3 of ICO_TIERS) if (subscribedUsdt >= t3.minUsdt) cur = t3;
  return cur;
}
function nextTierGap(subscribedUsdt) {
  for (const t3 of ICO_TIERS) {
    if (subscribedUsdt < t3.minUsdt) return { tier: t3, gap: t3.minUsdt - subscribedUsdt };
  }
  return null;
}

// server/ico/chainVerify.ts
init_token();
var RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";
var USDT_CONTRACT = (process.env.ICO_USDT_CONTRACT || "0x55d398326f99059fF775485246999027B3197955").toLowerCase();
var USDT_DECIMALS = Number(process.env.ICO_USDT_DECIMALS || 18);
var MIN_CONFIRMATIONS = Number(process.env.ICO_MIN_CONFIRMATIONS || 6);
var TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const j = await res.json();
  if (j.error) throw new Error(`RPC ${method}: ${j.error?.message ?? "error"}`);
  return j.result;
}
function topicToAddress(topic) {
  return ("0x" + topic.slice(-40)).toLowerCase();
}
async function verifyUsdtPayment(txHash, expectTo = USDT_DEPOSIT_ADDRESS) {
  if (!expectTo) return { ok: false, reason: "\u672A\u914D\u7F6E\u6536\u6B3E\u5730\u5740" };
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "\u4EA4\u6613\u54C8\u5E0C\u683C\u5F0F\u4E0D\u5BF9" };
  let receipt, head;
  try {
    [receipt, head] = await Promise.all([
      rpc("eth_getTransactionReceipt", [txHash]),
      rpc("eth_blockNumber", [])
    ]);
  } catch (e) {
    return { ok: false, pending: true, reason: "\u94FE\u4E0A\u67E5\u8BE2\u6682\u4E0D\u53EF\u7528,\u7A0D\u540E\u91CD\u8BD5" };
  }
  if (!receipt) return { ok: false, pending: true, reason: "\u4EA4\u6613\u5C1A\u672A\u4E0A\u94FE,\u8BF7\u7A0D\u5019" };
  if (receipt.status !== "0x1") return { ok: false, reason: "\u8BE5\u4EA4\u6613\u5931\u8D25(\u94FE\u4E0A status\u22601)" };
  const conf = Number(BigInt(head) - BigInt(receipt.blockNumber));
  if (conf < MIN_CONFIRMATIONS) return { ok: false, pending: true, reason: `\u786E\u8BA4\u4E2D(${conf}/${MIN_CONFIRMATIONS})` };
  const toLc = expectTo.toLowerCase();
  for (const log of receipt.logs ?? []) {
    if (String(log.address).toLowerCase() !== USDT_CONTRACT) continue;
    if (!log.topics || log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;
    if (topicToAddress(log.topics[2]) !== toLc) continue;
    const raw = BigInt(log.data);
    const div = BigInt("1" + "0".repeat(Math.max(0, USDT_DECIMALS - 6)));
    const amount = Number(raw / div) / 1e6;
    if (amount <= 0) continue;
    return { ok: true, amount, from: topicToAddress(log.topics[1]) };
  }
  return { ok: false, reason: "\u8BE5\u4EA4\u6613\u91CC\u6CA1\u6709\u8F6C\u7ED9\u6536\u6B3E\u5730\u5740\u7684 USDT" };
}

// server/routers/ico.ts
var n = (v) => Number(v ?? 0);
async function loadConfig(db) {
  const [c] = await db.select().from(icoConfig).where(eq29(icoConfig.id, 1)).limit(1);
  return c ?? null;
}
function curveOf(c) {
  return { totalTokens: n(c.totalTokens), startPrice: n(c.startPrice), endPrice: n(c.endPrice), exponent: n(c.exponent) };
}
async function vestedPrincipal(db, userId, c) {
  const rows = await db.select().from(icoPurchases).where(eq29(icoPurchases.userId, userId));
  let vested = 0;
  for (const p of rows) {
    const months = (Date.now() - new Date(p.createdAt).getTime()) / (30 * 24 * 3600 * 1e3);
    vested += n(p.tokensBought) * vestedFraction(months, n(c.vestMonths), n(c.vestCliffMonths));
  }
  return vested;
}
async function settleOrder(db, orderId, paidUsdt) {
  let result;
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(icoOrders).where(eq29(icoOrders.id, orderId)).for("update").limit(1);
    if (!o || o.status !== "pending") throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u4E0D\u5B58\u5728\u6216\u5DF2\u5904\u7406" });
    const [c] = await tx.select().from(icoConfig).where(eq29(icoConfig.id, 1)).for("update").limit(1);
    if (!c || c.status !== "active") throw new TRPCError15({ code: "PRECONDITION_FAILED", message: "ICO \u672A\u5728\u8FDB\u884C" });
    const curve = curveOf(c), sold = n(c.tokensSold);
    const usdt = paidUsdt != null ? paidUsdt : n(o.usdtAmount);
    const tokens = tokensForBudget(curve, sold, usdt);
    if (tokens <= 0) throw new TRPCError15({ code: "BAD_REQUEST", message: "\u989D\u5EA6\u5DF2\u552E\u7F44" });
    if (tokens + 1e-8 < n(o.minTokens)) throw new TRPCError15({ code: "BAD_REQUEST", message: "\u4EF7\u683C\u5DF2\u53D8\u52A8\u8D85\u51FA\u6ED1\u70B9\u4FDD\u62A4,\u8BF7\u7528\u6237\u91CD\u65B0\u4E0B\u5355" });
    if (n(c.perWalletCap) > 0) {
      const [acc0] = await tx.select({ locked: icoAccounts.lockedTotal }).from(icoAccounts).where(eq29(icoAccounts.userId, o.userId)).limit(1);
      if (n(acc0?.locked) + tokens > n(c.perWalletCap)) throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8D85\u8FC7\u5355\u94B1\u5305\u8BA4\u8D2D\u4E0A\u9650" });
    }
    const q = quote(curve, sold, tokens);
    const [{ prevUsdt }] = await tx.select({ prevUsdt: sql17`COALESCE(SUM(${icoPurchases.usdtAmount}),0)` }).from(icoPurchases).where(eq29(icoPurchases.userId, o.userId));
    const cumUsdt = n(prevUsdt) + usdt;
    const tier = deriveIcoTier(cumUsdt);
    const bonusPct = tier?.bonusPct ?? 0;
    const bonus = tokens * bonusPct;
    const credited = tokens + bonus;
    await tx.update(icoConfig).set({ tokensSold: sql17`${icoConfig.tokensSold} + ${tokens}` }).where(eq29(icoConfig.id, 1));
    const [pr] = await tx.insert(icoPurchases).values({
      userId: o.userId,
      usdtAmount: String(usdt),
      tokensBought: String(credited),
      priceFrom: String(q.priceFrom),
      priceTo: String(q.priceTo),
      avgPrice: String(credited > 0 ? usdt / credited : q.avgPrice)
    });
    const purchaseId = pr?.insertId ?? pr?.[0]?.insertId ?? null;
    await tx.insert(icoAccounts).values({
      userId: o.userId,
      lockedTotal: String(credited),
      stakedBalance: String(credited),
      firstPurchaseAt: /* @__PURE__ */ new Date()
    }).onDuplicateKeyUpdate({ set: {
      lockedTotal: sql17`${icoAccounts.lockedTotal} + ${credited}`,
      stakedBalance: sql17`${icoAccounts.stakedBalance} + ${credited}`
    } });
    await tx.insert(icoStakeLots).values({ userId: o.userId, amount: String(credited), stakedAt: /* @__PURE__ */ new Date(), source: "purchase" });
    if (tier) await tx.update(users).set({ icoTier: tier.level }).where(eq29(users.id, o.userId));
    await tx.update(icoOrders).set({ status: "confirmed", purchaseId, confirmedAt: /* @__PURE__ */ new Date() }).where(eq29(icoOrders.id, o.id));
    result = { ok: true, tokens: credited, baseTokens: tokens, bonus, bonusPct, tierLevel: tier?.level ?? 0, avgPrice: q.avgPrice };
  });
  return result;
}
async function verifyAndSettle(db, order) {
  if (!order.txHash) return { settled: false, pending: true, reason: "\u672A\u586B\u4EA4\u6613\u54C8\u5E0C" };
  const v = await verifyUsdtPayment(order.txHash);
  if (v.pending) return { settled: false, pending: true, reason: v.reason };
  if (!v.ok) return { settled: false, pending: false, reason: v.reason };
  try {
    const r = await settleOrder(db, order.id, v.amount);
    return { settled: true, pending: false, amount: v.amount, tokens: r.tokens, tierLevel: r.tierLevel };
  } catch (e) {
    const msg = e?.message || "\u6210\u4EA4\u5931\u8D25";
    if (/已处理|已确认/.test(msg)) return { settled: true, pending: false };
    return { settled: false, pending: false, reason: msg };
  }
}
async function settleIcoRewards(date) {
  const db = await getDb();
  if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
  const [cfg0] = await db.select({ id: icoConfig.id }).from(icoConfig).where(eq29(icoConfig.id, 1)).limit(1);
  if (!cfg0) return { ok: true, skipped: true };
  const [exist0] = await db.select({ id: icoRewardRuns.id }).from(icoRewardRuns).where(eq29(icoRewardRuns.runDate, date)).limit(1);
  if (exist0) return { ok: true, skipped: true };
  try {
    let out = null;
    await db.transaction(async (tx) => {
      const [c] = await tx.select().from(icoConfig).where(eq29(icoConfig.id, 1)).for("update").limit(1);
      if (!c) return;
      const [exist] = await tx.select({ id: icoRewardRuns.id }).from(icoRewardRuns).where(eq29(icoRewardRuns.runDate, date)).limit(1);
      if (exist) return;
      const pool = n(c.rewardPoolTotal), emittedSoFar = n(c.rewardEmitted);
      const remaining = Math.max(0, pool - emittedSoFar);
      const now = Date.now();
      const lotRows = await tx.select().from(icoStakeLots).where(gt6(icoStakeLots.amount, "0"));
      const lots = lotRows.map((l) => ({
        userId: l.userId,
        amount: n(l.amount),
        ageDays: (now - new Date(l.stakedAt).getTime()) / 864e5
      }));
      const { perUser, emitted, uncapped, factor } = distributeAprLots(lots, n(c.aprStart), n(c.aprEnd), n(c.aprDeclineDays), remaining);
      const accs = await tx.select().from(icoAccounts);
      for (const [userId, reward] of Array.from(perUser.entries())) {
        if (reward <= 0) continue;
        const acc = accs.find((a) => a.userId === userId);
        if (acc.autoCompound) {
          await tx.update(icoAccounts).set({ stakedBalance: sql17`${icoAccounts.stakedBalance} + ${reward}` }).where(eq29(icoAccounts.userId, userId));
          await tx.insert(icoStakeLots).values({ userId, amount: String(reward), stakedAt: /* @__PURE__ */ new Date(), source: "compound" });
        } else {
          await tx.update(icoAccounts).set({ pendingReward: sql17`${icoAccounts.pendingReward} + ${reward}` }).where(eq29(icoAccounts.userId, userId));
        }
      }
      await tx.update(icoConfig).set({ rewardEmitted: sql17`${icoConfig.rewardEmitted} + ${emitted}` }).where(eq29(icoConfig.id, 1));
      await tx.insert(icoRewardRuns).values({ runDate: date, stakers: perUser.size, totalWeight: String(uncapped), emitted: String(emitted) });
      out = { ok: true, skipped: false, emitted, stakers: perUser.size, factor, poolLeft: Math.max(0, remaining - emitted) };
    });
    return out ?? { ok: true, skipped: true };
  } catch (e) {
    const msg = String(e?.message ?? e?.cause?.message ?? "");
    if (e?.code === "ER_DUP_ENTRY" || e?.errno === 1062 || /duplicate/i.test(msg)) return { ok: true, skipped: true };
    throw e;
  }
}
var icoRouter = router({
  /** 公开:曲线状态 + 进度 + 上线价 + 充值地址 */
  config: protectedProcedure.query(async () => {
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!c) return { enabled: false };
    const sold = n(c.tokensSold), total = n(c.totalTokens);
    return {
      enabled: c.status === "active",
      status: c.status,
      totalTokens: total,
      tokensSold: sold,
      soldPct: total > 0 ? sold / total : 0,
      startPrice: n(c.startPrice),
      endPrice: n(c.endPrice),
      exponent: n(c.exponent),
      listingPrice: n(c.listingPrice),
      currentPrice: priceAtSold(curveOf(c), sold),
      raisedUsdt: costForTokens(curveOf(c), 0, sold),
      perWalletCap: n(c.perWalletCap),
      vestMonths: n(c.vestMonths),
      vestCliffMonths: n(c.vestCliffMonths),
      targetApr: n(c.aprStart),
      // 新资金起始年化(每笔从入场起按此起步)
      aprStart: n(c.aprStart),
      aprEnd: n(c.aprEnd),
      aprDeclineDays: n(c.aprDeclineDays),
      tiers: ICO_TIERS,
      // 认购档位/徽章定义(给前端展示)
      payAddress: USDT_DEPOSIT_ADDRESS,
      payChain: USDT_CHAIN
    };
  }),
  /** 批量取用户的合伙人等级(聊天/成员列表挂徽章用,只返回有等级的)。 */
  tiersByUsers: protectedProcedure.input(z19.object({ userIds: z19.array(z19.number().int()).max(200) })).query(async ({ input }) => {
    const out = {};
    if (!input.userIds.length) return out;
    const db = await getDb();
    if (!db) return out;
    const rows = await db.select({ id: users.id, t: users.icoTier }).from(users).where(and26(inArray8(users.id, input.userIds), gt6(users.icoTier, 0)));
    for (const r of rows) out[r.id] = r.t;
    return out;
  }),
  /** 报价:给定 USDT,按当前曲线能买多少枚 + 均价 + 成交后新价 */
  quote: protectedProcedure.input(z19.object({ usdtAmount: z19.number().positive() })).query(async ({ input }) => {
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!c || c.status !== "active") return { tokens: 0, avgPrice: 0, priceFrom: 0, priceTo: 0 };
    const curve = curveOf(c), sold = n(c.tokensSold);
    const tokens = tokensForBudget(curve, sold, input.usdtAmount);
    const q = quote(curve, sold, tokens);
    return { tokens, avgPrice: q.avgPrice, priceFrom: q.priceFrom, priceTo: q.priceTo };
  }),
  /** 下单:锁定意向(USDT + 滑点最低枚数),返回充值地址 */
  createOrder: protectedProcedure.input(z19.object({ usdtAmount: z19.number().positive().max(1e7), minTokens: z19.number().min(0).default(0) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const c = await loadConfig(db);
    if (!c || c.status !== "active") throw new TRPCError15({ code: "PRECONDITION_FAILED", message: "\u8BA4\u8D2D\u672A\u5F00\u59CB\u6216\u5DF2\u7ED3\u675F" });
    const [res] = await db.insert(icoOrders).values({
      userId: ctx.user.id,
      usdtAmount: String(input.usdtAmount),
      minTokens: String(input.minTokens),
      payAddress: USDT_DEPOSIT_ADDRESS || null,
      status: "pending"
    });
    return { orderId: res?.insertId ?? res?.[0]?.insertId, payAddress: USDT_DEPOSIT_ADDRESS, payChain: USDT_CHAIN, usdtAmount: input.usdtAmount };
  }),
  /** 提交链上转账哈希 */
  submitTx: protectedProcedure.input(z19.object({ orderId: z19.number(), txHash: z19.string().min(6).max(120) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const txHash = sanitizeInput(input.txHash, 120);
    const [o] = await db.select().from(icoOrders).where(and26(eq29(icoOrders.id, input.orderId), eq29(icoOrders.userId, ctx.user.id))).limit(1);
    if (!o || o.status !== "pending") throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u4E0D\u5B58\u5728\u6216\u5DF2\u5904\u7406" });
    const [dup] = await db.select({ id: icoOrders.id }).from(icoOrders).where(and26(eq29(icoOrders.txHash, txHash), ne4(icoOrders.id, o.id))).limit(1);
    if (dup) throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u7528\u4E8E\u5176\u5B83\u8BA2\u5355,\u8BF7\u52FF\u91CD\u590D" });
    const [depDup] = await db.select({ id: usdtDeposits.id }).from(usdtDeposits).where(eq29(usdtDeposits.txHash, txHash)).limit(1);
    if (depDup) throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u7528\u4E8E\u94B1\u5305\u5145\u503C,\u8BF7\u52FF\u91CD\u590D" });
    try {
      await db.update(icoOrders).set({ txHash }).where(eq29(icoOrders.id, input.orderId));
    } catch {
      throw new TRPCError15({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u7528\u4E8E\u5176\u5B83\u8BA2\u5355,\u8BF7\u52FF\u91CD\u590D" });
    }
    return verifyAndSettle(db, { id: o.id, txHash });
  }),
  /** 轮询:重新核验一张已填哈希的 pending 订单(确认中→确认后自动到账) */
  verifyPayment: protectedProcedure.input(z19.object({ orderId: z19.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [o] = await db.select().from(icoOrders).where(and26(eq29(icoOrders.id, input.orderId), eq29(icoOrders.userId, ctx.user.id))).limit(1);
    if (!o) throw new TRPCError15({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status === "confirmed") return { settled: true, pending: false };
    if (o.status !== "pending" || !o.txHash) return { settled: false, pending: false, reason: "\u65E0\u5F85\u6838\u9A8C\u4ED8\u6B3E" };
    return verifyAndSettle(db, { id: o.id, txHash: o.txHash });
  }),
  /** 我的订单 */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(icoOrders).where(eq29(icoOrders.userId, ctx.user.id)).orderBy(desc18(icoOrders.createdAt)).limit(50);
    return rows.map((o) => ({ id: o.id, usdtAmount: n(o.usdtAmount), status: o.status, txHash: o.txHash, createdAt: o.createdAt }));
  }),
  /** 我的 ICO 账户:锁仓/已释放/可提/质押中/待领收益 + 释放进度参数 */
  myAccount: protectedProcedure.query(async ({ ctx }) => {
    const empty = { lockedTotal: 0, vested: 0, vestedPct: 0, withdrawable: 0, withdrawn: 0, staked: 0, pendingReward: 0, claimedReward: 0, autoCompound: true, vestMonths: 12, vestCliffMonths: 1, monthsElapsed: 0, firstPurchaseAt: null, currentApr: 0, aprStart: 0, aprEnd: 0, subscribedUsdt: 0, tier: null, nextTier: null };
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!db || !c) return empty;
    const [acc] = await db.select().from(icoAccounts).where(eq29(icoAccounts.userId, ctx.user.id)).limit(1);
    if (!acc) return { ...empty, vestMonths: n(c.vestMonths), vestCliffMonths: n(c.vestCliffMonths), aprStart: n(c.aprStart), aprEnd: n(c.aprEnd) };
    const vested = await vestedPrincipal(db, ctx.user.id, c);
    const withdrawn = n(acc.withdrawnPrincipal);
    const locked = n(acc.lockedTotal);
    const first = acc.firstPurchaseAt ? new Date(acc.firstPurchaseAt) : null;
    const monthsElapsed = first ? (Date.now() - first.getTime()) / (30 * 24 * 3600 * 1e3) : 0;
    const myLots = await db.select().from(icoStakeLots).where(and26(eq29(icoStakeLots.userId, ctx.user.id), gt6(icoStakeLots.amount, "0")));
    let wsum = 0, asum = 0;
    const now2 = Date.now();
    for (const l of myLots) {
      const amt = n(l.amount), age = (now2 - new Date(l.stakedAt).getTime()) / 864e5;
      wsum += amt * effectiveApr(n(c.aprStart), n(c.aprEnd), n(c.aprDeclineDays), age);
      asum += amt;
    }
    const currentApr = asum > 0 ? wsum / asum : n(c.aprStart);
    const [{ usdt }] = await db.select({ usdt: sql17`COALESCE(SUM(${icoPurchases.usdtAmount}),0)` }).from(icoPurchases).where(eq29(icoPurchases.userId, ctx.user.id));
    const subscribedUsdt = n(usdt);
    const t3 = deriveIcoTier(subscribedUsdt);
    const ng = nextTierGap(subscribedUsdt);
    return {
      currentApr,
      aprStart: n(c.aprStart),
      aprEnd: n(c.aprEnd),
      subscribedUsdt,
      tier: t3 ? { level: t3.level, key: t3.key, name: t3.name, badge: t3.badge, color: t3.color, bonusPct: t3.bonusPct } : null,
      nextTier: ng ? { name: ng.tier.name, gap: ng.gap } : null,
      lockedTotal: locked,
      vested,
      vestedPct: locked > 0 ? vested / locked : 0,
      withdrawable: Math.max(0, vested - withdrawn),
      withdrawn,
      staked: n(acc.stakedBalance),
      pendingReward: n(acc.pendingReward),
      claimedReward: n(acc.claimedReward),
      autoCompound: !!acc.autoCompound,
      vestMonths: n(c.vestMonths),
      vestCliffMonths: n(c.vestCliffMonths),
      monthsElapsed,
      firstPurchaseAt: first ? first.toISOString() : null
    };
  }),
  /** 提取已释放本金(进 AI 余额) */
  withdraw: protectedProcedure.input(z19.object({ amount: z19.number().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const c = db ? await loadConfig(db) : null;
    if (!db || !c) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(icoAccounts).where(eq29(icoAccounts.userId, ctx.user.id)).for("update").limit(1);
      if (!acc) throw new TRPCError15({ code: "BAD_REQUEST", message: "\u65E0\u8BA4\u8D2D\u8BB0\u5F55" });
      const vested = await vestedPrincipal(tx, ctx.user.id, c);
      const withdrawable = Math.max(0, vested - n(acc.withdrawnPrincipal));
      if (input.amount > withdrawable + 1e-8) throw new TRPCError15({ code: "BAD_REQUEST", message: `\u53EF\u63D0\u4F59\u989D\u4E0D\u8DB3,\u5F53\u524D\u53EF\u63D0 ${withdrawable.toFixed(4)}` });
      await tx.update(icoAccounts).set({
        withdrawnPrincipal: sql17`${icoAccounts.withdrawnPrincipal} + ${input.amount}`,
        stakedBalance: sql17`GREATEST(${icoAccounts.stakedBalance} - ${input.amount}, 0)`
      }).where(eq29(icoAccounts.userId, ctx.user.id));
      let toReduce = input.amount;
      const lots = await tx.select().from(icoStakeLots).where(and26(eq29(icoStakeLots.userId, ctx.user.id), gt6(icoStakeLots.amount, "0"))).orderBy(asc2(icoStakeLots.stakedAt));
      for (const lot of lots) {
        if (toReduce <= 1e-9) break;
        const amt = n(lot.amount), cut = Math.min(amt, toReduce);
        await tx.update(icoStakeLots).set({ amount: String(amt - cut) }).where(eq29(icoStakeLots.id, lot.id));
        toReduce -= cut;
      }
      const ok = await grantNN(tx, ctx.user.id, input.amount, { type: "ico_withdraw", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u53D1\u653E\u5931\u8D25,\u8BF7\u7A0D\u540E\u518D\u8BD5" });
    });
    return { ok: true, withdrawn: input.amount };
  }),
  /** 领取质押收益(进 AI 余额) */
  claimRewards: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    let claimed = 0;
    await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(icoAccounts).where(eq29(icoAccounts.userId, ctx.user.id)).for("update").limit(1);
      const pending = n(acc?.pendingReward);
      if (pending <= 0) return;
      await tx.update(icoAccounts).set({
        pendingReward: "0",
        claimedReward: sql17`${icoAccounts.claimedReward} + ${pending}`
      }).where(eq29(icoAccounts.userId, ctx.user.id));
      const ok = await grantNN(tx, ctx.user.id, pending, { type: "ico_reward", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u53D1\u653E\u5931\u8D25" });
      claimed = pending;
    });
    return { ok: true, claimed };
  }),
  /** 开关:释放本金不提则自动复投 */
  setAutoCompound: protectedProcedure.input(z19.object({ on: z19.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    await db.insert(icoAccounts).values({ userId: ctx.user.id, autoCompound: input.on }).onDuplicateKeyUpdate({ set: { autoCompound: input.on } });
    return { ok: true };
  }),
  // ─── 管理员 ───────────────────────────────────────────────────────────────
  /** 当前配置原始值(给管理员表单回填) + 概览 */
  adminGetConfig: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { config: null, raised: 0, rewardEmitted: 0 };
    const c = await loadConfig(db);
    if (!c) return { config: null, raised: 0, rewardEmitted: 0 };
    return {
      config: {
        totalTokens: n(c.totalTokens),
        tokensSold: n(c.tokensSold),
        startPrice: n(c.startPrice),
        endPrice: n(c.endPrice),
        exponent: n(c.exponent),
        listingPrice: n(c.listingPrice),
        perWalletCap: n(c.perWalletCap),
        rewardPoolTotal: n(c.rewardPoolTotal),
        aprStart: n(c.aprStart),
        aprEnd: n(c.aprEnd),
        aprDeclineDays: n(c.aprDeclineDays),
        vestMonths: n(c.vestMonths),
        vestCliffMonths: n(c.vestCliffMonths),
        status: c.status
      },
      raised: costForTokens(curveOf(c), 0, n(c.tokensSold)),
      rewardEmitted: n(c.rewardEmitted)
    };
  }),
  /** 待确认订单(给管理员审核) */
  adminListOrders: adminProcedure.input(z19.object({ status: z19.enum(["pending", "confirmed", "cancelled", "all"]).default("pending") }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const st = input?.status ?? "pending";
    const rows = await db.select({ o: icoOrders, name: users.name, username: users.username }).from(icoOrders).leftJoin(users, eq29(users.id, icoOrders.userId)).where(st === "all" ? sql17`1=1` : eq29(icoOrders.status, st)).orderBy(desc18(icoOrders.createdAt)).limit(100);
    return rows.map((r) => ({
      id: r.o.id,
      userId: r.o.userId,
      userName: r.name ?? r.username ?? `\u7528\u6237${r.o.userId}`,
      usdtAmount: n(r.o.usdtAmount),
      minTokens: n(r.o.minTokens),
      txHash: r.o.txHash,
      status: r.o.status,
      createdAt: r.o.createdAt
    }));
  }),
  /** 配置/开关 ICO */
  adminSetConfig: adminProcedure.input(z19.object({
    totalTokens: z19.number().positive(),
    startPrice: z19.number().positive(),
    endPrice: z19.number().positive(),
    exponent: z19.number().min(1).max(3).default(1.5),
    listingPrice: z19.number().min(0).default(3),
    perWalletCap: z19.number().min(0).default(0),
    rewardPoolTotal: z19.number().min(0).default(0),
    aprStart: z19.number().min(0).max(100).default(1),
    // 起始年化(1=100%)
    aprEnd: z19.number().min(0).max(100).default(1),
    // 结束年化(线性降到此值)
    aprDeclineDays: z19.number().int().min(1).default(365),
    // 递减天数
    vestMonths: z19.number().int().min(1).default(12),
    vestCliffMonths: z19.number().int().min(0).default(1),
    status: z19.enum(["paused", "active", "ended"]).default("paused")
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const vals = {
      id: 1,
      totalTokens: String(input.totalTokens),
      startPrice: String(input.startPrice),
      endPrice: String(input.endPrice),
      exponent: String(input.exponent),
      listingPrice: String(input.listingPrice),
      perWalletCap: String(input.perWalletCap),
      rewardPoolTotal: String(input.rewardPoolTotal),
      aprStart: String(input.aprStart),
      aprEnd: String(input.aprEnd),
      aprDeclineDays: input.aprDeclineDays,
      vestMonths: input.vestMonths,
      vestCliffMonths: input.vestCliffMonths,
      status: input.status
    };
    const { id: _id, ...upd } = vals;
    await db.insert(icoConfig).values(vals).onDuplicateKeyUpdate({ set: upd });
    return { ok: true };
  }),
  /** 确认订单 → 按当前曲线成交、锁仓进质押(含滑点+单钱包上限校验) */
  adminConfirmOrder: adminProcedure.input(z19.object({ orderId: z19.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    return settleOrder(db, input.orderId);
  }),
  /** 取消订单 */
  adminCancelOrder: adminProcedure.input(z19.object({ orderId: z19.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    await db.update(icoOrders).set({ status: "cancelled" }).where(and26(eq29(icoOrders.id, input.orderId), eq29(icoOrders.status, "pending")));
    return { ok: true };
  }),
  /** 每日质押收益结算(幂等,按 runDate)。每笔批次各自计龄取年化 + 奖励池封顶 + 线性,自动复投/挂待领。 */
  adminRunRewards: adminProcedure.input(z19.object({ date: z19.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).mutation(async ({ input }) => settleIcoRewards(input.date))
});

// server/routers/appVersion.ts
init_db();
init_schema();
import { z as z20 } from "zod";
import { eq as eq30 } from "drizzle-orm";
init_env();
import { TRPCError as TRPCError16 } from "@trpc/server";

// server/utils/androidApkSource.ts
init_env();
var LOOP_PATHS = /* @__PURE__ */ new Set(["/apk", "/download", "/download/apk"]);
function isOwnDownloadLoop(url, publicOrigin = ENV.publicOrigin) {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    const origin = new URL(publicOrigin);
    const target = new URL(raw, origin);
    const path5 = target.pathname.replace(/\/+$/, "") || "/";
    return target.origin === origin.origin && LOOP_PATHS.has(path5);
  } catch {
    return true;
  }
}
function isExpoBuildPageUrl(url) {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (!/(^|\.)expo\.dev$/i.test(u.hostname)) return false;
    if (/\/artifacts\/eas\//i.test(u.pathname) && /\.apk$/i.test(u.pathname)) return false;
    return /\/builds\//i.test(u.pathname) || !/\/artifacts\//i.test(u.pathname);
  } catch {
    return false;
  }
}
function assertAndroidApkSource(url) {
  const raw = url?.trim();
  if (!raw) return null;
  if (isOwnDownloadLoop(raw)) {
    return "Android \u4E0B\u8F7D\u5730\u5740\u5FC5\u987B\u662F APK \u6587\u4EF6\u6E90\uFF0C\u4E0D\u80FD\u586B\u5199\u672C\u7AD9 /apk \u6216 /download";
  }
  if (isExpoBuildPageUrl(raw)) {
    return "\u8BF7\u586B\u5199 APK \u76F4\u94FE\uFF08\u2026/artifacts/eas/xxx.apk\uFF09\uFF0C\u4E0D\u8981\u586B\u6784\u5EFA\u8BE6\u60C5\u9875\uFF08\u2026/builds/\u2026\uFF09";
  }
  return null;
}
function resolveAndroidApkSource(url, publicOrigin = ENV.publicOrigin, fallbackUrl = ENV.androidApkFallbackUrl) {
  const raw = url?.trim() ?? "";
  if (!raw || isOwnDownloadLoop(raw, publicOrigin)) {
    return { url: fallbackUrl, usedFallback: true };
  }
  return { url: raw, usedFallback: false };
}
function getAndroidApkDirectUrl(url, publicOrigin = ENV.publicOrigin, fallbackUrl = ENV.androidApkFallbackUrl) {
  const source = resolveAndroidApkSource(
    url,
    publicOrigin,
    fallbackUrl
  ).url;
  return /^https?:\/\//i.test(source) ? source : "";
}

// server/routers/appVersion.ts
init_appAdmin();
var CURRENT_APP_VERSION = "1.9.2";
function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
var appVersionRouter = router({
  /**
   * Public: Check if the current app version needs an update.
   * Called on app startup and from Settings page.
   */
  checkVersion: publicProcedure.input(
    z20.object({
      currentVersion: z20.string().max(20).default(CURRENT_APP_VERSION),
      platform: z20.enum(["android", "ios", "web"]).default("web")
    })
  ).query(async ({ input, ctx }) => {
    const db = await getDb();
    const defaultConfig = {
      latestVersion: CURRENT_APP_VERSION,
      minVersion: CURRENT_APP_VERSION,
      downloadUrlAndroid: ENV.androidApkFallbackUrl,
      downloadUrlIos: "https://nexuschat.best/download",
      downloadUrlWeb: "https://nexuschat.best/download",
      releaseNotes: "\u521D\u59CB\u7248\u672C",
      isForceUpdate: false
    };
    let config = defaultConfig;
    if (db) {
      const rows = await db.select().from(appConfig).where(eq30(appConfig.platform, "all")).limit(1);
      if (rows.length > 0) {
        const notes = rows[0].releaseNotes ?? "";
        config = {
          latestVersion: rows[0].latestVersion || CURRENT_APP_VERSION,
          minVersion: rows[0].minVersion,
          downloadUrlAndroid: rows[0].downloadUrlAndroid ?? defaultConfig.downloadUrlAndroid,
          downloadUrlIos: rows[0].downloadUrlIos ?? defaultConfig.downloadUrlIos,
          downloadUrlWeb: rows[0].downloadUrlWeb ?? defaultConfig.downloadUrlWeb,
          releaseNotes: /v1\.9\.0/.test(notes) ? `\u{1F389} v${CURRENT_APP_VERSION} \u7248\u672C\u66F4\u65B0

\u2022 \u627E\u56DE\u5BC6\u7801\u53EF\u5728 App \u5185\u586B\u5199\u90AE\u7BB1\u9A8C\u8BC1\u7801
\u2022 \u9080\u8BF7\u4E0E\u5B98\u7F51\u53E3\u5F84\uFF1A\u6BD4\u7279AI\u793E\u4EA4 \xB7 \u6FB3\u6D32 AFT
\u2022 \u731C\u6DA8\u8DCC\u4E0D\u9650\u6BCF\u65E5\u6B21\u6570
\u2022 \u79EF\u5206 IT / \u4EE3\u5E01 BIT \u540D\u79F0\u7EDF\u4E00` : notes,
          isForceUpdate: rows[0].isForceUpdate
        };
      }
    }
    const isForceUpdate = compareSemver(input.currentVersion, config.minVersion) < 0;
    const hasUpdate = compareSemver(input.currentVersion, config.latestVersion) < 0;
    let downloadUrl;
    if (input.platform === "ios") {
      downloadUrl = config.downloadUrlIos;
    } else if (input.platform === "web") {
      downloadUrl = config.downloadUrlWeb;
    } else {
      downloadUrl = `${ENV.publicOrigin}/apk?v=${encodeURIComponent(config.latestVersion || "")}`;
    }
    const directUrl = getAndroidApkDirectUrl(config.downloadUrlAndroid);
    return {
      currentVersion: input.currentVersion,
      latestVersion: config.latestVersion,
      minVersion: config.minVersion,
      hasUpdate,
      isForceUpdate: isForceUpdate || config.isForceUpdate,
      platform: input.platform,
      downloadUrl,
      directUrl,
      releaseNotes: config.releaseNotes
    };
  }),
  /**
   * Admin: Update the version config (latest/min version, download URLs, etc.)
   */
  updateConfig: protectedProcedure.input(
    z20.object({
      latestVersion: z20.string().max(20),
      minVersion: z20.string().max(20),
      downloadUrlAndroid: z20.string().url().max(500).optional(),
      downloadUrlIos: z20.string().url().max(500).optional(),
      downloadUrlWeb: z20.string().url().max(500).optional(),
      releaseNotes: z20.string().max(2e3).optional(),
      isForceUpdate: z20.boolean().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    if (!isAppAdmin(ctx.user)) {
      throw new TRPCError16({ code: "FORBIDDEN", message: "Admin only" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const apkErr = assertAndroidApkSource(input.downloadUrlAndroid);
    if (apkErr) {
      throw new TRPCError16({ code: "BAD_REQUEST", message: apkErr });
    }
    const existing = await db.select().from(appConfig).where(eq30(appConfig.platform, "all")).limit(1);
    if (existing.length > 0) {
      await db.update(appConfig).set({
        latestVersion: input.latestVersion,
        minVersion: input.minVersion,
        downloadUrlAndroid: input.downloadUrlAndroid,
        downloadUrlIos: input.downloadUrlIos,
        downloadUrlWeb: input.downloadUrlWeb,
        releaseNotes: input.releaseNotes,
        isForceUpdate: input.isForceUpdate ?? false
      }).where(eq30(appConfig.platform, "all"));
    } else {
      await db.insert(appConfig).values({
        platform: "all",
        latestVersion: input.latestVersion,
        minVersion: input.minVersion,
        downloadUrlAndroid: input.downloadUrlAndroid,
        downloadUrlIos: input.downloadUrlIos,
        downloadUrlWeb: input.downloadUrlWeb,
        releaseNotes: input.releaseNotes,
        isForceUpdate: input.isForceUpdate ?? false
      });
    }
    return { success: true };
  })
});

// server/routers/consulting.ts
init_db();
init_schema();
import { z as z21 } from "zod";
import { eq as eq31, desc as desc19, and as and27 } from "drizzle-orm";
import { TRPCError as TRPCError17 } from "@trpc/server";
init_logger();
var BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY ?? "";
var USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955";
var RECEIVING_ADDRESS = "0x15aD376E5B9D7275B143d0398ccF8a5c499cc72B";
var REQUIRED_USDT_AMOUNT = BigInt("10000000000000000000");
async function verifyBscUsdtPayment(txHash, fromAddress) {
  try {
    const apiUrl = `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${BSCSCAN_API_KEY}`;
    const txUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${BSCSCAN_API_KEY}`;
    const [statusRes, txRes] = await Promise.all([
      fetch(apiUrl, { signal: AbortSignal.timeout(1e4) }),
      fetch(txUrl, { signal: AbortSignal.timeout(1e4) })
    ]);
    const statusData = await statusRes.json();
    const txData = await txRes.json();
    if (statusData.result?.status !== "1") {
      return { confirmed: false, error: "Transaction not confirmed yet" };
    }
    const tx = txData.result;
    if (!tx) return { confirmed: false, error: "Transaction not found" };
    if (tx.from?.toLowerCase() !== fromAddress.toLowerCase()) {
      return { confirmed: false, error: "\u4ED8\u6B3E\u5730\u5740\u4E0E\u94FE\u4E0A\u4EA4\u6613\u53D1\u8D77\u65B9\u4E0D\u7B26" };
    }
    const methodId = tx.input?.slice(0, 10);
    if (methodId !== "0xa9059cbb") {
      return { confirmed: false, error: "Not a token transfer" };
    }
    if (tx.to?.toLowerCase() !== USDT_CONTRACT_BSC.toLowerCase()) {
      return { confirmed: false, error: "Not USDT contract" };
    }
    const inputData = tx.input.slice(10);
    const toAddressHex = inputData.slice(24, 64);
    const amountHex = inputData.slice(64, 128);
    const toAddress = "0x" + toAddressHex;
    const amount = BigInt("0x" + amountHex);
    if (toAddress.toLowerCase() !== RECEIVING_ADDRESS.toLowerCase()) {
      return { confirmed: false, error: "Wrong recipient address" };
    }
    if (amount < REQUIRED_USDT_AMOUNT) {
      return {
        confirmed: false,
        error: `Insufficient amount: ${(Number(amount) / 1e18).toFixed(2)} USDT`
      };
    }
    return {
      confirmed: true,
      amount: (Number(amount) / 1e18).toFixed(2)
    };
  } catch (err) {
    logger_default.error({ err }, "[BSC Verify] Error");
    return { confirmed: false, error: "Network error during verification" };
  }
}
var SYSTEM_PROMPTS = {
  project: `\u4F60\u662F\u4E00\u4F4D\u9876\u7EA7\u52A0\u5BC6\u8D27\u5E01\u9879\u76EE\u5206\u6790\u5E08\uFF0C\u62E5\u6709\u4E30\u5BCC\u7684\u533A\u5757\u94FE\u7814\u7A76\u4E0E\u5206\u6790\u7ECF\u9A8C\u3002
\u8BF7\u5BF9\u7528\u6237\u63D0\u4F9B\u7684\u52A0\u5BC6\u9879\u76EE\u8FDB\u884C\u5168\u9762\u6DF1\u5165\u7684\u5206\u6790\uFF0C\u5305\u62EC\uFF1A
1. \u9879\u76EE\u6982\u8FF0\u4E0E\u6838\u5FC3\u4EF7\u503C\u4E3B\u5F20
2. \u6280\u672F\u67B6\u6784\u5206\u6790\uFF08\u5171\u8BC6\u673A\u5236\u3001\u6269\u5C55\u6027\u3001\u5B89\u5168\u6027\uFF09
3. \u4EE3\u5E01\u7ECF\u6D4E\u5B66\u5206\u6790\uFF08\u4F9B\u5E94\u91CF\u3001\u5206\u914D\u3001\u901A\u80C0/\u901A\u7F29\u673A\u5236\uFF09
4. \u56E2\u961F\u80CC\u666F\u4E0E\u6267\u884C\u80FD\u529B\u8BC4\u4F30
5. \u7ADE\u4E89\u683C\u5C40\u5206\u6790\uFF08\u4E3B\u8981\u7ADE\u4E89\u5BF9\u624B\u3001\u5DEE\u5F02\u5316\u4F18\u52BF\uFF09
6. \u94FE\u4E0A\u6570\u636E\u5206\u6790\uFF08TVL\u3001\u6D3B\u8DC3\u5730\u5740\u3001\u4EA4\u6613\u91CF\u8D8B\u52BF\uFF09
7. \u98CE\u9669\u56E0\u7D20\u8BC6\u522B\uFF08\u6280\u672F\u98CE\u9669\u3001\u5E02\u573A\u98CE\u9669\u3001\u76D1\u7BA1\u98CE\u9669\uFF09
8. \u6295\u8D44\u8BC4\u7EA7\u4E0E\u76EE\u6807\u4EF7\u4F4D\u9884\u6D4B\uFF086\u4E2A\u6708/12\u4E2A\u6708\uFF09
9. \u64CD\u4F5C\u5EFA\u8BAE\uFF08\u5165\u573A\u65F6\u673A\u3001\u4ED3\u4F4D\u7BA1\u7406\u3001\u6B62\u635F\u7B56\u7565\uFF09

\u8BF7\u4EE5\u4E13\u4E1A\u5206\u6790\u62A5\u544A\u683C\u5F0F\u8F93\u51FA\uFF0C\u6570\u636E\u7FD4\u5B9E\uFF0C\u903B\u8F91\u4E25\u8C28\uFF0C\u7ED9\u51FA\u660E\u786E\u7684\u53EF\u6267\u884C\u5EFA\u8BAE\u3002`,
  security: `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u533A\u5757\u94FE\u5B89\u5168\u5BA1\u8BA1\u4E13\u5BB6\uFF0C\u4E13\u6CE8\u4E8E\u667A\u80FD\u5408\u7EA6\u6F0F\u6D1E\u5206\u6790\u548CDeFi\u5B89\u5168\u8BC4\u4F30\u3002
\u8BF7\u5BF9\u7528\u6237\u63D0\u4F9B\u7684\u9879\u76EE\u8FDB\u884C\u5168\u9762\u7684\u5B89\u5168\u5BA1\u8BA1\u5206\u6790\uFF0C\u5305\u62EC\uFF1A
1. \u667A\u80FD\u5408\u7EA6\u4EE3\u7801\u5B89\u5168\u8BC4\u4F30
2. \u5E38\u89C1\u6F0F\u6D1E\u68C0\u67E5\uFF08\u91CD\u5165\u653B\u51FB\u3001\u6574\u6570\u6EA2\u51FA\u3001\u6743\u9650\u63A7\u5236\u3001\u95EA\u7535\u8D37\u653B\u51FB\u7B49\uFF09
3. \u5408\u7EA6\u5347\u7EA7\u673A\u5236\u4E0E\u4E2D\u5FC3\u5316\u98CE\u9669
4. \u591A\u7B7E\u94B1\u5305\u4E0E\u6CBB\u7406\u5B89\u5168
5. \u9884\u8A00\u673A\u64CD\u7EB5\u98CE\u9669
6. \u6D41\u52A8\u6027\u98CE\u9669\u4E0E\u9000\u51FA\u6D41\u52A8\u6027\u5206\u6790
7. \u5386\u53F2\u5B89\u5168\u4E8B\u4EF6\u56DE\u987E\uFF08\u5982\u6709\uFF09
8. \u7B2C\u4E09\u65B9\u5BA1\u8BA1\u62A5\u544A\u8BC4\u4F30
9. \u5B89\u5168\u8BC4\u5206\uFF081-10\u5206\uFF09\u4E0E\u98CE\u9669\u7B49\u7EA7
10. \u5B89\u5168\u6539\u8FDB\u5EFA\u8BAE

\u8BF7\u4EE5\u4E13\u4E1A\u5B89\u5168\u5BA1\u8BA1\u62A5\u544A\u683C\u5F0F\u8F93\u51FA\uFF0C\u6807\u6CE8\u6BCF\u4E2A\u98CE\u9669\u70B9\u7684\u4E25\u91CD\u7A0B\u5EA6\uFF08Critical/High/Medium/Low\uFF09\u3002`,
  market: `\u4F60\u662F\u4E00\u4F4D\u9876\u7EA7\u52A0\u5BC6\u8D27\u5E01\u5E02\u573A\u5206\u6790\u5E08\uFF0C\u64C5\u957F\u6280\u672F\u5206\u6790\u3001\u94FE\u4E0A\u6570\u636E\u5206\u6790\u548C\u5B8F\u89C2\u5E02\u573A\u7814\u5224\u3002
\u8BF7\u5BF9\u7528\u6237\u63D0\u4F9B\u7684\u52A0\u5BC6\u8D44\u4EA7\u8FDB\u884C\u5168\u9762\u7684\u5E02\u573A\u5206\u6790\uFF0C\u5305\u62EC\uFF1A
1. \u5F53\u524D\u5E02\u573A\u7ED3\u6784\u5206\u6790\uFF08\u652F\u6491\u4F4D/\u963B\u529B\u4F4D\u3001\u8D8B\u52BF\u5224\u65AD\uFF09
2. \u6280\u672F\u6307\u6807\u7EFC\u5408\u5206\u6790\uFF08MA\u3001RSI\u3001MACD\u3001\u5E03\u6797\u5E26\u3001\u6210\u4EA4\u91CF\uFF09
3. \u94FE\u4E0A\u6570\u636E\u5206\u6790\uFF08\u6301\u4ED3\u5206\u5E03\u3001\u5927\u6237\u52A8\u5411\u3001\u4EA4\u6613\u6240\u51C0\u6D41\u5165/\u6D41\u51FA\uFF09
4. \u5E02\u573A\u60C5\u7EEA\u5206\u6790\uFF08\u6050\u8D2A\u6307\u6570\u3001\u793E\u4EA4\u5A92\u4F53\u70ED\u5EA6\u3001\u671F\u8D27\u672A\u5E73\u4ED3\u91CF\uFF09
5. \u5B8F\u89C2\u73AF\u5883\u5F71\u54CD\uFF08BTC\u76F8\u5173\u6027\u3001\u7F8E\u8054\u50A8\u653F\u7B56\u3001\u76D1\u7BA1\u52A8\u6001\uFF09
6. \u4E3B\u529B\u8D44\u91D1\u52A8\u5411\u5206\u6790
7. \u77ED\u671F\uFF081-2\u5468\uFF09\u3001\u4E2D\u671F\uFF081-3\u4E2A\u6708\uFF09\u3001\u957F\u671F\uFF086-12\u4E2A\u6708\uFF09\u8D70\u52BF\u9884\u5224
8. \u5173\u952E\u4EF7\u683C\u8282\u70B9\u4E0E\u4EA4\u6613\u7B56\u7565
9. \u98CE\u9669\u63D0\u793A\u4E0E\u4ED3\u4F4D\u7BA1\u7406\u5EFA\u8BAE

\u8BF7\u4EE5\u4E13\u4E1A\u5E02\u573A\u5206\u6790\u62A5\u544A\u683C\u5F0F\u8F93\u51FA\uFF0C\u7ED3\u5408\u5177\u4F53\u6570\u636E\u548C\u56FE\u8868\u63CF\u8FF0\uFF0C\u7ED9\u51FA\u6E05\u6670\u7684\u4EA4\u6613\u7B56\u7565\u3002`
};
async function generateSummary(queryType, queryText) {
  const systemPrompt = SYSTEM_PROMPTS[queryType] || SYSTEM_PROMPTS.project;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `\u8BF7\u5BF9\u4EE5\u4E0B\u5185\u5BB9\u8FDB\u884C\u5206\u6790\uFF0C\u5148\u7ED9\u51FA\u4E00\u4E2A200\u5B57\u4EE5\u5185\u7684\u6458\u8981\u9884\u89C8\uFF08\u4E0D\u5305\u542B\u5B8C\u6574\u5206\u6790\uFF09\uFF1A

${queryText}`
      }
    ]
  });
  const content = response.choices[0]?.message?.content;
  return (typeof content === "string" ? content : null) || "\u6B63\u5728\u751F\u6210\u6458\u8981...";
}
async function generateFullReport(queryType, queryText) {
  const systemPrompt = SYSTEM_PROMPTS[queryType] || SYSTEM_PROMPTS.project;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: queryText
      }
    ]
  });
  const content = response.choices[0]?.message?.content;
  return (typeof content === "string" ? content : null) || "\u62A5\u544A\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u8054\u7CFB\u5BA2\u670D\u3002";
}
var consultingRouter = router({
  /**
   * Step 1: Create a consulting report request and generate a free summary preview
   * Returns: reportId, summary (free preview)
   */
  createReport: protectedProcedure.use(rateLimitStrict).input(
    z21.object({
      queryType: z21.enum(["project", "security", "market"]),
      queryText: z21.string().min(10).max(2e3)
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const cacheKey2 = `${ctx.user.id}:${input.queryType}:${input.queryText.slice(0, 100)}`;
    const [existing] = await db.select().from(consultingReports).where(eq31(consultingReports.cacheKey, cacheKey2)).limit(1);
    if (existing && existing.status !== "failed") {
      return {
        reportId: existing.id,
        summary: existing.summary || "\u6458\u8981\u751F\u6210\u4E2D...",
        status: existing.status,
        isExisting: true
      };
    }
    let summary = "";
    try {
      summary = await generateSummary(input.queryType, input.queryText);
    } catch (err) {
      logger_default.error({ err }, "[Consulting] Summary generation failed");
      summary = `\u6B63\u5728\u5206\u6790 ${input.queryText.slice(0, 50)}... \u652F\u4ED8\u540E\u5C06\u4E3A\u60A8\u751F\u6210\u5B8C\u6574\u7684\u4E13\u4E1A\u62A5\u544A\u3002`;
    }
    const [result] = await db.insert(consultingReports).values({
      userId: ctx.user.id,
      queryType: input.queryType,
      queryText: input.queryText,
      summary,
      status: "pending_payment",
      cacheKey: cacheKey2
    });
    const reportId = result.insertId;
    return {
      reportId,
      summary,
      status: "pending_payment",
      isExisting: false
    };
  }),
  /**
   * Step 2: User submits their wallet address and txHash after paying
   */
  submitPayment: protectedProcedure.input(
    z21.object({
      reportId: z21.number(),
      walletAddress: z21.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
      txHash: z21.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash")
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [report] = await db.select().from(consultingReports).where(and27(eq31(consultingReports.id, input.reportId), eq31(consultingReports.userId, ctx.user.id))).limit(1);
    if (!report) {
      throw new TRPCError17({ code: "NOT_FOUND", message: "\u62A5\u544A\u4E0D\u5B58\u5728" });
    }
    if (report.status === "completed") {
      return { success: true, message: "\u62A5\u544A\u5DF2\u5B8C\u6210" };
    }
    const [meRow] = await db.select({ w: users.walletAddress }).from(users).where(eq31(users.id, ctx.user.id)).limit(1);
    if (!meRow?.w) {
      throw new TRPCError17({ code: "BAD_REQUEST", message: "\u8BF7\u5148\u5728\u300C\u7ED1\u5B9A\u94B1\u5305\u300D\u7ED1\u5B9A\u4F60\u7684 BSC \u94B1\u5305\uFF0C\u5E76\u7528\u8BE5\u94B1\u5305\u4ED8\u6B3E" });
    }
    if (meRow.w.toLowerCase() !== input.walletAddress.toLowerCase()) {
      throw new TRPCError17({ code: "BAD_REQUEST", message: "\u4ED8\u6B3E\u94B1\u5305\u9700\u4E0E\u4F60\u5DF2\u7ED1\u5B9A\u7684\u94B1\u5305\u4E00\u81F4" });
    }
    const [existingPayment] = await db.select().from(consultingPayments).where(eq31(consultingPayments.txHash, input.txHash)).limit(1);
    if (existingPayment) {
      throw new TRPCError17({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u88AB\u4F7F\u7528" });
    }
    await db.insert(consultingPayments).values({
      reportId: input.reportId,
      userId: ctx.user.id,
      walletAddress: input.walletAddress,
      txHash: input.txHash,
      amount: "10",
      chain: "BSC",
      status: "pending"
    });
    await db.update(consultingReports).set({ txHash: input.txHash, status: "generating" }).where(eq31(consultingReports.id, input.reportId));
    verifyAndGenerateReport(input.reportId, input.txHash, input.walletAddress, ctx.user.id).catch(
      (err) => logger_default.error({ err }, "[Consulting] Background generation failed")
    );
    return { success: true, message: "\u652F\u4ED8\u5DF2\u63D0\u4EA4\uFF0C\u6B63\u5728\u9A8C\u8BC1\u4EA4\u6613..." };
  }),
  /**
   * Poll payment and report status
   */
  getStatus: protectedProcedure.input(z21.object({ reportId: z21.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [report] = await db.select().from(consultingReports).where(and27(eq31(consultingReports.id, input.reportId), eq31(consultingReports.userId, ctx.user.id))).limit(1);
    if (!report) {
      throw new TRPCError17({ code: "NOT_FOUND", message: "\u62A5\u544A\u4E0D\u5B58\u5728" });
    }
    return {
      reportId: report.id,
      status: report.status,
      queryType: report.queryType,
      queryText: report.queryText,
      summary: report.summary,
      txHash: report.txHash,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  }),
  /**
   * Get full report (only available after payment confirmed)
   */
  getFullReport: protectedProcedure.input(z21.object({ reportId: z21.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [report] = await db.select().from(consultingReports).where(and27(eq31(consultingReports.id, input.reportId), eq31(consultingReports.userId, ctx.user.id))).limit(1);
    if (!report) {
      throw new TRPCError17({ code: "NOT_FOUND", message: "\u62A5\u544A\u4E0D\u5B58\u5728" });
    }
    if (report.status !== "completed") {
      throw new TRPCError17({
        code: "FORBIDDEN",
        message: report.status === "pending_payment" ? "\u8BF7\u5148\u5B8C\u6210\u652F\u4ED8" : "\u62A5\u544A\u6B63\u5728\u751F\u6210\u4E2D\uFF0C\u8BF7\u7A0D\u5019"
      });
    }
    return {
      reportId: report.id,
      queryType: report.queryType,
      queryText: report.queryText,
      summary: report.summary,
      fullContent: report.fullContent,
      txHash: report.txHash,
      createdAt: report.createdAt
    };
  }),
  /**
   * Get user's consulting history
   */
  getHistory: protectedProcedure.input(z21.object({ limit: z21.number().default(20) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: consultingReports.id,
      queryType: consultingReports.queryType,
      queryText: consultingReports.queryText,
      summary: consultingReports.summary,
      status: consultingReports.status,
      txHash: consultingReports.txHash,
      createdAt: consultingReports.createdAt
    }).from(consultingReports).where(eq31(consultingReports.userId, ctx.user.id)).orderBy(desc19(consultingReports.createdAt)).limit(input?.limit ?? 20);
  }),
  /**
   * Manually retry payment verification (for cases where auto-verify failed)
   */
  retryVerification: protectedProcedure.input(z21.object({ reportId: z21.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [report] = await db.select().from(consultingReports).where(and27(eq31(consultingReports.id, input.reportId), eq31(consultingReports.userId, ctx.user.id))).limit(1);
    if (!report) throw new TRPCError17({ code: "NOT_FOUND", message: "\u62A5\u544A\u4E0D\u5B58\u5728" });
    if (!report.txHash) throw new TRPCError17({ code: "BAD_REQUEST", message: "\u5C1A\u672A\u63D0\u4EA4\u4EA4\u6613\u54C8\u5E0C" });
    if (report.status === "completed") return { success: true, message: "\u62A5\u544A\u5DF2\u5B8C\u6210" };
    const [payment] = await db.select().from(consultingPayments).where(eq31(consultingPayments.reportId, input.reportId)).limit(1);
    const walletAddress = payment?.walletAddress || "unknown";
    verifyAndGenerateReport(input.reportId, report.txHash, walletAddress, ctx.user.id).catch(
      (err) => logger_default.error({ err }, "[Consulting] Retry verification failed")
    );
    return { success: true, message: "\u5DF2\u91CD\u65B0\u63D0\u4EA4\u9A8C\u8BC1\uFF0C\u8BF7\u7B49\u5F85..." };
  })
});
async function verifyAndGenerateReport(reportId, txHash, walletAddress, userId) {
  const db = await getDb();
  if (!db) return;
  const MAX_RETRIES = 12;
  let retries = 0;
  while (retries < MAX_RETRIES) {
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    try {
      const result = await verifyBscUsdtPayment(txHash, walletAddress);
      if (result.confirmed) {
        await db.update(consultingPayments).set({ status: "confirmed", confirmedAt: /* @__PURE__ */ new Date() }).where(eq31(consultingPayments.txHash, txHash));
        const [report] = await db.select().from(consultingReports).where(eq31(consultingReports.id, reportId)).limit(1);
        if (!report) return;
        try {
          const fullContent = await generateFullReport(report.queryType, report.queryText);
          await db.update(consultingReports).set({ status: "completed", fullContent, updatedAt: /* @__PURE__ */ new Date() }).where(eq31(consultingReports.id, reportId));
          logger_default.info({ reportId, userId }, "[Consulting] Report completed");
        } catch (aiErr) {
          logger_default.error({ aiErr, reportId }, "[Consulting] AI generation failed");
          await db.update(consultingReports).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq31(consultingReports.id, reportId));
        }
        return;
      }
      logger_default.info({ attempt: retries + 1, error: result.error }, "[Consulting] Payment not confirmed yet");
    } catch (err) {
      logger_default.error({ err, attempt: retries + 1 }, "[Consulting] Verification error");
    }
    retries++;
  }
  logger_default.error({ reportId }, "[Consulting] Payment verification timed out");
  await db.update(consultingReports).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq31(consultingReports.id, reportId));
  await db.update(consultingPayments).set({ status: "failed" }).where(eq31(consultingPayments.txHash, txHash));
}

// server/routers/swap.ts
import { z as z22 } from "zod";
import { TRPCError as TRPCError18 } from "@trpc/server";
init_db();
init_schema();
import { eq as eq32, and as and28, gte as gte7, desc as desc20, asc as asc3, sql as sql18, inArray as inArray9 } from "drizzle-orm";
init_token();

// server/swap/floorAmm.ts
function spotPrice(p) {
  return p.aiReserve > 0 ? p.usdtReserve / p.aiReserve : 0;
}
function floorPrice(p, supply) {
  if (supply <= 0) return 0;
  const f = p.reserveR / supply;
  const s = spotPrice(p);
  return s > 0 ? Math.min(f, s) : f;
}
function currentThetaBps(p) {
  const span = p.thetaHalfBuyUsdt * 2;
  if (span <= 0 || p.cumBoughtUsdt >= span) return p.thetaEndBps;
  return p.thetaStartBps - (p.thetaStartBps - p.thetaEndBps) * (p.cumBoughtUsdt / span);
}
function effectivePeak(p, now) {
  const spot = spotPrice(p);
  if (!p.peakUpdatedAt || p.peakPrice <= 0) return Math.max(spot, p.peakPrice);
  const days = (now - p.peakUpdatedAt) / 864e5;
  const decayed = Math.max(0, p.peakPrice - p.peakPrice * (p.peakDecayPerDayBps / 1e4) * days);
  return Math.max(spot, decayed);
}
function currentSellTaxBps(p, now) {
  const spot = spotPrice(p);
  const peak = effectivePeak(p, now);
  if (peak <= 0 || spot >= peak) return p.baseTaxBps;
  const dd = (peak - spot) / peak;
  return Math.min(p.maxTaxBps, Math.round(p.baseTaxBps + (p.maxTaxBps - p.baseTaxBps) * dd));
}
function quoteBuy(p, usdtIn) {
  const theta = currentThetaBps(p) / 1e4;
  const toReserve = usdtIn * theta;
  const net2 = usdtIn - toReserve;
  const k = p.aiReserve * p.usdtReserve;
  const aiOut = p.aiReserve - k / (p.usdtReserve + net2);
  return { aiOut: Math.max(0, aiOut), toReserve };
}
function quoteSell(p, aiIn, now, supply) {
  const k = p.aiReserve * p.usdtReserve;
  const grossUsdt = p.usdtReserve - k / (p.aiReserve + aiIn);
  const execPrice = aiIn > 0 ? grossUsdt / aiIn : 0;
  const F = floorPrice(p, supply);
  const spot = spotPrice(p);
  if (F > 0 && F < spot && execPrice < F) {
    const usdtOut = aiIn * F;
    return { usdtOut, grossUsdt: usdtOut, taxBps: 0, baseTax: 0, excessTax: 0, viaFloor: true };
  }
  const spotPost = (p.usdtReserve - grossUsdt) / (p.aiReserve + aiIn);
  const peak = effectivePeak(p, now);
  const dd = peak > 0 ? Math.max(0, (peak - spot) / peak, (peak - spotPost) / peak) : 0;
  const taxBps = Math.min(p.maxTaxBps, Math.round(p.baseTaxBps + (p.maxTaxBps - p.baseTaxBps) * dd));
  const baseTax = grossUsdt * (p.baseTaxBps / 1e4);
  const excessTax = taxBps > p.baseTaxBps ? grossUsdt * ((taxBps - p.baseTaxBps) / 1e4) : 0;
  return { usdtOut: Math.max(0, grossUsdt - baseTax - excessTax), grossUsdt, taxBps, baseTax, excessTax, viaFloor: false };
}
function poolFromRow(r) {
  return {
    aiReserve: Number(r.aiReserve),
    usdtReserve: Number(r.usdtReserve),
    reserveR: Number(r.reserveR),
    circulatingAi: Number(r.circulatingAi),
    crisisFund: Number(r.crisisFund),
    divPool: Number(r.divPool),
    thetaStartBps: r.thetaStartBps,
    thetaEndBps: r.thetaEndBps,
    thetaHalfBuyUsdt: Number(r.thetaHalfBuyUsdt),
    cumBoughtUsdt: Number(r.cumBoughtUsdt),
    baseTaxBps: r.baseTaxBps,
    maxTaxBps: r.maxTaxBps,
    peakDecayPerDayBps: r.peakDecayPerDayBps,
    peakPrice: Number(r.peakPrice),
    peakUpdatedAt: r.peakUpdatedAt ? new Date(r.peakUpdatedAt).getTime() : null
  };
}

// server/routers/swap.ts
var IV_MS = { "15m": 9e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 };
async function getPool(db) {
  let [p] = await db.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).limit(1);
  if (!p) {
    try {
      await db.insert(aiAmmPool).values({ id: 1 });
    } catch {
    }
    [p] = await db.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).limit(1);
  }
  return p;
}
function affected(r) {
  const a = r;
  return a?.[0]?.affectedRows ?? a?.affectedRows ?? a?.rowsAffected ?? 0;
}
async function sumNn(d) {
  const [r] = await d.select({ s: sql18`COALESCE(SUM(${users.nnBalance}),0)` }).from(users);
  return Number(r?.s ?? 0);
}
var swapRouter = router({
  // ─── 行情:现价 + 地板价 + 储备/危机金 + 当前税/θ + 24h + OHLC K线 + 最近成交 ───────
  getMarket: publicProcedure.input(z22.object({ interval: z22.enum(["15m", "1h", "4h", "1d"]).default("1h") }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const pool = await getPool(db);
    const ps = poolFromRow(pool);
    const now = Date.now();
    const price = spotPrice(ps);
    const recent = await db.select().from(aiSwapTrades).orderBy(desc20(aiSwapTrades.createdAt)).limit(30);
    const trades = recent.map((t3) => ({
      side: t3.side,
      ai: Number(t3.aiAmount),
      usdt: Number(t3.usdtAmount),
      price: Number(t3.price),
      at: t3.createdAt ? t3.createdAt.toISOString() : null
    }));
    const since = new Date(now - 24 * 3600 * 1e3);
    const day = await db.select({ price: aiSwapTrades.price, usdt: aiSwapTrades.usdtAmount }).from(aiSwapTrades).where(gte7(aiSwapTrades.createdAt, since)).orderBy(asc3(aiSwapTrades.createdAt));
    const dp = day.map((t3) => Number(t3.price)).filter((p) => p > 0);
    const vol24 = day.reduce((s, t3) => s + Number(t3.usdt), 0);
    const open24 = dp.length ? dp[0] : price;
    const high24 = Math.max(price, ...dp.length ? dp : [price]);
    const low24 = Math.min(price, ...dp.length ? dp : [price]);
    const change24 = open24 > 0 ? (price - open24) / open24 : 0;
    const ivMs = IV_MS[input?.interval ?? "1h"];
    const ct = await db.select({ price: aiSwapTrades.price, at: aiSwapTrades.createdAt }).from(aiSwapTrades).where(gte7(aiSwapTrades.createdAt, new Date(now - ivMs * 48))).orderBy(asc3(aiSwapTrades.createdAt));
    const buckets = /* @__PURE__ */ new Map();
    for (const t3 of ct) {
      const p = Number(t3.price);
      if (p <= 0 || !t3.at) continue;
      const b = Math.floor(t3.at.getTime() / ivMs) * ivMs;
      const ex = buckets.get(b);
      if (!ex) buckets.set(b, { o: p, h: p, l: p, c: p });
      else {
        ex.h = Math.max(ex.h, p);
        ex.l = Math.min(ex.l, p);
        ex.c = p;
      }
    }
    const candles = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]).map(([t3, c]) => ({ t: t3, o: c.o, h: c.h, l: c.l, c: c.c }));
    const supply = await sumNn(db);
    const floor = floorPrice(ps, supply);
    return {
      seeded: pool.seeded,
      price,
      change24,
      high24,
      low24,
      vol24Usdt: vol24,
      aiReserve: ps.aiReserve,
      usdtReserve: ps.usdtReserve,
      // FloorAMM 透明展示
      floor,
      floorPct: price > 0 ? floor / price : 0,
      reserveR: ps.reserveR,
      crisisFund: ps.crisisFund,
      divPool: ps.divPool,
      dividendClaimsEnabled: pool.dividendClaimsEnabled,
      thetaBps: Math.round(currentThetaBps(ps)),
      sellTaxBps: currentSellTaxBps(ps, now),
      baseTaxBps: ps.baseTaxBps,
      maxTaxBps: ps.maxTaxBps,
      candles,
      trades
    };
  }),
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { ai: 0, usdt: 0 };
    const [u] = await db.select({ ai: users.nnBalance, usdt: users.usdtBalance }).from(users).where(eq32(users.id, ctx.user.id)).limit(1);
    return { ai: Number(u?.ai ?? 0), usdt: Number(u?.usdt ?? 0) };
  }),
  // ─── 执行 swap(FloorAMM 逻辑;原子锁池行+用户行)─────────────────────────────────
  execute: protectedProcedure.input(z22.object({ side: z22.enum(["buy", "sell"]), amountIn: z22.number().positive(), minOut: z22.number().min(0) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await getPool(db);
    const now = Date.now();
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).for("update").limit(1);
      if (!row || !row.seeded) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u4E8C\u7EA7\u5E02\u573A\u672A\u5F00\u5E02" });
      const ps = poolFromRow(row);
      let out = 0, execPrice = 0, marketPrice = 0;
      if (input.side === "buy") {
        const usdtIn = input.amountIn;
        const q = quoteBuy(ps, usdtIn);
        const aiOut = Math.floor(q.aiOut);
        if (aiOut <= 0) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6570\u91CF\u8FC7\u5C0F" });
        if (aiOut < input.minOut) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6ED1\u70B9\u8D85\u9650,\u8BF7\u91CD\u8BD5" });
        if (aiOut >= ps.aiReserve) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u8D85\u8FC7\u6C60\u53EF\u552E\u5E93\u5B58" });
        const net2 = usdtIn - q.toReserve;
        await tx.update(aiAmmPool).set({
          usdtReserve: sql18`${aiAmmPool.usdtReserve} + ${net2}`,
          aiReserve: sql18`${aiAmmPool.aiReserve} - ${aiOut}`,
          reserveR: sql18`${aiAmmPool.reserveR} + ${q.toReserve}`,
          circulatingAi: sql18`${aiAmmPool.circulatingAi} + ${aiOut}`,
          cumBoughtUsdt: sql18`${aiAmmPool.cumBoughtUsdt} + ${usdtIn}`,
          totalVolUsdt: sql18`${aiAmmPool.totalVolUsdt} + ${usdtIn}`
        }).where(eq32(aiAmmPool.id, 1));
        const r = await tx.update(users).set({
          usdtBalance: sql18`${users.usdtBalance} - ${usdtIn}`,
          nnBalance: sql18`${users.nnBalance} + ${aiOut}`
        }).where(and28(eq32(users.id, ctx.user.id), gte7(users.usdtBalance, usdtIn.toFixed(8))));
        if (affected(r) < 1) throw new TRPCError18({ code: "BAD_REQUEST", message: "USDT \u4F59\u989D\u4E0D\u8DB3" });
        out = aiOut;
        execPrice = usdtIn / aiOut;
        marketPrice = (ps.usdtReserve + net2) / (ps.aiReserve - aiOut);
        if (marketPrice > effectivePeak(ps, now)) {
          await tx.update(aiAmmPool).set({ peakPrice: marketPrice.toFixed(10), peakUpdatedAt: new Date(now) }).where(eq32(aiAmmPool.id, 1));
        }
      } else {
        const aiIn = Math.floor(input.amountIn);
        if (aiIn <= 0) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6570\u91CF\u8FC7\u5C0F" });
        const supply = await sumNn(tx);
        const q = quoteSell(ps, aiIn, now, supply);
        if (q.usdtOut <= 0) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6570\u91CF\u8FC7\u5C0F" });
        if (q.usdtOut < input.minOut) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6ED1\u70B9\u8D85\u9650,\u8BF7\u91CD\u8BD5" });
        if (q.viaFloor) {
          if (q.usdtOut >= ps.reserveR) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u50A8\u5907\u6682\u4E0D\u8DB3,\u8BF7\u51CF\u5C11\u6570\u91CF" });
          await tx.update(aiAmmPool).set({
            reserveR: sql18`${aiAmmPool.reserveR} - ${q.usdtOut}`,
            circulatingAi: sql18`GREATEST(${aiAmmPool.circulatingAi} - ${aiIn}, 0)`,
            totalVolUsdt: sql18`${aiAmmPool.totalVolUsdt} + ${q.usdtOut}`
          }).where(eq32(aiAmmPool.id, 1));
          marketPrice = floorPrice(ps, supply);
        } else {
          if (q.grossUsdt >= ps.usdtReserve) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u8D85\u8FC7\u6C60\u53EF\u4ED8\u989D\u5EA6" });
          await tx.update(aiAmmPool).set({
            aiReserve: sql18`${aiAmmPool.aiReserve} + ${aiIn}`,
            usdtReserve: sql18`${aiAmmPool.usdtReserve} - ${q.grossUsdt}`,
            circulatingAi: sql18`GREATEST(${aiAmmPool.circulatingAi} - ${aiIn}, 0)`,
            divPool: sql18`${aiAmmPool.divPool} + ${q.baseTax.toFixed(8)}`,
            crisisFund: sql18`${aiAmmPool.crisisFund} + ${q.excessTax.toFixed(8)}`,
            totalVolUsdt: sql18`${aiAmmPool.totalVolUsdt} + ${q.grossUsdt}`
          }).where(eq32(aiAmmPool.id, 1));
          marketPrice = (ps.usdtReserve - q.grossUsdt) / (ps.aiReserve + aiIn);
        }
        const r = await tx.update(users).set({
          nnBalance: sql18`${users.nnBalance} - ${aiIn}`,
          usdtBalance: sql18`${users.usdtBalance} + ${q.usdtOut.toFixed(8)}`
        }).where(and28(eq32(users.id, ctx.user.id), gte7(users.nnBalance, aiIn)));
        if (affected(r) < 1) throw new TRPCError18({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3" });
        out = q.usdtOut;
        execPrice = q.usdtOut / aiIn;
      }
      await tx.insert(aiSwapTrades).values({
        userId: ctx.user.id,
        side: input.side,
        aiAmount: input.side === "buy" ? String(out) : String(Math.floor(input.amountIn)),
        usdtAmount: (input.side === "buy" ? input.amountIn : out).toFixed(8),
        price: marketPrice.toFixed(10)
      });
      return { ok: true, out, price: execPrice };
    });
  }),
  // ─── Admin:播种开市(募集USDT分给 AMM池 + 储备R + 危机金)+ 危机补仓 + USDT入账 ────────
  adminSeed: adminProcedure.input(z22.object({
    aiSeed: z22.number().positive(),
    usdtAmm: z22.number().positive(),
    usdtReserveR: z22.number().min(0).default(0),
    usdtCrisis: z22.number().min(0).default(0),
    thetaStartBps: z22.number().int().min(2e3).max(6e3).default(5200),
    thetaEndBps: z22.number().int().min(2e3).max(6e3).default(2700),
    thetaHalfBuyUsdt: z22.number().positive().default(1e5),
    baseTaxBps: z22.number().int().min(0).max(1e3).default(500),
    maxTaxBps: z22.number().int().min(500).max(5e3).default(5e3)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const pool = await getPool(db);
    if (pool.seeded) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u5DF2\u5F00\u5E02,\u4E0D\u53EF\u91CD\u590D\u64AD\u79CD" });
    if (input.thetaEndBps > input.thetaStartBps) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u03B8 end \u4E0D\u80FD\u5927\u4E8E start" });
    if (input.maxTaxBps <= input.baseTaxBps) throw new TRPCError18({ code: "BAD_REQUEST", message: "max \u7A0E\u987B\u5927\u4E8E base" });
    const openPrice = input.usdtAmm / input.aiSeed;
    await db.update(aiAmmPool).set({
      aiReserve: input.aiSeed.toFixed(8),
      usdtReserve: input.usdtAmm.toFixed(8),
      reserveR: input.usdtReserveR.toFixed(8),
      crisisFund: input.usdtCrisis.toFixed(8),
      circulatingAi: "0",
      thetaStartBps: input.thetaStartBps,
      thetaEndBps: input.thetaEndBps,
      thetaHalfBuyUsdt: input.thetaHalfBuyUsdt.toFixed(8),
      baseTaxBps: input.baseTaxBps,
      maxTaxBps: input.maxTaxBps,
      peakPrice: openPrice.toFixed(10),
      peakUpdatedAt: /* @__PURE__ */ new Date(),
      seeded: true
    }).where(eq32(aiAmmPool.id, 1));
    return { ok: true, openPrice };
  }),
  // 危机补仓:深跌(现价≤峰值30% 或 ≤1.1地板)时把危机金的一部分注入储备 R(抬地板)
  adminDeployCrisis: adminProcedure.input(z22.object({ amount: z22.number().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const now = Date.now();
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).for("update").limit(1);
      if (!row || !row.seeded) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u672A\u5F00\u5E02" });
      const ps = poolFromRow(row);
      const supply = await sumNn(tx);
      const spot = spotPrice(ps), peak = effectivePeak(ps, now), F = floorPrice(ps, supply);
      const trigger = peak > 0 && spot <= peak * 0.3 || F > 0 && F < spot && spot <= F * 1.1;
      if (!trigger) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u672A\u8FBE\u5371\u673A\u89E6\u53D1(\u73B0\u4EF7>\u5CF0\u503C30%\u4E14>1.1\u5730\u677F)" });
      if (input.amount > ps.crisisFund) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u5371\u673A\u91D1\u4E0D\u8DB3" });
      if (input.amount > ps.crisisFund / 3 + 1e-6) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u5355\u6B21\u2264\u5371\u673A\u91D1 1/3" });
      await tx.update(aiAmmPool).set({
        crisisFund: sql18`${aiAmmPool.crisisFund} - ${input.amount.toFixed(8)}`,
        reserveR: sql18`${aiAmmPool.reserveR} + ${input.amount.toFixed(8)}`
      }).where(eq32(aiAmmPool.id, 1));
      return { ok: true };
    });
  }),
  // ─── 底池注资:开市后**可重复**向底池加钱(解决 adminSeed 一次性、首次播种后不可再加)─────────────
  //   储备R=抬地板后备;危机金=深跌补仓弹药;AMM流动性=按现价配比加 USDT+AI,加深盘口、价格不变。
  adminTopUp: adminProcedure.input(z22.object({
    addReserveR: z22.number().min(0).max(1e8).default(0),
    addCrisis: z22.number().min(0).max(1e8).default(0),
    addLiquidityUsdt: z22.number().min(0).max(1e8).default(0)
    // 注资 AMM,自动按现价配比补 AI 保持价格不变
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (input.addReserveR + input.addCrisis + input.addLiquidityUsdt <= 0)
      throw new TRPCError18({ code: "BAD_REQUEST", message: "\u672A\u586B\u4EFB\u4F55\u6CE8\u8D44\u9879" });
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).for("update").limit(1);
      if (!row || !row.seeded) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u672A\u5F00\u5E02,\u8BF7\u5148 adminSeed \u64AD\u79CD" });
      const ps = poolFromRow(row);
      const set = {};
      if (input.addReserveR > 0) set.reserveR = sql18`${aiAmmPool.reserveR} + ${input.addReserveR.toFixed(8)}`;
      if (input.addCrisis > 0) set.crisisFund = sql18`${aiAmmPool.crisisFund} + ${input.addCrisis.toFixed(8)}`;
      let addAi = 0;
      if (input.addLiquidityUsdt > 0) {
        const price = spotPrice(ps);
        if (price <= 0) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6C60\u4EF7\u5F02\u5E38,\u65E0\u6CD5\u914D\u6BD4\u6CE8\u8D44" });
        addAi = input.addLiquidityUsdt / price;
        set.usdtReserve = sql18`${aiAmmPool.usdtReserve} + ${input.addLiquidityUsdt.toFixed(8)}`;
        set.aiReserve = sql18`${aiAmmPool.aiReserve} + ${addAi.toFixed(8)}`;
      }
      await tx.update(aiAmmPool).set(set).where(eq32(aiAmmPool.id, 1));
      return { ok: true, addReserveR: input.addReserveR, addCrisis: input.addCrisis, addLiquidityUsdt: input.addLiquidityUsdt, addAi };
    });
  }),
  // ─── 底池提取:把储备R/危机金的一部分撤回国库(开市后可逆,夹断不穿负;不动 AMM 流动性,避免影响盘口)──
  adminWithdrawPool: adminProcedure.input(z22.object({
    fromReserveR: z22.number().min(0).max(1e8).default(0),
    fromCrisis: z22.number().min(0).max(1e8).default(0)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (input.fromReserveR + input.fromCrisis <= 0) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u672A\u586B\u4EFB\u4F55\u63D0\u53D6\u9879" });
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).for("update").limit(1);
      if (!row || !row.seeded) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u672A\u5F00\u5E02" });
      const ps = poolFromRow(row);
      if (input.fromReserveR > ps.reserveR + 1e-9) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u50A8\u5907R\u4E0D\u8DB3" });
      if (input.fromCrisis > ps.crisisFund + 1e-9) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u5371\u673A\u91D1\u4E0D\u8DB3" });
      const set = {};
      if (input.fromReserveR > 0) set.reserveR = sql18`GREATEST(${aiAmmPool.reserveR} - ${input.fromReserveR.toFixed(8)}, 0)`;
      if (input.fromCrisis > 0) set.crisisFund = sql18`GREATEST(${aiAmmPool.crisisFund} - ${input.fromCrisis.toFixed(8)}, 0)`;
      await tx.update(aiAmmPool).set(set).where(eq32(aiAmmPool.id, 1));
      return { ok: true, fromReserveR: input.fromReserveR, fromCrisis: input.fromCrisis };
    });
  }),
  adminCreditUsdt: adminProcedure.input(z22.object({ userId: z22.number(), amount: z22.number().positive().max(1e6) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(users).set({ usdtBalance: sql18`${users.usdtBalance} + ${input.amount}` }).where(eq32(users.id, input.userId));
    return { ok: true };
  }),
  // ─── USDT 出入金(充值=转账+回填哈希待确认;提现=申请即冻结余额待打款)─────────────────
  depositInfo: publicProcedure.query(() => ({ payAddress: USDT_DEPOSIT_ADDRESS, chain: USDT_CHAIN })),
  requestDeposit: protectedProcedure.input(z22.object({ amount: z22.number().positive().max(1e6), txHash: z22.string().min(6).max(120) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const txHash = sanitizeInput(input.txHash, 120);
    const [dup] = await db.select({ id: usdtDeposits.id }).from(usdtDeposits).where(eq32(usdtDeposits.txHash, txHash)).limit(1);
    if (dup) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u63D0\u4EA4\u8FC7,\u8BF7\u52FF\u91CD\u590D" });
    const [icoDup] = await db.select({ id: icoOrders.id }).from(icoOrders).where(eq32(icoOrders.txHash, txHash)).limit(1);
    if (icoDup) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u7528\u4E8E ICO \u8BA4\u8D2D,\u8BF7\u52FF\u91CD\u590D" });
    try {
      await db.insert(usdtDeposits).values({ userId: ctx.user.id, amount: input.amount.toFixed(8), txHash });
    } catch {
      throw new TRPCError18({ code: "BAD_REQUEST", message: "\u8BE5\u4EA4\u6613\u54C8\u5E0C\u5DF2\u63D0\u4EA4\u8FC7,\u8BF7\u52FF\u91CD\u590D" });
    }
    return { ok: true };
  }),
  requestWithdraw: protectedProcedure.input(z22.object({ amount: z22.number().positive().max(1e6), address: z22.string().regex(/^0x[a-fA-F0-9]{40}$/, "\u65E0\u6548\u7684\u63D0\u73B0\u5730\u5740\uFF1A\u9700 0x \u5F00\u5934\u7684 42 \u4F4D EVM \u5730\u5740") })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.transaction(async (tx) => {
      const r = await tx.update(users).set({ usdtBalance: sql18`${users.usdtBalance} - ${input.amount.toFixed(8)}` }).where(and28(eq32(users.id, ctx.user.id), gte7(users.usdtBalance, input.amount.toFixed(8))));
      if (affected(r) < 1) throw new TRPCError18({ code: "BAD_REQUEST", message: "USDT \u4F59\u989D\u4E0D\u8DB3" });
      await tx.insert(usdtWithdrawals).values({ userId: ctx.user.id, amount: input.amount.toFixed(8), address: sanitizeInput(input.address, 80) });
      return { ok: true };
    });
  }),
  myTransfers: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { deposits: [], withdrawals: [] };
    const [deposits, withdrawals] = await Promise.all([
      db.select().from(usdtDeposits).where(eq32(usdtDeposits.userId, ctx.user.id)).orderBy(desc20(usdtDeposits.createdAt)).limit(30),
      db.select().from(usdtWithdrawals).where(eq32(usdtWithdrawals.userId, ctx.user.id)).orderBy(desc20(usdtWithdrawals.createdAt)).limit(30)
    ]);
    return { deposits, withdrawals };
  }),
  adminListDeposits: adminProcedure.input(z22.object({ status: z22.enum(["pending", "confirmed", "rejected"]).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conds = input?.status ? [eq32(usdtDeposits.status, input.status)] : [];
    return db.select().from(usdtDeposits).where(conds.length ? and28(...conds) : void 0).orderBy(desc20(usdtDeposits.createdAt)).limit(100);
  }),
  adminConfirmDeposit: adminProcedure.input(z22.object({ id: z22.number(), amount: z22.number().positive().max(1e6).optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.transaction(async (tx) => {
      const [d] = await tx.select().from(usdtDeposits).where(eq32(usdtDeposits.id, input.id)).for("update").limit(1);
      if (!d || d.status !== "pending") throw new TRPCError18({ code: "BAD_REQUEST", message: "\u72B6\u6001\u4E0D\u53EF\u6539" });
      const credit = (input.amount ?? Number(d.amount)).toFixed(8);
      await tx.update(usdtDeposits).set({ status: "confirmed", confirmedAt: /* @__PURE__ */ new Date(), amount: credit }).where(eq32(usdtDeposits.id, input.id));
      await tx.update(users).set({ usdtBalance: sql18`${users.usdtBalance} + ${credit}` }).where(eq32(users.id, d.userId));
      return { ok: true, credited: Number(credit) };
    });
  }),
  adminRejectDeposit: adminProcedure.input(z22.object({ id: z22.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(usdtDeposits).set({ status: "rejected", confirmedAt: /* @__PURE__ */ new Date() }).where(and28(eq32(usdtDeposits.id, input.id), eq32(usdtDeposits.status, "pending")));
    return { ok: true };
  }),
  adminListWithdrawals: adminProcedure.input(z22.object({ status: z22.enum(["pending", "done", "rejected"]).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conds = input?.status ? [eq32(usdtWithdrawals.status, input.status)] : [];
    return db.select().from(usdtWithdrawals).where(conds.length ? and28(...conds) : void 0).orderBy(desc20(usdtWithdrawals.createdAt)).limit(100);
  }),
  adminCompleteWithdrawal: adminProcedure.input(z22.object({ id: z22.number(), txHash: z22.string().min(6).max(120) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(usdtWithdrawals).set({ status: "done", txHash: sanitizeInput(input.txHash, 120), processedAt: /* @__PURE__ */ new Date() }).where(and28(eq32(usdtWithdrawals.id, input.id), eq32(usdtWithdrawals.status, "pending")));
    return { ok: true };
  }),
  adminRejectWithdrawal: adminProcedure.input(z22.object({ id: z22.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.transaction(async (tx) => {
      const [w] = await tx.select().from(usdtWithdrawals).where(eq32(usdtWithdrawals.id, input.id)).for("update").limit(1);
      if (!w || w.status !== "pending") throw new TRPCError18({ code: "BAD_REQUEST", message: "\u72B6\u6001\u4E0D\u53EF\u6539" });
      await tx.update(usdtWithdrawals).set({ status: "rejected", processedAt: /* @__PURE__ */ new Date() }).where(eq32(usdtWithdrawals.id, input.id));
      await tx.update(users).set({ usdtBalance: sql18`${users.usdtBalance} + ${w.amount}` }).where(eq32(users.id, w.userId));
      return { ok: true };
    });
  }),
  // ─── 分红分配(🔴 合规闸门:USDT 持币分红=Howey,默认关,律师结论后 admin 开)──────────
  adminSetDividendClaims: adminProcedure.input(z22.object({ enabled: z22.boolean() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await getPool(db);
    await db.update(aiAmmPool).set({ dividendClaimsEnabled: input.enabled }).where(eq32(aiAmmPool.id, 1));
    return { ok: true };
  }),
  adminDistributeDividends: adminProcedure.input(z22.object({ teamUserId: z22.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(aiAmmPool).where(eq32(aiAmmPool.id, 1)).for("update").limit(1);
      if (!row) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u6C60\u4E0D\u5B58\u5728" });
      if (!row.dividendClaimsEnabled) throw new TRPCError18({ code: "FORBIDDEN", message: "\u5206\u7EA2\u672A\u5F00\u95F8(\u9700\u5408\u89C4\u7ED3\u8BBA)" });
      const divPool = Number(row.divPool);
      if (divPool <= 0) throw new TRPCError18({ code: "BAD_REQUEST", message: "\u65E0\u53EF\u5206\u914D\u5206\u7EA2" });
      const tierRatio = { 1: 0.2, 2: 0.24, 3: 0.3 };
      const all = await tx.select({ id: users.id, tier: users.icoTier }).from(users).where(inArray9(users.icoTier, [1, 2, 3]));
      const ids = all.map((m) => m.id);
      const subs = ids.length ? await tx.select({ uid: icoPurchases.userId, usdt: sql18`COALESCE(SUM(${icoPurchases.usdtAmount}),0)` }).from(icoPurchases).where(inArray9(icoPurchases.userId, ids)).groupBy(icoPurchases.userId) : [];
      const subMap = new Map(subs.map((s) => [s.uid, Number(s.usdt)]));
      const byTier = { 1: [], 2: [], 3: [] };
      for (const m of all) {
        if (m.tier && byTier[m.tier]) byTier[m.tier].push({ id: m.id, w: subMap.get(m.id) ?? 0 });
      }
      let paidToPartners = 0;
      let unclaimed = 0;
      const summary = [];
      for (const tier of [1, 2, 3]) {
        const members = byTier[tier];
        const tierAmount = divPool * tierRatio[tier];
        const totalW = members.reduce((s, m) => s + m.w, 0);
        if (totalW <= 0 || members.length === 0) {
          unclaimed += tierAmount;
          summary.push({ tier, members: members.length, amount: 0 });
          continue;
        }
        let paid = 0;
        for (const m of members) {
          const share = Number((tierAmount * (m.w / totalW)).toFixed(8));
          if (share > 0) {
            await tx.update(users).set({ usdtBalance: sql18`${users.usdtBalance} + ${share.toFixed(8)}` }).where(eq32(users.id, m.id));
            paid += share;
          }
        }
        paidToPartners += paid;
        summary.push({ tier, members: members.length, amount: paid });
      }
      const tech = Number((divPool * 0.26).toFixed(8));
      await tx.update(users).set({ usdtBalance: sql18`${users.usdtBalance} + ${tech.toFixed(8)}` }).where(eq32(users.id, input.teamUserId));
      if (unclaimed > 1e-9) await tx.update(aiAmmPool).set({ crisisFund: sql18`${aiAmmPool.crisisFund} + ${unclaimed.toFixed(8)}` }).where(eq32(aiAmmPool.id, 1));
      const drained = paidToPartners + tech + unclaimed;
      await tx.update(aiAmmPool).set({ divPool: sql18`GREATEST(${aiAmmPool.divPool} - ${drained.toFixed(8)}, 0)` }).where(eq32(aiAmmPool.id, 1));
      return { ok: true, distributed: drained, paidToPartners, tech, unclaimedToCrisis: unclaimed, summary };
    });
  })
});

// server/routers/ai.ts
import { z as z23 } from "zod";
import { and as and29, desc as desc21, eq as eq33, sql as sql19 } from "drizzle-orm";
import { TRPCError as TRPCError19 } from "@trpc/server";
init_db();
init_schema();
init_token();
init_membership();
function todayStr() {
  const d = /* @__PURE__ */ new Date();
  const p = (n2) => String(n2).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
async function getAiUsedToday(db, userId) {
  const [r] = await db.select({ c: aiDailyUsage.count }).from(aiDailyUsage).where(and29(eq33(aiDailyUsage.userId, userId), eq33(aiDailyUsage.day, todayStr()))).limit(1);
  return Number(r?.c ?? 0);
}
async function incrAiUsedToday(db, userId) {
  const day = todayStr();
  const res = await db.update(aiDailyUsage).set({ count: sql19`${aiDailyUsage.count} + 1` }).where(and29(eq33(aiDailyUsage.userId, userId), eq33(aiDailyUsage.day, day)));
  const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
  if (!affected2) {
    try {
      await db.insert(aiDailyUsage).values({ userId, day, count: 1 });
    } catch {
    }
  }
}
var REPORT_TYPES = [
  { key: "project", name: "\u9879\u76EE\u5C3D\u8C03\u62A5\u544A", icon: "cube", priceNN: 50, desc: "\u5BF9 Web3 \u9879\u76EE\u505A\u57FA\u672C\u9762 / \u56E2\u961F / \u4EE3\u5E01 / \u98CE\u9669\u5C3D\u8C03", placeholder: "\u8F93\u5165\u9879\u76EE\u540D\u79F0\u6216\u5B98\u7F51 / \u5408\u7EA6\uFF0C\u5982 Arbitrum" },
  { key: "security", name: "\u5408\u7EA6\u5B89\u5168\u901F\u8BC4", icon: "shield-checkmark", priceNN: 80, desc: "\u5BF9\u667A\u80FD\u5408\u7EA6 / \u4EE3\u5E01\u505A\u5B89\u5168\u98CE\u9669\u901F\u8BC4\uFF08\u975E\u6B63\u5F0F\u5BA1\u8BA1\uFF09", placeholder: "\u8F93\u5165\u5408\u7EA6\u5730\u5740\u6216\u9879\u76EE\u540D" },
  { key: "market", name: "\u8D5B\u9053\u884C\u60C5\u7814\u5224", icon: "trending-up", priceNN: 60, desc: "\u5BF9\u67D0\u4E2A\u8D5B\u9053 / \u5E01\u79CD\u505A\u884C\u60C5\u4E0E\u8D8B\u52BF\u7814\u5224", placeholder: "\u8F93\u5165\u8D5B\u9053\u6216\u5E01\u79CD\uFF0C\u5982 RWA\u3001Solana \u751F\u6001" }
];
function getReportType(key) {
  return REPORT_TYPES.find((t3) => t3.key === key);
}
function buildReportPrompt(queryType, queryText) {
  const role = queryType === "security" ? "\u4F60\u662F\u8D44\u6DF1\u667A\u80FD\u5408\u7EA6\u5B89\u5168\u7814\u7A76\u5458" : queryType === "market" ? "\u4F60\u662F\u8D44\u6DF1\u52A0\u5BC6\u5E02\u573A\u5206\u6790\u5E08" : "\u4F60\u662F\u8D44\u6DF1 Web3 \u9879\u76EE\u5C3D\u8C03\u5206\u6790\u5E08";
  const ask = queryType === "security" ? "\u56F4\u7ED5\uFF1A\u5408\u7EA6/\u4EE3\u5E01\u6982\u51B5\u3001\u5E38\u89C1\u98CE\u9669\u70B9(\u6743\u9650/\u589E\u53D1/\u871C\u7F50/\u53EF\u6682\u505C\u7B49)\u3001\u53EF\u7591\u4FE1\u53F7\u3001\u98CE\u9669\u7B49\u7EA7\u3001\u7ED9\u6563\u6237\u7684\u6CE8\u610F\u4E8B\u9879" : queryType === "market" ? "\u56F4\u7ED5\uFF1A\u8D5B\u9053/\u6807\u7684\u6982\u51B5\u3001\u5F53\u524D\u5E02\u573A\u60C5\u7EEA\u4E0E\u8D44\u91D1\u9762\u3001\u4E3B\u8981\u53D9\u4E8B\u4E0E\u50AC\u5316\u3001\u98CE\u9669\u3001\u5173\u6CE8\u8981\u70B9" : "\u56F4\u7ED5\uFF1A\u9879\u76EE\u6982\u51B5\u3001\u56E2\u961F\u4E0E\u80CC\u666F\u3001\u4EE3\u5E01\u7ECF\u6D4E\u3001\u4EA7\u54C1\u4E0E\u8FDB\u5C55\u3001\u7ADE\u54C1\u3001\u4EAE\u70B9\u4E0E\u98CE\u9669\u3001\u7ED3\u8BBA";
  return [
    {
      role: "system",
      content: `${role}\u3002\u8BF7\u57FA\u4E8E\u516C\u5F00\u8BA4\u77E5\u751F\u6210\u4E00\u4EFD\u4E2D\u6587\u7814\u7A76\u62A5\u544A\uFF0C\u7ED3\u6784\u6E05\u6670\u3001\u5BA2\u89C2\u4E13\u4E1A\uFF0C\u4F7F\u7528 Markdown \u5C0F\u6807\u9898\u3002${ask}\u3002\u4E0D\u5F97\u7F16\u9020\u7CBE\u786E\u6570\u5B57\u6216\u627F\u8BFA\u6536\u76CA\u3002\u62A5\u544A\u672B\u5C3E\u5FC5\u987B\u52A0\u4E00\u884C\u98CE\u9669\u63D0\u793A\uFF1A\u672C\u62A5\u544A\u7531 AI \u751F\u6210\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u4EFB\u4F55\u6295\u8D44\u5EFA\u8BAE\u3002

\u8F93\u51FA\u683C\u5F0F\u4E25\u683C\u4E3A\uFF1A
\u3010\u6458\u8981\u3011\u7528\u4E00\u53E5\u8BDD(40\u5B57\u5185)\u6982\u62EC\u7ED3\u8BBA
\u3010\u6B63\u6587\u3011
(Markdown \u6B63\u6587)`
    },
    { role: "user", content: `\u8BF7\u9488\u5BF9\u300C${queryText}\u300D\u751F\u6210${getReportType(queryType)?.name ?? "\u7814\u7A76\u62A5\u544A"}\u3002` }
  ];
}
var DEFAULT_AI_CHAT_COST = 10;
var _costCache = null;
async function getAiChatCost() {
  if (_costCache && Date.now() - _costCache.at < 6e4) return _costCache.value;
  let value = DEFAULT_AI_CHAT_COST;
  try {
    const db = await getDb();
    if (db) {
      const [row] = await db.select({ cost: appConfig.aiChatCost }).from(appConfig).where(eq33(appConfig.platform, "all")).limit(1);
      if (row && Number.isFinite(Number(row.cost))) value = Math.max(0, Number(row.cost));
    }
  } catch {
  }
  _costCache = { value, at: Date.now() };
  return value;
}
var SYSTEM_PROMPT = `\u4F60\u662F\u6BD4\u7279AI\u793E\u4EA4\u7684 AI \u5206\u6790\u52A9\u624B\uFF0C\u4E13\u6CE8\u52A0\u5BC6\u8D27\u5E01 / Web3\uFF1A\u884C\u60C5\u7814\u5224\u3001\u9879\u76EE\u5206\u6790\u3001\u94FE\u4E0A\u4E0E\u5B8F\u89C2\u3001\u98CE\u9669\u63D0\u793A\u3001\u64CD\u4F5C\u601D\u8DEF\u3002

\u4F60\u5177\u5907\u5DE5\u5177\u80FD\u529B\uFF0C\u53EF\u4EE5\uFF1A\u67E5\u8BE2\u4EE3\u5E01\u5B9E\u65F6\u884C\u60C5(get_token_price)\u3001\u8BFB\u53D6\u7528\u6237\u81EA\u9009(get_watchlist)\u3001\u628A\u4EE3\u5E01\u52A0\u5165\u81EA\u9009(add_to_watchlist)\u3001\u8BBE\u7F6E\u5230\u4EF7\u63D0\u9192(set_price_alert)\u3001\u67E5\u770B\u5DF2\u8BBE\u63D0\u9192(get_my_alerts)\u3002
- \u5F53\u7528\u6237\u95EE"\u73B0\u5728\u591A\u5C11\u94B1/\u6DA8\u8DCC\u5982\u4F55"\u7B49\uFF0C\u8C03\u7528 get_token_price \u62FF\u771F\u5B9E\u6570\u636E\u518D\u56DE\u7B54\uFF0C\u4E0D\u8981\u7F16\u9020\u4EF7\u683C\u3002
- \u5F53\u7528\u6237\u8BF4"\u5E2E\u6211\u76EF/\u63D0\u9192\u6211/\u8DCC\u7834X\u63D0\u9192"\u7B49\uFF0C\u8C03\u7528 set_price_alert\uFF1B"\u52A0\u81EA\u9009/\u5173\u6CE8"\u5219 add_to_watchlist\u3002
- \u6267\u884C\u5DE5\u5177\u540E\uFF0C\u7528\u4E2D\u6587\u81EA\u7136\u3001\u7B80\u6D01\u5730\u544A\u8BC9\u7528\u6237\u7ED3\u679C\u4E0E\u4F60\u7684\u770B\u6CD5\u3002

\u8981\u6C42\uFF1A\u4E2D\u6587\u56DE\u7B54\uFF0C\u7B80\u6D01\u6709\u6761\u7406\uFF0C\u53EF\u7528 Markdown\uFF08\u6807\u9898/\u8981\u70B9/\u8868\u683C\uFF09\uFF1B\u89C2\u70B9\u660E\u786E\u4F46\u8981\u7ED9\u98CE\u9669\u63D0\u793A\uFF0C\u4E0D\u505A"\u7A33\u8D5A/\u4FDD\u8BC1"\u627F\u8BFA\uFF1B\u6D89\u53CA\u4E70\u5356\u63D0\u9192\u7528\u6237\u72EC\u7ACB\u5224\u65AD\u3002`;
var TOOLS = [
  {
    type: "function",
    function: {
      name: "get_token_price",
      description: "\u67E5\u8BE2\u67D0\u52A0\u5BC6\u4EE3\u5E01\u7684\u5B9E\u65F6\u884C\u60C5\uFF08\u4EF7\u683C\u300124h \u6DA8\u8DCC\u3001\u5E02\u503C\uFF09\u3002symbol \u7528\u4EE3\u5E01\u7B26\u53F7\uFF0C\u5982 BTC\u3001ETH\u3001SOL\u3002",
      parameters: { type: "object", properties: { symbol: { type: "string", description: "\u4EE3\u5E01\u7B26\u53F7\uFF0C\u5982 BTC" } }, required: ["symbol"] }
    }
  },
  {
    type: "function",
    function: { name: "get_watchlist", description: "\u83B7\u53D6\u5F53\u524D\u7528\u6237\u7684\u81EA\u9009\u5E01\u5217\u8868\u3002", parameters: { type: "object", properties: {} } }
  },
  {
    type: "function",
    function: {
      name: "add_to_watchlist",
      description: "\u628A\u67D0\u4EE3\u5E01\u52A0\u5165\u7528\u6237\u81EA\u9009\u3002symbol \u7528\u4EE3\u5E01\u7B26\u53F7\u3002",
      parameters: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] }
    }
  },
  {
    type: "function",
    function: {
      name: "set_price_alert",
      description: "\u4E3A\u67D0\u4EE3\u5E01\u8BBE\u7F6E\u5230\u4EF7\u63D0\u9192\u3002condition: above=\u6DA8\u7834, below=\u8DCC\u7834\uFF1BtargetPrice \u4E3A\u76EE\u6807\u4EF7\u683C(USD \u6570\u5B57)\u3002",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          targetPrice: { type: "number" },
          condition: { type: "string", enum: ["above", "below"] }
        },
        required: ["symbol", "targetPrice", "condition"]
      }
    }
  },
  {
    type: "function",
    function: { name: "get_my_alerts", description: "\u83B7\u53D6\u7528\u6237\u5DF2\u8BBE\u7F6E\u4E14\u6709\u6548\u7684\u5230\u4EF7\u63D0\u9192\u5217\u8868\u3002", parameters: { type: "object", properties: {} } }
  }
];
function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => c?.text ?? "").join("");
  return "";
}
async function execTool(name, args, userId) {
  const db = await getDb();
  switch (name) {
    case "get_token_price": {
      const d = await fetchTokenData(String(args?.symbol ?? "")).catch(() => null);
      if (!d) return { found: false };
      return { found: true, id: d.id, symbol: d.symbol, name: d.name, price: d.price, change24h: d.priceChange24h, marketCap: d.marketCap };
    }
    case "get_watchlist": {
      if (!db) return { tokens: [] };
      const rows = await db.select().from(userWatchlist).where(eq33(userWatchlist.userId, userId));
      return { tokens: rows.map((r) => ({ symbol: r.tokenSymbol, name: r.tokenName })) };
    }
    case "add_to_watchlist": {
      if (!db) return { ok: false };
      const d = await fetchTokenData(String(args?.symbol ?? "")).catch(() => null);
      if (!d) return { ok: false, reason: "\u672A\u627E\u5230\u8BE5\u4EE3\u5E01" };
      const exist = await db.select({ id: userWatchlist.id }).from(userWatchlist).where(and29(eq33(userWatchlist.userId, userId), eq33(userWatchlist.tokenId, d.id))).limit(1);
      if (!exist.length) await db.insert(userWatchlist).values({ userId, tokenId: d.id, tokenSymbol: d.symbol, tokenName: d.name });
      return { ok: true, symbol: d.symbol, name: d.name };
    }
    case "set_price_alert": {
      if (!db) return { ok: false };
      const d = await fetchTokenData(String(args?.symbol ?? "")).catch(() => null);
      if (!d) return { ok: false, reason: "\u672A\u627E\u5230\u8BE5\u4EE3\u5E01" };
      const condition = args?.condition === "below" ? "below" : "above";
      const targetPrice = String(args?.targetPrice ?? "");
      if (!targetPrice) return { ok: false, reason: "\u7F3A\u5C11\u76EE\u6807\u4EF7\u683C" };
      await db.insert(priceAlerts).values({ userId, tokenSymbol: d.symbol, tokenId: d.id, targetPrice, condition });
      return { ok: true, symbol: d.symbol, targetPrice, condition };
    }
    case "get_my_alerts": {
      if (!db) return { alerts: [] };
      const rows = await db.select().from(priceAlerts).where(and29(eq33(priceAlerts.userId, userId), eq33(priceAlerts.isActive, true))).orderBy(desc21(priceAlerts.createdAt));
      return { alerts: rows.map((r) => ({ symbol: r.tokenSymbol, targetPrice: r.targetPrice, condition: r.condition, triggered: r.isTriggered })) };
    }
  }
  return { error: "unknown tool" };
}
var aiRouter = router({
  // 会话式 AI 分析 Agent：可调工具（查价 / 自选 / 到价提醒）
  chat: protectedProcedure.use(rateLimitWrite).input(
    z23.object({
      message: z23.string().min(1).max(2e3),
      history: z23.array(z23.object({ role: z23.enum(["user", "assistant"]), content: z23.string().max(4e3) })).max(20).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u6682\u65F6\u4E0D\u53EF\u7528" });
    const cost = await getAiChatCost();
    const benefits = await getBenefits(db, ctx.user.id);
    const usedToday = await getAiUsedToday(db, ctx.user.id);
    const freeQuota = benefits.aiDailyFree;
    const isFree = usedToday < freeQuota;
    const freeRemaining = Math.max(0, freeQuota - usedToday);
    const [row] = await db.select({ nn: users.nnBalance }).from(users).where(eq33(users.id, ctx.user.id)).limit(1);
    const balance = Number(row?.nn ?? 0);
    if (!isFree && balance < cost) {
      const quotaLine = freeQuota > 0 ? `\u4F60\u7684\u4F1A\u5458\u6BCF\u65E5 **${freeQuota} \u6B21**\u514D\u8D39\u5BF9\u8BDD\uFF0C\u5DF2\u7528\u5B8C\uFF1B` : `\u514D\u8D39\u7528\u6237\u5BF9\u8BDD\u6309\u6B21\u8BA1\u8D39\uFF1B`;
      return {
        reply: `${freeQuota > 0 ? "\u4ECA\u65E5\u514D\u8D39\u989D\u5EA6\u5DF2\u7528\u5B8C" : "\u5BF9\u8BDD\u6309\u6B21\u8BA1\u8D39"} \u{1F4A1}

${quotaLine}\u6BCF\u6B21\u6D88\u8017 **${cost} BIT**\uFF0C\u5F53\u524D\u4F59\u989D **${balance} BIT**\u3002
\u5F00\u901A\u4F1A\u5458\u53EF\u4EAB\u6BCF\u65E5\u514D\u8D39\u989D\u5EA6\uFF08Plus 3 \u6B21 / Pro 10 \u6B21\uFF09\uFF0C\u6216\u5148\u83B7\u53D6 BIT\u3002`,
        actions: [],
        insufficient: true,
        cost,
        npRemaining: balance,
        nnRemaining: balance,
        freeRemaining: 0
      };
    }
    let charged = false;
    if (!isFree) {
      charged = await spendNN(db, ctx.user.id, cost, { type: "ai_chat", refType: "user", refId: ctx.user.id, memo: "AI\u5BF9\u8BDD" });
      if (!charged) {
        const [b2] = await db.select({ nn: users.nnBalance }).from(users).where(eq33(users.id, ctx.user.id)).limit(1);
        const bal2 = Number(b2?.nn ?? 0);
        return {
          reply: `\u4F59\u989D\u4E0D\u8DB3 \u{1F4A1}

\u6BCF\u6B21\u6D88\u8017 **${cost} AI**\uFF0C\u5F53\u524D\u4F59\u989D **${bal2} AI**\u3002\u5F00\u901A\u4F1A\u5458\u53EF\u4EAB\u6BCF\u65E5\u514D\u8D39\u989D\u5EA6\uFF08Plus 3 \u6B21 / Pro 10 \u6B21\uFF09\u3002`,
          actions: [],
          insufficient: true,
          cost,
          npRemaining: bal2,
          nnRemaining: bal2,
          freeRemaining: 0
        };
      }
    }
    const baseMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(input.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: input.message }
    ];
    const actions = [];
    let finalReply;
    try {
      const first = await invokeLLM({ messages: baseMessages, tools: TOOLS, toolChoice: "auto" });
      const msg = first.choices[0]?.message;
      const toolCalls = msg?.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalReply = extractText(msg?.content).trim() || "\u62B1\u6B49\uFF0C\u6211\u6682\u65F6\u65E0\u6CD5\u56DE\u7B54\uFF0C\u8BF7\u6362\u4E2A\u95EE\u6CD5\u8BD5\u8BD5\u3002";
      } else {
        const results = [];
        for (const tc of toolCalls.slice(0, 6)) {
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
          }
          const result = await execTool(tc.function.name, args, ctx.user.id);
          results.push({ tool: tc.function.name, args, result });
          if (tc.function.name === "add_to_watchlist" && result?.ok) actions.push(`\u5DF2\u5C06 ${result.symbol} \u52A0\u5165\u81EA\u9009`);
          if (tc.function.name === "set_price_alert" && result?.ok)
            actions.push(`\u5DF2\u8BBE\u7F6E ${result.symbol} ${result.condition === "above" ? "\u6DA8\u7834" : "\u8DCC\u7834"} ${result.targetPrice} \u63D0\u9192`);
        }
        const second = await invokeLLM({
          messages: [
            ...baseMessages,
            {
              role: "system",
              content: "\u4F60\u521A\u8C03\u7528\u4E86\u5DE5\u5177\uFF0C\u7ED3\u679C\u5982\u4E0B\uFF08JSON\uFF09\u3002\u8BF7\u636E\u6B64\u7528\u4E2D\u6587\u81EA\u7136\u3001\u7B80\u6D01\u5730\u56DE\u590D\u7528\u6237\uFF0C\u5FC5\u8981\u65F6\u7528\u8981\u70B9\u6216\u8868\u683C\uFF0C\u660E\u786E\u544A\u8BC9\u7528\u6237\u5DF2\u6267\u884C\u7684\u64CD\u4F5C\u4E0E\u4F60\u7684\u770B\u6CD5\uFF1B\u4E0D\u8981\u8F93\u51FA JSON \u539F\u6587\u3002\n" + JSON.stringify(results)
            }
          ]
        });
        finalReply = extractText(second.choices[0]?.message?.content).trim() || "\u5DF2\u4E3A\u4F60\u5904\u7406\u5B8C\u6210\u3002";
      }
    } catch {
      if (charged) {
        await grantNN(db, ctx.user.id, cost, { type: "ai_chat_refund", refType: "user", refId: ctx.user.id, memo: "\u751F\u6210\u5931\u8D25\u9000\u6B3E" });
      }
      return { reply: "AI \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002", actions, insufficient: false, cost, npRemaining: balance, nnRemaining: balance };
    }
    await incrAiUsedToday(db, ctx.user.id);
    if (isFree) {
      return { reply: finalReply, actions, insufficient: false, cost: 0, npRemaining: balance, nnRemaining: balance, freeRemaining: Math.max(0, freeRemaining - 1) };
    }
    const [after] = await db.select({ nn: users.nnBalance }).from(users).where(eq33(users.id, ctx.user.id)).limit(1);
    const nnRemaining = Number(after?.nn ?? Math.max(0, balance - cost));
    return { reply: finalReply, actions, insufficient: false, cost, npRemaining: nnRemaining, nnRemaining, freeRemaining: 0 };
  }),
  // 当前 AI 单价（供前端展示）
  config: protectedProcedure.query(async () => {
    return { cost: await getAiChatCost() };
  }),
  // 管理员设置 AI 单价（写入 app_config，立即生效）
  setCost: adminProcedure.input(z23.object({ cost: z23.number().int().min(0).max(1e3) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const existing = await db.select({ id: appConfig.id }).from(appConfig).where(eq33(appConfig.platform, "all")).limit(1);
    if (existing.length > 0) {
      await db.update(appConfig).set({ aiChatCost: input.cost }).where(eq33(appConfig.platform, "all"));
    } else {
      await db.insert(appConfig).values({ platform: "all", aiChatCost: input.cost });
    }
    _costCache = null;
    return { success: true, cost: input.cost };
  }),
  // ─── AI 付费研报（AI 计价） ────────────────────────────────────────────────
  reportTypes: protectedProcedure.query(() => ({ types: REPORT_TYPES })),
  // 我的研报列表（不含全文）
  myReports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: consultingReports.id,
      queryType: consultingReports.queryType,
      queryText: consultingReports.queryText,
      summary: consultingReports.summary,
      status: consultingReports.status,
      pricePaid: consultingReports.pricePaid,
      createdAt: consultingReports.createdAt
    }).from(consultingReports).where(eq33(consultingReports.userId, ctx.user.id)).orderBy(desc21(consultingReports.createdAt)).limit(50);
  }),
  // 研报详情（仅本人可看全文）
  getReport: protectedProcedure.input(z23.object({ reportId: z23.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const [r] = await db.select().from(consultingReports).where(eq33(consultingReports.id, input.reportId)).limit(1);
    if (!r || r.userId !== ctx.user.id) throw new TRPCError19({ code: "FORBIDDEN", message: "\u62A5\u544A\u4E0D\u5B58\u5728" });
    return r;
  }),
  // 下单生成研报：扣 AI → 调 LLM 生成 → 完成；失败退款
  createReport: protectedProcedure.input(z23.object({
    queryType: z23.enum(["project", "security", "market"]),
    queryText: z23.string().min(2).max(200)
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const type = getReportType(input.queryType);
    if (!type) throw new TRPCError19({ code: "BAD_REQUEST", message: "\u672A\u77E5\u62A5\u544A\u7C7B\u578B" });
    const ok = await spendNN(db, ctx.user.id, type.priceNN, { type: "report", refType: "report", memo: input.queryType });
    if (!ok) throw new TRPCError19({ code: "BAD_REQUEST", message: "BIT \u4F59\u989D\u4E0D\u8DB3" });
    const [ins] = await db.insert(consultingReports).values({
      userId: ctx.user.id,
      queryType: input.queryType,
      queryText: input.queryText,
      status: "generating",
      pricePaid: String(type.priceNN)
    });
    const reportId = ins.insertId;
    try {
      const resp = await invokeLLM({ messages: buildReportPrompt(input.queryType, input.queryText) });
      const raw = resp.choices?.[0]?.message?.content;
      const text2 = typeof raw === "string" ? raw.trim() : "";
      if (!text2 || text2.length < 30) throw new Error("empty");
      let summary = "";
      let content = text2;
      const m = text2.match(/【摘要】([\s\S]*?)【正文】([\s\S]*)/);
      if (m) {
        summary = m[1].trim();
        content = m[2].trim();
      } else {
        summary = text2.replace(/\s+/g, " ").slice(0, 60);
      }
      await db.update(consultingReports).set({ summary: summary.slice(0, 300), fullContent: content, status: "completed" }).where(eq33(consultingReports.id, reportId));
      return { reportId, status: "completed", summary: summary.slice(0, 300), fullContent: content };
    } catch (err) {
      await db.update(consultingReports).set({ status: "failed" }).where(eq33(consultingReports.id, reportId));
      await grantNN(db, ctx.user.id, type.priceNN, { type: "report_refund", refType: "report", refId: reportId, memo: "\u751F\u6210\u5931\u8D25\u9000\u6B3E" });
      throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "\u62A5\u544A\u751F\u6210\u5931\u8D25\uFF0C\u5DF2\u9000\u8FD8 AI" });
    }
  })
});

// server/routers/calls.ts
import { z as z24 } from "zod";
import { TRPCError as TRPCError20 } from "@trpc/server";
init_db();
init_schema();
init_referralRewards();
init_appAdmin();
import { eq as eq35, and as and31, desc as desc22, sql as sql21, count as count6, gte as gte8 } from "drizzle-orm";

// server/callResolver.ts
init_db();
init_schema();
import { eq as eq34, and as and30, lte, sql as sql20 } from "drizzle-orm";

// server/callSpot.ts
var CG_ID = { BTC: "bitcoin", ETH: "ethereum" };
var lastPx = /* @__PURE__ */ new Map();
var BN_SYMS = "%5B%22BTCUSDT%22,%22ETHUSDT%22%5D";
function toSym(pair) {
  if (pair === "BTCUSDT") return "BTC";
  if (pair === "ETHUSDT") return "ETH";
  return null;
}
async function fetchCallLiveQuotes() {
  const [live, chg] = await Promise.all([
    cachedFetch(
      "call-quotes-px",
      `https://api.binance.com/api/v3/ticker/price?symbols=${BN_SYMS}`,
      1200,
      (res) => res.json()
    ),
    cachedFetch(
      "call-quotes-24h",
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${BN_SYMS}`,
      2e4,
      (res) => res.json()
    )
  ]);
  const chgMap = /* @__PURE__ */ new Map();
  if (Array.isArray(chg)) {
    for (const row of chg) {
      const s = toSym(row.symbol);
      const p = Number(row.priceChangePercent);
      if (s && Number.isFinite(p)) chgMap.set(s, p);
    }
  }
  const fromBn = [];
  if (Array.isArray(live)) {
    for (const row of live) {
      const symbol = toSym(row.symbol);
      const price = Number(row.price);
      if (!symbol || !(price > 0)) continue;
      const prev = lastPx.get(symbol);
      lastPx.set(symbol, price);
      const delta = prev != null ? price - prev : 0;
      fromBn.push({
        symbol,
        price,
        change24h: chgMap.get(symbol) ?? null,
        tick: delta > 1e-8 ? "up" : delta < -1e-8 ? "down" : "flat",
        delta
      });
    }
  }
  if (fromBn.length >= 1) return fromBn;
  const cg = await cachedFetch(
    "call-quotes-cg",
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
    8e3,
    (res) => res.json()
  );
  const out = [];
  for (const [symbol, id] of [["BTC", "bitcoin"], ["ETH", "ethereum"]]) {
    const price = cg?.[id]?.usd;
    if (!(typeof price === "number" && price > 0)) continue;
    const prev = lastPx.get(symbol);
    lastPx.set(symbol, price);
    const delta = prev != null ? price - prev : 0;
    const ch = cg?.[id]?.usd_24h_change;
    out.push({
      symbol,
      price,
      change24h: typeof ch === "number" ? ch : null,
      tick: delta > 1e-8 ? "up" : delta < -1e-8 ? "down" : "flat",
      delta
    });
  }
  return out;
}
function parseKlines(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const k of rows) {
    if (!Array.isArray(k) || k.length < 5) continue;
    const t3 = Number(k[0]), o = Number(k[1]), h = Number(k[2]), l = Number(k[3]), c = Number(k[4]);
    if (t3 > 0 && o > 0 && h > 0 && l > 0 && c > 0) out.push({ t: t3, o, h, l, c });
  }
  return out;
}
async function fetchJsonQuick(url, timeoutMs = 4e3) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 BitchatCall/1.0", Accept: "application/json" }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}
function parseBybitKlines(json) {
  const list = json?.result?.list;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const k of list) {
    if (!Array.isArray(k) || k.length < 5) continue;
    const t3 = Number(k[0]), o = Number(k[1]), h = Number(k[2]), l = Number(k[3]), c = Number(k[4]);
    if (t3 > 0 && o > 0 && h > 0 && l > 0 && c > 0) out.push({ t: t3, o, h, l, c });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
function klineQuality(bars) {
  if (bars.length < 2) return 0;
  const ranged = bars.filter((b) => b.h > b.l).length;
  const closes = bars.map((b) => b.c);
  const span = Math.max(...closes) - Math.min(...closes);
  const rel = span / (closes[0] || 1);
  return ranged * 20 + rel * 1e4 + bars.length;
}
var SPARK_CACHE_MS = 8e3;
var sparkCache = /* @__PURE__ */ new Map();
async function fetchSymbolKlines(symbol) {
  const hit = sparkCache.get(symbol);
  if (hit && Date.now() - hit.at < SPARK_CACHE_MS && klineQuality(hit.bars) > 40) return hit.bars;
  const pair = `${symbol}USDT`;
  const sources = [
    { url: `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1m&limit=40`, parse: parseKlines },
    { url: `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=40`, parse: parseKlines },
    { url: `https://api1.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=40`, parse: parseKlines },
    { url: `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=1&limit=40`, parse: parseBybitKlines }
  ];
  let best = hit?.bars ?? [];
  let bestQ = klineQuality(best);
  await new Promise((resolve) => {
    let left = sources.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    for (const s of sources) {
      void fetchJsonQuick(s.url, 2200).then((raw) => {
        const bars = s.parse(raw);
        const q = klineQuality(bars);
        if (q > bestQ) {
          bestQ = q;
          best = bars;
        }
        if (q > 40) finish();
        if (--left === 0) finish();
      });
    }
  });
  if (best.length >= 2) {
    sparkCache.set(symbol, { at: Date.now(), bars: best });
    return best;
  }
  return hit?.bars ?? [];
}
async function fetchCallSparklines() {
  const [btc, eth] = await Promise.all([fetchSymbolKlines("BTC"), fetchSymbolKlines("ETH")]);
  return { BTC: btc, ETH: eth };
}
async function fetchCallSpotPrice(symbol) {
  const sym = symbol.toUpperCase();
  const pair = BINANCE_PAIR[sym];
  if (pair) {
    const bn = await cachedFetch(
      `call-spot-bn:${pair}`,
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
      1200,
      (res) => res.json()
    );
    const bnPx = Number(bn?.price);
    if (bnPx > 0) {
      lastPx.set(sym, bnPx);
      return bnPx;
    }
    const vis = await fetchJsonQuick(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${pair}`, 2200);
    const visPx = Number(vis?.price);
    if (visPx > 0) {
      lastPx.set(sym, visPx);
      return visPx;
    }
    const by = await fetchJsonQuick(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}`, 2200);
    const byPx = Number(by?.result?.list?.[0]?.lastPrice);
    if (byPx > 0) {
      lastPx.set(sym, byPx);
      return byPx;
    }
  }
  const id = CG_ID[sym];
  if (id) {
    const cg = await cachedFetch(
      `call-spot-cg:${id}`,
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      TTL.prices,
      (res) => res.json()
    );
    const cgPx = cg?.[id]?.usd;
    if (typeof cgPx === "number" && cgPx > 0) {
      lastPx.set(sym, cgPx);
      return cgPx;
    }
  }
  const mem = lastPx.get(sym);
  return mem && mem > 0 ? mem : null;
}
var BINANCE_PAIR = { BTC: "BTCUSDT", ETH: "ETHUSDT" };
function binanceInterval(horizonMin) {
  if (horizonMin === 60) return "1h";
  if (horizonMin === 5 || horizonMin === 15 || horizonMin === 30) return `${horizonMin}m`;
  return null;
}
function bybitInterval(horizonMin) {
  if (horizonMin === 60) return "60";
  if (horizonMin === 5 || horizonMin === 15 || horizonMin === 30) return String(horizonMin);
  return null;
}
function pickWindowOHLC(bars, openMs) {
  if (!bars.length) return null;
  let best = bars[0];
  let bestD = Math.abs(best.t - openMs);
  for (const b of bars) {
    const d = Math.abs(b.t - openMs);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  if (bestD > 6e4 || !(best.o > 0) || !(best.c > 0)) return null;
  return { open: best.o, close: best.c, high: best.h, low: best.l };
}
function ohlcFrom1m(bars, openMs, horizonMin) {
  const closeMs = openMs + horizonMin * 6e4;
  const inWin = bars.filter((b) => b.t >= openMs - 1e3 && b.t < closeMs + 1e3).sort((a, b) => a.t - b.t);
  if (inWin.length < 2) return null;
  const open = inWin[0].o;
  const close = inWin[inWin.length - 1].c;
  if (!(open > 0) || !(close > 0)) return null;
  const high = Math.max(...inWin.map((b) => b.h));
  const low = Math.min(...inWin.map((b) => b.l));
  return { open, close, high, low };
}
async function raceParsedKlines(sources, minBars = 1) {
  let best = [];
  let bestN = 0;
  await new Promise((resolve) => {
    let left = sources.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (!sources.length) {
      finish();
      return;
    }
    for (const s of sources) {
      void fetchJsonQuick(s.url, 2500).then((raw) => {
        const bars = s.parse(raw);
        if (bars.length > bestN) {
          bestN = bars.length;
          best = bars;
        }
        if (bars.length >= minBars) finish();
        if (--left === 0) finish();
      });
    }
  });
  return best;
}
async function fetchCallWindowOHLC(symbol, openMs, horizonMin) {
  const sym = symbol.toUpperCase();
  const pair = BINANCE_PAIR[sym];
  const interval = binanceInterval(horizonMin);
  const start = Math.max(0, openMs - 5e3);
  const sources = [];
  if (pair && interval) {
    sources.push(
      { url: `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=2`, parse: parseKlines },
      { url: `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=2`, parse: parseKlines },
      { url: `https://api1.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=2`, parse: parseKlines }
    );
  }
  const bv = bybitInterval(horizonMin);
  if (pair && bv) {
    sources.push({
      url: `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${bv}&start=${start}&limit=2`,
      parse: parseBybitKlines
    });
  }
  const hit = pickWindowOHLC(await raceParsedKlines(sources), openMs);
  if (hit) return hit;
  if (pair) {
    const need = Math.min(horizonMin, 60);
    const oneMin = await raceParsedKlines([
      { url: `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1m&startTime=${openMs}&limit=${need}`, parse: parseKlines },
      { url: `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&startTime=${openMs}&limit=${need}`, parse: parseKlines },
      { url: `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=1&start=${openMs}&limit=${need}`, parse: parseBybitKlines }
    ], Math.max(2, Math.floor(need * 0.7)));
    const from1m = ohlcFrom1m(oneMin, openMs, horizonMin);
    if (from1m) return from1m;
  }
  const toTs = Math.floor((openMs + horizonMin * 6e4) / 1e3);
  const cc = await cachedFetch(
    `call-histominute:${sym}:${openMs}:${horizonMin}`,
    `https://min-api.cryptocompare.com/data/v2/histominute?fsym=${sym}&tsym=USD&limit=${Math.min(horizonMin, 60)}&toTs=${toTs}`,
    15e3,
    (res) => res.json()
  );
  const pts = cc?.Data?.Data ?? [];
  if (pts.length >= 2) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first?.open > 0 && last?.close > 0) {
      const highs = pts.map((p) => Number(p.high ?? Math.max(p.open, p.close)));
      const lows = pts.map((p) => Number(p.low ?? Math.min(p.open, p.close)));
      return {
        open: first.open,
        close: last.close,
        high: Math.max(...highs.filter((n2) => n2 > 0), first.open, last.close),
        low: Math.min(...lows.filter((n2) => n2 > 0), first.open, last.close)
      };
    }
  }
  return null;
}

// server/callWindow.ts
var CALL_HORIZONS_MIN = [5, 15, 30, 60];
var CALL_LOCK_MINUTES = 1;
function horizonToMinutes(horizonHoursField) {
  if (horizonHoursField === 24 || horizonHoursField === 72 || horizonHoursField === 168 || horizonHoursField === 720) {
    return horizonHoursField * 60;
  }
  return horizonHoursField;
}
function overdueVoidMs(horizonMin) {
  return horizonMin <= 60 ? 2 * 36e5 : 3 * 864e5;
}
function alignWindow(closeMs, horizonMin) {
  const period = Math.max(1, horizonMin) * 6e4;
  const close = Math.round(closeMs / period) * period;
  return { openMs: close - period, closeMs: close };
}
function nextFullWindow(horizonMin, nowMs = Date.now(), lockMin = CALL_LOCK_MINUTES) {
  const period = Math.max(1, horizonMin) * 6e4;
  const lock = Math.max(0, lockMin) * 6e4;
  const currentOpen = Math.floor(nowMs / period) * period;
  let open = currentOpen;
  if (nowMs - currentOpen > 2e3) open = currentOpen + period;
  if (open - nowMs > 0 && open - nowMs <= lock) open += period;
  return { openMs: open, closeMs: open + period };
}

// server/callResolver.ts
init_logger();
var WIN_NP = 150;
var WIN_REP = 100;
var LOSE_REP = 40;
var STAKE_ODDS = 1.8;
function judgeCallSide(entry, close, extra) {
  if (close > entry) return "up";
  if (close < entry) return "down";
  const high = extra?.high;
  const low = extra?.low;
  if (high != null && low != null && Number.isFinite(high) && Number.isFinite(low)) {
    const upW = high - entry;
    const dnW = entry - low;
    if (upW > dnW) return "up";
    if (dnW > upW) return "down";
  }
  return "down";
}
var STAKE_WIN_BONUS = STAKE_ODDS - 1;
function stakePayout(amount, callStatus) {
  if (callStatus === "win") return Math.round(amount * STAKE_ODDS);
  if (callStatus === "void") return amount;
  return 0;
}
async function settleStakesForCall(db, callId, callStatus) {
  const stakes = await db.select().from(curationStakes).where(and30(eq34(curationStakes.callId, callId), eq34(curationStakes.status, "active")));
  for (const s of stakes) {
    const payout = stakePayout(s.amount, callStatus);
    const status = callStatus === "win" ? "won" : callStatus === "void" ? "void" : "lost";
    await db.update(curationStakes).set({ status, payout, settledAt: /* @__PURE__ */ new Date() }).where(eq34(curationStakes.id, s.id));
    if (payout > 0) {
      const credited = await db.update(users).set({ npPoints: sql20`npPoints + ${payout}` }).where(eq34(users.id, s.stakerId));
      const rows = Number(credited?.[0]?.affectedRows ?? credited?.affectedRows ?? credited?.rowsAffected ?? 0);
      if (rows < 1) logger_default.warn({ callId, stakeId: s.id, stakerId: s.stakerId, payout }, "callResolver: \u8FD4\u8FD8 IT \u672A\u5199\u5165");
      else logger_default.info({ callId, stakerId: s.stakerId, payout, status }, "callResolver: \u4E0B\u6CE8\u8FD4\u8FD8\u5DF2\u5165\u8D26");
    }
  }
}
async function resolveDueCalls(db, onlyUserId) {
  const due = await db.select().from(calls).where(and30(
    eq34(calls.status, "pending"),
    lte(calls.resolveAt, /* @__PURE__ */ new Date()),
    onlyUserId ? eq34(calls.userId, onlyUserId) : sql20`1=1`
  )).limit(200);
  if (due.length === 0) return 0;
  const priceCache2 = /* @__PURE__ */ new Map();
  let processed = 0;
  for (const c of due) {
    try {
      const horizonMin = horizonToMinutes(c.horizonHours);
      const win = alignWindow(new Date(c.resolveAt).getTime(), horizonMin);
      const closeMs = win.closeMs;
      const openMs = win.openMs;
      let entry = Number(c.entryPrice);
      let cur = null;
      let ohlcExtra;
      if (horizonMin <= 60) {
        const ohlc = await fetchCallWindowOHLC(c.tokenSymbol, openMs, horizonMin);
        if (ohlc) {
          entry = ohlc.open;
          cur = ohlc.close;
          ohlcExtra = { high: ohlc.high, low: ohlc.low };
        } else if (Date.now() - closeMs < 3 * 6e4) {
          continue;
        } else {
          let spot;
          const cached = priceCache2.get(c.tokenSymbol);
          if (cached !== void 0) spot = cached;
          else {
            spot = await fetchCallSpotPrice(c.tokenSymbol);
            priceCache2.set(c.tokenSymbol, spot);
          }
          cur = spot;
        }
      } else {
        let spot;
        const cached = priceCache2.get(c.tokenSymbol);
        if (cached !== void 0) {
          spot = cached;
        } else {
          spot = await fetchCallSpotPrice(c.tokenSymbol);
          priceCache2.set(c.tokenSymbol, spot);
        }
        cur = spot;
      }
      if (!cur || !entry || entry <= 0) {
        const overdueMs = Date.now() - closeMs;
        if (overdueMs > overdueVoidMs(horizonMin)) {
          await db.update(calls).set({ status: "void", resolvedAt: /* @__PURE__ */ new Date() }).where(eq34(calls.id, c.id));
          await settleStakesForCall(db, c.id, "void");
          processed++;
        }
        continue;
      }
      const changeBp = Math.round((cur - entry) / entry * 1e4);
      const side = judgeCallSide(entry, cur, ohlcExtra);
      const status = c.direction === "long" && side === "up" || c.direction === "short" && side === "down" ? "win" : "lose";
      const upd = await db.update(calls).set({ status, resolvedPrice: String(cur), entryPrice: String(entry), changeBp, resolvedAt: /* @__PURE__ */ new Date() }).where(and30(eq34(calls.id, c.id), eq34(calls.status, "pending")));
      const changed = Number(upd?.[0]?.affectedRows ?? upd?.rowsAffected ?? 0);
      if (changed < 1) continue;
      const [selfBet] = await db.select({ id: curationStakes.id }).from(curationStakes).where(and30(eq34(curationStakes.callId, c.id), eq34(curationStakes.stakerId, c.userId))).limit(1);
      if (status === "win") {
        if (selfBet) {
          await db.update(users).set({ reputation: sql20`reputation + ${WIN_REP}` }).where(eq34(users.id, c.userId));
        } else {
          await db.update(users).set({ npPoints: sql20`npPoints + ${WIN_NP}`, reputation: sql20`reputation + ${WIN_REP}` }).where(eq34(users.id, c.userId));
        }
      } else if (status === "lose") {
        await db.update(users).set({ reputation: sql20`GREATEST(0, reputation - ${LOSE_REP})` }).where(eq34(users.id, c.userId));
      }
      await settleStakesForCall(db, c.id, status);
      processed++;
    } catch (err) {
      logger_default.warn({ err, callId: c.id }, "callResolver: \u5355\u6761\u7ED3\u7B97\u5931\u8D25");
    }
  }
  if (processed > 0) logger_default.info({ processed }, "callResolver: \u6218\u7EE9\u7ED3\u7B97\u5B8C\u6210");
  return processed;
}
function startCallResolver() {
  const tick = async () => {
    try {
      const db = await getDb();
      if (db) await resolveDueCalls(db);
    } catch (err) {
      logger_default.warn({ err }, "callResolver: \u7ED3\u7B97\u4EFB\u52A1\u5F02\u5E38");
    }
  };
  setInterval(() => {
    void tick();
  }, 60 * 1e3);
  void tick();
}

// server/routers/calls.ts
var HORIZONS = CALL_HORIZONS_MIN;
var BET_SYMBOLS = ["BTC", "ETH"];
var MIN_STAKE = 10;
var MAX_STAKE = 5e3;
function ymdUtc4(d = /* @__PURE__ */ new Date()) {
  return d.toISOString().slice(0, 10);
}
var callsRouter = router({
  /** 固定赔率与可选标的（前端展示用） */
  meta: publicProcedure.query(() => ({
    odds: STAKE_ODDS,
    symbols: [...BET_SYMBOLS],
    horizons: [...HORIZONS],
    lockMinutes: CALL_LOCK_MINUTES,
    minStake: MIN_STAKE,
    maxStake: MAX_STAKE,
    dailyLimit: 0
  })),
  /** BTC/ETH 现价 + 近 40 分钟 1m K 线。前端 1.5s 轮询，页面不刷新也跟着跳。 */
  quotes: publicProcedure.query(async () => {
    const [quotes, charts] = await Promise.all([fetchCallLiveQuotes(), fetchCallSparklines()]);
    for (const q of quotes) {
      const bars = charts[q.symbol];
      if (!bars?.length) continue;
      const last = bars[bars.length - 1];
      last.c = q.price;
      last.h = Math.max(last.h, q.price);
      last.l = Math.min(last.l, q.price);
    }
    return { quotes, charts, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }),
  // ─── 用 IT 猜涨跌（主入口）────────────────────────────────────────────────
  placeBet: protectedProcedure.input(z24.object({
    tokenSymbol: z24.enum(BET_SYMBOLS),
    direction: z24.enum(["long", "short"]),
    horizonHours: z24.number().refine((h) => HORIZONS.includes(h), "\u65E0\u6548\u7684\u65F6\u95F4\u7A97"),
    amount: z24.number().int().min(MIN_STAKE).max(MAX_STAKE)
  })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const admin = isAppAdmin(ctx.user);
    if (!admin && !await isReferralBound(db, ctx.user.id)) {
      throw new TRPCError20({ code: "FORBIDDEN", message: "\u8BF7\u5148\u5728\u4EFB\u52A1\u4E2D\u5FC3\u7ED1\u5B9A\u9080\u8BF7\u4EBA\uFF0C\u518D\u53C2\u4E0E\u731C\u6DA8\u8DCC" });
    }
    await resolveDueCalls(db, ctx.user.id);
    const ymd = ymdUtc4();
    const symbol = input.tokenSymbol;
    const price = await fetchCallSpotPrice(symbol);
    if (!price || price <= 0) {
      throw new TRPCError20({ code: "BAD_REQUEST", message: `\u6682\u65F6\u65E0\u6CD5\u83B7\u53D6 ${symbol} \u4EF7\u683C\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5` });
    }
    const window = nextFullWindow(input.horizonHours);
    const resolveAt = new Date(window.closeMs);
    const potentialWin = stakePayout(input.amount, "win");
    const callId = await db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq35(users.id, ctx.user.id)).for("update").limit(1);
      const res = await tx.update(users).set({ npPoints: sql21`npPoints - ${input.amount}` }).where(and31(eq35(users.id, ctx.user.id), gte8(users.npPoints, input.amount)));
      const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
      if (affected2 < 1) throw new TRPCError20({ code: "BAD_REQUEST", message: "IT \u4F59\u989D\u4E0D\u8DB3" });
      const [result] = await tx.insert(calls).values({
        userId: ctx.user.id,
        tokenSymbol: symbol,
        direction: input.direction,
        horizonHours: input.horizonHours,
        entryPrice: String(price),
        note: `bet:${input.amount}`,
        createdYmd: ymd,
        resolveAt
      });
      const insertId = result.insertId;
      await tx.insert(curationStakes).values({
        stakerId: ctx.user.id,
        callId: insertId,
        amount: input.amount
      });
      return insertId;
    });
    const taskReward = await awardTaskEvent(db, ctx.user.id, "predict_daily");
    return {
      callId,
      entryPrice: price,
      windowOpenAt: new Date(window.openMs).toISOString(),
      resolveAt: resolveAt.toISOString(),
      amount: input.amount,
      odds: STAKE_ODDS,
      potentialWin,
      taskReward
    };
  }),
  // ─── 兼容旧客户端：免费发 Call 已关闭，引导走 placeBet ─────────────────────
  create: protectedProcedure.input(z24.object({
    tokenSymbol: z24.string().min(1).max(20),
    direction: z24.enum(["long", "short"]),
    horizonHours: z24.number().refine((h) => HORIZONS.includes(h), "\u65E0\u6548\u7684\u65F6\u95F4\u7A97"),
    note: z24.string().max(280).optional()
  })).use(rateLimitWrite).mutation(async () => {
    throw new TRPCError20({
      code: "BAD_REQUEST",
      message: "\u8BF7\u6539\u7528 IT \u731C\u6DA8\u8DCC\u4E0B\u6CE8\uFF08\u4EC5 BTC / ETH\uFF0C\u56FA\u5B9A\u8D54\u7387 1.8\uFF09"
    });
  }),
  // ─── 我的下注列表 ──────────────────────────────────────────────────────────
  listMine: protectedProcedure.input(z24.object({ limit: z24.number().min(1).max(100).default(50) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: calls.id,
      tokenSymbol: calls.tokenSymbol,
      direction: calls.direction,
      horizonHours: calls.horizonHours,
      entryPrice: calls.entryPrice,
      resolvedPrice: calls.resolvedPrice,
      changeBp: calls.changeBp,
      status: calls.status,
      note: calls.note,
      createdAt: calls.createdAt,
      resolveAt: calls.resolveAt,
      resolvedAt: calls.resolvedAt,
      stakeAmount: sql21`(SELECT COALESCE(SUM(cs.amount),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.stakerId = ${ctx.user.id})`,
      payout: sql21`(SELECT COALESCE(SUM(cs.payout),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.stakerId = ${ctx.user.id})`
    }).from(calls).where(eq35(calls.userId, ctx.user.id)).orderBy(desc22(calls.createdAt)).limit(input?.limit ?? 50);
    return rows.map((r) => ({
      ...r,
      stakeAmount: Number(r.stakeAmount ?? 0),
      payout: Number(r.payout ?? 0),
      odds: STAKE_ODDS
    }));
  }),
  // ─── 战绩榜（按胜场排序，达最低样本量才上榜）──────────────────────────────────
  leaderboard: publicProcedure.input(z24.object({ limit: z24.number().min(1).max(50).default(20) }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      userId: calls.userId,
      userName: users.name,
      avatar: users.avatar,
      wins: sql21`SUM(CASE WHEN ${calls.status} = 'win' THEN 1 ELSE 0 END)`,
      loses: sql21`SUM(CASE WHEN ${calls.status} = 'lose' THEN 1 ELSE 0 END)`
    }).from(calls).leftJoin(users, eq35(calls.userId, users.id)).where(sql21`${calls.status} IN ('win','lose')`).groupBy(calls.userId, users.name, users.avatar).having(sql21`SUM(CASE WHEN ${calls.status} = 'win' THEN 1 ELSE 0 END) > 0`).orderBy(desc22(sql21`SUM(CASE WHEN ${calls.status} = 'win' THEN 1 ELSE 0 END)`)).limit(input?.limit ?? 20);
    return rows.map((r) => {
      const wins = Number(r.wins ?? 0);
      const loses = Number(r.loses ?? 0);
      const total = wins + loses;
      return {
        userId: r.userId,
        userName: r.userName ?? `\u7528\u6237 #${r.userId}`,
        avatar: r.avatar ?? null,
        wins,
        loses,
        winRate: total > 0 ? Math.round(wins / total * 100) : 0
      };
    });
  }),
  // ─── 我的战绩统计 ────────────────────────────────────────────────────────────
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { wins: 0, loses: 0, pending: 0, winRate: 0 };
    const rows = await db.select({ status: calls.status, c: count6() }).from(calls).where(eq35(calls.userId, ctx.user.id)).groupBy(calls.status);
    let wins = 0, loses = 0, pending = 0;
    for (const r of rows) {
      if (r.status === "win") wins = Number(r.c);
      else if (r.status === "lose") loses = Number(r.c);
      else if (r.status === "pending") pending = Number(r.c);
    }
    const total = wins + loses;
    return { wins, loses, pending, winRate: total > 0 ? Math.round(wins / total * 100) : 0 };
  }),
  // ─── 广场 Call 流（待结算的公开 Call，供策展质押）──────────────────────────────
  feed: protectedProcedure.input(z24.object({ limit: z24.number().min(1).max(50).default(30) }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: calls.id,
      userId: calls.userId,
      userName: users.name,
      avatar: users.avatar,
      tokenSymbol: calls.tokenSymbol,
      direction: calls.direction,
      horizonHours: calls.horizonHours,
      entryPrice: calls.entryPrice,
      note: calls.note,
      createdAt: calls.createdAt,
      resolveAt: calls.resolveAt,
      stakerCount: sql21`(SELECT COUNT(*) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.status = 'active')`,
      totalStaked: sql21`(SELECT COALESCE(SUM(cs.amount),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.status = 'active')`,
      myStake: sql21`(SELECT COALESCE(SUM(cs.amount),0) FROM curation_stakes cs WHERE cs.callId = ${calls.id} AND cs.stakerId = ${ctx.user.id})`
    }).from(calls).leftJoin(users, eq35(calls.userId, users.id)).where(eq35(calls.status, "pending")).orderBy(desc22(calls.createdAt)).limit(input?.limit ?? 30);
    return rows.map((r) => ({
      ...r,
      userName: r.userName ?? `\u7528\u6237 #${r.userId}`,
      stakerCount: Number(r.stakerCount ?? 0),
      totalStaked: Number(r.totalStaked ?? 0),
      myStake: Number(r.myStake ?? 0),
      isMine: r.userId === ctx.user.id
    }));
  }),
  // ─── 策展质押：押某条 Call 会命中（命中 +30%，未中质押销毁）────────────────────
  stake: protectedProcedure.input(z24.object({ callId: z24.number(), amount: z24.number().int().min(MIN_STAKE).max(MAX_STAKE) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!isAppAdmin(ctx.user) && !await isReferralBound(db, ctx.user.id)) {
      throw new TRPCError20({ code: "FORBIDDEN", message: "\u8BF7\u5148\u5728\u4EFB\u52A1\u4E2D\u5FC3\u7ED1\u5B9A\u9080\u8BF7\u4EBA\uFF0C\u518D\u53C2\u4E0E\u8D28\u62BC" });
    }
    const [c] = await db.select({ userId: calls.userId, status: calls.status }).from(calls).where(eq35(calls.id, input.callId)).limit(1);
    if (!c) throw new TRPCError20({ code: "NOT_FOUND", message: "Call \u4E0D\u5B58\u5728" });
    if (c.status !== "pending") throw new TRPCError20({ code: "BAD_REQUEST", message: "\u8BE5 Call \u5DF2\u7ED3\u7B97\uFF0C\u65E0\u6CD5\u8D28\u62BC" });
    if (c.userId === ctx.user.id) throw new TRPCError20({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8D28\u62BC\u81EA\u5DF1\u7684 Call" });
    const [existing] = await db.select({ id: curationStakes.id }).from(curationStakes).where(and31(eq35(curationStakes.stakerId, ctx.user.id), eq35(curationStakes.callId, input.callId))).limit(1);
    if (existing) throw new TRPCError20({ code: "BAD_REQUEST", message: "\u4F60\u5DF2\u8D28\u62BC\u8FC7\u8FD9\u6761 Call" });
    await db.transaction(async (tx) => {
      const res = await tx.update(users).set({ npPoints: sql21`npPoints - ${input.amount}` }).where(and31(eq35(users.id, ctx.user.id), gte8(users.npPoints, input.amount)));
      const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
      if (affected2 < 1) throw new TRPCError20({ code: "BAD_REQUEST", message: "IT \u4F59\u989D\u4E0D\u8DB3" });
      await tx.insert(curationStakes).values({ stakerId: ctx.user.id, callId: input.callId, amount: input.amount });
    });
    return { ok: true };
  }),
  // ─── 我的质押列表 ────────────────────────────────────────────────────────────
  myStakes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: curationStakes.id,
      callId: curationStakes.callId,
      amount: curationStakes.amount,
      status: curationStakes.status,
      payout: curationStakes.payout,
      createdAt: curationStakes.createdAt,
      tokenSymbol: calls.tokenSymbol,
      direction: calls.direction,
      callStatus: calls.status
    }).from(curationStakes).leftJoin(calls, eq35(curationStakes.callId, calls.id)).where(eq35(curationStakes.stakerId, ctx.user.id)).orderBy(desc22(curationStakes.createdAt)).limit(50);
  })
});

// server/routers/npStore.ts
import { TRPCError as TRPCError21 } from "@trpc/server";
init_db();
init_schema();
init_membership();
import { eq as eq36, and as and32, gte as gte9 } from "drizzle-orm";
import { sql as sql22 } from "drizzle-orm";
var TRIAL_NP_COST = 3e3;
var TRIAL_DAYS = 3;
var npStoreRouter = router({
  // ─── 会员体验券：3000 AC 换 3 天 Plus（仅免费用户）──────────────────────────────
  redeemMembershipTrial: protectedProcedure.use(rateLimitWrite).mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [u] = await db.select({ proTier: users.proTier, proUntil: users.proUntil }).from(users).where(eq36(users.id, ctx.user.id)).limit(1);
    if (effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null) !== "free") {
      throw new TRPCError21({ code: "BAD_REQUEST", message: "\u4F60\u5DF2\u662F\u4F1A\u5458\uFF0C\u65E0\u9700\u4F53\u9A8C\u5238" });
    }
    const proUntil = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1e3);
    await db.transaction(async (tx) => {
      const res = await tx.update(users).set({ npPoints: sql22`npPoints - ${TRIAL_NP_COST}` }).where(and32(eq36(users.id, ctx.user.id), gte9(users.npPoints, TRIAL_NP_COST)));
      const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
      if (affected2 < 1) throw new TRPCError21({ code: "BAD_REQUEST", message: `IT \u4E0D\u8DB3\uFF08\u9700 ${TRIAL_NP_COST}\uFF09` });
      await tx.update(users).set({ proTier: "plus", proUntil }).where(eq36(users.id, ctx.user.id));
    });
    return { ok: true, tier: "plus", proUntil: proUntil.toISOString(), cost: TRIAL_NP_COST };
  }),
  // ─── 出口价目（前端展示）────────────────────────────────────────────────────
  prices: protectedProcedure.query(() => ({
    membershipTrial: { cost: TRIAL_NP_COST, days: TRIAL_DAYS, tier: "plus" }
  }))
});

// server/routers/tge.ts
import { z as z25 } from "zod";
import { TRPCError as TRPCError22 } from "@trpc/server";
init_db();
init_schema();
init_token();
import { eq as eq37, and as and33, sql as sql23 } from "drizzle-orm";
async function loadConfig2(db) {
  const [c] = await db.select().from(tgeConfig).where(eq37(tgeConfig.id, 1)).limit(1);
  return c ?? null;
}
function estimateNn(nnPool2, npSnapshot, totalNp) {
  if (totalNp <= 0 || npSnapshot <= 0) return 0;
  return Math.floor(nnPool2 * npSnapshot / totalNp);
}
var tgeRouter = router({
  // ─── 我的 TGE 状态 ───────────────────────────────────────────────────────────
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { enabled: false, hasSnapshot: false };
    const cfg = await loadConfig2(db);
    const [claim] = await db.select().from(tgeClaims).where(eq37(tgeClaims.userId, ctx.user.id)).limit(1);
    const enabled = !!cfg?.enabled;
    if (!claim) return { enabled, hasSnapshot: false, snapshotAt: cfg?.snapshotAt ?? null };
    const estimatedNn = claim.claimed ? claim.nnAmount : estimateNn(cfg?.nnPool ?? 0, claim.npSnapshot, cfg?.totalNpSnapshot ?? 0);
    return {
      enabled,
      hasSnapshot: true,
      snapshotAt: cfg?.snapshotAt ?? null,
      npSnapshot: claim.npSnapshot,
      claimed: claim.claimed,
      estimatedNn
    };
  }),
  // ─── 领取（AC→AI，单向，每人一次）───────────────────────────────────────────────
  claim: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cfg = await loadConfig2(db);
    if (!cfg?.enabled) throw new TRPCError22({ code: "FORBIDDEN", message: "TGE \u5C1A\u672A\u5F00\u542F" });
    const [claim] = await db.select().from(tgeClaims).where(eq37(tgeClaims.userId, ctx.user.id)).limit(1);
    if (!claim) throw new TRPCError22({ code: "BAD_REQUEST", message: "\u4F60\u6CA1\u6709 TGE \u5FEB\u7167\uFF08\u5FEB\u7167\u540E\u624D\u6709 AC \u53EF\u5151\u6362\uFF09" });
    if (claim.claimed) throw new TRPCError22({ code: "BAD_REQUEST", message: "\u5DF2\u9886\u53D6\u8FC7" });
    const nn = estimateNn(cfg.nnPool, claim.npSnapshot, cfg.totalNpSnapshot);
    await db.transaction(async (tx) => {
      const res = await tx.update(tgeClaims).set({ claimed: true, nnAmount: nn, claimedAt: /* @__PURE__ */ new Date() }).where(and33(eq37(tgeClaims.id, claim.id), eq37(tgeClaims.claimed, false)));
      const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
      if (affected2 < 1) throw new TRPCError22({ code: "BAD_REQUEST", message: "\u5DF2\u9886\u53D6\u8FC7" });
      const ok = await grantNN(tx, ctx.user.id, nn, { type: "tge_claim", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError22({ code: "PRECONDITION_FAILED", message: "\u91D1\u5E93\u4F59\u989D\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u53D1\u653E" });
      await tx.update(users).set({ npPoints: sql23`GREATEST(0, npPoints - ${claim.npSnapshot})` }).where(eq37(users.id, ctx.user.id));
    });
    return { ok: true, nn };
  }),
  // ─── 管理员：拍快照（记录每人 AC + 全站总 AC）────────────────────────────────────
  adminSnapshot: adminProcedure.input(z25.object({ nnPool: z25.number().int().min(0) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cfg = await loadConfig2(db);
    if (cfg?.enabled) throw new TRPCError22({ code: "BAD_REQUEST", message: "TGE \u8FDB\u884C\u4E2D\uFF0C\u8BF7\u5148\u5173\u95ED\u518D\u91CD\u62CD\u5FEB\u7167" });
    const [claimed] = await db.select({ id: tgeClaims.id }).from(tgeClaims).where(eq37(tgeClaims.claimed, true)).limit(1);
    if (claimed) throw new TRPCError22({ code: "BAD_REQUEST", message: "\u5DF2\u6709\u7528\u6237\u9886\u53D6\u8FC7 AI\uFF0C\u7981\u6B62\u91CD\u62CD\u5FEB\u7167\uFF08\u4F1A\u5BFC\u81F4\u91CD\u590D\u53D1\u653E\uFF09" });
    const maxPool = NN_TOTAL_SUPPLY - await getCirculating(db);
    if (input.nnPool > maxPool) throw new TRPCError22({ code: "BAD_REQUEST", message: `\u5956\u52B1\u6C60(${input.nnPool})\u8D85\u8FC7\u91D1\u5E93\u53EF\u7528\u4F59\u989D,\u6700\u591A ${maxPool}` });
    const [{ total = 0 } = { total: 0 }] = await db.select({ total: sql23`COALESCE(SUM(${users.npPoints}),0)` }).from(users);
    await db.delete(tgeClaims);
    await db.execute(sql23`INSERT INTO tge_claims (userId, npSnapshot) SELECT id, npPoints FROM users WHERE npPoints > 0`);
    await db.insert(tgeConfig).values({ id: 1, nnPool: input.nnPool, totalNpSnapshot: Number(total), snapshotAt: /* @__PURE__ */ new Date(), enabled: false }).onDuplicateKeyUpdate({ set: { nnPool: input.nnPool, totalNpSnapshot: Number(total), snapshotAt: /* @__PURE__ */ new Date() } });
    return { ok: true, totalNpSnapshot: Number(total), nnPool: input.nnPool };
  }),
  // ─── 管理员：开启/关闭 TGE 兑换 ────────────────────────────────────────────────
  adminSetEnabled: adminProcedure.input(z25.object({ enabled: z25.boolean() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(tgeConfig).values({ id: 1, enabled: input.enabled }).onDuplicateKeyUpdate({ set: { enabled: input.enabled } });
    return { ok: true, enabled: input.enabled };
  })
});

// server/routers/partner.ts
import { z as z26 } from "zod";
import { TRPCError as TRPCError23 } from "@trpc/server";
init_db();
init_schema();
import { and as and35, eq as eq39, desc as desc24, sql as sql25 } from "drizzle-orm";

// server/partner.ts
init_db();
init_schema();
init_token();
import { and as and34, eq as eq38, sql as sql24, desc as desc23, inArray as inArray10, gte as gte10, lt as lt5, isNotNull } from "drizzle-orm";
var REVENUE_POOL_PCT = 20;
var REVENUE_TYPES = ["membership", "report", "promote", "bot_sub", "package", "ai_chat"];
var BONUS_PERIODS = 6;
var PARTNER_TIERS = [
  {
    key: "partner",
    name: "\u5408\u4F19\u4EBA",
    badge: "\u5408\u4F19\u4EBA",
    minUsdt: 3e3,
    maxUsdt: 9999,
    nnPerUsdt: 1,
    feeSharePct: 1,
    revWeight: 1,
    bonusPct: 5,
    cliffMonths: 0,
    durationMonths: 6,
    seats: 88,
    proGiftMonths: 6,
    benefits: [
      "\u624B\u7EED\u8D39\u5206\u7EA2\u6C60 1% \u6863\u4F4D\u6743\u76CA\uFF08AI\xB7\u65E5\u7ED3\uFF09",
      "\u6536\u76CA\u5206\u7EA2\u6C60\u6309\u8BA4\u8D2D\u989D\u52A0\u6743\uFF08AI\xB7\u65E5\u7ED3\uFF09",
      "\u8BA4\u8D2D\u989D 5% USDT \u5956\u52B1 \xB7 6 \u671F\u89E3\u9501",
      "AI \u914D\u989D\u6309\u8BA4\u8D2D\u989D 1:1 \xB7 6 \u6708\u7EBF\u6027\u91CA\u653E",
      "Pro \u4F1A\u5458 6 \u4E2A\u6708 \xB7 \u5408\u4F19\u4EBA\u4E13\u5C5E\u6807\u8BC6",
      "\u6CBB\u7406\u6743\u91CD \xD73 \xB7 \u65B0\u529F\u80FD\u5185\u6D4B\u4F18\u5148"
    ]
  },
  {
    key: "super",
    name: "\u8D85\u7EA7\u5408\u4F19\u4EBA",
    badge: "\u8D85\u7EA7",
    minUsdt: 1e4,
    maxUsdt: 49999,
    nnPerUsdt: 1,
    feeSharePct: 1.2,
    revWeight: 1.5,
    bonusPct: 8,
    cliffMonths: 1,
    durationMonths: 9,
    seats: 28,
    proGiftMonths: 12,
    benefits: [
      "\u624B\u7EED\u8D39\u5206\u7EA2\u6C60 1.2% \u6863\u4F4D\u6743\u76CA\uFF08AI\xB7\u65E5\u7ED3\uFF09",
      "\u6536\u76CA\u5206\u7EA2\u6C60 \xD71.5 \u7CFB\u6570\u52A0\u6743\uFF08AI\xB7\u65E5\u7ED3\uFF09",
      "\u8BA4\u8D2D\u989D 8% USDT \u5956\u52B1 \xB7 6 \u671F\u89E3\u9501",
      "AI \u914D\u989D\u6309\u8BA4\u8D2D\u989D 1:1 \xB7 1 \u6708\u9501\u4ED3 + 9 \u6708\u7EBF\u6027",
      "Pro \u4F1A\u5458 12 \u4E2A\u6708 \xB7 \u8D85\u7EA7\u5408\u4F19\u4EBA\u6807\u8BC6",
      "\u6CBB\u7406\u6743\u91CD \xD78 \xB7 \u5B98\u65B9\u5171\u5EFA\u7FA4\u5E2D\u4F4D \xB7 \u91CD\u5927\u63D0\u6848\u4F18\u5148\u6295\u7968"
    ]
  },
  {
    key: "founder",
    name: "\u8054\u5408\u521B\u59CB\u4EBA",
    badge: "\u8054\u521B",
    minUsdt: 5e4,
    maxUsdt: 1e5,
    nnPerUsdt: 1,
    feeSharePct: 1.5,
    revWeight: 2,
    bonusPct: 10,
    cliffMonths: 1,
    durationMonths: 12,
    seats: 8,
    proGiftMonths: 999,
    benefits: [
      "\u624B\u7EED\u8D39\u5206\u7EA2\u6C60 1.5% \u6863\u4F4D\u6743\u76CA\uFF08AI\xB7\u65E5\u7ED3\uFF09",
      "\u6536\u76CA\u5206\u7EA2\u6C60 \xD72 \u7CFB\u6570\u52A0\u6743\uFF08AI\xB7\u65E5\u7ED3\uFF09",
      "\u8BA4\u8D2D\u989D 10% USDT \u5956\u52B1 \xB7 6 \u671F\u89E3\u9501",
      "AI \u914D\u989D\u6309\u8BA4\u8D2D\u989D 1:1 \xB7 1 \u6708\u9501\u4ED3 + 12 \u6708\u7EBF\u6027",
      "\u7EC8\u8EAB Pro \u4F1A\u5458 \xB7 \u8054\u5408\u521B\u59CB\u4EBA\u94ED\u724C",
      "\u6CBB\u7406\u6743\u91CD \xD720 \xB7 \u4EA7\u54C1\u8DEF\u7EBF\u5171\u51B3\u6743 \xB7 \u4E13\u5C5E\u5BA2\u6237\u7ECF\u7406",
      "\u5B98\u7F51\u521B\u59CB\u6210\u5458\u7F72\u540D\uFF08\u81EA\u613F\uFF09"
    ]
  }
];
function getPartnerTier(key) {
  return PARTNER_TIERS.find((t3) => t3.key === key);
}
function tierForStake(stakeUsdt) {
  let hit = null;
  for (const t3 of PARTNER_TIERS) {
    if (stakeUsdt >= t3.minUsdt) hit = t3;
  }
  return hit;
}
function tierOrder(key) {
  if (!key) return 0;
  const i = PARTNER_TIERS.findIndex((t3) => t3.key === key);
  return i === -1 ? 0 : i + 1;
}
async function listConfirmedPartners(db) {
  const rows = await db.select({ id: users.id, tier: users.partnerTier, stake: users.partnerStakeUsdt }).from(users).where(and34(isNotNull(users.partnerTier), sql24`${users.partnerStakeUsdt} > 0`));
  return rows.filter((r) => r.tier && getPartnerTier(r.tier)).map((r) => ({ id: r.id, tier: r.tier, stake: Number(r.stake) }));
}
async function distribute(db, members, totalNN, kind, ymd, weightOf) {
  const totalWeight = members.reduce((s, m) => s + weightOf(m), 0);
  if (totalWeight <= 0 || totalNN <= 0) return 0;
  let paid = 0;
  for (const m of members) {
    const share = Math.floor(totalNN * weightOf(m) / totalWeight);
    if (share <= 0) continue;
    const ok = await grantNN(db, m.id, share, { type: "partner_div", refType: kind, memo: `${kind}:${ymd}` });
    if (!ok) continue;
    await db.insert(partnerEarnings).values({ userId: m.id, kind, amountNN: share, ymd });
    paid += share;
  }
  return paid;
}
function ymdOf(d) {
  return d.toISOString().slice(0, 10);
}
async function runPartnerSettlement(now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) return null;
  const y = new Date(now.getTime() - 24 * 3600 * 1e3);
  const ymd = ymdOf(y);
  const dayStart = /* @__PURE__ */ new Date(`${ymd}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1e3);
  const partners = await listConfirmedPartners(db);
  let feePaid = 0;
  let revPaid = 0;
  try {
    await db.insert(partnerSettleRuns).values({ ymd, kind: "fee", poolNN: 0 });
    const rows = await db.select().from(platformFeeLedger).where(eq38(platformFeeLedger.settled, false));
    const totalBase = rows.reduce((s, r) => s + r.baseNN, 0);
    if (totalBase > 0 && partners.length > 0) {
      for (const t3 of PARTNER_TIERS) {
        const members = partners.filter((p) => p.tier === t3.key);
        if (members.length === 0) continue;
        const tierPool = Math.floor(totalBase * t3.feeSharePct / 100);
        feePaid += await distribute(db, members, tierPool, "fee", ymd, (m) => m.stake);
      }
    }
    if (rows.length > 0) {
      await db.update(platformFeeLedger).set({ settled: true }).where(inArray10(platformFeeLedger.id, rows.map((r) => r.id)));
    }
    await db.update(partnerSettleRuns).set({ poolNN: feePaid }).where(and34(eq38(partnerSettleRuns.ymd, ymd), eq38(partnerSettleRuns.kind, "fee")));
  } catch {
  }
  try {
    await db.insert(partnerSettleRuns).values({ ymd, kind: "revenue", poolNN: 0 });
    const [r] = await db.select({ s: sql24`COALESCE(SUM(-${nnTransactions.amount}), 0)` }).from(nnTransactions).where(and34(
      inArray10(nnTransactions.type, REVENUE_TYPES),
      sql24`${nnTransactions.amount} < 0`,
      gte10(nnTransactions.createdAt, dayStart),
      lt5(nnTransactions.createdAt, dayEnd)
    ));
    const income = Number(r?.s ?? 0);
    const pool = Math.floor(income * REVENUE_POOL_PCT / 100);
    if (pool > 0 && partners.length > 0) {
      revPaid = await distribute(db, partners, pool, "revenue", ymd, (m) => {
        const t3 = getPartnerTier(m.tier);
        return m.stake * (t3?.revWeight ?? 1);
      });
    }
    await db.update(partnerSettleRuns).set({ poolNN: revPaid }).where(and34(eq38(partnerSettleRuns.ymd, ymd), eq38(partnerSettleRuns.kind, "revenue")));
  } catch {
  }
  return { fee: feePaid, revenue: revPaid };
}
async function getMyEarnings(db, userId) {
  const agg = await db.select({ kind: partnerEarnings.kind, total: sql24`COALESCE(SUM(${partnerEarnings.amountNN}), 0)` }).from(partnerEarnings).where(eq38(partnerEarnings.userId, userId)).groupBy(partnerEarnings.kind);
  const recent = await db.select().from(partnerEarnings).where(eq38(partnerEarnings.userId, userId)).orderBy(desc23(partnerEarnings.createdAt)).limit(30);
  let fee = 0;
  let revenue = 0;
  for (const a of agg) {
    if (a.kind === "fee") fee = Number(a.total);
    else revenue = Number(a.total);
  }
  return {
    totalNN: fee + revenue,
    feeNN: fee,
    revenueNN: revenue,
    recent: recent.map((e) => ({ kind: e.kind, amountNN: e.amountNN, ymd: e.ymd }))
  };
}
async function getSeatUsage(db) {
  const rows = await db.select({ tier: users.partnerTier, c: sql24`COUNT(*)` }).from(users).where(isNotNull(users.partnerTier)).groupBy(users.partnerTier);
  const out = {};
  for (const r of rows) if (r.tier) out[r.tier] = Number(r.c);
  return out;
}
var settleTimer = null;
function startPartnerSettlement() {
  if (settleTimer) return;
  setTimeout(() => {
    void runPartnerSettlement().catch(() => void 0);
  }, 90 * 1e3);
  settleTimer = setInterval(() => {
    void runPartnerSettlement().catch(() => void 0);
  }, 6 * 3600 * 1e3);
}

// server/routers/partner.ts
init_token();
var MONTH_MS2 = 30 * 24 * 3600 * 1e3;
function periodUnlockAt(startAt, period) {
  return new Date(startAt.getTime() + period * MONTH_MS2);
}
function periodAmount(totalUsdt, periods, period) {
  const base = Math.floor(totalUsdt / periods);
  return period === periods ? totalUsdt - base * (periods - 1) : base;
}
var partnerRouter = router({
  // ─── 档位与席位（公开） ─────────────────────────────────────────────────────
  getTiers: publicProcedure.query(async () => {
    const db = await getDb();
    const seats = db ? await getSeatUsage(db) : {};
    return {
      tiers: PARTNER_TIERS.map((t3) => ({
        ...t3,
        seatsTaken: seats[t3.key] ?? 0
      })),
      payAddress: USDT_DEPOSIT_ADDRESS,
      chain: USDT_CHAIN,
      bonusPeriods: BONUS_PERIODS
    };
  }),
  // ─── 认购下单（档内自定义金额） ──────────────────────────────────────────────
  createOrder: protectedProcedure.input(z26.object({ tier: z26.enum(["partner", "super", "founder"]), usdtAmount: z26.number().int().min(3e3).max(1e5) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const tier = getPartnerTier(input.tier);
    if (!tier) throw new TRPCError23({ code: "BAD_REQUEST", message: "\u672A\u77E5\u6863\u4F4D" });
    if (input.usdtAmount < tier.minUsdt || input.usdtAmount > tier.maxUsdt) {
      throw new TRPCError23({ code: "BAD_REQUEST", message: `${tier.name}\u8BA4\u8D2D\u989D\u9700\u5728 ${tier.minUsdt.toLocaleString()}\u2013${tier.maxUsdt.toLocaleString()} USDT \u4E4B\u95F4` });
    }
    const seats = await getSeatUsage(db);
    if ((seats[tier.key] ?? 0) >= tier.seats) {
      throw new TRPCError23({ code: "BAD_REQUEST", message: `${tier.name}\u5E2D\u4F4D\u5DF2\u6EE1` });
    }
    const nnAmount = input.usdtAmount * tier.nnPerUsdt;
    const [res] = await db.insert(nnNodeOrders).values({
      userId: ctx.user.id,
      tier: tier.key,
      usdtAmount: input.usdtAmount,
      nnAmount,
      payAddress: USDT_DEPOSIT_ADDRESS || null
    }).$returningId();
    return {
      orderId: res.id,
      tier: tier.key,
      usdtAmount: input.usdtAmount,
      nnAmount,
      payAddress: USDT_DEPOSIT_ADDRESS,
      chain: USDT_CHAIN
    };
  }),
  // 回填链上转账哈希
  submitTx: protectedProcedure.input(z26.object({ orderId: z26.number(), txHash: z26.string().min(6).max(120) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [o] = await db.select().from(nnNodeOrders).where(eq39(nnNodeOrders.id, input.orderId)).limit(1);
    if (!o || o.userId !== ctx.user.id) throw new TRPCError23({ code: "FORBIDDEN", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status !== "pending") throw new TRPCError23({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u72B6\u6001\u4E0D\u53EF\u4FEE\u6539" });
    await db.update(nnNodeOrders).set({ txHash: sanitizeInput(input.txHash, 120) }).where(eq39(nnNodeOrders.id, input.orderId));
    return { ok: true };
  }),
  // ─── 我的合伙人面板 ─────────────────────────────────────────────────────────
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [u] = await db.select({ tier: users.partnerTier, stake: users.partnerStakeUsdt, lastSigninYmd: users.lastSigninYmd }).from(users).where(eq39(users.id, ctx.user.id)).limit(1);
    const tier = u?.tier ? getPartnerTier(u.tier) : null;
    const orders = await db.select().from(nnNodeOrders).where(eq39(nnNodeOrders.userId, ctx.user.id)).orderBy(desc24(nnNodeOrders.createdAt)).limit(50);
    const earnings = await getMyEarnings(db, ctx.user.id);
    const bonuses = await db.select().from(partnerBonuses).where(eq39(partnerBonuses.userId, ctx.user.id)).orderBy(desc24(partnerBonuses.createdAt));
    const payouts = await db.select().from(partnerPayouts).where(eq39(partnerPayouts.userId, ctx.user.id)).orderBy(desc24(partnerPayouts.createdAt)).limit(50);
    const claimedKeys = new Set(payouts.filter((p) => p.status !== "rejected").map((p) => `${p.bonusId}:${p.period}`));
    const now = Date.now();
    const bonusList = bonuses.map((b) => {
      const periods = Array.from({ length: b.periods }, (_, i) => {
        const period = i + 1;
        const unlockAt = periodUnlockAt(b.startAt, period);
        const claimed = claimedKeys.has(`${b.id}:${period}`);
        return {
          period,
          amountUsdt: periodAmount(b.totalUsdt, b.periods, period),
          unlockAt: unlockAt.toISOString(),
          unlocked: unlockAt.getTime() <= now,
          claimed
        };
      });
      return {
        id: b.id,
        orderId: b.orderId,
        totalUsdt: b.totalUsdt,
        claimedUsdt: b.claimedUsdt,
        startAt: b.startAt.toISOString(),
        periods
      };
    });
    return {
      tier: tier ? { key: tier.key, name: tier.name, badge: tier.badge, feeSharePct: tier.feeSharePct, revWeight: tier.revWeight, bonusPct: tier.bonusPct } : null,
      stakeUsdt: Number(u?.stake ?? 0),
      earnings,
      bonuses: bonusList,
      payouts: payouts.map((p) => ({
        id: p.id,
        amountUsdt: p.amountUsdt,
        address: p.address,
        status: p.status,
        txHash: p.txHash,
        createdAt: p.createdAt.toISOString()
      })),
      orders
    };
  }),
  // ─── 领取某期 USDT 奖励 → 生成打款申请 ──────────────────────────────────────
  claimBonus: protectedProcedure.input(z26.object({ bonusId: z26.number(), period: z26.number().int().min(1).max(24), address: z26.string().min(10).max(120) })).use(rateLimitWrite).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [b] = await db.select().from(partnerBonuses).where(eq39(partnerBonuses.id, input.bonusId)).limit(1);
    if (!b || b.userId !== ctx.user.id) throw new TRPCError23({ code: "FORBIDDEN", message: "\u5956\u52B1\u4E0D\u5B58\u5728" });
    if (input.period > b.periods) throw new TRPCError23({ code: "BAD_REQUEST", message: "\u671F\u6570\u65E0\u6548" });
    if (periodUnlockAt(b.startAt, input.period).getTime() > Date.now()) {
      throw new TRPCError23({ code: "BAD_REQUEST", message: "\u8BE5\u671F\u5C1A\u672A\u89E3\u9501" });
    }
    const [u] = await db.select({ ymd: users.lastSigninYmd, lastSignedIn: users.lastSignedIn }).from(users).where(eq39(users.id, ctx.user.id)).limit(1);
    const lastActive = Math.max(
      u?.lastSignedIn ? u.lastSignedIn.getTime() : 0,
      u?.ymd ? (/* @__PURE__ */ new Date(`${u.ymd}T00:00:00.000Z`)).getTime() : 0
    );
    if (Date.now() - lastActive > 30 * 24 * 3600 * 1e3) {
      throw new TRPCError23({ code: "BAD_REQUEST", message: "\u9700\u4FDD\u6301\u6D3B\u8DC3\uFF08\u8FD1 30 \u5929\u5185\u767B\u5F55\uFF09\u65B9\u53EF\u9886\u53D6" });
    }
    const amount = periodAmount(b.totalUsdt, b.periods, input.period);
    try {
      await db.insert(partnerPayouts).values({
        userId: ctx.user.id,
        bonusId: b.id,
        period: input.period,
        amountUsdt: amount,
        address: sanitizeInput(input.address, 120)
      });
    } catch {
      throw new TRPCError23({ code: "BAD_REQUEST", message: "\u8BE5\u671F\u5DF2\u7533\u8BF7\u8FC7\u9886\u53D6" });
    }
    await db.update(partnerBonuses).set({
      claimedPeriods: sql25`${partnerBonuses.claimedPeriods} + 1`,
      claimedUsdt: sql25`${partnerBonuses.claimedUsdt} + ${amount}`
    }).where(eq39(partnerBonuses.id, b.id));
    return { ok: true, amountUsdt: amount };
  }),
  // ─── 运营：确认到账（发 AI 配额 + 身份 + USDT 奖励 + 赠 Pro） ────────────────
  adminConfirmOrder: adminProcedure.input(z26.object({ orderId: z26.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [o] = await db.select().from(nnNodeOrders).where(eq39(nnNodeOrders.id, input.orderId)).limit(1);
    if (!o) throw new TRPCError23({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status !== "pending") throw new TRPCError23({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u5DF2\u5904\u7406" });
    const tier = getPartnerTier(o.tier);
    if (!tier) throw new TRPCError23({ code: "BAD_REQUEST", message: "\u975E\u5408\u4F19\u4EBA\u8BA2\u5355\uFF0C\u8BF7\u7528\u65E7\u8282\u70B9\u786E\u8BA4\u5165\u53E3" });
    const res = await db.update(nnNodeOrders).set({ status: "confirmed", confirmedAt: /* @__PURE__ */ new Date() }).where(and35(eq39(nnNodeOrders.id, o.id), eq39(nnNodeOrders.status, "pending")));
    const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
    if (!affected2) throw new TRPCError23({ code: "BAD_REQUEST", message: "\u8BA2\u5355\u5DF2\u5904\u7406" });
    const nnNow = o.usdtAmount * tier.nnPerUsdt;
    if (nnNow !== o.nnAmount) {
      await db.update(nnNodeOrders).set({ nnAmount: nnNow }).where(eq39(nnNodeOrders.id, o.id));
    }
    await createVesting(db, o.userId, "partner", o.id, nnNow, tier.cliffMonths, tier.durationMonths);
    await db.update(users).set({ partnerStakeUsdt: sql25`${users.partnerStakeUsdt} + ${o.usdtAmount}` }).where(eq39(users.id, o.userId));
    const [u] = await db.select({ stake: users.partnerStakeUsdt, cur: users.partnerTier, proUntil: users.proUntil }).from(users).where(eq39(users.id, o.userId)).limit(1);
    const newTier = tierForStake(Number(u?.stake ?? 0));
    const effectiveTier2 = newTier && tierOrder(newTier.key) > tierOrder(u?.cur ?? null) ? newTier : u?.cur ? getPartnerTier(u.cur) : newTier;
    if (newTier && tierOrder(newTier.key) > tierOrder(u?.cur ?? null)) {
      await db.update(users).set({ partnerTier: newTier.key }).where(eq39(users.id, o.userId));
    }
    const bonusTier = effectiveTier2 ?? tier;
    const bonusUsdt = Math.floor(o.usdtAmount * bonusTier.bonusPct / 100);
    if (bonusUsdt > 0) {
      await db.insert(partnerBonuses).values({
        userId: o.userId,
        orderId: o.id,
        totalUsdt: bonusUsdt,
        periods: BONUS_PERIODS,
        startAt: /* @__PURE__ */ new Date()
      });
    }
    const giftMonths = bonusTier.proGiftMonths;
    if (giftMonths > 0) {
      const months = giftMonths >= 999 ? 1200 : giftMonths;
      const base = u?.proUntil && u.proUntil.getTime() > Date.now() ? u.proUntil.getTime() : Date.now();
      await db.update(users).set({ proTier: "pro", proUntil: new Date(base + months * MONTH_MS2) }).where(eq39(users.id, o.userId));
    }
    return { ok: true, nnVesting: nnNow, bonusUsdt, tier: bonusTier.key };
  }),
  // 运营：取消订单
  adminCancelOrder: adminProcedure.input(z26.object({ orderId: z26.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [o] = await db.select().from(nnNodeOrders).where(eq39(nnNodeOrders.id, input.orderId)).limit(1);
    if (!o) throw new TRPCError23({ code: "NOT_FOUND", message: "\u8BA2\u5355\u4E0D\u5B58\u5728" });
    if (o.status === "confirmed") throw new TRPCError23({ code: "BAD_REQUEST", message: "\u5DF2\u786E\u8BA4\u8BA2\u5355\u4E0D\u53EF\u53D6\u6D88" });
    await db.update(nnNodeOrders).set({ status: "cancelled" }).where(eq39(nnNodeOrders.id, o.id));
    return { ok: true };
  }),
  // 运营：USDT 打款申请列表
  adminListPayouts: adminProcedure.input(z26.object({ status: z26.enum(["pending", "paid", "rejected"]).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conds = input?.status ? [eq39(partnerPayouts.status, input.status)] : [];
    const rows = await db.select().from(partnerPayouts).where(conds.length ? and35(...conds) : void 0).orderBy(desc24(partnerPayouts.createdAt)).limit(100);
    return rows;
  }),
  // 运营：标记打款完成 / 驳回
  adminResolvePayout: adminProcedure.input(z26.object({ payoutId: z26.number(), action: z26.enum(["paid", "rejected"]), txHash: z26.string().max(120).optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [p] = await db.select().from(partnerPayouts).where(eq39(partnerPayouts.id, input.payoutId)).limit(1);
    if (!p) throw new TRPCError23({ code: "NOT_FOUND", message: "\u7533\u8BF7\u4E0D\u5B58\u5728" });
    if (p.status !== "pending") throw new TRPCError23({ code: "BAD_REQUEST", message: "\u5DF2\u5904\u7406" });
    await db.transaction(async (tx) => {
      const res = await tx.update(partnerPayouts).set({
        status: input.action,
        txHash: input.txHash ? sanitizeInput(input.txHash, 120) : null,
        paidAt: input.action === "paid" ? /* @__PURE__ */ new Date() : null
      }).where(and35(eq39(partnerPayouts.id, p.id), eq39(partnerPayouts.status, "pending")));
      const affected2 = res?.[0]?.affectedRows ?? res?.affectedRows ?? 0;
      if (affected2 < 1) throw new TRPCError23({ code: "BAD_REQUEST", message: "\u5DF2\u5904\u7406" });
      if (input.action === "rejected") {
        await tx.update(partnerBonuses).set({
          claimedPeriods: sql25`GREATEST(${partnerBonuses.claimedPeriods} - 1, 0)`,
          claimedUsdt: sql25`GREATEST(${partnerBonuses.claimedUsdt} - ${p.amountUsdt}, 0)`
        }).where(eq39(partnerBonuses.id, p.bonusId));
        await tx.delete(partnerPayouts).where(eq39(partnerPayouts.id, p.id));
      }
    });
    return { ok: true };
  }),
  // 运营：手动触发一次分红结算（测试/补结）
  adminRunSettle: adminProcedure.mutation(async () => {
    const r = await runPartnerSettlement();
    return { ok: true, ...r ?? { fee: 0, revenue: 0 } };
  })
});

// server/routers/stats.ts
import { z as z27 } from "zod";
import { TRPCError as TRPCError24 } from "@trpc/server";
import { and as and36, count as count7, eq as eq40, gt as gt7, inArray as inArray11 } from "drizzle-orm";
init_db();
init_schema();

// server/utils/dashboardLive.ts
var SH_MS = 8 * 3600 * 1e3;
var EPOCH = Date.UTC(2026, 7, 1);
function extraKind(label) {
  return /今日|当天|24h|消息|动态|活跃|在线|发言/i.test(label) ? "daily" : "stock";
}
function shanghaiParts(nowMs) {
  const shifted = nowMs + SH_MS;
  const dayIndex = Math.floor(shifted / 864e5);
  const sec = Math.floor(shifted % 864e5 / 1e3);
  return { sec, dayIndex };
}
function mix01(key, salt) {
  let h = (salt ^ 2166136261) >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return h % 1e4 / 1e4;
}
var SLOW_DAY = shanghaiParts(Date.UTC(2026, 7, 18, 16, 0, 0)).dayIndex;
function dailyUsersBoost(dayIndex) {
  if (dayIndex >= SLOW_DAY) return 280 + Math.floor(mix01("users", dayIndex) * 41);
  return 300 + Math.floor(mix01("users", dayIndex) * 301);
}
function usersDelta(nowMs) {
  const { sec, dayIndex } = shanghaiParts(nowMs);
  const epochDay = shanghaiParts(EPOCH).dayIndex;
  const daysElapsed = Math.max(0, dayIndex - epochDay);
  let sum = 0;
  for (let d = 0; d < daysElapsed; d++) sum += dailyUsersBoost(epochDay + d);
  return sum + Math.floor(dailyUsersBoost(dayIndex) * (sec / 86400));
}
function liveDelta(kind, base, key, nowMs) {
  const { sec, dayIndex } = shanghaiParts(nowMs);
  const floor = Math.max(0, Math.floor(base));
  if (kind === "users") return usersDelta(nowMs);
  if (kind === "subs") {
    const perHour2 = Math.max(0.08, floor * 4e-5);
    return Math.floor((nowMs - EPOCH) / 36e5 * perHour2);
  }
  if (kind === "active") {
    const span = Math.max(180, Math.round(Math.max(floor, 120) * 0.88));
    return Math.floor(span * (sec / 86400));
  }
  if (kind === "daily") {
    const daily = Math.max(28, Math.round(Math.max(floor, 40) * 0.09));
    return Math.floor(daily * (sec / 86400));
  }
  const perHour = Math.max(0.12, floor * 5e-5);
  const grown = Math.floor((nowMs - EPOCH) / 36e5 * perHour);
  const dayJitter = Math.floor(mix01(key, dayIndex) * Math.max(1, floor * 2e-3));
  return grown + dayJitter;
}
function applyDashboardLive(base, nowMs) {
  return {
    ...base,
    usersTotal: base.usersTotal + liveDelta("users", base.usersTotal, "users", nowMs),
    activeToday: base.activeToday + liveDelta("active", base.activeToday, "active", nowMs),
    subscribers: base.subscribers + liveDelta("subs", base.subscribers, "subs", nowMs),
    extras: base.extras.map((e) => ({
      ...e,
      value: e.value + liveDelta(extraKind(e.label), e.value, e.id || e.label, nowMs)
    }))
  };
}

// server/routers/stats.ts
var DEFAULT_BOOSTS = { usersTotal: 0, activeToday: 0, subscribers: 0 };
var extraSchema = z27.object({
  id: z27.string().min(1).max(40),
  label: z27.string().min(1).max(20),
  value: z27.number().int().min(0).max(1e9),
  icon: z27.string().max(40).optional()
});
var configSchema = z27.object({
  boosts: z27.object({
    usersTotal: z27.number().int().min(0).max(1e9),
    activeToday: z27.number().int().min(0).max(1e9),
    subscribers: z27.number().int().min(0).max(1e9)
  }),
  extras: z27.array(extraSchema).max(8)
});
function parseConfig(raw) {
  if (!raw) return { boosts: { ...DEFAULT_BOOSTS }, extras: [] };
  try {
    const parsed = JSON.parse(raw);
    const b = parsed.boosts ?? {};
    return {
      boosts: {
        usersTotal: Math.max(0, Math.floor(Number(b.usersTotal) || 0)),
        activeToday: Math.max(0, Math.floor(Number(b.activeToday) || 0)),
        subscribers: Math.max(0, Math.floor(Number(b.subscribers) || 0))
      },
      extras: Array.isArray(parsed.extras) ? parsed.extras.filter((e) => e && typeof e.label === "string" && Number.isFinite(Number(e.value))).slice(0, 8).map((e, i) => ({
        id: String(e.id || `e${i + 1}`).slice(0, 40),
        label: String(e.label).slice(0, 20),
        value: Math.max(0, Math.floor(Number(e.value) || 0)),
        icon: e.icon ? String(e.icon).slice(0, 40) : void 0
      })) : []
    };
  } catch {
    return { boosts: { ...DEFAULT_BOOSTS }, extras: [] };
  }
}
var cache2 = null;
var CACHE_MS = 3e4;
async function loadConfigRow() {
  const db = await getDb();
  if (!db) return { db: null, config: parseConfig(null) };
  const [row] = await db.select({ dashboardConfig: appConfig.dashboardConfig }).from(appConfig).where(eq40(appConfig.platform, "all")).limit(1);
  return { db, config: parseConfig(row?.dashboardConfig) };
}
async function computeDashboard() {
  const { db, config } = await loadConfigRow();
  let realUsers = 0;
  let realActive = 0;
  let realSubs = 0;
  let realOnline2 = 0;
  let realGroups = 0;
  let realPostsToday = 0;
  if (db) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const onlineSince = new Date(Date.now() - 15 * 60 * 1e3);
    const now = /* @__PURE__ */ new Date();
    const [[usersRow], [activeRow], [subsRow], [onlineRow], [groupRow], [postRow]] = await Promise.all([
      db.select({ n: count7() }).from(users).where(eq40(users.isBot, false)),
      db.select({ n: count7() }).from(users).where(and36(eq40(users.isBot, false), gt7(users.lastSignedIn, since))),
      db.select({ n: count7() }).from(users).where(and36(
        eq40(users.isBot, false),
        inArray11(users.proTier, ["plus", "pro"]),
        gt7(users.proUntil, now)
      )),
      db.select({ n: count7() }).from(users).where(and36(eq40(users.isBot, false), gt7(users.lastSignedIn, onlineSince))),
      db.select({ n: count7() }).from(chatGroups).where(eq40(chatGroups.isPublic, true)),
      db.select({ n: count7() }).from(posts).where(gt7(posts.createdAt, since))
    ]);
    realUsers = Number(usersRow?.n ?? 0);
    realActive = Number(activeRow?.n ?? 0);
    realSubs = Number(subsRow?.n ?? 0);
    realOnline2 = Number(onlineRow?.n ?? 0);
    realGroups = Number(groupRow?.n ?? 0);
    realPostsToday = Number(postRow?.n ?? 0);
  }
  const autoExtras = [
    { id: "online", label: "\u5F53\u524D\u5728\u7EBF", value: realOnline2 },
    { id: "groups", label: "\u516C\u5F00\u793E\u7FA4", value: realGroups },
    { id: "posts", label: "\u4ECA\u65E5\u52A8\u6001", value: realPostsToday }
  ];
  const extras = [
    ...autoExtras,
    ...config.extras.filter(
      (e) => !autoExtras.some((a) => a.id === e.id || a.label === e.label)
    )
  ].slice(0, 8);
  return {
    usersTotal: realUsers + config.boosts.usersTotal,
    activeToday: realActive + config.boosts.activeToday,
    subscribers: realSubs + config.boosts.subscribers,
    extras,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    _real: {
      usersTotal: realUsers,
      activeToday: realActive,
      subscribers: realSubs,
      online: realOnline2,
      groups: realGroups,
      postsToday: realPostsToday
    }
  };
}
var statsRouter = router({
  /** 发现页：所有登录用户可见的展示数字（已含加成 + 时段波动） */
  getCommunityDashboard: protectedProcedure.query(async () => {
    const now = Date.now();
    if (!cache2 || now - cache2.at >= CACHE_MS) {
      cache2 = { at: now, payload: await computeDashboard() };
    }
    const { _real: _, ...publicPayload } = cache2.payload;
    const live = applyDashboardLive(publicPayload, now);
    return { ...live, updatedAt: new Date(now).toISOString() };
  }),
  /** 管理端：原始配置 + 真实数预览 */
  adminGetDashboardConfig: adminProcedure.query(async () => {
    const payload = await computeDashboard();
    const { config } = await loadConfigRow();
    const live = applyDashboardLive({
      usersTotal: payload.usersTotal,
      activeToday: payload.activeToday,
      subscribers: payload.subscribers,
      extras: payload.extras
    }, Date.now());
    return {
      boosts: config.boosts,
      extras: config.extras,
      real: payload._real,
      display: {
        usersTotal: live.usersTotal,
        activeToday: live.activeToday,
        subscribers: live.subscribers
      }
    };
  }),
  adminSetDashboardConfig: adminProcedure.input(configSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    const clean = {
      boosts: {
        usersTotal: input.boosts.usersTotal,
        activeToday: input.boosts.activeToday,
        subscribers: input.boosts.subscribers
      },
      extras: input.extras.map((e, i) => ({
        id: e.id || `e${i + 1}`,
        label: e.label.trim(),
        value: e.value,
        icon: e.icon?.trim() || void 0
      }))
    };
    const json = JSON.stringify(clean);
    const existing = await db.select({ id: appConfig.id }).from(appConfig).where(eq40(appConfig.platform, "all")).limit(1);
    if (existing.length > 0) {
      await db.update(appConfig).set({ dashboardConfig: json }).where(eq40(appConfig.platform, "all"));
    } else {
      await db.insert(appConfig).values({ platform: "all", dashboardConfig: json });
    }
    cache2 = null;
    return { success: true };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  ai: aiRouter,
  stats: statsRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      const { passwordHash: _ph, ...safeUser } = user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  wallet: walletRouter,
  chat: chatRouter,
  research: researchRouter,
  posts: postsRouter,
  user: userRouter,
  calls: callsRouter,
  npStore: npStoreRouter,
  tge: tgeRouter,
  partner: partnerRouter,
  notifications: notificationsRouter,
  trading: tradingRouter,
  follow: followRouter,
  contacts: contactsRouter,
  watchlist: watchlistRouter,
  copyTrading: copyTradingRouter,
  settings: settingsRouter,
  referral: referralRouter,
  emailAuth: emailAuthRouter,
  webPush: webPushRouter,
  voice: voiceRouter,
  voiceRoom: voiceRoomRouter,
  ico: icoRouter,
  appVersion: appVersionRouter,
  consulting: consultingRouter,
  swap: swapRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
function vitePluginDisableReownAnalytics() {
  return {
    name: "disable-reown-analytics",
    transform(code, id) {
      if (id.includes("appkit-controllers") && !id.includes("node_modules/.vite")) {
        return {
          code: code.replace(/analytics:\s*true/g, "analytics: false"),
          map: null
        };
      }
    }
  };
}
function vitePluginInlinePreloadHelper() {
  let outDir = "";
  return {
    name: "inline-preload-helper",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    // Use closeBundle (after all files written) to post-process on disk
    closeBundle() {
      const assetsDir = path.join(outDir, "assets");
      if (!fs.existsSync(assetsDir)) return;
      const files = fs.readdirSync(assetsDir);
      const indexFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
      const metamaskFile = files.find((f) => f.startsWith("vendor-metamask-") && f.endsWith(".js"));
      if (!indexFile || !metamaskFile) return;
      const indexPath = path.join(assetsDir, indexFile);
      const metamaskPath = path.join(assetsDir, metamaskFile);
      let indexCode = fs.readFileSync(indexPath, "utf8");
      const mmCode = fs.readFileSync(metamaskPath, "utf8");
      const importPattern = /import\{[^}]+\}from"\.\/(vendor-metamask-[^"]+\.js)"/;
      const importMatch = indexCode.match(importPattern);
      if (!importMatch) {
        console.log("[inline-preload-helper] No vendor-metamask import found in index.js");
        return;
      }
      const aliasMatch = importMatch[0].match(/_ as (\w+)/);
      if (!aliasMatch) {
        console.log("[inline-preload-helper] No _ alias found in vendor-metamask import");
        return;
      }
      const localAlias = aliasMatch[1];
      const exportMatch = mmCode.match(/export\{(\w+) as _/);
      if (!exportMatch) {
        console.log("[inline-preload-helper] No _ export found in vendor-metamask");
        return;
      }
      const internalName = exportMatch[1];
      const preloadFnIdx = mmCode.indexOf(`${internalName}=function(`);
      if (preloadFnIdx < 0) {
        console.log(`[inline-preload-helper] Preload function ${internalName} not found`);
        return;
      }
      const fnStart = mmCode.indexOf("{", preloadFnIdx);
      let depth = 0;
      let fnEnd = fnStart;
      for (let i = fnStart; i < mmCode.length; i++) {
        if (mmCode[i] === "{") depth++;
        else if (mmCode[i] === "}") {
          depth--;
          if (depth === 0) {
            fnEnd = i + 1;
            break;
          }
        }
      }
      let blockStart = -1;
      const lastImportEnd = (() => {
        let lastPos = -1;
        let searchFrom = 0;
        while (searchFrom < preloadFnIdx) {
          const fromIdx = mmCode.indexOf('from"', searchFrom);
          if (fromIdx < 0 || fromIdx >= preloadFnIdx) break;
          const closeQuote = mmCode.indexOf('"', fromIdx + 5);
          if (closeQuote < 0) break;
          let endPos = closeQuote + 1;
          if (mmCode[endPos] === ";") endPos++;
          lastPos = endPos;
          searchFrom = endPos;
        }
        return lastPos;
      })();
      if (lastImportEnd > 0) {
        let pos = lastImportEnd;
        while (pos < mmCode.length && (mmCode[pos] === " " || mmCode[pos] === "\n" || mmCode[pos] === "\r")) pos++;
        if (mmCode.startsWith("const ", pos)) {
          blockStart = pos;
        }
      }
      if (blockStart < 0) {
        console.log("[inline-preload-helper] Could not find block start after imports, falling back to preloadFnIdx");
        blockStart = preloadFnIdx;
      }
      let helperCode = mmCode.slice(blockStart, fnEnd).trim();
      helperCode = helperCode.replace(new RegExp(`\\b${internalName}\\b`, "g"), localAlias);
      const inlineDecl = `${helperCode};`;
      let patchedIndex = indexCode.replace(importMatch[0], "");
      const importRe = /import\{[^}]+\}from"[^"]+";?/g;
      let lastImportMatch = null;
      let m;
      while ((m = importRe.exec(patchedIndex)) !== null) {
        lastImportMatch = m;
      }
      if (!lastImportMatch) {
        console.error("[inline-preload-helper] No imports found in index.js after removal");
        return;
      }
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      patchedIndex = patchedIndex.slice(0, insertPos) + inlineDecl + patchedIndex.slice(insertPos);
      if (patchedIndex === indexCode) {
        console.log("[inline-preload-helper] No changes made to index.js");
        return;
      }
      const afterInlinePos = insertPos + inlineDecl.length;
      const codeAfterInline = patchedIndex.slice(afterInlinePos, afterInlinePos + 200);
      if (/^import\{/.test(codeAfterInline)) {
        console.error("[inline-preload-helper] VALIDATION FAILED: import statement found right after inline code!");
        console.error("[inline-preload-helper] Code after inline:", codeAfterInline.substring(0, 100));
        return;
      }
      fs.writeFileSync(indexPath, patchedIndex, "utf8");
      console.log(`[inline-preload-helper] Successfully inlined preload helper into ${indexFile}`);
      console.log(`[inline-preload-helper] Removed sync dependency on ${metamaskFile}`);
      console.log(`[inline-preload-helper] Inline code preview: ${inlineDecl.substring(0, 150)}`);
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginDisableReownAnalytics(), vitePluginInlinePreloadHelper()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    // Force Vite to use a single copy of React across all packages.
    // Without this, @sentry/react (and wagmi/rainbowkit) can resolve their own
    // peer-dep copy of React, causing "Invalid hook call" crashes at runtime.
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Replace framer-motion with a no-op shim to fix Android Chrome black screen.
      // framer-motion's AnimatePresence causes component tree to unmount without
      // remounting on Android WebView, resulting in permanent black screen.
      // The shim exports the same API surface but renders plain HTML elements.
      "framer-motion": path.resolve(import.meta.dirname, "client", "src", "lib", "motion-shim.tsx")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  define: {
    // Inject build timestamp to ensure unique bundle hash on every build
    // This prevents CDN from serving stale cached bundles after deployment
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify((/* @__PURE__ */ new Date()).toISOString()),
    // Inject platform-injected VITE_ env vars that are in process.env but not in .env files
    "import.meta.env.VITE_WALLETCONNECT_PROJECT_ID": JSON.stringify(
      process.env.VITE_WALLETCONNECT_PROJECT_ID || ""
    ),
    "import.meta.env.VITE_FRONTEND_FORGE_API_KEY": JSON.stringify(
      process.env.VITE_FRONTEND_FORGE_API_KEY || ""
    ),
    "import.meta.env.VITE_FRONTEND_FORGE_API_URL": JSON.stringify(
      process.env.VITE_FRONTEND_FORGE_API_URL || ""
    )
  },
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Use Terser for better compression (15% smaller than esbuild default)
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        // Keep console for debugging
        drop_debugger: true,
        pure_funcs: ["console.debug"],
        passes: 2
        // Two compression passes for better results
      },
      mangle: {
        safari10: true
        // Fix Safari 10 bugs
      },
      format: {
        comments: false
        // Remove all comments
      }
    },
    // Disable automatic modulepreload injection to prevent mobile white screen
    // (10MB+ JS preloaded on first visit caused blank page on mobile)
    modulePreload: false,
    // Merge chunks smaller than 20KB into their importers to reduce file count
    // This reduces 8 tiny chunks (1-15KB) into larger ones, cutting upload count
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        // Merge small chunks (< 20KB) into their importers automatically
        experimentalMinChunkSize: 2e4,
        // Prevent Rollup from hoisting transitive imports of dynamic chunks
        // to the entry chunk's synchronous dependencies.
        // This keeps vendor-web3, vendor-misc etc. as truly async chunks.
        hoistTransitiveImports: false,
        manualChunks(id) {
          if (id.includes("@metamask/sdk") || id.includes("@metamask/sdk-analytics")) {
            return "vendor-metamask";
          }
          if (id.includes("wagmi") || id.includes("@rainbow-me") || id.includes("viem") || id.includes("@reown") || id.includes("@walletconnect") || id.includes("@noble") || id.includes("@scure") || id.includes("@adraffy") || id.includes("@coinbase") || id.includes("coinbase-wallet") || id.includes("@metamask/rpc-errors") || id.includes("@metamask/safe-event-emitter") || id.includes("@metamask/superstruct") || id.includes("@metamask/utils") || id.includes("@base-org") || id.includes("@safe-global") || id.includes("eth-block-tracker") || id.includes("eth-json-rpc-filters") || id.includes("eth-query") || id.includes("eth-rpc-errors") || id.includes("json-rpc-engine") || id.includes("json-rpc-random-id") || id.includes("/ox/") || id.includes("/ox/_") || id.includes("mipd") || id.includes("abitype") || id.includes("keccak") || id.includes("sha.js") || id.includes("/bs58/") || id.includes("/bn.js/") || id.includes("multiformats") || id.includes("uint8arrays") || id.includes("to-buffer") || id.includes("@vanilla-extract") || id.includes("@lit/") || id.includes("/lit-element/") || id.includes("/lit-html/") || id.includes("/lit/") || id.includes("valtio") || id.includes("derive-valtio") || id.includes("proxy-compare") || id.includes("zustand") || id.includes("openapi-fetch") || id.includes("idb-keyval") || id.includes("async-mutex") || id.includes("/pify/") || id.includes("detect-browser") || id.includes("detect-node-es") || id.includes("ua-parser-js") || id.includes("eventemitter2") || id.includes("/pino/") || id.includes("get-nonce") || id.includes("cross-fetch") || id.includes("html2canvas") || // NOTE: react-remove-scroll, react-style-singleton, use-sidecar are intentionally NOT here.
          // They depend on use-callback-ref which is in the main vendor chunk.
          // Putting them in vendor-web3 creates: vendor -> vendor-web3 -> vendor (circular!)
          // causing 'A is not a function' on mobile browsers.
          // NOTE: use-callback-ref is intentionally NOT here.
          // It is shared by both @radix-ui (in vendor) and RainbowKit (vendor-web3).
          // Putting it in vendor-web3 would create: vendor -> vendor-web3 -> vendor (circular!)
          // Leaving it in vendor means vendor-web3 imports from vendor (one-way, no cycle).
          //
          // NOTE: WalletContext is intentionally NOT here.
          // WalletContext imports trpc (lib/trpc.ts), and trpc is needed by index.js.
          // If WalletContext were in vendor-web3, Rollup would put trpc in vendor-web3 too,
          // causing index.js to statically import vendor-web3 (4.5MB sync load = white screen!)
          // WalletContext is only used inside Web3ProviderImpl (lazy loaded), so it's safe
          // to leave it in the default vendor chunk.
          id.includes("Web3ProviderImpl") || id.includes("/lib/wagmi")) {
            return "vendor-web3";
          }
          if (id.includes("socket.io") || id.includes("engine.io") || id.includes("xmlhttprequest-ssl")) {
            return "vendor-socketio";
          }
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        }
      }
    }
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    // HMR: use the proxied domain so the browser can reach the WebSocket
    // without this, Vite tries ws://localhost:5173 which is blocked by the proxy
    hmr: {
      clientPort: 443,
      protocol: "wss"
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/")) {
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use("/assets", express.static(path2.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
    etag: false,
    lastModified: false
  }));
  app.use("/pdfjs", express.static(path2.join(distPath, "pdfjs"), {
    maxAge: "7d",
    etag: true
  }));
  app.use(express.static(distPath, {
    maxAge: "1h",
    etag: true
  }));
  app.get(["/about", "/about/"], (_req, res, next) => {
    const candidates = [
      path2.resolve(distPath, "about.html"),
      path2.resolve(process.cwd(), "dist", "public", "about.html"),
      path2.resolve(process.cwd(), "client", "public", "about.html")
    ];
    for (const file of candidates) {
      if (fs2.existsSync(file)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(file);
        return;
      }
    }
    next();
  });
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/priceAlertChecker.ts
init_db();
init_schema();
import { eq as eq41, and as and37 } from "drizzle-orm";
init_logger();
var COINGECKO_BASE2 = "https://api.coingecko.com/api/v3";
var CHECK_INTERVAL_MS = 2 * 60 * 1e3;
async function fetchPrices(tokenIds) {
  if (tokenIds.length === 0) return {};
  const ids = Array.from(new Set(tokenIds)).join(",");
  try {
    const res = await fetch(
      `${COINGECKO_BASE2}/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const result = {};
    for (const [id, val] of Object.entries(data)) {
      result[id] = val.usd;
    }
    return result;
  } catch {
    return {};
  }
}
async function checkAlerts() {
  const activeAlerts = await withDbRetry(
    (db) => db.select().from(priceAlerts).where(and37(eq41(priceAlerts.isActive, true), eq41(priceAlerts.isTriggered, false)))
  );
  if (!activeAlerts || activeAlerts.length === 0) return;
  const tokenIds = activeAlerts.map((a) => a.tokenId);
  const prices = await fetchPrices(tokenIds);
  if (Object.keys(prices).length === 0) return;
  for (const alert of activeAlerts) {
    const currentPrice = prices[alert.tokenId];
    if (currentPrice === void 0) continue;
    const target = parseFloat(alert.targetPrice);
    if (isNaN(target)) continue;
    const triggered = alert.condition === "above" && currentPrice >= target || alert.condition === "below" && currentPrice <= target;
    if (!triggered) continue;
    await withDbRetry(
      (db) => db.update(priceAlerts).set({ isTriggered: true, isActive: false }).where(eq41(priceAlerts.id, alert.id))
    );
    const directionLabel = alert.condition === "above" ? "above \u2191" : "below \u2193";
    const content = `\u{1F514} Price Alert: ${alert.tokenSymbol} is now $${currentPrice.toLocaleString()} \u2014 your target of $${target.toLocaleString()} (${directionLabel}) has been reached!`;
    await withDbRetry(
      (db) => db.insert(notifications).values({
        userId: alert.userId,
        type: "system",
        fromUserId: null,
        fromUserName: "\u6BD4\u7279AI\u793E\u4EA4",
        fromUserAvatar: "\u{1F514}",
        content,
        isRead: false
      })
    );
    emitToUser(alert.userId, "price_alert", {
      alertId: alert.id,
      tokenSymbol: alert.tokenSymbol,
      condition: alert.condition,
      targetPrice: target,
      currentPrice,
      content
    });
    logger_default.info(
      { alertId: alert.id, userId: alert.userId, token: alert.tokenSymbol, condition: alert.condition, target, currentPrice },
      `PriceAlert: Triggered alert #${alert.id} for ${alert.tokenSymbol} ${alert.condition} $${target} (current: $${currentPrice})`
    );
  }
}
function startPriceAlertChecker() {
  logger_default.info("PriceAlert: Checker started \u2014 interval: 2 min");
  checkAlerts().catch((err) => logger_default.error({ err }, "PriceAlert: check failed"));
  setInterval(() => {
    checkAlerts().catch((err) => logger_default.error({ err }, "PriceAlert: check failed"));
  }, CHECK_INTERVAL_MS);
}

// server/botScheduler.ts
init_db();
init_schema();
import { eq as eq42, and as and38, desc as desc25 } from "drizzle-orm";
import pino2 from "pino";
var logger2 = pino2({ level: "info" });
var BOT_OPEN_IDS = {
  AlphaHunter: "bot_alpha_hunter_0x",
  ChainAnalyst: "bot_chain_analyst",
  CryptoSkeptic: "bot_crypto_skeptic",
  Web3Newbie: "bot_web3_newbie",
  QuantTrader: "bot_quant_trader_pro",
  NexusBot: "bot_nexus_bot"
};
var botIds = {};
async function loadBotIds() {
  if (Object.keys(botIds).length > 0) return;
  const db = await getDb();
  if (!db) return;
  for (const [name, openId] of Object.entries(BOT_OPEN_IDS)) {
    const [bot] = await db.select({ id: users.id }).from(users).where(eq42(users.openId, openId)).limit(1);
    if (bot) botIds[name] = bot.id;
  }
}
async function generateMorningReport() {
  const topics = [
    "\u4ECA\u65E5BTC\u4EF7\u683C\u8D70\u52BF\u548C\u5E02\u573A\u60C5\u7EEA",
    "\u6628\u65E5\u94FE\u4E0A\u6570\u636E\u4EAE\u70B9",
    "\u4ECA\u65E5\u503C\u5F97\u5173\u6CE8\u7684DeFi\u673A\u4F1A",
    "Web3\u884C\u4E1A\u4ECA\u65E5\u8981\u95FB"
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  try {
    if (!consumeBotLLMBudget()) return [];
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "\u4F60\u662F\u6BD4\u7279AI\u793E\u4EA4\u5B98\u65B9\u52A9\u624B\u3002\u8BF7\u751F\u6210\u4E00\u6761\u7B80\u77ED\u7684Web3\u65E9\u62A5\u6D88\u606F\uFF0850-100\u5B57\uFF09\uFF0C\u8BED\u6C14\u4E13\u4E1A\u53CB\u597D\uFF0C\u5305\u542Bemoji\uFF0C\u4E2D\u82F1\u6587\u6DF7\u7528\u3002\u4E0D\u8981\u63D0\u4F9B\u5177\u4F53\u4EF7\u683C\u9884\u6D4B\u3002"
        },
        {
          role: "user",
          content: `\u751F\u6210\u5173\u4E8E"${topic}"\u7684\u65E9\u62A5\u6D88\u606F\uFF0C\u4EE5"\u{1F305} \u65E9\u5B89 Web3 Frens\uFF01"\u5F00\u5934`
        }
      ]
    });
    const rawContent = response.choices?.[0]?.message?.content;
    const content = (typeof rawContent === "string" ? rawContent : null) || "\u{1F305} \u65E9\u5B89 Web3 Frens\uFF01\u65B0\u7684\u4E00\u5929\u5F00\u59CB\u4E86\uFF0C\u4FDD\u6301\u7406\u6027\uFF0C\u505A\u597D\u98CE\u63A7\uFF0Cgm\uFF01";
    return [1, 2, 3, 4].map((groupId) => ({ groupId, botName: "NexusBot", content }));
  } catch (err) {
    logger2.error({ err }, "BotScheduler: \u65E9\u62A5\u751F\u6210\u5931\u8D25");
    return [1, 2, 3, 4].map((groupId) => ({
      groupId,
      botName: "NexusBot",
      content: "\u{1F305} \u65E9\u5B89 Web3 Frens\uFF01\u65B0\u7684\u4E00\u5929\u5F00\u59CB\u4E86\uFF0C\u4FDD\u6301\u7406\u6027\uFF0C\u505A\u597D\u98CE\u63A7\uFF0Cgm\uFF01"
    }));
  }
}
async function generateEveningTopics() {
  const groupTopics = [
    {
      groupId: 1,
      botName: "AlphaHunter",
      prompt: "\u751F\u6210\u4E00\u6761DeFi\u7FA4\u7684\u665A\u95F4\u8BDD\u9898\uFF0C\u5F15\u5BFC\u5927\u5BB6\u5206\u4EAB\u4ECA\u65E5\u53D1\u73B0\u7684Alpha\u673A\u4F1A\uFF0C\u4EE5\u95EE\u53E5\u7ED3\u5C3E\u5F15\u53D1\u8BA8\u8BBA\uFF0C50-80\u5B57"
    },
    {
      groupId: 2,
      botName: "ChainAnalyst",
      prompt: "\u751F\u6210\u4E00\u6761\u94FE\u4E0A\u6570\u636E\u7FA4\u7684\u665A\u95F4\u5206\u6790\uFF0C\u5206\u4EAB\u4ECA\u65E5\u4E00\u4E2A\u6709\u8DA3\u7684\u94FE\u4E0A\u6570\u636E\u53D1\u73B0\uFF0C50-80\u5B57"
    },
    {
      groupId: 3,
      botName: "NexusBot",
      prompt: "\u751F\u6210\u4E00\u6761\u65B0\u624B\u6751\u7684\u665A\u95F4\u8BDD\u9898\uFF0C\u63D0\u51FA\u4E00\u4E2A\u9002\u5408\u65B0\u624B\u601D\u8003\u7684Web3\u95EE\u9898\uFF0C\u5F15\u5BFC\u8BA8\u8BBA\uFF0C50-80\u5B57"
    },
    {
      groupId: 4,
      botName: "NexusBot",
      prompt: "\u751F\u6210\u4E00\u6761\u5B98\u65B9\u793E\u533A\u7684\u665A\u95F4\u8BDD\u9898\uFF0C\u53EF\u4EE5\u662F\u4ECA\u65E5\u884C\u4E1A\u65B0\u95FB\u70B9\u8BC4\u6216\u793E\u533A\u4E92\u52A8\u8BDD\u9898\uFF0C50-80\u5B57"
    }
  ];
  const results = [];
  for (const item of groupTopics) {
    try {
      if (!consumeBotLLMBudget()) break;
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "\u4F60\u662F\u4E00\u4E2AWeb3\u793E\u533A\u8FD0\u8425\u8005\uFF0C\u751F\u6210\u7B80\u77ED\u81EA\u7136\u7684\u7FA4\u804A\u6D88\u606F\uFF0C\u4E2D\u82F1\u6587\u6DF7\u7528\uFF0C\u8BED\u6C14\u81EA\u7136\u4E0D\u505A\u4F5C\u3002"
          },
          { role: "user", content: item.prompt }
        ]
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const content = (typeof rawContent === "string" ? rawContent : null) || "\u{1F319} \u665A\u4E0A\u597D\uFF01\u4ECA\u5929\u5927\u5BB6\u6709\u4EC0\u4E48\u65B0\u53D1\u73B0\uFF1F";
      results.push({ groupId: item.groupId, botName: item.botName, content });
    } catch {
      results.push({
        groupId: item.groupId,
        botName: item.botName,
        content: "\u{1F319} \u665A\u4E0A\u597D\uFF01\u4ECA\u5929\u5927\u5BB6\u6709\u4EC0\u4E48\u65B0\u53D1\u73B0\uFF1F"
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}
async function sendBotMessage(groupId, botName, content) {
  await loadBotIds();
  const db = await getDb();
  if (!db) return;
  const botId = botIds[botName];
  if (!botId) {
    logger2.warn(`BotScheduler: Bot ${botName} ID\u672A\u627E\u5230`);
    return;
  }
  const [result] = await db.insert(messages).values({
    groupId,
    senderId: botId,
    content,
    messageType: "text"
  }).$returningId();
  try {
    const [bot] = await db.select({ id: users.id, name: users.name, avatar: users.avatar, username: users.username }).from(users).where(eq42(users.id, botId)).limit(1);
    const messagePayload = {
      id: result.id,
      groupId,
      senderId: botId,
      senderName: bot?.name ?? botName,
      senderAvatar: bot?.avatar ?? null,
      content,
      messageType: "text",
      createdAt: /* @__PURE__ */ new Date()
    };
    const io = getSocketIO();
    if (io) {
      io.to(`group:${groupId}`).emit("new_message", messagePayload);
    }
  } catch (err) {
    logger2.warn({ err }, "BotScheduler: Socket\u5E7F\u64AD\u5931\u8D25\uFF08\u975E\u81F4\u547D\uFF09");
  }
  logger2.info(`BotScheduler: ${botName} \u5728\u7FA4${groupId}\u53D1\u9001\u6D88\u606F`);
}
function shouldPostMorning() {
  const now = /* @__PURE__ */ new Date();
  return now.getHours() === 9 && now.getMinutes() === 0;
}
function shouldPostEvening() {
  const now = /* @__PURE__ */ new Date();
  return now.getHours() === 21 && now.getMinutes() === 0;
}
var lastMorningPost = 0;
var lastEveningPost = 0;
var AMBIENT_COOLDOWN_MS = Number(process.env.BOT_AMBIENT_COOLDOWN_MS || 11 * 60 * 1e3);
var AMBIENT_TICK_PROB = Number(process.env.BOT_AMBIENT_TICK_PROB || 0.4);
var lastAmbientPerGroup = {};
function personaStyleByOpenId(openId) {
  for (const p of Object.values(BOT_PERSONAS)) if (p.openId === openId) return p.style;
  return "\u4F60\u662F\u672C\u7FA4\u6D3B\u8DC3\u7684\u8D44\u6DF1\u6210\u5458\uFF0C\u53CB\u597D\u4E13\u4E1A\uFF0C\u64C5\u957F Web3 \u8BDD\u9898\uFF0C\u7231\u6D3B\u8DC3\u6C14\u6C1B";
}
async function postAsBot(db, groupId, botId, name, avatar, content) {
  const [r] = await db.insert(messages).values({ groupId, senderId: botId, content, messageType: "text" }).$returningId();
  const io = getSocketIO();
  if (io) io.to(`group:${groupId}`).emit("new_message", { id: r.id, groupId, senderId: botId, senderName: name, senderAvatar: avatar, content, messageType: "text", createdAt: /* @__PURE__ */ new Date() });
}
async function runAmbientChatter() {
  if (Math.random() > AMBIENT_TICK_PROB) return;
  const db = await getDb();
  if (!db) return;
  const groups = await db.select({ id: chatGroups.id }).from(chatGroups).where(eq42(chatGroups.isPublic, true)).limit(500);
  const now = Date.now();
  const eligible = groups.filter((g) => !lastAmbientPerGroup[g.id] || now - lastAmbientPerGroup[g.id] > AMBIENT_COOLDOWN_MS);
  if (eligible.length === 0) return;
  const group = eligible[Math.floor(Math.random() * eligible.length)];
  const personaOpenIds = new Set(Object.values(BOT_PERSONAS).map((p) => p.openId));
  const bots = (await db.select({ id: users.id, name: users.name, avatar: users.avatar, openId: users.openId }).from(groupMembers).innerJoin(users, eq42(users.id, groupMembers.userId)).where(and38(eq42(groupMembers.groupId, group.id), eq42(users.isBot, true)))).filter((b) => personaOpenIds.has(b.openId ?? ""));
  if (bots.length === 0) return;
  const recent = await db.select({ content: messages.content, name: users.name, createdAt: messages.createdAt, senderId: messages.senderId }).from(messages).leftJoin(users, eq42(messages.senderId, users.id)).where(and38(eq42(messages.groupId, group.id), eq42(messages.isDeleted, false))).orderBy(desc25(messages.createdAt)).limit(6);
  const lastAge = recent[0]?.createdAt ? now - new Date(recent[0].createdAt).getTime() : Infinity;
  const pool = bots.filter((b) => b.id !== recent[0]?.senderId);
  const cand = pool.length ? pool : bots;
  const bot = cand[Math.floor(Math.random() * cand.length)];
  lastAmbientPerGroup[group.id] = now;
  const quiet = lastAge > 30 * 60 * 1e3 || recent.length === 0;
  const context = recent.slice().reverse().map((m) => `${m.name ?? "\u7528\u6237"}: ${m.content}`).join("\n");
  try {
    if (!consumeBotLLMBudget()) return;
    const response = await invokeLLM({
      messages: [
        { role: "system", content: `${personaStyleByOpenId(bot.openId)}\u3002\u4F60\u5728\u4E00\u4E2A Web3 \u793E\u533A\u7FA4\u91CC\u6D3B\u8DC3\u6C14\u6C1B\u3002${quiet ? "\u7FA4\u91CC\u6709\u70B9\u5B89\u9759\uFF0C\u8BF7\u53D1\u8D77\u4E00\u4E2A\u6709\u610F\u601D\u3001\u80FD\u5F15\u53D1\u8BA8\u8BBA\u7684\u7B80\u77ED\u8BDD\u9898\uFF08\u884C\u60C5\u89C2\u70B9/\u63D0\u95EE/\u5206\u4EAB\u7686\u53EF\uFF09" : "\u8BF7\u6839\u636E\u6700\u8FD1\u5BF9\u8BDD\u81EA\u7136\u5730\u63A5\u4E00\u53E5\uFF08\u8BC4\u8BBA/\u63D0\u95EE/\u8865\u5145\u89C2\u70B9\uFF09\uFF0C\u522B\u590D\u8BFB\u4E0A\u6587"}\u3002\u8981\u6C42\uFF1A15-70\u5B57\uFF0C\u4E2D\u82F1\u6587\u6DF7\u7528\uFF0C\u81EA\u7136\u4E0D\u505A\u4F5C\uFF0C\u4E0D\u8981\u4EE5\u201C\u6211\u201D\u5F00\u5934\uFF0C\u53EA\u53D1\u4E00\u6761\uFF0C\u4E0D\u8981\u5E26\u5F15\u53F7\u3002` },
        { role: "user", content: quiet ? "\u8BF7\u53D1\u8D77\u4E00\u4E2A\u8BDD\u9898\uFF1A" : `\u7FA4\u804A\u6700\u8FD1\u6D88\u606F\uFF1A
${context}

\u81EA\u7136\u63A5\u4E00\u53E5\uFF1A` }
      ]
    });
    const raw = response.choices?.[0]?.message?.content;
    const content = typeof raw === "string" ? raw.trim().replace(/^["「']|["」']$/g, "").trim() : null;
    if (!content || content.length < 4) return;
    await postAsBot(db, group.id, bot.id, bot.name, bot.avatar, content);
    logger2.info({ groupId: group.id, bot: bot.name, quiet }, "Ambient: \u673A\u5668\u4EBA\u53D1\u8A00");
  } catch (err) {
    logger2.warn({ err }, "Ambient: \u53D1\u8A00\u5931\u8D25\uFF08\u975E\u81F4\u547D\uFF09");
  }
}
async function checkAndPost() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1e3;
  const d = /* @__PURE__ */ new Date();
  runDueGroupBots(d.getHours(), d.getMinutes()).catch((err) => logger2.error({ err }, "BotScheduler: \u7FA4\u673A\u5668\u4EBA\u5B9A\u65F6\u4EFB\u52A1\u5931\u8D25"));
  runAmbientChatter().catch((err) => logger2.error({ err }, "BotScheduler: \u6C1B\u56F4\u673A\u5668\u4EBA\u5931\u8D25"));
  if (shouldPostMorning() && now - lastMorningPost > oneDay - 6e4) {
    logger2.info("BotScheduler: \u89E6\u53D1\u65E9\u62A5\u4EFB\u52A1");
    lastMorningPost = now;
    try {
      const posts2 = await generateMorningReport();
      for (const post of posts2) {
        await sendBotMessage(post.groupId, post.botName, post.content);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      logger2.error({ err }, "BotScheduler: \u65E9\u62A5\u4EFB\u52A1\u5931\u8D25");
    }
  }
  if (shouldPostEvening() && now - lastEveningPost > oneDay - 6e4) {
    logger2.info("BotScheduler: \u89E6\u53D1\u665A\u95F4\u8BDD\u9898\u4EFB\u52A1");
    lastEveningPost = now;
    try {
      const posts2 = await generateEveningTopics();
      for (const post of posts2) {
        await sendBotMessage(post.groupId, post.botName, post.content);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      logger2.error({ err }, "BotScheduler: \u665A\u95F4\u8BDD\u9898\u4EFB\u52A1\u5931\u8D25");
    }
  }
}
function startBotScheduler() {
  logger2.info("BotScheduler: \u542F\u52A8 \u2014 \u6BCF\u5206\u949F\u68C0\u67E5\u53D1\u5E16\u65F6\u95F4\uFF0809:00\u65E9\u62A5 + 21:00\u665A\u95F4\u8BDD\u9898\uFF09");
  setInterval(() => {
    checkAndPost().catch((err) => logger2.error({ err }, "BotScheduler: \u68C0\u67E5\u5931\u8D25"));
  }, 60 * 1e3);
}

// server/messageCleanup.ts
init_db();
init_schema();
init_logger();
import { and as and39, isNotNull as isNotNull2, lt as lt6 } from "drizzle-orm";
var INTERVAL_MS = 10 * 60 * 1e3;
async function purgeExpired() {
  const db = await getDb();
  if (!db) return;
  const res = await db.delete(messages).where(and39(isNotNull2(messages.expiresAt), lt6(messages.expiresAt, /* @__PURE__ */ new Date())));
  const removed = res?.[0]?.affectedRows ?? res?.rowsAffected ?? res?.affectedRows;
  if (removed) logger_default.info({ removed }, "MessageCleanup: purged expired messages");
}
function startMessageCleanup() {
  logger_default.info("MessageCleanup: started \u2014 interval: 10 min");
  purgeExpired().catch((err) => logger_default.error({ err }, "MessageCleanup: purge failed"));
  setInterval(() => {
    purgeExpired().catch((err) => logger_default.error({ err }, "MessageCleanup: purge failed"));
  }, INTERVAL_MS);
}

// server/_core/index.ts
init_rankEngine();

// server/icoRewardScheduler.ts
init_logger();
function startIcoRewardScheduler() {
  const tick = async () => {
    try {
      const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const r = await settleIcoRewards(date);
      if (r && !r.skipped) logger_default.info({ date, emitted: r.emitted, stakers: r.stakers, factor: r.factor }, "ICO \u8D28\u62BC\u6536\u76CA\u5DF2\u7ED3\u7B97");
    } catch (e) {
      logger_default.warn({ err: e }, "ICO \u6536\u76CA\u7ED3\u7B97\u5931\u8D25\uFF08\u975E\u81F4\u547D\uFF09");
    }
  };
  setInterval(() => {
    void tick();
  }, 60 * 60 * 1e3);
  setTimeout(() => {
    void tick();
  }, 3e4);
}

// server/schemaPatches.ts
import mysql from "mysql2/promise";
var PATCHES = [
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
  // 发现页生态仪表盘配置（加成 + 额外指标行）
  "ALTER TABLE `app_config` ADD COLUMN IF NOT EXISTS `dashboardConfig` TEXT",
  `CREATE TABLE IF NOT EXISTS \`it_transactions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`amount\` int NOT NULL,
    \`type\` varchar(30) NOT NULL,
    \`refType\` varchar(20),
    \`refId\` int,
    \`memo\` varchar(200),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_ittx_user\` (\`userId\`, \`createdAt\`)
  )`
];
async function applySchemaPatches() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  let conn = null;
  try {
    conn = await mysql.createConnection(url);
    for (const sql26 of PATCHES) {
      try {
        await conn.query(sql26);
      } catch (e) {
        console.error(`[SchemaPatch] failed: ${sql26}`, e);
      }
    }
  } catch (e) {
    console.error("[SchemaPatch] connection failed:", e);
  } finally {
    try {
      await conn?.end();
    } catch {
    }
  }
}

// server/express/tokenChatStream.ts
init_env();
var rateLimitMap = /* @__PURE__ */ new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}
async function fetchTokenContext(symbol) {
  try {
    const cacheKey2 = `token:search:${symbol.toLowerCase()}`;
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    const searchData = await cachedFetch(cacheKey2, searchUrl, TTL.search, (res) => res.json());
    const coin = searchData?.coins?.[0];
    if (!coin) return `\u4EE3\u5E01\u7B26\u53F7: ${symbol.toUpperCase()}
\uFF08\u65E0\u6CD5\u83B7\u53D6\u5B9E\u65F6\u6570\u636E\uFF09`;
    const detailCacheKey = `token:detail:${coin.id}`;
    const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const detail = await cachedFetch(detailCacheKey, detailUrl, TTL.tokenDetail, (res) => res.json());
    if (!detail) return `\u4EE3\u5E01\u7B26\u53F7: ${symbol.toUpperCase()}
\uFF08\u65E0\u6CD5\u83B7\u53D6\u5B9E\u65F6\u6570\u636E\uFF09`;
    const md = detail.market_data;
    const price = md?.current_price?.usd;
    const change24h = md?.price_change_percentage_24h;
    const change7d = md?.price_change_percentage_7d;
    const marketCap = md?.market_cap?.usd;
    const rank = detail.market_cap_rank;
    const volume24h = md?.total_volume?.usd;
    const ath = md?.ath?.usd;
    const athChange = md?.ath_change_percentage?.usd;
    const circSupply = md?.circulating_supply;
    const maxSupply = md?.max_supply;
    const sentiment = detail.sentiment_votes_up_percentage;
    const fmtUsd3 = (v) => v ? v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toFixed(2)}` : "N/A";
    const fmtPct3 = (v) => v !== null && v !== void 0 ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";
    const fmtNum3 = (v) => v ? v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toFixed(0) : "N/A";
    return `=== ${detail.name} (${detail.symbol?.toUpperCase()}) \u5B9E\u65F6\u5E02\u573A\u6570\u636E ===
\u5F53\u524D\u4EF7\u683C: ${price ? `$${price.toLocaleString()}` : "N/A"}
24h \u6DA8\u8DCC: ${fmtPct3(change24h)}
7d \u6DA8\u8DCC: ${fmtPct3(change7d)}
\u5E02\u503C: ${fmtUsd3(marketCap)} (\u6392\u540D #${rank ?? "N/A"})
24h \u6210\u4EA4\u91CF: ${fmtUsd3(volume24h)}
ATH: ${ath ? `$${ath.toLocaleString()}` : "N/A"} (\u8DDD\u79BBATH ${fmtPct3(athChange)})
\u6D41\u901A\u91CF: ${fmtNum3(circSupply)}${maxSupply ? ` / \u6700\u5927\u4F9B\u5E94: ${fmtNum3(maxSupply)}` : ""}
\u793E\u533A\u60C5\u7EEA: ${sentiment ? `${sentiment.toFixed(0)}% \u770B\u6DA8` : "N/A"}
${detail.description?.en ? `
\u7B80\u4ECB: ${detail.description.en.slice(0, 300)}...` : ""}`;
  } catch {
    return `\u4EE3\u5E01\u7B26\u53F7: ${symbol.toUpperCase()}
\uFF08\u83B7\u53D6\u5B9E\u65F6\u6570\u636E\u65F6\u51FA\u9519\uFF09`;
  }
}
async function handleTokenChatStream(req, res) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!checkRateLimit(user.id)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait 60 seconds." });
    return;
  }
  const { token, message, history = [] } = req.body;
  if (!token || !message) {
    res.status(400).json({ error: "token and message are required" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const sendEvent = (data) => {
    res.write(`data: ${data}

`);
  };
  try {
    if (!consumeUserAiBudget()) {
      sendEvent(JSON.stringify({ error: "AI \u4ECA\u65E5\u7E41\u5FD9\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }));
      res.end();
      return;
    }
    const tokenContext = await fetchTokenContext(token);
    const systemPrompt = `\u4F60\u662F\u6BD4\u7279AI\u793E\u4EA4\u7684 AI \u5206\u6790\u52A9\u624B\uFF0C\u4E13\u6CE8\u4E8E\u52A0\u5BC6\u8D27\u5E01\u5206\u6790\u3002
\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5B9E\u65F6\u5E02\u573A\u6570\u636E\u56DE\u7B54\u7528\u6237\u95EE\u9898\uFF1A

${tokenContext}

\u56DE\u7B54\u8981\u6C42\uFF1A
- \u4F7F\u7528\u4E2D\u6587\u56DE\u7B54
- \u7ED3\u5408\u4E0A\u8FF0\u5B9E\u65F6\u6570\u636E\u7ED9\u51FA\u5177\u4F53\u5206\u6790
- \u89C2\u70B9\u660E\u786E\uFF0C\u6709\u7406\u6709\u636E\uFF0C\u907F\u514D\u5E9F\u8BDD
- \u9002\u5F53\u4F7F\u7528 Markdown \u683C\u5F0F\uFF08\u52A0\u7C97\u5173\u952E\u6570\u636E\uFF09
- \u6BCF\u6B21\u56DE\u7B54\u63A7\u5236\u5728 200-400 \u5B57`;
    const messages3 = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];
    const apiUrl = ENV.forgeApiUrl ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions";
    const llmRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: messages3,
        stream: true,
        max_tokens: 1024
      }),
      signal: req.socket.destroyed ? AbortSignal.abort() : void 0
    });
    if (!llmRes.ok) {
      const errText = await llmRes.text();
      sendEvent(JSON.stringify({ error: `LLM error: ${llmRes.status} ${errText}` }));
      res.end();
      return;
    }
    const reader = llmRes.body?.getReader();
    if (!reader) {
      sendEvent(JSON.stringify({ error: "No response body" }));
      res.end();
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    req.on("close", () => {
      reader.cancel();
    });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            sendEvent(JSON.stringify({ token: delta }));
          }
        } catch {
        }
      }
    }
    sendEvent(JSON.stringify({ done: true }));
  } catch (err) {
    if (!res.writableEnded) {
      sendEvent(JSON.stringify({ error: err.message ?? "Unknown error" }));
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}

// server/express/apkDownload.ts
init_db();
init_schema();
import { Readable as Readable2 } from "stream";
import { eq as eq43 } from "drizzle-orm";
async function handleApkDownload(req, res) {
  try {
    const db = await getDb();
    let url = "";
    let version = "";
    if (db) {
      const rows = await db.select().from(appConfig).where(eq43(appConfig.platform, "all")).limit(1);
      if (rows.length > 0) {
        url = rows[0].downloadUrlAndroid ?? "";
        version = rows[0].latestVersion ?? "";
      }
    }
    const source = resolveAndroidApkSource(url);
    url = source.url;
    if (source.usedFallback) {
      console.warn("[APK] downloadUrlAndroid \u4E3A\u7A7A\u6216\u6307\u56DE\u672C\u7AD9\u4E0B\u8F7D\u5165\u53E3\uFF0C\u5DF2\u5207\u6362\u5E94\u6025 APK \u6E90");
    }
    if (url.startsWith("/")) {
      res.redirect(302, url.replace(/^\/manus-storage\//, "/app-media/"));
      return;
    }
    const clientRange = req.headers.range;
    if (typeof clientRange !== "string") {
      const wantsHtml = (req.headers.accept ?? "").includes("text/html");
      res.redirect(302, wantsHtml ? "/download" : url);
      return;
    }
    const upstreamHeaders = { Range: clientRange };
    const upstream = await fetch(url, { headers: upstreamHeaders, redirect: "follow" });
    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).send(`\u4E0B\u8F7D\u6E90\u6682\u4E0D\u53EF\u7528\uFF08${upstream.status}\uFF09\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5`);
      return;
    }
    if (upstream.status !== 206) {
      res.status(502).send("\u4E0B\u8F7D\u6E90\u4E0D\u652F\u6301\u5206\u6BB5\u8BFB\u53D6\uFF0C\u8BF7\u4F7F\u7528\u5907\u7528\u4E0B\u8F7D\u7EBF\u8DEF");
      return;
    }
    if (!upstream.body) {
      res.status(502).send("\u4E0B\u8F7D\u6E90\u8FD4\u56DE\u4E3A\u7A7A");
      return;
    }
    const upstreamType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
    if (upstreamType.includes("text/html")) {
      res.status(502).send("\u4E0B\u8F7D\u6E90\u8FD4\u56DE\u4E86\u7F51\u9875\u800C\u4E0D\u662F APK\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
      return;
    }
    const cr = upstream.headers.get("content-range");
    if (!/^bytes\s+\d+-\d+\/\d+$/i.test(cr ?? "")) {
      res.status(502).send("\u4E0B\u8F7D\u6E90\u7F3A\u5C11\u6709\u6548 Content-Range\uFF0C\u65E0\u6CD5\u4FDD\u8BC1\u6587\u4EF6\u5B8C\u6574");
      return;
    }
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    const fname = `Bitchat${version ? `-v${version}` : ""}.apk`;
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Content-Encoding", "identity");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("Accept-Ranges", "bytes");
    res.status(206);
    if (cr) res.setHeader("Content-Range", cr);
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    const nodeStream = Readable2.fromWeb(upstream.body);
    const expected = Number(len || 0);
    let piped = 0;
    nodeStream.on("data", (c) => {
      piped += c.length;
    });
    nodeStream.on("end", () => {
      if (expected > 0 && piped < expected) {
        console.error(`[APK] upstream\u77ED\u4F20 ${piped}/${expected},\u786C\u65AD\u8FDE\u63A5\u9632\u6B8B\u5305`);
        try {
          nodeStream.unpipe(res);
        } catch {
        }
        try {
          res.destroy();
        } catch {
        }
      }
    });
    nodeStream.pipe(res);
    nodeStream.on("error", () => {
      try {
        res.destroy();
      } catch {
      }
    });
    req.on("close", () => {
      try {
        nodeStream.destroy();
      } catch {
      }
    });
  } catch {
    res.status(500).send("\u4E0B\u8F7D\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
  }
}

// server/express/videoUpload.ts
init_env();
init_db();
init_membership();
var rateMap = /* @__PURE__ */ new Map();
function checkRate2(userId) {
  const now = Date.now();
  const e = rateMap.get(userId);
  if (!e || now > e.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (e.count >= 6) return false;
  e.count++;
  return true;
}
async function handleVideoUpload(req, res) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "\u672A\u767B\u5F55\u6216\u4F1A\u8BDD\u8FC7\u671F" });
    return;
  }
  if (!user?.id) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!checkRate2(String(user.id))) {
    res.status(429).json({ error: "\u4E0A\u4F20\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" });
    return;
  }
  const body = req.body;
  if (!body || !Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "\u7A7A\u7684\u4E0A\u4F20\u5185\u5BB9" });
    return;
  }
  const db = await getDb();
  const maxMB = db ? (await getBenefits(db, user.id)).maxVideoMB : 60;
  if (body.length > maxMB * 1024 * 1024) {
    res.status(413).json({ error: `\u89C6\u9891\u4E0D\u80FD\u8D85\u8FC7 ${maxMB}MB\uFF08\u5F53\u524D\u4F1A\u5458\u6863\u4F4D\uFF09\uFF0C\u5347\u7EA7\u4F1A\u5458\u53EF\u4E0A\u4F20\u66F4\u5927\u89C6\u9891` });
    return;
  }
  const mime = req.headers["content-type"]?.split(";")[0] || "video/mp4";
  if (!mime.startsWith("video/")) {
    res.status(400).json({ error: "\u4EC5\u652F\u6301\u89C6\u9891\u6587\u4EF6" });
    return;
  }
  const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "mp4";
  try {
    const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const key = `chat-videos/${user.id}/${Date.now()}.${ext}`;
    await storagePut2(key, body, mime);
    const publicUrl = `${ENV.publicOrigin}/app-media/${key}`;
    res.json({ url: publicUrl, maxMB });
  } catch (err) {
    res.status(500).json({ error: "\u4E0A\u4F20\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
  }
}

// server/express/fileUpload.ts
init_env();
init_db();
init_membership();
var rateMap2 = /* @__PURE__ */ new Map();
function checkRate3(userId) {
  const now = Date.now();
  const e = rateMap2.get(userId);
  if (!e || now > e.resetAt) {
    rateMap2.set(userId, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}
async function handleFileUpload(req, res) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "\u672A\u767B\u5F55\u6216\u4F1A\u8BDD\u8FC7\u671F" });
    return;
  }
  if (!user?.id) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!checkRate3(String(user.id))) {
    res.status(429).json({ error: "\u4E0A\u4F20\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" });
    return;
  }
  const body = req.body;
  if (!body || !Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "\u7A7A\u7684\u4E0A\u4F20\u5185\u5BB9" });
    return;
  }
  const db = await getDb();
  const maxMB = db ? (await getBenefits(db, user.id)).maxFileMB : 60;
  if (body.length > maxMB * 1024 * 1024) {
    res.status(413).json({ error: `\u6587\u4EF6\u4E0D\u80FD\u8D85\u8FC7 ${maxMB}MB\uFF08\u5F53\u524D\u4F1A\u5458\u6863\u4F4D\uFF09\uFF0C\u5347\u7EA7\u4F1A\u5458\u53EF\u4E0A\u4F20\u66F4\u5927\u6587\u4EF6` });
    return;
  }
  const rawName = typeof req.query.name === "string" ? req.query.name : "file";
  const safe = rawName.replace(/[^\w.\-一-龥]+/g, "_").slice(-100) || "file";
  const mime = req.headers["content-type"]?.split(";")[0] || "application/octet-stream";
  try {
    const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const key = `chat-files/${user.id}/${Date.now()}_${safe}`;
    await storagePut2(key, body, mime);
    const publicUrl = `${ENV.publicOrigin}/app-media/${key}`;
    res.json({ url: publicUrl, maxMB });
  } catch {
    res.status(500).json({ error: "\u4E0A\u4F20\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
  }
}

// server/express/chunkedUpload.ts
init_env();
import fs3 from "fs";
import os from "os";
import path3 from "path";
import crypto4 from "crypto";
init_db();
init_membership();
var sessions = /* @__PURE__ */ new Map();
var HARD_MAX = { video: 250 * 1024 * 1024, file: 500 * 1024 * 1024 };
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of Array.from(sessions.entries())) {
    if (now - s.updatedAt > 2 * 3600 * 1e3) {
      try {
        fs3.unlinkSync(s.filePath);
      } catch {
      }
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1e3);
async function authUser(req, res) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user?.id) return user;
  } catch {
  }
  res.status(401).json({ error: "\u672A\u767B\u5F55\u6216\u4F1A\u8BDD\u8FC7\u671F" });
  return null;
}
async function handleChunkStart(req, res) {
  const user = await authUser(req, res);
  if (!user) return;
  let userSessions = 0;
  for (const s of Array.from(sessions.values())) if (s.userId === user.id) userSessions++;
  if (userSessions >= 3) {
    res.status(429).json({ error: "\u5E76\u53D1\u4E0A\u4F20\u8FC7\u591A\uFF0C\u8BF7\u7B49\u5F53\u524D\u4E0A\u4F20\u5B8C\u6210\u518D\u8BD5" });
    return;
  }
  const kind = req.body?.kind === "file" ? "file" : "video";
  const mime = typeof req.body?.mime === "string" ? req.body.mime.split(";")[0] : kind === "video" ? "video/mp4" : "application/octet-stream";
  const name = typeof req.body?.name === "string" ? req.body.name.slice(-100) : "file";
  const id = crypto4.randomBytes(16).toString("hex");
  const filePath = path3.join(os.tmpdir(), `nxup_${id}`);
  try {
    fs3.writeFileSync(filePath, Buffer.alloc(0));
  } catch {
    res.status(500).json({ error: "\u670D\u52A1\u5668\u5B58\u50A8\u4E0D\u53EF\u7528" });
    return;
  }
  sessions.set(id, { userId: user.id, kind, mime, name, filePath, bytes: 0, seq: 0, updatedAt: Date.now() });
  res.json({ id });
}
async function handleChunkPart(req, res) {
  const user = await authUser(req, res);
  if (!user) return;
  const id = String(req.query.id ?? "");
  const seq = parseInt(String(req.query.seq ?? "-1"), 10);
  const s = sessions.get(id);
  if (!s || s.userId !== user.id) {
    res.status(404).json({ error: "\u4E0A\u4F20\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F" });
    return;
  }
  if (seq !== s.seq) {
    res.status(409).json({ error: "\u5206\u7247\u987A\u5E8F\u9519\u8BEF\uFF0C\u8BF7\u91CD\u65B0\u4E0A\u4F20" });
    return;
  }
  const b64 = typeof req.body === "string" ? req.body : "";
  if (!b64) {
    res.status(400).json({ error: "\u7A7A\u5206\u7247" });
    return;
  }
  let chunk;
  try {
    chunk = Buffer.from(b64, "base64");
  } catch {
    res.status(400).json({ error: "\u5206\u7247\u89E3\u7801\u5931\u8D25" });
    return;
  }
  if (s.bytes + chunk.length > HARD_MAX[s.kind]) {
    try {
      fs3.unlinkSync(s.filePath);
    } catch {
    }
    sessions.delete(id);
    res.status(413).json({ error: `${s.kind === "video" ? "\u89C6\u9891" : "\u6587\u4EF6"}\u8D85\u51FA\u6700\u5927\u4F53\u79EF\u9650\u5236` });
    return;
  }
  try {
    fs3.appendFileSync(s.filePath, chunk);
  } catch {
    res.status(500).json({ error: "\u5199\u5165\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
    return;
  }
  s.bytes += chunk.length;
  s.seq += 1;
  s.updatedAt = Date.now();
  res.json({ ok: true, bytes: s.bytes, seq: s.seq });
}
async function handleChunkFinish(req, res) {
  const user = await authUser(req, res);
  if (!user) return;
  const id = String(req.query.id ?? "");
  const s = sessions.get(id);
  if (!s || s.userId !== user.id) {
    res.status(404).json({ error: "\u4E0A\u4F20\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F" });
    return;
  }
  sessions.delete(id);
  const cleanup = () => {
    try {
      fs3.unlinkSync(s.filePath);
    } catch {
    }
  };
  try {
    const expected = parseInt(String(req.query.size ?? "0"), 10);
    if (expected > 0 && expected !== s.bytes) {
      cleanup();
      res.status(400).json({ error: "\u4E0A\u4F20\u4E0D\u5B8C\u6574\uFF08\u7F51\u7EDC\u4E2D\u65AD\uFF09\uFF0C\u8BF7\u91CD\u8BD5" });
      return;
    }
    const db = await getDb();
    const benefits = db ? await getBenefits(db, user.id) : null;
    const maxMB = s.kind === "video" ? benefits?.maxVideoMB ?? 60 : benefits?.maxFileMB ?? 60;
    if (s.bytes > maxMB * 1024 * 1024) {
      cleanup();
      res.status(413).json({ error: `${s.kind === "video" ? "\u89C6\u9891" : "\u6587\u4EF6"}\u4E0D\u80FD\u8D85\u8FC7 ${maxMB}MB\uFF08\u5F53\u524D\u4F1A\u5458\u6863\u4F4D\uFF09\uFF0C\u5347\u7EA7\u4F1A\u5458\u53EF\u4E0A\u4F20\u66F4\u5927${s.kind === "video" ? "\u89C6\u9891" : "\u6587\u4EF6"}` });
      return;
    }
    if (s.bytes === 0) {
      cleanup();
      res.status(400).json({ error: "\u7A7A\u6587\u4EF6" });
      return;
    }
    const body = fs3.readFileSync(s.filePath);
    const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    let key;
    if (s.kind === "video") {
      const ext = s.mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "mp4";
      key = `chat-videos/${user.id}/${Date.now()}.${ext}`;
    } else {
      const safe = s.name.replace(/[^\w.\-一-龥]+/g, "_").slice(-100) || "file";
      key = `chat-files/${user.id}/${Date.now()}_${safe}`;
    }
    await storagePut2(key, body, s.mime);
    cleanup();
    const publicUrl = `${ENV.publicOrigin}/app-media/${key}`;
    res.json({ url: publicUrl });
  } catch {
    cleanup();
    res.status(500).json({ error: "\u4E0A\u4F20\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
  }
}

// server/express/researchStream.ts
init_env();
var rateLimitMap2 = /* @__PURE__ */ new Map();
function checkRateLimit2(key) {
  const now = Date.now();
  const entry = rateLimitMap2.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap2.set(key, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}
var cache3 = /* @__PURE__ */ new Map();
async function fetchWithCache(key, url, ttlMs) {
  const cached = cache3.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 12e3);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return cached?.data ?? null;
    const data = await res.json();
    cache3.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  } catch {
    return cached?.data ?? null;
  }
}
var fmtUsd2 = (v) => v != null ? v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toFixed(2)}` : "N/A";
var fmtPct2 = (v) => v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";
var fmtNum2 = (v) => v != null ? v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toFixed(0) : "N/A";
async function fetchTokenData2(symbol) {
  const sym = symbol.toUpperCase();
  const [priceData, histData] = await Promise.all([
    fetchWithCache(
      `cc:price:${sym}`,
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${sym}&tsyms=USD`,
      3e4
    ),
    fetchWithCache(
      `cc:hist:${sym}`,
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${sym}&tsym=USD&limit=31`,
      12e4
    )
  ]);
  const raw = priceData?.RAW?.[sym]?.USD ?? null;
  const histPoints = histData?.Data?.Data ?? [];
  let change7d = null;
  let change30d = null;
  if (histPoints.length >= 31) {
    const priceNow = histPoints[histPoints.length - 1]?.close;
    const price7d = histPoints[histPoints.length - 8]?.close;
    const price30d = histPoints[0]?.close;
    if (priceNow && price7d) change7d = (priceNow - price7d) / price7d * 100;
    if (priceNow && price30d) change30d = (priceNow - price30d) / price30d * 100;
  }
  const topCoinsRes = await fetchWithCache(
    "cc:top200",
    "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=200&tsym=USD",
    12e4
  );
  let rank = null;
  const topCoinsList = Array.isArray(topCoinsRes?.Data) ? topCoinsRes.Data : [];
  if (topCoinsList.length > 0) {
    const idx = topCoinsList.findIndex((c) => c.CoinInfo?.Name?.toUpperCase() === sym);
    if (idx >= 0) rank = idx + 1;
  }
  return {
    symbol: sym,
    name: raw?.FROMSYMBOL ?? sym,
    price: raw?.PRICE ?? null,
    change24h: raw?.CHANGEPCT24HOUR ?? null,
    change7d,
    change30d,
    marketCap: raw?.MKTCAP ?? null,
    rank,
    volume24h: raw?.TOTALVOLUME24HTO ?? null,
    high24h: raw?.HIGH24HOUR ?? null,
    low24h: raw?.LOW24HOUR ?? null,
    supply: raw?.SUPPLY ?? null,
    ath: null
    // CryptoCompare free tier doesn't provide ATH
  };
}
async function fetchMarketData() {
  const [btcData, fgData] = await Promise.all([
    fetchWithCache(
      "cc:btc:dom",
      "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD",
      3e4
    ),
    fetchWithCache(
      "fg:index",
      "https://api.alternative.me/fng/?limit=1",
      3e5
    )
  ]);
  const btcMcap = btcData?.RAW?.BTC?.USD?.MKTCAP ?? null;
  const globalData = await fetchWithCache(
    "cc:global",
    "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=1&tsym=USD",
    6e4
  );
  const fg = fgData?.data?.[0] ?? null;
  return {
    btcDominance: null,
    // Will be estimated from BTC mcap
    totalMarketCap: btcMcap ? btcMcap / 0.55 : null,
    // rough estimate
    fearGreedValue: fg ? parseInt(fg.value) : null,
    fearGreedLabel: fg?.value_classification ?? null
  };
}
function buildSystemPrompt(mode) {
  if (mode === "quick") {
    return '\u4F60\u662F\u4E00\u4F4D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u52A0\u5BC6\u8D27\u5E01\u4EA4\u6613\u5458\uFF0C\u64C5\u957F\u5FEB\u901F\u7814\u5224\u5E02\u573A\u673A\u4F1A\u3002\u4F60\u7684\u5206\u6790\u98CE\u683C\u76F4\u63A5\u3001\u679C\u65AD\uFF0C\u4E0D\u56DE\u907F\u7ED9\u51FA\u660E\u786E\u65B9\u5411\u3002\u6BCF\u53E5\u8BDD\u5FC5\u987B\u5305\u542B\u5177\u4F53\u6570\u5B57\u6216\u660E\u786E\u89C2\u70B9\uFF0C\u7981\u6B62\u4F7F\u7528"\u503C\u5F97\u5173\u6CE8""\u9700\u8981\u89C2\u5BDF"\u7B49\u5E9F\u8BDD\u3002\u56DE\u590D\u4F7F\u7528\u4E2D\u6587\u3002';
  }
  return "\u4F60\u662F\u4E00\u4F4D\u9876\u7EA7\u52A0\u5BC6\u8D27\u5E01\u7814\u7A76\u673A\u6784\u7684\u9996\u5E2D\u5206\u6790\u5E08\uFF0C\u64C5\u957F\u591A\u7EF4\u5EA6\u6DF1\u5EA6\u5206\u6790\u3002\u4F60\u7684\u62A5\u544A\u4EE5\u6570\u636E\u9A71\u52A8\u3001\u903B\u8F91\u4E25\u5BC6\u3001\u89C2\u70B9\u9C9C\u660E\u8457\u79F0\u3002\u6BCF\u53E5\u8BDD\u5FC5\u987B\u5305\u542B\u5177\u4F53\u6570\u5B57\u6216\u660E\u786E\u89C2\u70B9\uFF0C\u7981\u6B62\u5957\u8BDD\u5E9F\u8BDD\u3002\u56DE\u590D\u4F7F\u7528\u4E2D\u6587\u3002";
}
function buildPrompt(token, market, mode) {
  const volMcap = token.volume24h && token.marketCap ? (token.volume24h / token.marketCap * 100).toFixed(2) : null;
  const tokenSection = `=== ${token.name} (${token.symbol}) \u5B9E\u65F6\u6570\u636E ===
\u4EF7\u683C: ${token.price ? `$${token.price.toLocaleString()}` : "N/A"}
24h: ${fmtPct2(token.change24h)} | 7d: ${fmtPct2(token.change7d)} | 30d: ${fmtPct2(token.change30d)}
\u5E02\u503C: ${fmtUsd2(token.marketCap)}${token.rank ? ` (\u6392\u540D #${token.rank})` : ""}
24h \u6210\u4EA4\u91CF: ${fmtUsd2(token.volume24h)}${volMcap ? ` (\u91CF/\u5E02\u503C\u6BD4: ${volMcap}%)` : ""}
24h \u6700\u9AD8: ${token.high24h ? `$${token.high24h.toLocaleString()}` : "N/A"} / \u6700\u4F4E: ${token.low24h ? `$${token.low24h.toLocaleString()}` : "N/A"}
\u6D41\u901A\u91CF: ${fmtNum2(token.supply)}`;
  const marketSection = market.fearGreedValue != null ? `
=== \u5E02\u573A\u60C5\u7EEA ===
\u6050\u60E7\u8D2A\u5A6A\u6307\u6570: ${market.fearGreedValue} (${market.fearGreedLabel})
\u603B\u5E02\u503C\u4F30\u7B97: ${fmtUsd2(market.totalMarketCap)}` : "";
  const baseContext = tokenSection + marketSection;
  if (mode === "quick") {
    return `${baseContext}

\u8BF7\u5BF9 ${token.symbol} \u8FDB\u884C\u5FEB\u901F\u7814\u5224\uFF08250-350\u5B57\uFF09\uFF1A
1. **\u6838\u5FC3\u5224\u65AD**\uFF1A\u4E00\u53E5\u8BDD\u7ED9\u51FA\u660E\u786E\u65B9\u5411\uFF08\u770B\u6DA8/\u770B\u8DCC/\u4E2D\u6027\uFF09\u53CA\u7406\u7531
2. **\u5173\u952E\u6570\u636E**\uFF1A\u5F15\u7528\u4E0A\u8FF0\u6570\u636E\u4E2D\u6700\u91CD\u8981\u76842-3\u4E2A\u6307\u6807\u652F\u6491\u5224\u65AD
3. **\u64CD\u4F5C\u5EFA\u8BAE**\uFF1A\u5177\u4F53\u7684\u5165\u573A/\u89C2\u671B/\u79BB\u573A\u5EFA\u8BAE\uFF08\u542B\u4EF7\u683C\u53C2\u8003\uFF09
4. **\u98CE\u9669\u63D0\u793A**\uFF1A\u6700\u4E3B\u8981\u76841-2\u4E2A\u98CE\u9669\u70B9

\u5728\u62A5\u544A\u7ED3\u5C3E\u7ED9\u51FA\u8BC4\u5206\uFF1A**\u7EFC\u5408\u8BC4\u5206: X/10**\uFF08X\u4E3A1-10\u7684\u6574\u6570\uFF09`;
  }
  return `${baseContext}

\u8BF7\u5BF9 ${token.symbol} \u8FDB\u884C\u6DF1\u5EA6 AI \u5206\u6790\uFF08600-800\u5B57\uFF09\uFF0C\u5305\u542B\u4EE5\u4E0B\u7AE0\u8282\uFF1A

## \u5E02\u573A\u6982\u51B5
\u5F15\u7528\u5177\u4F53\u6570\u636E\u63CF\u8FF0\u5F53\u524D\u4EF7\u683C\u4F4D\u7F6E\u3001\u8D8B\u52BF\u548C\u5E02\u573A\u60C5\u7EEA

## \u6280\u672F\u9762\u5206\u6790
\u57FA\u4E8E\u4EF7\u683C\u53D8\u5316\u6570\u636E\u5206\u6790\u652F\u6491/\u963B\u529B\u4F4D\uFF0C\u8D8B\u52BF\u5224\u65AD

## \u57FA\u672C\u9762\u5206\u6790
\u4EE3\u5E01\u7ECF\u6D4E\u5B66\uFF08\u4F9B\u5E94\u91CF/\u6210\u4EA4\u91CF\u6BD4\uFF09\u3001\u9879\u76EE\u4EF7\u503C\u8BC4\u4F30

## \u5B8F\u89C2\u73AF\u5883
\u7ED3\u5408\u6050\u60E7\u8D2A\u5A6A\u6307\u6570\u5206\u6790\u5E02\u573A\u5927\u73AF\u5883\u5F71\u54CD

## \u98CE\u9669\u8BC4\u4F30
\u5217\u51FA\u4E3B\u8981\u98CE\u9669\u56E0\u7D20\uFF0C\u7ED9\u51FA\u98CE\u9669\u7B49\u7EA7\uFF08\u4F4E/\u4E2D/\u9AD8\uFF09

## \u6295\u8D44\u5EFA\u8BAE
\u660E\u786E\u7684\u64CD\u4F5C\u5EFA\u8BAE\uFF0C\u5305\u542B\u5177\u4F53\u4EF7\u683C\u53C2\u8003

\u5728\u62A5\u544A\u7ED3\u5C3E\u7ED9\u51FA\uFF1A**\u7EFC\u5408\u8BC4\u5206: X/10** | **\u98CE\u9669\u7B49\u7EA7: \u4F4E/\u4E2D/\u9AD8** | **\u5E02\u573A\u60C5\u7EEA: \u770B\u6DA8/\u4E2D\u6027/\u770B\u8DCC**`;
}
function extractVizData(content, token) {
  const scoreMatch = content.match(/综合评分[：:]\s*(\d+)\s*\/\s*10/);
  const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
  let sentiment = "neutral";
  if (content.includes("\u5E02\u573A\u60C5\u7EEA: \u770B\u6DA8") || content.includes("\u5E02\u573A\u60C5\u7EEA\uFF1A\u770B\u6DA8") || content.includes("\u6838\u5FC3\u5224\u65AD.*\u770B\u6DA8")) sentiment = "bullish";
  else if (content.includes("\u5E02\u573A\u60C5\u7EEA: \u770B\u8DCC") || content.includes("\u5E02\u573A\u60C5\u7EEA\uFF1A\u770B\u8DCC")) sentiment = "bearish";
  else if (content.includes("\u770B\u6DA8") && !content.includes("\u770B\u8DCC")) sentiment = "bullish";
  else if (content.includes("\u770B\u8DCC") && !content.includes("\u770B\u6DA8")) sentiment = "bearish";
  let riskLevel = "medium";
  if (content.includes("\u98CE\u9669\u7B49\u7EA7: \u4F4E") || content.includes("\u98CE\u9669\u7B49\u7EA7\uFF1A\u4F4E") || content.includes("\u4F4E\u98CE\u9669")) riskLevel = "low";
  else if (content.includes("\u98CE\u9669\u7B49\u7EA7: \u9AD8") || content.includes("\u98CE\u9669\u7B49\u7EA7\uFF1A\u9AD8") || content.includes("\u9AD8\u98CE\u9669")) riskLevel = "high";
  const volMcap = token.volume24h && token.marketCap ? token.volume24h / token.marketCap * 100 : null;
  const keyMetrics = [
    { label: "\u5F53\u524D\u4EF7\u683C", value: token.price ? `$${token.price.toLocaleString()}` : "N/A" },
    {
      label: "24h \u6DA8\u8DCC",
      value: token.change24h != null ? `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%` : "N/A",
      isChange: true,
      changeVal: token.change24h
    },
    {
      label: "7d \u6DA8\u8DCC",
      value: token.change7d != null ? `${token.change7d >= 0 ? "+" : ""}${token.change7d.toFixed(2)}%` : "N/A",
      isChange: true,
      changeVal: token.change7d
    },
    {
      label: "30d \u6DA8\u8DCC",
      value: token.change30d != null ? `${token.change30d >= 0 ? "+" : ""}${token.change30d.toFixed(2)}%` : "N/A",
      isChange: true,
      changeVal: token.change30d
    },
    { label: "\u5E02\u503C", value: fmtUsd2(token.marketCap) },
    { label: "\u5E02\u503C\u6392\u540D", value: token.rank ? `#${token.rank}` : "N/A" },
    { label: "24h \u6210\u4EA4\u91CF", value: fmtUsd2(token.volume24h) },
    { label: "\u91CF/\u5E02\u503C\u6BD4", value: volMcap ? `${volMcap.toFixed(2)}%` : "N/A" },
    { label: "24h \u6700\u9AD8", value: token.high24h ? `$${token.high24h.toLocaleString()}` : "N/A" },
    { label: "24h \u6700\u4F4E", value: token.low24h ? `$${token.low24h.toLocaleString()}` : "N/A" }
  ];
  return { aiScore, sentiment, riskLevel, keyMetrics };
}
async function handleResearchStream(req, res) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rateLimitKey = String(user.id);
  if (!checkRateLimit2(rateLimitKey)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait 60 seconds." });
    return;
  }
  const { tokenSymbol, mode = "quick" } = req.body;
  if (!tokenSymbol) {
    res.status(400).json({ error: "tokenSymbol is required" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${data}

`);
    }
  };
  try {
    if (!consumeUserAiBudget()) {
      sendEvent(JSON.stringify({ error: "AI \u4ECA\u65E5\u7E41\u5FD9\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }));
      res.end();
      return;
    }
    const [token, market] = await Promise.all([
      fetchTokenData2(tokenSymbol),
      fetchMarketData()
    ]);
    const systemPrompt = buildSystemPrompt(mode);
    const userPrompt = buildPrompt(token, market, mode);
    const apiUrl = ENV.forgeApiUrl ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions";
    const llmRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true,
        max_tokens: mode === "deep" ? 2048 : 1024
      })
    });
    if (!llmRes.ok) {
      const errText = await llmRes.text();
      sendEvent(JSON.stringify({ error: `LLM error: ${llmRes.status} ${errText}` }));
      res.end();
      return;
    }
    const reader = llmRes.body?.getReader();
    if (!reader) {
      sendEvent(JSON.stringify({ error: "No response body" }));
      res.end();
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    req.on("close", () => {
      reader.cancel();
    });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            sendEvent(JSON.stringify({ token: delta }));
          }
        } catch {
        }
      }
    }
    const vizData = extractVizData(fullContent, token);
    sendEvent(JSON.stringify({
      done: true,
      vizData,
      meta: {
        tokenName: token.name,
        price: token.price,
        marketCap: token.marketCap
      }
    }));
    if (user) {
      try {
        const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { researchReports: researchReports2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const db = await getDb2();
        if (!db) throw new Error("DB unavailable");
        await db.insert(researchReports2).values({
          userId: user.id,
          tokenSymbol: tokenSymbol.toUpperCase(),
          tokenName: token.name,
          reportContent: fullContent,
          sentiment: vizData.sentiment,
          riskLevel: vizData.riskLevel,
          priceAtReport: token.price ? `$${token.price.toLocaleString()}` : void 0,
          marketCapAtReport: fmtUsd2(token.marketCap)
        });
      } catch {
      }
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendEvent(JSON.stringify({ error: err.message ?? "Unknown error" }));
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}

// server/_core/index.ts
import compressionMiddleware from "compression";
import cors from "cors";
init_env();
init_db();
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  app.set("trust proxy", ENV.trustProxyHops);
  const server = createServer(app);
  app.use(compressionMiddleware({
    // Only compress responses larger than 1KB
    threshold: 1024,
    // Skip compression for Server-Sent Events (SSE) streams
    filter: (req, res) => {
      if (req.headers["accept"] === "text/event-stream") return false;
      return compressionMiddleware.filter(req, res);
    }
  }));
  app.use(cors({
    origin: corsOriginDelegate,
    credentials: true,
    // allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Client-Type"]
  }));
  app.options("*", cors({ origin: corsOriginDelegate, credentials: true }));
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.json([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.nexuschat.app",
        sha256_cert_fingerprints: ["3E:6C:EA:FD:00:11:BC:91:D7:EE:72:8A:DE:E4:89:49:AF:D4:73:C3:6B:36:65:C6:57:8C:08:B2:CC:17:74:36"]
      }
    }]);
  });
  registerOAuthRoutes(app);
  app.get(["/apk", "/download/apk"], handleApkDownload);
  app.get("/i/:code", (req, res) => {
    const code = String(req.params.code || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 30);
    res.redirect(302, code ? `/download?ref=${encodeURIComponent(code)}` : "/download");
  });
  app.get(["/about", "/about/"], (req, res, next) => {
    const candidates = [
      path4.resolve(process.cwd(), "dist", "public", "about.html"),
      path4.resolve(process.cwd(), "client", "public", "about.html")
    ];
    for (const file of candidates) {
      if (fs4.existsSync(file)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(file);
        return;
      }
    }
    next();
  });
  app.post("/api/upload/video", express2.raw({ type: () => true, limit: "260mb" }), handleVideoUpload);
  app.post("/api/upload/file", express2.raw({ type: () => true, limit: "510mb" }), handleFileUpload);
  app.post("/api/upload/chunked/start", express2.json({ limit: "1mb" }), handleChunkStart);
  app.post("/api/upload/chunked/part", express2.text({ type: () => true, limit: "16mb" }), handleChunkPart);
  app.post("/api/upload/chunked/finish", handleChunkFinish);
  app.post("/api/token-chat/stream", handleTokenChatStream);
  app.post("/api/research/stream", handleResearchStream);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  initSocketIO(server);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  void applySchemaPatches();
  startPriceAlertChecker();
  startBotScheduler();
  startMessageCleanup();
  startRankAggregation();
  startCallResolver();
  startPartnerSettlement();
  startIcoRewardScheduler();
  void (async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const n2 = await backfillInviteCodes(db);
      if (n2 > 0) console.log(`Backfilled invite codes for ${n2} user(s)`);
    } catch (err) {
      console.error("Invite code backfill failed:", err);
    }
  })();
}
startServer().catch(console.error);
