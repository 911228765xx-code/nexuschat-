import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { chatGroups, groupMembers, messages, users, groupUnreadCounts, messageReactions, groupInviteLinks, groupFiles, messageReadReceipts, groupMutes, redPacketClaims, redPackets, groupAnnouncements, conversationPrefs, groupJoinRequests } from "../../drizzle/schema";
import { eq, and, desc, lt, sql, or, ne, gt, gte, asc, like, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { emitToUser, evictUserFromGroupRoom, getSocketIO, notifyDmOffline } from "../socket";
import { sanitizeInput } from "../utils/sanitize";
import { rateLimitWrite } from "../rateLimit";
import logger from "../utils/logger";
import { groupBots } from "../../drizzle/schema";
import { BOT_PACKAGES, getBotMeta, listGroupBots, runWelcomeBot, runManageBot, runGrowthReward } from "../groupBots";
import { getTokenInfo, getTokenomics, spendNN, grantNN, getMyNNTransactions, getNNRevenue, createVesting, getMyVesting, claimVesting, NN_TOTAL_SUPPLY, NN_NODE_TIERS, getNodeTier, USDT_DEPOSIT_ADDRESS, USDT_CHAIN } from "../token";
import { nnNodeOrders } from "../../drizzle/schema";
import { getMembership, getBenefits, buyMembership } from "../membership";
import { awardReferrerMilestone } from "../referralRewards";
import { awardTaskEvent } from "./user";
import { createNotification } from "./notificationsRouter";
import { enforceContent, reviewMessageAsync } from "../moderation";
import { assertCanDM } from "../utils/relations";
import { BOT_PERSONAS } from "../botAutoReply";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Throw FORBIDDEN if the user is not a member of the group. */
async function assertGroupMember(db: Db, groupId: number, userId: number): Promise<void> {
  const [m] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!m) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group" });
}

/** 入群时把读游标定位到当前最新消息:否则 lastReadMessageId 为空,getUnreadCounts 会把
 *  整群历史都算成新成员的未读(加入老群立刻顶几百上千红点)。失败不阻断入群。 */
async function initReadCursor(db: Db, groupId: number, userId: number): Promise<void> {
  try {
    const [row] = await db.select({ maxId: sql<number>`COALESCE(MAX(${messages.id}), 0)` })
      .from(messages).where(eq(messages.groupId, groupId));
    const maxId = Number(row?.maxId ?? 0);
    const existing = await db.select({ id: groupUnreadCounts.id }).from(groupUnreadCounts)
      .where(and(eq(groupUnreadCounts.groupId, groupId), eq(groupUnreadCounts.userId, userId))).limit(1);
    if (existing[0]) {
      await db.update(groupUnreadCounts).set({ lastReadMessageId: maxId }).where(eq(groupUnreadCounts.id, existing[0].id));
    } else {
      await db.insert(groupUnreadCounts).values({ groupId, userId, lastReadMessageId: maxId });
    }
  } catch { /* 游标初始化失败仅影响首屏未读数,不阻断入群 */ }
}

/**
 * 过滤出 userId 有权查看「已读回执」的 messageId 子集，防止靠全局自增 id 枚举他人消息的已读状态/读者身份（IDOR）。
 * - 群消息：调用者必须是该消息所属群的成员。
 * - 私信（groupId 为 null）：调用者必须是发送方或接收方。
 * 不存在的 id 与无权查看的 id 都会被丢弃（不报错），调用方据此过滤而非返回全部请求的 id。
 */
async function filterReadableMessageIds(db: Db, messageIds: number[], userId: number): Promise<number[]> {
  if (messageIds.length === 0) return [];
  const msgs = await db
    .select({ id: messages.id, groupId: messages.groupId, senderId: messages.senderId, receiverId: messages.receiverId })
    .from(messages)
    .where(inArray(messages.id, messageIds));
  if (msgs.length === 0) return [];
  // 这些消息涉及的去重群 id
  const groupIds = Array.from(new Set(msgs.map((m) => m.groupId).filter((g): g is number => g != null)));
  // 其中调用者实际属于的群
  let memberGroupIds = new Set<number>();
  if (groupIds.length > 0) {
    const memberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, groupIds)));
    memberGroupIds = new Set(memberships.map((r) => r.groupId));
  }
  return msgs
    .filter((m) =>
      m.groupId != null ? memberGroupIds.has(m.groupId) : m.senderId === userId || m.receiverId === userId
    )
    .map((m) => m.id);
}

/** 用户清除历史后的游标：只显示 id > clearedBeforeId 的消息（0=未清除）。 */
async function getClearedBeforeId(db: Db, userId: number, convKey: string): Promise<number> {
  const [p] = await db
    .select({ c: conversationPrefs.clearedBeforeId })
    .from(conversationPrefs)
    .where(and(eq(conversationPrefs.userId, userId), eq(conversationPrefs.convKey, convKey)))
    .limit(1);
  return p?.c ?? 0;
}


/** 原子扣 AC 积分（余额足够才扣）；AC 只进不出生态内消耗 */
async function spendNP(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, cost: number): Promise<boolean> {
  if (cost <= 0) return true;
  const res: any = await db.update(users)
    .set({ npPoints: sql`${users.npPoints} - ${cost}` })
    .where(and(eq(users.id, userId), sql`${users.npPoints} >= ${cost}`));
  const affected = res?.[0]?.affectedRows ?? res?.affectedRows ?? res?.rowsAffected ?? 0;
  return affected > 0;
}

export const chatRouter = router({
  // List public groups
  listGroups: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
          category: z.string().optional(),
          search: z.string().max(50).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(chatGroups.isPublic, true)];
      if (input?.category && input.category !== "all") {
        conditions.push(eq(chatGroups.category, input.category));
      }
      const q = input?.search?.trim();
      if (q) {
        const term = `%${q}%`;
        const match = or(like(chatGroups.name, term), like(chatGroups.description, term));
        if (match) conditions.push(match);
      }
      return db
        .select()
        .from(chatGroups)
        .where(and(...conditions))
        .orderBy(desc(chatGroups.memberCount))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);
    }),

  // ─── 管理员：列出所有群（含私有），用于平台管理 ─────────────────────────
  adminListGroups: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30), offset: z.number().min(0).default(0), search: z.string().max(50).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = [] as any[];
      const q = input?.search?.trim();
      if (q) conds.push(like(chatGroups.name, `%${q}%`));
      return db
        .select({ id: chatGroups.id, name: chatGroups.name, memberCount: chatGroups.memberCount, isPublic: chatGroups.isPublic, category: chatGroups.category, creatorId: chatGroups.creatorId, createdAt: chatGroups.createdAt })
        .from(chatGroups)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(chatGroups.createdAt))
        .limit(input?.limit ?? 30)
        .offset(input?.offset ?? 0);
    }),

  // ─── 管理员：删除群（连带成员/消息/公告）─────────────────────────────
  adminDeleteGroup: adminProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 4 条级联删除包进事务:原来非事务,中途失败会留孤儿(如消息删了但群还在,或群删了但成员残留)
      await db.transaction(async (tx) => {
        await tx.delete(messages).where(eq(messages.groupId, input.groupId));
        await tx.delete(groupMembers).where(eq(groupMembers.groupId, input.groupId));
        await tx.delete(groupAnnouncements).where(eq(groupAnnouncements.groupId, input.groupId));
        await tx.delete(chatGroups).where(eq(chatGroups.id, input.groupId));
      });
      return { success: true };
    }),

  // Create a group
  createGroup: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().default(true),
      isTokenGated: z.boolean().default(false),
      tokenGateAmount: z.string().optional(),
      tokenGateContract: z.string().optional(),
      category: z.string().max(30).optional().default("community"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // 会员限额：建群数 + 群人数上限
      const benefits = await getBenefits(db, ctx.user.id);
      const [owned] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(chatGroups)
        .where(eq(chatGroups.creatorId, ctx.user.id));
      if (Number(owned?.c ?? 0) >= benefits.maxGroups) {
        throw new TRPCError({ code: "FORBIDDEN", message: `当前会员最多可创建 ${benefits.maxGroups} 个群，升级会员可提升上限` });
      }
      // 公开群已对所有用户放开（2026-07-12 用户拍板）：不再要求会员，免费/会员都可建公开群。
      const [result] = await db.insert(chatGroups).values({
        name: input.name,
        description: input.description ?? undefined,
        creatorId: ctx.user.id,
        isPublic: input.isPublic,
        isTokenGated: input.isTokenGated,
        tokenGateAmount: input.tokenGateAmount ?? undefined,
        tokenGateContract: input.tokenGateContract ?? undefined,
        memberCount: 1,
        maxMembers: benefits.maxGroupMembers,
        category: input.category ?? "community",
      });
      const groupId = (result as any).insertId as number;
      // Add creator as owner
      await db.insert(groupMembers).values({
        groupId,
        userId: ctx.user.id,
        role: "owner",
      });
      // 裂变：被邀请人首次建群 → 邀请人里程碑奖（一次性）
      void awardReferrerMilestone(db, ctx.user.id, "first_group", 500);
      return { groupId };
    }),

  // Join a group
  joinGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Check if already member
      const existing = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)))
        .limit(1);
      if (existing.length > 0) return { success: true, alreadyMember: true };
      // 群容量上限校验（满员不可加入）
      const [grp] = await db.select({ joinApproval: chatGroups.joinApproval, memberCount: chatGroups.memberCount, maxMembers: chatGroups.maxMembers, isPublic: chatGroups.isPublic }).from(chatGroups)
        .where(eq(chatGroups.id, input.groupId)).limit(1);
      // 私密群不可凭 groupId 直接加入，只能通过邀请链接/群二维码（useInviteLink）
      if (grp && !grp.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "该群为私密群，需通过群成员邀请或二维码加入" });
      }
      if (grp && grp.maxMembers > 0 && grp.memberCount >= grp.maxMembers) {
        throw new TRPCError({ code: "FORBIDDEN", message: "群成员已满" });
      }
      // 审批群：不直接加入，转为提交加入申请
      if (grp?.joinApproval) {
        const pending = await db.select({ id: groupJoinRequests.id }).from(groupJoinRequests)
          .where(and(eq(groupJoinRequests.groupId, input.groupId), eq(groupJoinRequests.userId, ctx.user.id), eq(groupJoinRequests.status, "pending")))
          .limit(1);
        if (pending.length === 0) {
          await db.insert(groupJoinRequests).values({ groupId: input.groupId, userId: ctx.user.id });
        }
        return { success: true, alreadyMember: false, pendingApproval: true };
      }
      await db.insert(groupMembers).values({
        groupId: input.groupId,
        userId: ctx.user.id,
        role: "member",
      });
      // 用真实成员数回写，避免并发重复加入导致 memberCount 自增漂移
      await db
        .update(chatGroups)
        .set({
          memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`,
        })
        .where(eq(chatGroups.id, input.groupId));
      await initReadCursor(db, input.groupId, ctx.user.id); // 历史消息不算新成员未读
      // 欢迎机器人（启用则自动发欢迎语；不阻塞入群）
      void runWelcomeBot(db, input.groupId, (ctx.user as any).name || (ctx.user as any).username || "新朋友")
        .catch((err) => logger.warn({ err }, "welcome bot failed"));
      return { success: true, alreadyMember: false };
    }),

  // Get messages for a group
  getMessages: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      limit: z.number().default(50),
      before: z.number().optional(), // message id cursor
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Private groups: only members may read messages. Public groups are browsable.
      const [grp] = await db
        .select({ isPublic: chatGroups.isPublic })
        .from(chatGroups)
        .where(eq(chatGroups.id, input.groupId))
        .limit(1);
      if (!grp) return [];
      if (!grp.isPublic) await assertGroupMember(db, input.groupId, ctx.user.id);
      const conditions = [
        eq(messages.groupId, input.groupId),
        eq(messages.isDeleted, false),
        sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
      ];
      const clearedG = await getClearedBeforeId(db, ctx.user.id, `group:${input.groupId}`);
      if (clearedG > 0) conditions.push(gt(messages.id, clearedG));
      if (input.before) {
        conditions.push(lt(messages.id, input.before));
      }
      const repliedMsg = alias(messages, "replied_msg_g");
      const repliedUser = alias(users, "replied_user_g");
      const rows = await db
        .select({
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
          senderName: sql<string | null>`COALESCE(${groupMembers.alias}, ${users.name})`,
          senderAvatar: users.avatar,
          senderRole: groupMembers.role,
          replyContent: repliedMsg.content,
          replyType: repliedMsg.messageType,
          replySenderName: repliedUser.name,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(groupMembers, and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, messages.senderId)))
        .leftJoin(repliedMsg, eq(repliedMsg.id, messages.replyToId))
        .leftJoin(repliedUser, eq(repliedUser.id, repliedMsg.senderId))
        .where(and(...conditions))
        // 按 id 排序，与 before 游标(lt id)保持一致，避免同秒消息翻页丢/重
        .orderBy(desc(messages.id))
        .limit(input.limit);
      return rows.reverse();
    }),

  // ─── 群聊历史搜索（服务端，不限本地已加载消息）────────────────────────────
  searchMessages: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      query: z.string().min(1).max(50),
      limit: z.number().int().min(1).max(50).default(30),
      before: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      await assertGroupMember(db, input.groupId, ctx.user.id);
      const q = input.query.trim();
      if (!q) return [];
      // 转义 LIKE 通配符，避免 %/_ 扫全表
      const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      const conditions = [
        eq(messages.groupId, input.groupId),
        eq(messages.isDeleted, false),
        sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
        like(messages.content, `%${escaped}%`),
        sql`(${messages.recalledAt} IS NULL)`,
      ];
      const clearedG = await getClearedBeforeId(db, ctx.user.id, `group:${input.groupId}`);
      if (clearedG > 0) conditions.push(gt(messages.id, clearedG));
      if (input.before) conditions.push(lt(messages.id, input.before));

      const rows = await db
        .select({
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
          senderName: sql<string | null>`COALESCE(${groupMembers.alias}, ${users.name})`,
          senderAvatar: users.avatar,
          senderRole: groupMembers.role,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(groupMembers, and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, messages.senderId)))
        .where(and(...conditions))
        .orderBy(desc(messages.id))
        .limit(input.limit);
      return rows;
    }),

  // Save a message (called from socket handler via REST fallback)
  saveMessage: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      content: z.string().min(1).max(4000),
      messageType: z.enum(["text", "image", "file", "voice", "video"]).default("text"),
      mediaUrl: z.string().optional(),
      durationSeconds: z.number().int().min(0).max(600).optional(),
      replyToId: z.number().int().optional(),
      ttlSeconds: z.number().int().min(0).max(60 * 60 * 24 * 90).optional(),
      mentionedUserIds: z.array(z.number().int()).max(20).optional(), // 被 @ 的成员 id,后端据此发提及通知
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertGroupMember(db, input.groupId, ctx.user.id);
      // 禁言校验:被禁言(永久=expiresAt 为空,或未过期)不能在群里发言(原来禁言形同虚设)
      const [muted] = await db.select({ id: groupMutes.id }).from(groupMutes)
        .where(and(eq(groupMutes.groupId, input.groupId), eq(groupMutes.userId, ctx.user.id),
          or(isNull(groupMutes.expiresAt), gt(groupMutes.expiresAt, new Date())))).limit(1);
      if (muted) throw new TRPCError({ code: "FORBIDDEN", message: "你已被禁言,暂时无法发言" });
      // 引用鉴权:被引用消息必须属于本群,防止引用别群/私信的消息把无权内容带出来
      if (input.replyToId) {
        const [rep] = await db.select({ groupId: messages.groupId }).from(messages).where(eq(messages.id, input.replyToId)).limit(1);
        if (!rep || rep.groupId !== input.groupId) throw new TRPCError({ code: "BAD_REQUEST", message: "引用的消息无效" });
      }
      // 内容审核：违禁(毒品/赌博/贩卖)内容拦截 + 累犯封号。
      // 基于 content 本身而非 messageType:否则把违禁文本塞进 image/file/voice 类型的 content 即可绕过全部审核。
      const hasTextContent = !!input.content && input.content.trim().length > 0;
      if (hasTextContent) await enforceContent(db, ctx.user.id, input.content, "group");
      const expiresAt = input.ttlSeconds && input.ttlSeconds > 0 ? new Date(Date.now() + input.ttlSeconds * 1000) : null;
      const [result] = await db.insert(messages).values({
        groupId: input.groupId,
        senderId: ctx.user.id,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? undefined,
        durationSeconds: input.durationSeconds ?? undefined,
        replyToId: input.replyToId ?? undefined,
        expiresAt,
      });
      const messageId = (result as any).insertId;
      // 群昵称解析:有群昵称则广播群昵称,否则全局名
      let displayName: string | null = (ctx.user as any).name ?? (ctx.user as any).username ?? null;
      try {
        const [mr] = await db.select({ alias: groupMembers.alias }).from(groupMembers)
          .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
        if (mr?.alias) displayName = mr.alias;
      } catch { /* 用全局名 */ }
      // 实时广播给群内在线成员（客户端 5s 轮询作为兜底）
      try {
        getSocketIO()?.to(`group:${input.groupId}`).emit("new_message", {
          id: messageId,
          groupId: input.groupId,
          senderId: ctx.user.id,
          senderName: displayName,
          senderAvatar: (ctx.user as any).avatar ?? null,
          content: sanitizeInput(input.content, 5000),
          messageType: input.messageType,
          mediaUrl: input.mediaUrl ?? null,
          durationSeconds: input.durationSeconds ?? null,
          replyToId: input.replyToId ?? null,
          createdAt: new Date().toISOString(),
        });
      } catch { /* 广播失败不影响落库 */ }
      // 异步 AI 内容审核（违规则删消息+记+封号，不阻塞发送）：任何带非空 content 的消息都过,与类型解耦防绕过
      if (hasTextContent) void reviewMessageAsync(db, ctx.user.id, messageId, input.content, "group");
      // @提及:给被 @ 的群成员发通知(通知中心+离线推送)。校验确为本群成员、去重、排除自己;不阻塞发送
      if (input.mentionedUserIds?.length) {
        const targets = Array.from(new Set(input.mentionedUserIds)).filter((id) => id !== ctx.user.id).slice(0, 20);
        if (targets.length) {
          void db.select({ userId: groupMembers.userId }).from(groupMembers)
            .where(and(eq(groupMembers.groupId, input.groupId), inArray(groupMembers.userId, targets)))
            .then((rows) => {
              const fromName = ctx.user.name ?? ctx.user.username ?? `用户 #${ctx.user.id}`;
              const preview = sanitizeInput(input.content, 120);
              for (const r of rows) {
                void createNotification({
                  db, targetUserId: r.userId, fromUserId: ctx.user.id,
                  fromUserName: fromName, fromUserAvatar: (ctx.user as any).avatar ?? "",
                  type: "mention", content: preview,
                });
              }
            })
            .catch((err) => logger.warn({ err }, "mention notify failed"));
        }
      }
      // 管理机器人：文本消息做关键词检测（命中自动提醒；不阻塞发送）
      if (input.messageType === "text") {
        void runManageBot(db, input.groupId, input.content)
          .catch((err) => logger.warn({ err }, "manage bot failed"));
        // AC 产出：首次发消息里程碑
        void awardTaskEvent(db, ctx.user.id, "first_message");
      }
      return { messageId };
    }),

  // ─── DM: Send a direct message ─────────────────────────────────────────────
  sendDM: protectedProcedure
    .input(z.object({
      receiverId: z.number(),
      content: z.string().min(1).max(4000),
      messageType: z.enum(["text", "image", "file", "voice", "video"]).default("text"),
      mediaUrl: z.string().optional(),
      durationSeconds: z.number().int().min(0).max(600).optional(),
      replyToId: z.number().int().optional(),
      ttlSeconds: z.number().int().min(0).max(60 * 60 * 24 * 90).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await assertCanDM(db, ctx.user.id, input.receiverId); // 仅好友可私信 + 拉黑校验
      // 内容审核：违禁(毒品/赌博/贩卖)内容拦截 + 累犯封号。基于 content 而非 messageType,防塞进媒体类型绕过。
      const hasTextContent = !!input.content && input.content.trim().length > 0;
      if (hasTextContent) await enforceContent(db, ctx.user.id, input.content, "dm");
      // 引用鉴权:被引用消息必须属于本私信会话(双方之间),防止引用别处消息带出无权内容
      if (input.replyToId) {
        const [rep] = await db.select({ groupId: messages.groupId, senderId: messages.senderId, receiverId: messages.receiverId })
          .from(messages).where(eq(messages.id, input.replyToId)).limit(1);
        const inThisDM = rep && !rep.groupId && (
          (rep.senderId === ctx.user.id && rep.receiverId === input.receiverId) ||
          (rep.senderId === input.receiverId && rep.receiverId === ctx.user.id)
        );
        if (!inThisDM) throw new TRPCError({ code: "BAD_REQUEST", message: "引用的消息无效" });
      }
      const expiresAt = input.ttlSeconds && input.ttlSeconds > 0 ? new Date(Date.now() + input.ttlSeconds * 1000) : null;
      const [result] = await db.insert(messages).values({
        senderId: ctx.user.id,
        receiverId: input.receiverId,
        groupId: null,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? undefined,
        durationSeconds: input.durationSeconds ?? undefined,
        replyToId: input.replyToId ?? undefined,
        expiresAt,
      });
      const messageId = (result as any).insertId as number;
      // Push real-time notification to recipient via Socket.IO (use the sanitized content,
      // matching what is persisted, so the pushed payload can't carry unsanitized markup).
      emitToUser(input.receiverId, "dm_message", {
        messageId,
        senderId: ctx.user.id,
        senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
        content: sanitizeInput(input.content, 5000),
        messageType: input.messageType,
        mediaUrl: input.mediaUrl ?? null,
        durationSeconds: input.durationSeconds ?? null,
        createdAt: new Date().toISOString(),
      });
      // 接收者离线(未连 socket)时发原生推送;emitToUser 只对在线端有效,离线得靠这个
      void notifyDmOffline(
        input.receiverId, ctx.user.id,
        `${ctx.user.name ?? ctx.user.username ?? "有人"} 发来消息`,
        hasTextContent ? sanitizeInput(input.content, 5000) : "[媒体消息]",
      );
      // 异步 AI 内容审核:任何带非空 content 的消息都过(与类型解耦防绕过)
      if (hasTextContent) void reviewMessageAsync(db, ctx.user.id, messageId, input.content, "dm");
      // AC 产出：首次发消息里程碑(文本语义,保持原样)
      if (input.messageType === "text") void awardTaskEvent(db, ctx.user.id, "first_message");
      return { messageId };
    }),

  // ─── 推荐好友名片:把某用户的名片以 contact 消息发到群或私信 ──────────────────
  //   名片内容由服务端按 contactUserId 现取(权威,防客户端伪造他人名片)。
  shareContact: protectedProcedure
    .input(z.object({
      contactUserId: z.number().int().positive(),
      targetGroupId: z.number().int().positive().optional(),
      targetReceiverId: z.number().int().positive().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!input.targetGroupId === !input.targetReceiverId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "请选择且仅选择一个发送目标" });
      const [c] = await db
        .select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar, bio: users.bio })
        .from(users).where(eq(users.id, input.contactUserId)).limit(1);
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      const card = JSON.stringify({
        // 防御性净化:name/bio 是自由文本(注册路径未必 stripHtml),入库前清一遍
        contactId: c.id, name: sanitizeInput(c.name ?? "", 50), username: c.username ?? "",
        avatar: c.avatar ?? "", bio: sanitizeInput(c.bio ?? "", 200),
      });
      const senderName = (ctx.user as any).name ?? (ctx.user as any).username ?? `User #${ctx.user.id}`;
      if (input.targetGroupId) {
        await assertGroupMember(db, input.targetGroupId, ctx.user.id);
        const [r] = await db.insert(messages).values({
          groupId: input.targetGroupId, senderId: ctx.user.id, content: card, messageType: "contact",
        });
        const messageId = (r as any).insertId;
        try {
          getSocketIO()?.to(`group:${input.targetGroupId}`).emit("new_message", {
            id: messageId, groupId: input.targetGroupId, senderId: ctx.user.id,
            senderName, senderAvatar: (ctx.user as any).avatar ?? null,
            content: card, messageType: "contact", mediaUrl: null, durationSeconds: null,
            replyToId: null, createdAt: new Date().toISOString(),
          });
        } catch { /* 广播失败不影响落库 */ }
        return { messageId };
      }
      await assertCanDM(db, ctx.user.id, input.targetReceiverId!);
      const [r] = await db.insert(messages).values({
        senderId: ctx.user.id, receiverId: input.targetReceiverId, groupId: null, content: card, messageType: "contact",
      });
      const messageId = (r as any).insertId;
      emitToUser(input.targetReceiverId!, "dm_message", {
        messageId, senderId: ctx.user.id, senderName,
        content: card, messageType: "contact", mediaUrl: null, durationSeconds: null,
        createdAt: new Date().toISOString(),
      });
      return { messageId };
    }),

  // ─── 分享语音房:发一条可点进房的 voiceroom 消息到群或私信 ────────────────────
  shareVoiceRoom: protectedProcedure
    .input(z.object({
      roomId: z.string().min(1).max(80),
      title: z.string().max(60).default(""),
      targetGroupId: z.number().int().positive().optional(),
      targetReceiverId: z.number().int().positive().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!input.targetGroupId === !input.targetReceiverId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "请选择且仅选择一个发送目标" });
      const card = JSON.stringify({
        roomId: sanitizeInput(input.roomId, 80),
        title: sanitizeInput(input.title || "语音房", 60),
      });
      const senderName = (ctx.user as any).name ?? (ctx.user as any).username ?? `User #${ctx.user.id}`;
      if (input.targetGroupId) {
        await assertGroupMember(db, input.targetGroupId, ctx.user.id);
        const [r] = await db.insert(messages).values({
          groupId: input.targetGroupId, senderId: ctx.user.id, content: card, messageType: "voiceroom",
        });
        const messageId = (r as any).insertId;
        try {
          getSocketIO()?.to(`group:${input.targetGroupId}`).emit("new_message", {
            id: messageId, groupId: input.targetGroupId, senderId: ctx.user.id,
            senderName, senderAvatar: (ctx.user as any).avatar ?? null,
            content: card, messageType: "voiceroom", mediaUrl: null, durationSeconds: null,
            replyToId: null, createdAt: new Date().toISOString(),
          });
        } catch { /* 广播失败不影响落库 */ }
        return { messageId };
      }
      await assertCanDM(db, ctx.user.id, input.targetReceiverId!);
      const [r] = await db.insert(messages).values({
        senderId: ctx.user.id, receiverId: input.targetReceiverId, groupId: null, content: card, messageType: "voiceroom",
      });
      const messageId = (r as any).insertId;
      emitToUser(input.targetReceiverId!, "dm_message", {
        messageId, senderId: ctx.user.id, senderName,
        content: card, messageType: "voiceroom", mediaUrl: null, durationSeconds: null,
        createdAt: new Date().toISOString(),
      });
      return { messageId };
    }),

  // ─── DM: Get message history between two users ────────────────────────────
  getDMHistory: protectedProcedure
    .input(z.object({
      otherUserId: z.number(),
      limit: z.number().default(50),
      before: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const myId = ctx.user.id;
      const otherId = input.otherUserId;
      const conditions = [
        or(
          and(eq(messages.senderId, myId), eq(messages.receiverId, otherId)),
          and(eq(messages.senderId, otherId), eq(messages.receiverId, myId))
        )!,
        eq(messages.isDeleted, false),
        sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
      ];
      const clearedD = await getClearedBeforeId(db, myId, `dm:${otherId}`);
      if (clearedD > 0) conditions.push(gt(messages.id, clearedD));
      if (input.before) conditions.push(lt(messages.id, input.before));
      const repliedMsg = alias(messages, "replied_msg_d");
      const repliedUser = alias(users, "replied_user_d");
      const rows = await db
        .select({
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
          replySenderName: repliedUser.name,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(repliedMsg, eq(repliedMsg.id, messages.replyToId))
        .leftJoin(repliedUser, eq(repliedUser.id, repliedMsg.senderId))
        .where(and(...conditions))
        // 按 id 排序，与 before 游标(lt id)保持一致
        .orderBy(desc(messages.id))
        .limit(input.limit);
      // 打开会话即把对方发来的未读私信标记为已读
      try {
        await db.update(messages).set({ isRead: true }).where(
          and(
            eq(messages.senderId, otherId),
            eq(messages.receiverId, myId),
            eq(messages.isRead, false),
            sql`${messages.groupId} IS NULL`,
          )
        );
      } catch (err) {
        logger.warn({ err, otherId, myId }, "markDMsRead failed");
      }
      return rows.reverse();
    }),

  // ─── DM: List all DM conversations for current user ───────────────────────
  listDMConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const myId = ctx.user.id;
    // Get all DM messages involving current user
    const dmMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        recalledAt: messages.recalledAt,
      })
      .from(messages)
      .where(
        and(
          or(
            eq(messages.senderId, myId),
            eq(messages.receiverId, myId)
          )!,
          eq(messages.isDeleted, false),
          sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`,
          // DM messages have no groupId
          sql`${messages.groupId} IS NULL`,
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(200);
    // Group by conversation partner
    const convMap = new Map<number, typeof dmMessages[0]>();
    for (const msg of dmMessages) {
      const partnerId = msg.senderId === myId ? msg.receiverId! : msg.senderId;
      if (!convMap.has(partnerId)) convMap.set(partnerId, msg);
    }
    if (convMap.size === 0) return [];
    // Fetch partner user info
    const partnerIds = Array.from(convMap.keys());
    const partnerUsers = await db
      .select({ id: users.id, name: users.name, avatar: users.avatar, username: users.username })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(partnerIds.map(id => sql`${id}`), sql`, `)})`);

    // 各会话未读数（对方发来、未读、DM）
    const unreadRows = await db
      .select({ senderId: messages.senderId, cnt: sql<number>`COUNT(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, myId),
          eq(messages.isRead, false),
          eq(messages.isDeleted, false),
          sql`${messages.groupId} IS NULL`,
        )
      )
      .groupBy(messages.senderId);
    const unreadMap = new Map(unreadRows.map(r => [r.senderId, Number(r.cnt)]));

    // 已"删除"的会话过滤：clearedBeforeId >= 最新消息 id 的 dm 会话不显示（有新消息会重新出现）
    const prefRows = await db
      .select({ convKey: conversationPrefs.convKey, cleared: conversationPrefs.clearedBeforeId })
      .from(conversationPrefs).where(eq(conversationPrefs.userId, myId));
    const clearedMap = new Map<number, number>();
    for (const p of prefRows) {
      if (p.convKey.startsWith("dm:")) clearedMap.set(parseInt(p.convKey.slice(3), 10), p.cleared ?? 0);
    }

    return partnerUsers
      .filter(u => (convMap.get(u.id)?.id ?? 0) > (clearedMap.get(u.id) ?? 0))
      .map(u => ({
        userId: u.id,
        name: u.name ?? u.username ?? "User",
        avatar: u.avatar,
        lastMessage: convMap.get(u.id)?.recalledAt ? "[消息已撤回]" : (convMap.get(u.id)?.content ?? ""), // 撤回后预览不露原文
        lastMessageType: convMap.get(u.id)?.recalledAt ? "text" : (convMap.get(u.id)?.messageType ?? "text"),
        lastMessageAt: convMap.get(u.id)?.createdAt ?? new Date(),
        isMine: convMap.get(u.id)?.senderId === myId,
        unreadCount: unreadMap.get(u.id) ?? 0,
      }));
  }),

  // Get user's joined groups with latest message preview
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const groups = await db
      .select({
        id: chatGroups.id,
        name: chatGroups.name,
        description: chatGroups.description,
        avatar: chatGroups.avatar,
        memberCount: chatGroups.memberCount,
        isTokenGated: chatGroups.isTokenGated,
        isPublic: chatGroups.isPublic,
        category: chatGroups.category, // RN ChatGroup 类型要求;listGroups 全列有、这里原来漏了
        role: groupMembers.role,
        updatedAt: chatGroups.updatedAt,
      })
      .from(groupMembers)
      .innerJoin(chatGroups, eq(groupMembers.groupId, chatGroups.id))
      .where(eq(groupMembers.userId, ctx.user.id))
      .orderBy(desc(chatGroups.updatedAt));

    // Fetch latest message for all groups in ONE pass (avoid N+1).
    // 1) max(id) per group  2) join back to get its content/sender.
    const groupIds = groups.map((g) => g.id);
    const latestByGroup = new Map<number, { content: string; messageType: string; createdAt: Date; recalledAt: Date | null; senderName: string | null; senderUsername: string | null }>();
    if (groupIds.length > 0) {
      const latest = db
        .select({
          groupId: messages.groupId,
          maxId: sql<number>`MAX(${messages.id})`.as("max_id"),
        })
        .from(messages)
        .where(and(
          inArray(messages.groupId, groupIds), eq(messages.isDeleted, false),
          sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`, // 阅后即焚过期消息别当列表预览露原文
        ))
        .groupBy(messages.groupId)
        .as("latest");
      const latestRows = await db
        .select({
          groupId: messages.groupId,
          content: messages.content,
          messageType: messages.messageType,
          createdAt: messages.createdAt,
          recalledAt: messages.recalledAt,
          senderName: users.name,
          senderUsername: users.username,
        })
        .from(messages)
        .innerJoin(latest, eq(messages.id, latest.maxId))
        .leftJoin(users, eq(messages.senderId, users.id));
      for (const r of latestRows) {
        if (r.groupId != null) latestByGroup.set(r.groupId, r);
      }
    }
    const result = groups.map((g) => {
      const m = latestByGroup.get(g.id);
      return {
        ...g,
        lastMessage: m?.recalledAt ? "[消息已撤回]" : (m?.content ?? g.description ?? ''), // 撤回后列表预览显示"已撤回",不再露原文
        lastMessageType: m?.recalledAt ? "text" : (m?.messageType ?? "text"),
        lastMessageAt: m?.createdAt ?? g.updatedAt,
        lastSender: m?.senderName ?? m?.senderUsername ?? null,
      };
    });
    // Sort by last message time
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }),

  // Get members of a group
  getGroupMembers: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // 隐私：仅本群成员可查看成员名单，避免非成员窥探"某人加入了哪些群"
      const [me] = await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)))
        .limit(1);
      if (!me) return [];
      return db
        .select({
          id: users.id,
          username: users.username,
          name: sql<string | null>`COALESCE(${groupMembers.alias}, ${users.name})`,
          alias: groupMembers.alias,
          avatar: users.avatar,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
          isBot: users.isBot, // 供前端把机器人/静默填充号从 @提及 候选里排除
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, input.groupId))
        .orderBy(groupMembers.role, groupMembers.joinedAt)
        .limit(200);
    }),

  // 设置/清除自己在某群的群昵称(仅本人,空字符串=清除回全局名)
  setGroupAlias: protectedProcedure
    .input(z.object({ groupId: z.number(), alias: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const aliasVal = sanitizeInput(input.alias, 50).trim();
      const [m] = await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!m) throw new TRPCError({ code: "BAD_REQUEST", message: "你不在该群" });
      await db.update(groupMembers).set({ alias: aliasVal || null })
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)));
      return { ok: true, alias: aliasVal || null };
    }),

  // Get group info (name, description, memberCount, avatar)
  getGroupInfo: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      // 只投影预览所需的安全字段:原来 select() 全字段(public 接口、无 gate),把私有群的
      // tokenGateContract(合约地址)/creatorId/内部开关都泄漏给了非成员。
      const rows = await db
        .select({
          id: chatGroups.id, name: chatGroups.name, description: chatGroups.description,
          avatar: chatGroups.avatar, memberCount: chatGroups.memberCount, maxMembers: chatGroups.maxMembers,
          isPublic: chatGroups.isPublic, category: chatGroups.category,
          isTokenGated: chatGroups.isTokenGated, tokenGateAmount: chatGroups.tokenGateAmount,
          joinApproval: chatGroups.joinApproval,
          forbidAddFriend: chatGroups.forbidAddFriend, // 群设置页「禁止群成员互加好友」开关靠它回显——漏投影会让开关每次进来都显示关闭(设了像没生效)
          creatorId: chatGroups.creatorId, // 客户端 group/[id].tsx 靠它判 isManager;仅创建者 id,不敏感。真正敏感的 tokenGateContract 仍不投影。
        })
        .from(chatGroups)
        .where(eq(chatGroups.id, input.groupId))
        .limit(1);
      return rows[0] ?? null;
    }),

  // 我在某群的禁言态:客户端进群据此禁用输入框 + 顶部横幅提示,而非打字发出去才被后端拒
  getMyMuteState: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { muted: false, until: null as Date | null };
      const [m] = await db.select({ expiresAt: groupMutes.expiresAt }).from(groupMutes)
        .where(and(
          eq(groupMutes.groupId, input.groupId),
          eq(groupMutes.userId, ctx.user.id),
          or(isNull(groupMutes.expiresAt), gt(groupMutes.expiresAt, new Date())),
        )).limit(1);
      return { muted: !!m, until: m?.expiresAt ?? null };
    }),

  // Get user info by userId (for DM partner display)
  getUserInfo: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Upload chat image to S3
  uploadChatImage: protectedProcedure
    .input(z.object({
      base64: z.string().max(22_000_000), // ~16MB raw file (base64 is ~33% larger)
      mimeType: z.string().default("image/jpeg"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const { downscaleImage } = await import("../utils/image");
      const raw = Buffer.from(input.base64, "base64");
      // 等比缩到最长边 ≤1600，避免存/发 4000px 原图
      const { buffer, mime } = await downscaleImage(raw, 1600, 82, input.mimeType);
      const ext = mime.split("/")[1] ?? "jpg";
      const key = `chat-images/${ctx.user.id}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, mime);
      return { url };
    }),

  // Upload chat video to S3 (short clips; stays under the 50MB JSON body limit)
  uploadChatVideo: protectedProcedure
    .input(z.object({
      base64: z.string().max(40_000_000), // ~30MB raw file (base64 ~33% larger)
      mimeType: z.string().default("video/mp4"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 30 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "视频不能超过 30MB，请录短一点" });
      }
      const ext = input.mimeType.split("/")[1]?.split(";")[0] ?? "mp4";
      const key = `chat-videos/${ctx.user.id}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  // Upload an arbitrary chat file (documents) to S3
  uploadChatFile: protectedProcedure
    .input(z.object({
      base64: z.string().max(20_000_000), // ~15MB raw
      mimeType: z.string().default("application/octet-stream"),
      fileName: z.string().max(200).default("file"),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const db0 = await getDb();
      const buffer = Buffer.from(input.base64, "base64");
      // 会员档位文件大小上限
      const limitMB = db0 ? (await getBenefits(db0, ctx.user.id)).maxFileMB : 20;
      if (buffer.length > limitMB * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: `文件超出上限（当前会员 ${limitMB}MB），升级会员可上传更大文件` });
      }
      const safe = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
      const key = `chat-files/${ctx.user.id}/${Date.now()}_${safe}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  // ─── Mark group as read (update lastReadMessageId) ──────────────────────────
  markGroupRead: protectedProcedure
    .input(z.object({ groupId: z.number(), lastMessageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      // Upsert: update if exists, insert if not
      const existing = await db
        .select({ id: groupUnreadCounts.id })
        .from(groupUnreadCounts)
        .where(and(eq(groupUnreadCounts.userId, ctx.user.id), eq(groupUnreadCounts.groupId, input.groupId)))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(groupUnreadCounts)
          .set({ lastReadMessageId: input.lastMessageId })
          .where(and(eq(groupUnreadCounts.userId, ctx.user.id), eq(groupUnreadCounts.groupId, input.groupId)));
      } else {
        await db.insert(groupUnreadCounts).values({
          userId: ctx.user.id,
          groupId: input.groupId,
          lastReadMessageId: input.lastMessageId,
        });
      }
      return { ok: true };
    }),

  // ─── Get unread counts for all joined groups ──────────────────────────────
  getUnreadCounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {};
    // Get all groups the user has joined
    const joinedGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, ctx.user.id));
    if (joinedGroups.length === 0) return {};

    // One aggregated query (avoid N+1): join messages to the user's per-group
    // read cursor and count messages newer than it, grouped by group.
    const groupIds = joinedGroups.map((g) => g.groupId);
    const result: Record<number, number> = {};
    for (const id of groupIds) result[id] = 0;
    const rows = await db
      .select({
        groupId: messages.groupId,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .leftJoin(
        groupUnreadCounts,
        and(
          eq(groupUnreadCounts.groupId, messages.groupId),
          eq(groupUnreadCounts.userId, ctx.user.id),
        ),
      )
      .where(and(
        inArray(messages.groupId, groupIds),
        eq(messages.isDeleted, false),
        sql`(${messages.expiresAt} IS NULL OR ${messages.expiresAt} > NOW())`, // 焚毁消息不计未读(聊天页已看不到)
        gt(messages.id, sql`COALESCE(${groupUnreadCounts.lastReadMessageId}, 0)`),
      ))
      .groupBy(messages.groupId);
    for (const r of rows) {
      if (r.groupId != null) result[r.groupId] = Number(r.count);
    }
    return result;
  }),

  // ─── Auto-join sample groups for new users ───────────────────────────────
  autoJoinSampleGroups: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { joined: 0 };
    // Find the 4 sample groups (the ones created by bot_nexus_bot)
    const sampleGroups = await db
      .select({ id: chatGroups.id })
      .from(chatGroups)
      .where(eq(chatGroups.isPublic, true))
      .orderBy(chatGroups.id)
      .limit(4);
    let joined = 0;
    for (const group of sampleGroups) {
      const existing = await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, ctx.user.id)))
        .limit(1);
      if (existing.length > 0) continue;
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: ctx.user.id,
        role: "member",
      });
      await db
        .update(chatGroups)
        .set({ memberCount: sql`memberCount + 1` })
        .where(eq(chatGroups.id, group.id));
      joined++;
    }
    return { joined };
  }),

  // Soft-delete a message (only sender can delete)
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number(), groupId: z.number().optional() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({ senderId: messages.senderId, groupId: messages.groupId })
        .from(messages)
        .where(eq(messages.id, input.messageId))
        .limit(1);
      if (!rows[0]) throw new Error("Message not found");
      const isSender = rows[0].senderId === ctx.user.id;
      if (!isSender) {
        // 管理员可删本群内他人消息 —— 但必须按【消息真实所属群】校验,不能用 client 传的 input.groupId。
        // 原实现拿 input.groupId 查角色:攻击者建一个自己当 owner 的群、传该 groupId + 任意 messageId,
        // 即可软删全站任意消息(含别人 DM),全局越权。DM(groupId 为空)非发送者一律不可删。
        const realGroupId = rows[0].groupId;
        if (realGroupId == null) throw new Error("Not authorized");
        const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
          .where(and(eq(groupMembers.groupId, realGroupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
        if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      }
      await db
        .update(messages)
        .set({ isDeleted: true })
        .where(eq(messages.id, input.messageId));
      return { ok: true };
    }),

  // ─── 撤回消息（2 分钟内，仅发送者）────────────────────────────────────────
  recallMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [m] = await db.select({ senderId: messages.senderId, createdAt: messages.createdAt, groupId: messages.groupId, receiverId: messages.receiverId })
        .from(messages).where(eq(messages.id, input.messageId)).limit(1);
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "消息不存在" });
      if (m.senderId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能撤回自己的消息" });
      if (Date.now() - new Date(m.createdAt).getTime() > 2 * 60 * 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "超过 2 分钟，无法撤回" });
      }
      await db.update(messages).set({ recalledAt: new Date(), isPinned: false }).where(eq(messages.id, input.messageId));
      // 实时广播撤回:对端就地把气泡换成"[消息已撤回]",不必等下次拉历史
      if (m.groupId) {
        getSocketIO()?.to(`group:${m.groupId}`).emit("message_recall", { messageId: input.messageId, groupId: m.groupId });
      } else if (m.receiverId) {
        emitToUser(m.receiverId, "dm_recall", { messageId: input.messageId, fromUserId: ctx.user.id });
      }
      return { ok: true };
    }),

  // ─── 转发消息（到群或私信）───────────────────────────────────────────────
  forwardMessage: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      targetGroupId: z.number().optional(),
      targetReceiverId: z.number().optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      if (!input.targetGroupId && !input.targetReceiverId) throw new TRPCError({ code: "BAD_REQUEST", message: "缺少转发目标" });
      const [src] = await db.select({
        content: messages.content, messageType: messages.messageType, mediaUrl: messages.mediaUrl,
        durationSeconds: messages.durationSeconds, recalledAt: messages.recalledAt, isDeleted: messages.isDeleted,
        groupId: messages.groupId, senderId: messages.senderId, receiverId: messages.receiverId,
      }).from(messages).where(eq(messages.id, input.messageId)).limit(1);
      if (!src || src.isDeleted || src.recalledAt) throw new TRPCError({ code: "NOT_FOUND", message: "原消息不可用" });
      if (src.messageType === "redpacket") throw new TRPCError({ code: "BAD_REQUEST", message: "红包不能转发" });
      if (src.messageType === "contact" || src.messageType === "voiceroom") throw new TRPCError({ code: "BAD_REQUEST", message: "该消息不支持转发" });
      // 鉴权:必须有权读原消息才能转发(群成员 / 私信参与方),否则可越权把别人的群/私信内容转出去
      if (src.groupId) {
        await assertGroupMember(db, src.groupId, ctx.user.id);
      } else if (src.senderId !== ctx.user.id && src.receiverId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权转发该消息" });
      }
      if (input.targetGroupId) {
        await assertGroupMember(db, input.targetGroupId, ctx.user.id);
        const [r] = await db.insert(messages).values({
          groupId: input.targetGroupId, senderId: ctx.user.id, content: src.content,
          messageType: src.messageType, mediaUrl: src.mediaUrl ?? undefined,
          durationSeconds: src.durationSeconds ?? undefined, forwardFromId: input.messageId,
        });
        return { messageId: (r as any).insertId as number };
      }
      await assertCanDM(db, ctx.user.id, input.targetReceiverId!);
      const [r] = await db.insert(messages).values({
        receiverId: input.targetReceiverId!, senderId: ctx.user.id, groupId: null, content: src.content,
        messageType: src.messageType, mediaUrl: src.mediaUrl ?? undefined,
        durationSeconds: src.durationSeconds ?? undefined, forwardFromId: input.messageId,
      });
      const messageId = (r as any).insertId as number;
      emitToUser(input.targetReceiverId!, "dm_message", {
        messageId, senderId: ctx.user.id, senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
        content: src.content, messageType: src.messageType, mediaUrl: src.mediaUrl ?? null,
        durationSeconds: src.durationSeconds ?? null, createdAt: new Date().toISOString(),
      });
      void notifyDmOffline(input.targetReceiverId!, ctx.user.id, `${ctx.user.name ?? ctx.user.username ?? "有人"} 转发了一条消息`, src.content || "[媒体消息]");
      return { messageId };
    }),

  // ─── 置顶消息（群主/管理员）─────────────────────────────────────────────
  pinMessage: protectedProcedure
    .input(z.object({ messageId: z.number(), groupId: z.number(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主/管理员可置顶消息" });
      }
      await db.update(messages).set({ isPinned: input.pinned })
        .where(and(eq(messages.id, input.messageId), eq(messages.groupId, input.groupId)));
      return { ok: true };
    }),

  getPinnedMessages: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      await assertGroupMember(db, input.groupId, ctx.user.id); // 兄弟接口(getGroupFiles/Media/Stats)都校验了,这里漏了→非成员可读私有群置顶(最敏感公告)
      return db.select({
        id: messages.id, content: messages.content, messageType: messages.messageType,
        senderId: messages.senderId, senderName: users.name, createdAt: messages.createdAt,
      }).from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(
          eq(messages.groupId, input.groupId), eq(messages.isPinned, true),
          eq(messages.isDeleted, false), sql`${messages.recalledAt} IS NULL`,
        ))
        .orderBy(desc(messages.id))
        .limit(10);
    }),

  // ─── Reactions ────────────────────────────────────────────────────────────
  toggleReaction: protectedProcedure
    .input(z.object({ messageId: z.number(), emoji: z.string().max(10) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select({ id: messageReactions.id })
        .from(messageReactions)
        .where(and(eq(messageReactions.messageId, input.messageId), eq(messageReactions.userId, ctx.user.id), eq(messageReactions.emoji, input.emoji)))
        .limit(1);
      if (existing.length > 0) {
        await db.delete(messageReactions).where(eq(messageReactions.id, existing[0].id));
        return { action: "removed" };
      } else {
        await db.insert(messageReactions).values({ messageId: input.messageId, userId: ctx.user.id, emoji: input.emoji });
        return { action: "added" };
      }
    }),

  getReactions: protectedProcedure
    .input(z.object({ messageIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return {};
      const db = await getDb();
      if (!db) return {};
      const rows = await db
        .select({ messageId: messageReactions.messageId, emoji: messageReactions.emoji, userId: messageReactions.userId })
        .from(messageReactions)
        .where(sql`${messageReactions.messageId} IN (${sql.join(input.messageIds.map(id => sql`${id}`), sql`, `)})`);
      // Group by messageId: { [msgId]: { [emoji]: { count, myReaction } } }
      const result: Record<number, Record<string, { count: number; mine: boolean }>> = {};
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
  createInviteLink: protectedProcedure
    .input(z.object({ groupId: z.number(), maxUses: z.number().default(0), expiresInHours: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // 任何群成员都可生成邀请码/群二维码(2026-07-17 放开,对齐微信):原来仅 owner/admin,
      // 普通成员点「群二维码」直接失败,扫码加群整条链路对成员不可用。
      // 群主管控不靠这道闸——靠「进群需审批」开关:开了之后凭邀请码进来也要走审批(见 useInviteLink)。
      const member = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!member[0]) throw new Error("仅群成员可生成邀请码");
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const expiresAt = input.expiresInHours ? new Date(Date.now() + input.expiresInHours * 3600_000) : undefined;
      await db.insert(groupInviteLinks).values({ groupId: input.groupId, creatorId: ctx.user.id, token, maxUses: input.maxUses, expiresAt });
      return { token, url: `${input.groupId}/invite/${token}` };
    }),

  useInviteLink: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const link = await db.select().from(groupInviteLinks).where(and(eq(groupInviteLinks.token, input.token), eq(groupInviteLinks.isActive, true))).limit(1);
      if (!link[0]) throw new Error("Invalid or expired invite link");
      const l = link[0];
      if (l.expiresAt && l.expiresAt < new Date()) throw new Error("Invite link has expired");
      if (l.maxUses > 0 && l.useCount >= l.maxUses) throw new Error("Invite link has reached max uses");
      // Check already member
      const existing = await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, l.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (existing[0]) return { groupId: l.groupId, alreadyMember: true };
      // 群容量上限 + 进群审批校验
      const [cap] = await db.select({ memberCount: chatGroups.memberCount, maxMembers: chatGroups.maxMembers, joinApproval: chatGroups.joinApproval }).from(chatGroups)
        .where(eq(chatGroups.id, l.groupId)).limit(1);
      if (cap && cap.maxMembers > 0 && cap.memberCount >= cap.maxMembers) {
        throw new TRPCError({ code: "FORBIDDEN", message: "群成员已满" });
      }
      // 开了进群审批的群:邀请链接也必须走审批(不凭链接直接进),提交申请待群主通过
      if (cap?.joinApproval) {
        const pending = await db.select({ id: groupJoinRequests.id }).from(groupJoinRequests)
          .where(and(eq(groupJoinRequests.groupId, l.groupId), eq(groupJoinRequests.userId, ctx.user.id), eq(groupJoinRequests.status, "pending"))).limit(1);
        if (!pending[0]) await db.insert(groupJoinRequests).values({ groupId: l.groupId, userId: ctx.user.id });
        return { groupId: l.groupId, alreadyMember: false, pending: true };
      }
      // 原子占用一个名额:maxUses 限制下并发只有一方能 +1 成功,杜绝超额使用
      if (l.maxUses > 0) {
        const upd = await db.update(groupInviteLinks).set({ useCount: sql`useCount + 1` })
          .where(and(eq(groupInviteLinks.id, l.id), sql`${groupInviteLinks.useCount} < ${groupInviteLinks.maxUses}`));
        const aff = (upd as any)?.[0]?.affectedRows ?? (upd as any)?.affectedRows ?? (upd as any)?.rowsAffected ?? 0;
        if (aff < 1) throw new TRPCError({ code: "FORBIDDEN", message: "邀请链接已达使用上限" });
      } else {
        await db.update(groupInviteLinks).set({ useCount: sql`useCount + 1` }).where(eq(groupInviteLinks.id, l.id));
      }
      await db.insert(groupMembers).values({ groupId: l.groupId, userId: ctx.user.id, role: "member" });
      // 与 joinGroup 一致:用真实成员数回写,避免双击/并发核销导致 memberCount 自增漂移
      await db.update(chatGroups).set({
        memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${l.groupId})`,
      }).where(eq(chatGroups.id, l.groupId));
      await initReadCursor(db, l.groupId, ctx.user.id); // 历史消息不算新成员未读
      const newMemberName = (ctx.user as any).name || (ctx.user as any).username || "新朋友";
      // 添粉机器人：奖励邀请人 + 群内致谢；欢迎机器人：欢迎语（均不阻塞）
      void runGrowthReward(db, l.groupId, l.creatorId, newMemberName).catch((err) => logger.warn({ err }, "growth bot failed"));
      void runWelcomeBot(db, l.groupId, newMemberName).catch((err) => logger.warn({ err }, "welcome bot failed"));
      return { groupId: l.groupId, alreadyMember: false };
    }),

  getGroupInviteLinks: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const member = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!member[0]) return [];
      return db.select().from(groupInviteLinks)
        .where(and(eq(groupInviteLinks.groupId, input.groupId), eq(groupInviteLinks.isActive, true)))
        .orderBy(desc(groupInviteLinks.createdAt)).limit(5);
    }),

  // ─── File Upload ──────────────────────────────────────────────────────────
  saveGroupFile: protectedProcedure
    .input(z.object({ groupId: z.number(), messageId: z.number().optional(), fileName: z.string(), fileSize: z.number(), mimeType: z.string(), fileKey: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await assertGroupMember(db, input.groupId, ctx.user.id);
      const [result] = await db.insert(groupFiles).values({ groupId: input.groupId, uploaderId: ctx.user.id, messageId: input.messageId, fileName: input.fileName, fileSize: input.fileSize, mimeType: input.mimeType, fileKey: input.fileKey, url: input.url });
      return { id: (result as { insertId: number }).insertId, url: input.url };
    }),

  getGroupFiles: protectedProcedure
    .input(z.object({ groupId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      await assertGroupMember(db, input.groupId, ctx.user.id);
      return db.select({ id: groupFiles.id, fileName: groupFiles.fileName, fileSize: groupFiles.fileSize, mimeType: groupFiles.mimeType, url: groupFiles.url, createdAt: groupFiles.createdAt, uploaderName: users.name })
        .from(groupFiles)
        .leftJoin(users, eq(groupFiles.uploaderId, users.id))
        .where(eq(groupFiles.groupId, input.groupId))
        .orderBy(desc(groupFiles.createdAt)).limit(input.limit);
    }),

  // ─── 群文件库：直接列出群内已发的 图片/视频/文件 消息 ──────────────────────
  getGroupMedia: protectedProcedure
    .input(z.object({ groupId: z.number(), limit: z.number().default(60) }))
    .query(async ({ ctx, input }) => {
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
        senderName: users.name,
      }).from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(
          eq(messages.groupId, input.groupId),
          eq(messages.isDeleted, false),
          sql`${messages.recalledAt} IS NULL`,
          inArray(messages.messageType, ["image", "video", "file"]),
        ))
        .orderBy(desc(messages.id))
        .limit(input.limit);
    }),

  // ─── Read Receipts ────────────────────────────────────────────────────────
  markMessagesRead: protectedProcedure
    .input(z.object({ groupId: z.number(), messageIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return { ok: true };
      const db = await getDb();
      if (!db) return { ok: true };
      await assertGroupMember(db, input.groupId, ctx.user.id);
      // Upsert: only insert if not already read
      const existing = await db.select({ messageId: messageReadReceipts.messageId })
        .from(messageReadReceipts)
        .where(and(eq(messageReadReceipts.userId, ctx.user.id), eq(messageReadReceipts.groupId, input.groupId),
          sql`${messageReadReceipts.messageId} IN (${sql.join(input.messageIds.map(id => sql`${id}`), sql`, `)})`));
      const existingIds = new Set(existing.map(r => r.messageId));
      const toInsert = input.messageIds.filter(id => !existingIds.has(id));
      if (toInsert.length > 0) {
        await db.insert(messageReadReceipts).values(toInsert.map(msgId => ({ messageId: msgId, groupId: input.groupId, userId: ctx.user.id })));
      }
      return { ok: true };
    }),

  getReadCounts: protectedProcedure
    .input(z.object({ messageIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return {};
      const db = await getDb();
      if (!db) return {};
      // 仅统计调用者有权查看的消息，避免靠全局 id 枚举他人群/私信的已读人数
      const allowedIds = await filterReadableMessageIds(db, input.messageIds, ctx.user.id);
      if (allowedIds.length === 0) return {};
      const rows = await db
        .select({ messageId: messageReadReceipts.messageId, count: sql<number>`COUNT(*)` })
        .from(messageReadReceipts)
        .where(inArray(messageReadReceipts.messageId, allowedIds))
        .groupBy(messageReadReceipts.messageId);
      return Object.fromEntries(rows.map(r => [r.messageId, r.count]));
    }),

  // Returns up to 5 readers (with avatar) for a specific message
  getReadReceipts: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // 无权查看（非群成员 / 非私信双方，或消息不存在）时返回空，不泄露读者身份
      const allowedIds = await filterReadableMessageIds(db, [input.messageId], ctx.user.id);
      if (allowedIds.length === 0) return [];
      const rows = await db
        .select({
          userId: messageReadReceipts.userId,
          name: users.name,
          avatar: users.avatar,
        })
        .from(messageReadReceipts)
        .innerJoin(users, eq(users.id, messageReadReceipts.userId))
        .where(eq(messageReadReceipts.messageId, input.messageId))
        .limit(5);
      return rows.map(r => ({ userId: r.userId, name: r.name ?? "User", avatar: r.avatar ?? null }));
    }),

  // ─── Group Management ─────────────────────────────────────────────────────
  kickMember: protectedProcedure
    .input(z.object({ groupId: z.number(), targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      const target = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId))).limit(1);
      if (!target[0]) throw new Error("User not in group");
      if (target[0].role === "owner") throw new Error("Cannot kick the owner");
      // admin 只能踢普通成员;踢其他 admin 需 owner(防单个失陷/恶意 admin 踢光其他管理员独占群)
      if (actor[0].role === "admin" && target[0].role === "admin") throw new Error("管理员不能移除其他管理员");
      await db.delete(groupMembers).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)));
      // COUNT(*) 回写而非 -1:kick 与 leave 交错/两管理员并发踢同一人时,-1 会重复递减造成漂移
      await db.update(chatGroups).set({
        memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`,
      }).where(eq(chatGroups.id, input.groupId));
      // 把被踢者的 socket 移出群房间并通知:否则其连接仍留在房间,继续实时收到群消息(私密群越权泄露)
      try {
        evictUserFromGroupRoom(input.targetUserId, input.groupId);
        emitToUser(input.targetUserId, "group_kicked", { groupId: input.groupId });
      } catch { /* socket 通知失败不影响踢人本身 */ }
      return { ok: true };
    }),

  muteMember: protectedProcedure
    .input(z.object({ groupId: z.number(), targetUserId: z.number(), durationHours: z.number().default(24) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      // 校验 target 角色(kickMember 有、muteMember 之前漏了):不能禁言群主;admin 不能禁言其他 admin
      const mt = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId))).limit(1);
      if (!mt[0]) throw new Error("User not in group");
      if (mt[0].role === "owner") throw new Error("不能禁言群主");
      if (actor[0].role === "admin" && mt[0].role === "admin") throw new Error("管理员不能禁言其他管理员");
      const expiresAt = new Date(Date.now() + input.durationHours * 3600_000);
      // Upsert mute
      const existing = await db.select({ id: groupMutes.id }).from(groupMutes)
        .where(and(eq(groupMutes.groupId, input.groupId), eq(groupMutes.userId, input.targetUserId))).limit(1);
      if (existing[0]) {
        await db.update(groupMutes).set({ expiresAt, mutedBy: ctx.user.id }).where(eq(groupMutes.id, existing[0].id));
      } else {
        await db.insert(groupMutes).values({ groupId: input.groupId, userId: input.targetUserId, mutedBy: ctx.user.id, expiresAt });
      }
      return { ok: true, expiresAt };
    }),

  unmuteMember: protectedProcedure
    .input(z.object({ groupId: z.number(), targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      await db.delete(groupMutes).where(and(eq(groupMutes.groupId, input.groupId), eq(groupMutes.userId, input.targetUserId)));
      return { ok: true };
    }),

  transferOwnership: protectedProcedure
    .input(z.object({ groupId: z.number(), newOwnerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || actor[0].role !== "owner") throw new Error("Only owner can transfer");
      // 转给自己会让群变无主:set owner(自己,无变化)→ set member(自己自降)→ 0 个 owner,群永久无人可管
      if (input.newOwnerId === ctx.user.id) throw new Error("不能把群主转让给自己");
      // The new owner must already be a member, otherwise the group would be left with no owner.
      const target = await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.newOwnerId))).limit(1);
      if (!target[0]) throw new Error("New owner must be a member of the group");
      // 两条 update 包进事务:否则部分失败会产生"双 owner"或"无 owner"
      await db.transaction(async (tx) => {
        await tx.update(groupMembers).set({ role: "owner" }).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.newOwnerId)));
        await tx.update(groupMembers).set({ role: "member" }).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id)));
      });
      return { ok: true };
    }),

  // 群主设置/取消管理员
  setMemberRole: protectedProcedure
    .input(z.object({ groupId: z.number(), userId: z.number(), makeAdmin: z.boolean() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || actor[0].role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "仅群主可设置管理员" });
      const [target] = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId))).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "该用户不在群里" });
      if (target.role === "owner") throw new TRPCError({ code: "BAD_REQUEST", message: "不能修改群主角色" });
      await db.update(groupMembers).set({ role: input.makeAdmin ? "admin" : "member" })
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId)));
      return { ok: true, role: input.makeAdmin ? "admin" : "member" };
    }),

  getMutedMembers: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) return [];
      const now = new Date();
      return db.select({ userId: groupMutes.userId, expiresAt: groupMutes.expiresAt, userName: users.name })
        .from(groupMutes)
        .leftJoin(users, eq(groupMutes.userId, users.id))
        // 永久禁言 expiresAt 为 NULL:与 saveMessage 的强制判定对齐,否则永久禁言的人不出现在名单、无法解除
        .where(and(eq(groupMutes.groupId, input.groupId),
          sql`(${groupMutes.expiresAt} IS NULL OR ${groupMutes.expiresAt} > ${now})`));
    }),

  // ─── Leave Group ──────────────────────────────────────────────────────────
  leaveGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const member = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!member[0]) throw new Error("Not a member");
      if (member[0].role === "owner") throw new Error("Owner cannot leave. Transfer ownership first.");
      await db.delete(groupMembers).where(
        and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))
      );
      // COUNT(*) 回写而非 -1:与 kick 交错时 -1 会重复递减(见 kickMember 同注释)
      await db.update(chatGroups).set({
        memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${input.groupId})`,
      }).where(eq(chatGroups.id, input.groupId));
      try { evictUserFromGroupRoom(ctx.user.id, input.groupId); } catch { /* 非关键 */ }
      return { ok: true };
    }),

  // ─── Update Group Info (owner/admin only) ────────────────────────────────
  updateGroupInfo: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      avatar: z.string().max(500).optional(),
      isPublic: z.boolean().optional(),
      joinApproval: z.boolean().optional(),
      forbidAddFriend: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      // isPublic/joinApproval 是 owner 级设置——admin 把私密群改公开会让全部历史消息对任意人可浏览(getMessages 对公开群放开)。admin 仅可改 name/desc/avatar/forbidAddFriend。
      if (actor[0].role !== "owner" && (input.isPublic !== undefined || input.joinApproval !== undefined)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主可修改群的公开/入群审批设置" });
      }
      // 公开群已对所有用户放开（2026-07-12 用户拍板）：私密改公开不再要求会员。
      const updates: Partial<{ name: string; description: string; avatar: string; isPublic: boolean; joinApproval: boolean; forbidAddFriend: boolean }> = {};
      if (input.name !== undefined) updates.name = sanitizeInput(input.name);
      if (input.description !== undefined) updates.description = sanitizeInput(input.description);
      if (input.avatar !== undefined) updates.avatar = input.avatar;
      if (input.isPublic !== undefined) updates.isPublic = input.isPublic;
      if (input.joinApproval !== undefined) updates.joinApproval = input.joinApproval;
      if (input.forbidAddFriend !== undefined) updates.forbidAddFriend = input.forbidAddFriend;
      if (Object.keys(updates).length === 0) return { ok: true };
      await db.update(chatGroups).set(updates).where(eq(chatGroups.id, input.groupId));
      return { ok: true };
    }),

  // ─── 会话偏好：免打扰 / 置顶 / 清除历史 ──────────────────────────────────
  getConversationPrefs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {} as Record<string, { isMuted: boolean; isPinned: boolean }>;
    const rows = await db.select({
      convKey: conversationPrefs.convKey, isMuted: conversationPrefs.isMuted, isPinned: conversationPrefs.isPinned,
    }).from(conversationPrefs).where(eq(conversationPrefs.userId, ctx.user.id));
    const map: Record<string, { isMuted: boolean; isPinned: boolean }> = {};
    for (const r of rows) map[r.convKey] = { isMuted: r.isMuted, isPinned: r.isPinned };
    return map;
  }),

  setConversationPref: protectedProcedure
    .input(z.object({
      convKey: z.string().max(40),
      isMuted: z.boolean().optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [existing] = await db.select({ id: conversationPrefs.id }).from(conversationPrefs)
        .where(and(eq(conversationPrefs.userId, ctx.user.id), eq(conversationPrefs.convKey, input.convKey))).limit(1);
      const patch: Partial<{ isMuted: boolean; isPinned: boolean }> = {};
      if (input.isMuted !== undefined) patch.isMuted = input.isMuted;
      if (input.isPinned !== undefined) patch.isPinned = input.isPinned;
      if (existing) {
        if (Object.keys(patch).length > 0) await db.update(conversationPrefs).set(patch).where(eq(conversationPrefs.id, existing.id));
      } else {
        await db.insert(conversationPrefs).values({ userId: ctx.user.id, convKey: input.convKey, ...patch });
      }
      return { ok: true };
    }),

  clearConversationHistory: protectedProcedure
    .input(z.object({ convKey: z.string().max(40) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 把清除游标设到该会话当前最大消息 id —— 之后只显示更新的消息（仅对自己生效）
      let maxId = 0;
      if (input.convKey.startsWith("group:")) {
        const gid = parseInt(input.convKey.slice(6), 10);
        const [m] = await db.select({ id: messages.id }).from(messages)
          .where(eq(messages.groupId, gid)).orderBy(desc(messages.id)).limit(1);
        maxId = m?.id ?? 0;
      } else if (input.convKey.startsWith("dm:")) {
        const other = parseInt(input.convKey.slice(3), 10);
        const [m] = await db.select({ id: messages.id }).from(messages)
          .where(or(
            and(eq(messages.senderId, ctx.user.id), eq(messages.receiverId, other)),
            and(eq(messages.senderId, other), eq(messages.receiverId, ctx.user.id)),
          )!).orderBy(desc(messages.id)).limit(1);
        maxId = m?.id ?? 0;
      }
      const [existing] = await db.select({ id: conversationPrefs.id }).from(conversationPrefs)
        .where(and(eq(conversationPrefs.userId, ctx.user.id), eq(conversationPrefs.convKey, input.convKey))).limit(1);
      if (existing) {
        await db.update(conversationPrefs).set({ clearedBeforeId: maxId }).where(eq(conversationPrefs.id, existing.id));
      } else {
        await db.insert(conversationPrefs).values({ userId: ctx.user.id, convKey: input.convKey, clearedBeforeId: maxId });
      }
      return { ok: true, clearedBeforeId: maxId };
    }),

  // ─── 进群审批 ────────────────────────────────────────────────────────────
  listJoinRequests: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) return [];
      return db.select({
        id: groupJoinRequests.id, userId: groupJoinRequests.userId, createdAt: groupJoinRequests.createdAt,
        name: users.name, username: users.username, avatar: users.avatar,
      }).from(groupJoinRequests)
        .leftJoin(users, eq(users.id, groupJoinRequests.userId))
        .where(and(eq(groupJoinRequests.groupId, input.groupId), eq(groupJoinRequests.status, "pending")))
        .orderBy(desc(groupJoinRequests.id));
    }),

  reviewJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.number(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [req] = await db.select().from(groupJoinRequests).where(eq(groupJoinRequests.id, input.requestId)).limit(1);
      if (!req || req.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在或已处理" });
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, req.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主/管理员可审批" });
      }
      // 审批通过也要过容量闸:joinGroup/useInviteLink 都拦了"群成员已满",这条路径原来没拦,可越过上限
      if (input.approve) {
        const [cap] = await db.select({ memberCount: chatGroups.memberCount, maxMembers: chatGroups.maxMembers })
          .from(chatGroups).where(eq(chatGroups.id, req.groupId)).limit(1);
        if (cap && cap.maxMembers > 0 && cap.memberCount >= cap.maxMembers) {
          throw new TRPCError({ code: "FORBIDDEN", message: "群成员已满,无法通过申请" });
        }
      }
      // 条件更新做幂等:双击/两管理员并发审批时只有一方能把 pending 翻走,另一方直接返回,防重复入群
      const flip = await db.update(groupJoinRequests)
        .set({ status: input.approve ? "approved" : "rejected" })
        .where(and(eq(groupJoinRequests.id, input.requestId), eq(groupJoinRequests.status, "pending")));
      const flipped = (flip as any)?.[0]?.affectedRows ?? (flip as any)?.affectedRows ?? (flip as any)?.rowsAffected ?? 0;
      if (flipped < 1) throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在或已处理" });
      if (input.approve) {
        const already = await db.select({ id: groupMembers.id }).from(groupMembers)
          .where(and(eq(groupMembers.groupId, req.groupId), eq(groupMembers.userId, req.userId))).limit(1);
        if (already.length === 0) {
          await db.insert(groupMembers).values({ groupId: req.groupId, userId: req.userId, role: "member" });
          await db.update(chatGroups).set({
            memberCount: sql`(SELECT COUNT(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${req.groupId})`,
          }).where(eq(chatGroups.id, req.groupId));
          await initReadCursor(db, req.groupId, req.userId); // 历史消息不算新成员未读
        }
      }
      return { ok: true };
    }),

  // ─── Red Packet: Send (扣 AC 积分发群红包) ───────────────────────────────
  sendRedPacket: protectedProcedure
    .input(z.object({
      groupId: z.number().optional(),
      receiverId: z.number().optional(), // 私信红包接收者（与 groupId 二选一）
      totalAmount: z.number().int().min(1).max(1_000_000),
      totalShares: z.number().int().min(1).max(100).default(1),
      isRandom: z.boolean().default(true),
      blessing: z.string().max(100).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      if (!input.groupId && !input.receiverId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "缺少红包目标" });
      }
      const isDM = !input.groupId && !!input.receiverId;
      if (input.groupId) await assertGroupMember(db, input.groupId, ctx.user.id);
      else if (isDM) await assertCanDM(db, ctx.user.id, input.receiverId!); // 私信红包同样过拉黑/好友闸,否则=拉黑者可发红包+推送骚扰的绕过口
      // 私信红包固定 1 个、不拼手气
      const totalShares = isDM ? 1 : input.totalShares;
      const isRandom = isDM ? false : input.isRandom;
      if (totalShares > input.totalAmount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "红包个数不能超过总积分（每份至少 1 AC）" });
      }
      const blessing = sanitizeInput(input.blessing?.trim() || "恭喜发财，大吉大利", 100); // 净化,与其它 DM 内容路径一致(原来直接 slice 未过滤)
      let messageId = 0;
      await db.transaction(async (tx) => {
        // 1) 条件扣减发送者积分（防透支/并发）
        const deduct = await tx.update(users)
          .set({ npPoints: sql`npPoints - ${input.totalAmount}` })
          .where(and(eq(users.id, ctx.user.id), sql`npPoints >= ${input.totalAmount}`));
        const affected = (deduct as any)?.[0]?.affectedRows ?? (deduct as any)?.affectedRows ?? 0;
        if (!affected) throw new TRPCError({ code: "BAD_REQUEST", message: "积分不足，无法发红包" });
        // 2) 红包消息
        const [msg] = await tx.insert(messages).values({
          groupId: input.groupId ?? null,
          receiverId: isDM ? input.receiverId : undefined,
          senderId: ctx.user.id,
          content: blessing,
          messageType: "redpacket",
        });
        messageId = (msg as any).insertId as number;
        // 3) 红包本体
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
          blessing,
        });
      });
      // 私信红包：实时推给在线接收者 + 离线推送
      if (isDM && input.receiverId) {
        emitToUser(input.receiverId, "dm_message", {
          messageId, senderId: ctx.user.id,
          senderName: ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`,
          content: blessing, messageType: "redpacket", mediaUrl: null,
          durationSeconds: null, createdAt: new Date().toISOString(),
        });
        void notifyDmOffline(input.receiverId, ctx.user.id, `${ctx.user.name ?? ctx.user.username ?? "有人"} 发来一个红包`, "🧧 " + blessing);
      }
      return { messageId, totalAmount: input.totalAmount, totalShares };
    }),

  // ─── Red Packet: Claim (抢红包，随机/均分发放并入账) ───────────────────────
  claimRedPacket: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      groupId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      let result: { ok: boolean; reason: string; amount: number } = { ok: false, reason: "not_found", amount: 0 };
      await db.transaction(async (tx) => {
        // 锁定红包行，串行化所有抢包请求，避免超发
        const [rp] = await tx.select().from(redPackets)
          .where(eq(redPackets.messageId, input.messageId))
          .for("update")
          .limit(1);
        if (!rp) { result = { ok: false, reason: "not_found", amount: 0 }; return; }
        // 权限：群红包→须群成员；私信红包→只能接收者领
        if (rp.groupId) {
          const [m] = await tx.select({ id: groupMembers.id }).from(groupMembers)
            .where(and(eq(groupMembers.groupId, rp.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
          if (!m) { result = { ok: false, reason: "not_member", amount: 0 }; return; }
        } else if (rp.receiverId && rp.receiverId !== ctx.user.id) {
          result = { ok: false, reason: "not_recipient", amount: 0 }; return;
        }
        // 是否已抢过
        const existing = await tx.select({ amount: redPacketClaims.amount }).from(redPacketClaims)
          .where(and(eq(redPacketClaims.messageId, input.messageId), eq(redPacketClaims.claimedBy, ctx.user.id)))
          .limit(1);
        if (existing.length > 0) { result = { ok: false, reason: "already_claimed", amount: existing[0].amount }; return; }
        if (rp.remainingShares <= 0 || rp.remainingAmount <= 0) { result = { ok: false, reason: "exhausted", amount: 0 }; return; }
        // 计算本次金额
        let amount: number;
        if (rp.remainingShares === 1) {
          amount = rp.remainingAmount; // 最后一个拿走全部余额
        } else if (rp.isRandom) {
          // 二倍均值法：保证后面每人至少 1 AC（max 兜底 ≥1，防极端不变量被破坏）
          const max = Math.max(1, rp.remainingAmount - (rp.remainingShares - 1));
          const avg2 = Math.floor((rp.remainingAmount / rp.remainingShares) * 2);
          const hi = Math.max(1, Math.min(max, avg2));
          amount = Math.floor(Math.random() * hi) + 1;
        } else {
          amount = Math.max(1, Math.floor(rp.remainingAmount / rp.remainingShares));
        }
        // 记录领取 + 扣减红包余额 + 给领取者加积分
        await tx.insert(redPacketClaims).values({
          messageId: input.messageId, groupId: rp.groupId ?? null, claimedBy: ctx.user.id, amount,
        });
        await tx.update(redPackets)
          .set({ remainingAmount: sql`remainingAmount - ${amount}`, remainingShares: sql`remainingShares - 1` })
          .where(eq(redPackets.id, rp.id));
        await tx.update(users).set({ npPoints: sql`npPoints + ${amount}` }).where(eq(users.id, ctx.user.id));
        result = { ok: true, reason: "", amount };
      });
      return result;
    }),

  // ─── Red Packet: Get status (含金额与领取明细) ───────────────────────────
  getRedPacketStatus: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [rp] = await db.select().from(redPackets).where(eq(redPackets.messageId, input.messageId)).limit(1);
      if (!rp) return null;
      // 鉴权:群红包仅群成员可看、私信红包仅收发双方可看(防 messageId 枚举偷看谁抢了多少)
      if (rp.groupId) {
        const [m] = await db.select({ id: groupMembers.id }).from(groupMembers)
          .where(and(eq(groupMembers.groupId, rp.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
        if (!m) return null;
      } else if (rp.receiverId && rp.receiverId !== ctx.user.id && rp.senderId !== ctx.user.id) {
        return null;
      }
      const claims = await db.select({
        claimedBy: redPacketClaims.claimedBy,
        amount: redPacketClaims.amount,
        claimedAt: redPacketClaims.claimedAt,
        name: users.name,
        avatar: users.avatar,
      }).from(redPacketClaims)
        .leftJoin(users, eq(users.id, redPacketClaims.claimedBy))
        .where(eq(redPacketClaims.messageId, input.messageId))
        .orderBy(desc(redPacketClaims.claimedAt));
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
        claims: claims.map((c) => ({ userId: c.claimedBy, name: c.name, avatar: c.avatar, amount: c.amount })),
      };
    }),

  // ─── Group Announcements: Get ─────────────────────────────────────────────
  getAnnouncement: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      // 与 getMessages/getPinnedMessages 同门禁:私密群公告仅成员可读。
      // 原来是 publicProcedure 且无校验,任何人(含未登录)遍历 groupId 就能拿走私密群公告全文。
      const [grp] = await db.select({ isPublic: chatGroups.isPublic }).from(chatGroups)
        .where(eq(chatGroups.id, input.groupId)).limit(1);
      if (!grp) return null;
      if (!grp.isPublic) await assertGroupMember(db, input.groupId, ctx.user.id);
      const ann = await db.select().from(groupAnnouncements)
        .where(and(eq(groupAnnouncements.groupId, input.groupId), eq(groupAnnouncements.isPinned, true)))
        .orderBy(desc(groupAnnouncements.updatedAt)).limit(1);
      return ann[0] ?? null;
    }),

  // ─── Group Announcements: Set (owner/admin only) ──────────────────────────
  setAnnouncement: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      await db.delete(groupAnnouncements)
        .where(and(eq(groupAnnouncements.groupId, input.groupId), eq(groupAnnouncements.isPinned, true)));
      await db.insert(groupAnnouncements).values({
        groupId: input.groupId,
        content: sanitizeInput(input.content),
        createdBy: ctx.user.id,
        isPinned: true,
      });
      // Get group info and all members to push notification
      const [groupInfo] = await db.select({ name: chatGroups.name })
        .from(chatGroups).where(eq(chatGroups.id, input.groupId)).limit(1);
      const members = await db.select({ userId: groupMembers.userId })
        .from(groupMembers).where(eq(groupMembers.groupId, input.groupId));
      // Emit real-time notification to all members (except sender)
      const senderName = ctx.user.name ?? ctx.user.username ?? `User #${ctx.user.id}`;
      const groupName = groupInfo?.name ?? `Group #${input.groupId}`;
      const safeContent = sanitizeInput(input.content);
      const preview = safeContent.length > 60 ? safeContent.slice(0, 60) + "..." : safeContent;
      for (const member of members) {
        if (member.userId === ctx.user.id) continue;
        emitToUser(member.userId, "group_announcement", {
          groupId: input.groupId,
          groupName,
          content: preview,
          updatedBy: senderName,
          updatedAt: new Date().toISOString(),
        });
      }
      return { ok: true };
    }),

  // ─── Group Announcements: Delete (owner/admin only) ───────────────────────
  deleteAnnouncement: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const actor = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!actor[0] || (actor[0].role !== "owner" && actor[0].role !== "admin")) throw new Error("Not authorized");
      await db.delete(groupAnnouncements)
        .where(and(eq(groupAnnouncements.groupId, input.groupId), eq(groupAnnouncements.isPinned, true)));
      return { ok: true };
    }),

  // ─── 群数据看板（群成员可看；数据机器人解锁周报，但实时数据对成员开放） ──────
  getGroupStats: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await assertGroupMember(db, input.groupId, ctx.user.id);
      const now = Date.now();
      const dayAgo = new Date(now - 24 * 3600 * 1000);
      const weekAgo = new Date(now - 7 * 24 * 3600 * 1000);
      const prevWeekAgo = new Date(now - 14 * 24 * 3600 * 1000);

      const [memberCount] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, input.groupId));
      const [newWeek] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), gt(groupMembers.joinedAt, weekAgo)));
      const [msgToday] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(messages)
        .where(and(eq(messages.groupId, input.groupId), gt(messages.createdAt, dayAgo)));
      const [msgWeek] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(messages)
        .where(and(eq(messages.groupId, input.groupId), gt(messages.createdAt, weekAgo)));
      const [msgPrevWeek] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(messages)
        .where(and(eq(messages.groupId, input.groupId), gt(messages.createdAt, prevWeekAgo), lt(messages.createdAt, weekAgo)));
      const [activeWeek] = await db
        .select({ c: sql<number>`COUNT(DISTINCT ${messages.senderId})` })
        .from(messages)
        .where(and(eq(messages.groupId, input.groupId), gt(messages.createdAt, weekAgo)));

      // 近 7 天每日发言量（用于折线/柱状图）
      const daily = await db
        .select({
          day: sql<string>`DATE(${messages.createdAt})`,
          c: sql<number>`COUNT(*)`,
        })
        .from(messages)
        .where(and(eq(messages.groupId, input.groupId), gt(messages.createdAt, weekAgo)))
        .groupBy(sql`DATE(${messages.createdAt})`)
        .orderBy(sql`DATE(${messages.createdAt})`);

      // 本周最活跃成员 Top5
      const topRows = await db
        .select({
          userId: messages.senderId,
          name: users.name,
          avatar: users.avatar,
          c: sql<number>`COUNT(*)`,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(and(eq(messages.groupId, input.groupId), gt(messages.createdAt, weekAgo)))
        .groupBy(messages.senderId, users.name, users.avatar)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(5);

      const total = Number(memberCount?.c ?? 0);
      const active = Number(activeWeek?.c ?? 0);
      const mw = Number(msgWeek?.c ?? 0);
      const mpw = Number(msgPrevWeek?.c ?? 0);
      const wow = mpw > 0 ? Math.round(((mw - mpw) / mpw) * 100) : (mw > 0 ? 100 : 0);
      return {
        memberCount: total,
        newMembersWeek: Number(newWeek?.c ?? 0),
        messagesToday: Number(msgToday?.c ?? 0),
        messagesWeek: mw,
        messagesPrevWeek: mpw,
        messagesWoW: wow, // 周环比 %
        activeMembersWeek: active,
        activeRate: total > 0 ? Math.round((active / total) * 100) : 0, // 活跃率 %
        daily: daily.map((d) => ({ day: String(d.day), count: Number(d.c) })),
        topMembers: topRows.map((r) => ({
          userId: r.userId, name: r.name ?? `用户#${r.userId}`, avatar: r.avatar ?? null, count: Number(r.c),
        })),
      };
    }),

  // ─── 群机器人：目录 + 套餐 + 本群状态 ──────────────────────────────────────
  getGroupBots: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await assertGroupMember(db, input.groupId, ctx.user.id);
      const [me] = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      const canManage = !!me && (me.role === "owner" || me.role === "admin");
      const bots = await listGroupBots(db, input.groupId);
      return { canManage, bots, packages: BOT_PACKAGES };
    }),

  // 开通/续费/关闭/改设置（owner/admin；开通按月扣 AC）
  setGroupBot: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      botType: z.enum(["welcome", "manage", "price", "activity", "stats", "interact", "growth"]),
      enabled: z.boolean().optional(),       // 开/关
      months: z.number().int().min(0).max(12).optional(), // >0 表示订阅/续费月数（扣费）
      config: z.record(z.string(), z.any()).optional(),   // 机器人设置
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [me] = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!me || (me.role !== "owner" && me.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主/管理员可设置机器人" });
      }
      const meta = getBotMeta(input.botType);
      if (!meta) throw new TRPCError({ code: "BAD_REQUEST", message: "未知机器人" });

      const [existing] = await db.select().from(groupBots)
        .where(and(eq(groupBots.groupId, input.groupId), eq(groupBots.botType, input.botType))).limit(1);

      // 计算新到期时间（订阅/续费）
      let expiresAt: Date | null | undefined = undefined; // undefined=不变
      const months = input.months ?? 0;
      if (months > 0 && meta.monthlyNN > 0) {
        const cost = meta.monthlyNN * months;
        if (meta.currency === "AC") {
          // 基础机器人按 AC 计价（任务积分的消耗出口）
          const ok = await spendNP(db, ctx.user.id, cost);
          if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: `AC 余额不足（需 ${cost.toLocaleString()} AC），完成任务可获取 AC` });
        } else {
          // 原子扣 AI 治理代币（余额足够才扣，AI 回流金库）
          const ok = await spendNN(db, ctx.user.id, cost, { type: "bot_sub", refType: "group", refId: input.groupId, memo: input.botType });
          if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "AI 余额不足，无法开通" });
        }
        const base = existing?.expiresAt && existing.expiresAt.getTime() > Date.now()
          ? existing.expiresAt.getTime() : Date.now();
        expiresAt = new Date(base + months * 30 * 24 * 3600 * 1000);
      } else if (months > 0 && meta.monthlyNN === 0) {
        // 免费机器人，开通即永久
        expiresAt = null;
      }

      const setFields: Record<string, unknown> = { updatedAt: new Date() };
      if (input.enabled !== undefined) setFields.enabled = input.enabled;
      if (months > 0) setFields.enabled = true; // 订阅即开启
      if (expiresAt !== undefined) setFields.expiresAt = expiresAt;
      if (input.config !== undefined) {
        const merged = { ...meta.defaultConfig, ...input.config };
        setFields.config = JSON.stringify(merged);
      }

      if (existing) {
        await db.update(groupBots).set(setFields)
          .where(eq(groupBots.id, existing.id));
      } else {
        await db.insert(groupBots).values({
          groupId: input.groupId,
          botType: input.botType,
          enabled: (setFields.enabled as boolean) ?? false,
          expiresAt: (expiresAt ?? null) as Date | null,
          config: (setFields.config as string) ?? JSON.stringify(meta.defaultConfig),
        });
      }
      const [bal] = await db.select({ nn: users.nnBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return { ok: true, nnBalance: Number(bal?.nn ?? 0) };
    }),

  // 开通机器人套餐：按套餐折扣价一次性扣 AI，激活套餐内全部机器人
  buyBotPackage: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      packageKey: z.string(),
      months: z.number().int().min(1).max(12).default(1),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [me] = await db.select({ role: groupMembers.role }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!me || (me.role !== "owner" && me.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅群主/管理员可开通套餐" });
      }
      const pkg = BOT_PACKAGES.find((p) => p.key === input.packageKey);
      if (!pkg) throw new TRPCError({ code: "BAD_REQUEST", message: "未知套餐" });

      // 一次性按套餐价扣费（折扣已含在 pkg.monthlyNN；币种见 pkg.currency）
      const cost = pkg.monthlyNN * input.months;
      if (pkg.currency === "AC") {
        const ok = await spendNP(db, ctx.user.id, cost);
        if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: `AC 余额不足（需 ${cost.toLocaleString()} AC），完成任务可获取 AC` });
      } else {
        const ok = await spendNN(db, ctx.user.id, cost, { type: "package", refType: "group", refId: input.groupId, memo: pkg.key });
        if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "AI 余额不足，无法开通套餐" });
      }

      const paidExpiry = new Date(Date.now() + input.months * 30 * 24 * 3600 * 1000);
      for (const bt of pkg.bots) {
        const meta = getBotMeta(bt);
        if (!meta) continue;
        const isFree = meta.monthlyNN === 0;
        const [existing] = await db.select().from(groupBots)
          .where(and(eq(groupBots.groupId, input.groupId), eq(groupBots.botType, bt))).limit(1);
        // 付费机器人：在现有有效期上叠加；免费机器人：永久
        let expiresAt: Date | null = isFree ? null : paidExpiry;
        if (!isFree && existing?.expiresAt && existing.expiresAt.getTime() > Date.now()) {
          expiresAt = new Date(existing.expiresAt.getTime() + input.months * 30 * 24 * 3600 * 1000);
        }
        if (existing) {
          await db.update(groupBots).set({ enabled: true, expiresAt, updatedAt: new Date() })
            .where(eq(groupBots.id, existing.id));
        } else {
          await db.insert(groupBots).values({
            groupId: input.groupId, botType: bt, enabled: true, expiresAt,
            config: JSON.stringify(meta.defaultConfig),
          });
        }
      }
      const [bal] = await db.select({ nn: users.nnBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return { ok: true, nnBalance: Number(bal?.nn ?? 0), bots: pkg.bots };
    }),

  // ─── AI 治理代币 ──────────────────────────────────────────────────────────
  getTokenInfo: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return getTokenInfo(db, ctx.user.id);
    }),

  // 代币经济（总量 + 分配模型，公开）
  getTokenomics: publicProcedure
    .query(() => getTokenomics()),

  // 发放 AI（空投/运营，管理员）。amount 上限受金库余额约束。
  adminGrantNN: adminProcedure
    .input(z.object({ userId: z.number(), amount: z.number().int().min(1).max(NN_TOTAL_SUPPLY) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ok = await grantNN(db, input.userId, input.amount, { type: "grant", refType: "admin" });
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "金库余额不足或参数无效" });
      return await getTokenInfo(db, input.userId);
    }),

  // ─── Pro 会员 ─────────────────────────────────────────────────────────────
  getMembership: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return getMembership(db, ctx.user.id);
    }),

  buyMembership: protectedProcedure
    .input(z.object({ tier: z.enum(["plus", "pro"]), months: z.number().int().min(1).max(12).default(1) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      try {
        const r = await buyMembership(db, ctx.user.id, input.tier, input.months);
        return { ok: true, ...r };
      } catch (e: any) {
        if (e?.message === "insufficient_nn") throw new TRPCError({ code: "BAD_REQUEST", message: "AI 余额不足" });
        throw new TRPCError({ code: "BAD_REQUEST", message: "开通失败" });
      }
    }),

  // 我的归属计划（节点等线性释放）
  getMyVesting: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return getMyVesting(db, ctx.user.id);
    }),

  // 领取当前可解锁的 AI
  claimVesting: protectedProcedure
    .input(z.object({ vestingId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const r = await claimVesting(db, ctx.user.id, input.vestingId);
      if (!r.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "暂无可领取的额度" });
      return r;
    }),

  // 我的 AI 流水
  getMyNNTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return getMyNNTransactions(db, ctx.user.id, 50);
    }),

  // 运营：机器人订阅统计 + AI 营收 + 节点订单概览
  // ─── 运营增长:一键填公开群人数 + 一键扩充互动机器人(替代服务器脚本)──────────────
  adminFillGroupMembers: adminProcedure
    .input(z.object({
      targetMin: z.number().int().min(1).max(5000).default(220),
      targetMax: z.number().int().min(1).max(5000).default(480),
      maxPerCall: z.number().int().min(1).max(2000).default(800), // 单次最多新增,防 HTTP 超时;不够再点一次
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const lo = Math.min(input.targetMin, input.targetMax), hi = Math.max(input.targetMin, input.targetMax);
      const groups = await db.select({ id: chatGroups.id, name: chatGroups.name }).from(chatGroups).where(eq(chatGroups.isPublic, true)).limit(60);
      const PRE = ["0x", "Crypto", "Web3", "DeFi", "Chain", "Block", "Token", "NFT", "Eth", "BTC", "Sol", "Ape", "Degen", "Meta", "Zk", "Layer"];
      const SUF = ["Whale", "Degen", "Hodler", "Maxi", "Anon", "Dev", "Trader", "Farmer", "Bull", "Bear", "Ape", "Fren", "Chad", "Wizard", "Ninja", "Guru"];
      const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
      const pastDate = (maxDays: number) => new Date(Date.now() - Math.random() * maxDays * 86_400_000);
      let added = 0, remaining = 0, ctr = Date.now() * 1000;
      const summary: { group: string; from: number; to: number }[] = [];
      for (const g of groups) {
        const [cnt] = await db.select({ c: sql<number>`COUNT(*)` }).from(groupMembers).where(eq(groupMembers.groupId, g.id));
        const have = Number(cnt?.c ?? 0);
        const target = lo + Math.floor(Math.random() * (hi - lo + 1));
        const want = target - have;
        if (want <= 0) continue;
        const budget = input.maxPerCall - added;
        if (budget <= 0) { remaining += want; continue; }
        const need = Math.min(want, budget);
        // 分批多行 INSERT(避免逐条往返超时;单条多行插入的自增 id 连续,可推导成员行)
        let done = 0;
        while (done < need) {
          const n = Math.min(100, need - done);
          const rows = Array.from({ length: n }, () => {
            const uname = `${pick(PRE)}${pick(SUF)}_${(ctr++).toString(36)}`;
            return { openId: `silent_${ctr}_${Math.floor(Math.random() * 1e6)}`, name: uname, loginMethod: "silent", role: "user" as const, username: uname, isBot: true, lastSignedIn: pastDate(7) };
          });
          const res = await db.insert(users).values(rows);
          const firstId = (res as any)?.insertId ?? (res as any)?.[0]?.insertId;
          if (!firstId) break;
          await db.insert(groupMembers).values(Array.from({ length: n }, (_, i) => ({ groupId: g.id, userId: Number(firstId) + i, role: "member" as const, joinedAt: pastDate(60) })));
          done += n;
        }
        const [c2] = await db.select({ c: sql<number>`COUNT(*)` }).from(groupMembers).where(eq(groupMembers.groupId, g.id));
        await db.update(chatGroups).set({ memberCount: Number(c2?.c ?? 0) }).where(eq(chatGroups.id, g.id));
        added += done;
        if (want > done) remaining += want - done;
        summary.push({ group: g.name, from: have, to: Number(c2?.c ?? 0) });
      }
      return { added, remaining, summary }; // remaining>0 时再点一次继续填
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
      { openId: "bot_news_flash", name: "NewsFlash", username: "news_flash" },
    ];
    let created = 0;
    for (const b of NEW_BOTS) {
      const [ex] = await db.select({ id: users.id }).from(users).where(eq(users.openId, b.openId)).limit(1);
      if (ex) continue;
      await db.insert(users).values({ openId: b.openId, name: b.name, loginMethod: "bot", role: "user", username: b.username, isBot: true, lastSignedIn: new Date() });
      created++;
    }
    // 把所有「有人设的机器人」(BOT_PERSONAS,排除静默填充号)加入所有公开群
    const bots = await db.select({ id: users.id }).from(users).where(inArray(users.openId, Object.values(BOT_PERSONAS).map((p) => p.openId)));
    const groups = await db.select({ id: chatGroups.id }).from(chatGroups).where(eq(chatGroups.isPublic, true)).limit(60);
    let joins = 0;
    for (const g of groups) {
      for (const bot of bots) {
        const [m] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and(eq(groupMembers.groupId, g.id), eq(groupMembers.userId, bot.id))).limit(1);
        if (m) continue;
        await db.insert(groupMembers).values({ groupId: g.id, userId: bot.id, role: "member" });
        joins++;
      }
      const [c2] = await db.select({ c: sql<number>`COUNT(*)` }).from(groupMembers).where(eq(groupMembers.groupId, g.id));
      await db.update(chatGroups).set({ memberCount: Number(c2?.c ?? 0) }).where(eq(chatGroups.id, g.id));
    }
    return { createdBots: created, totalBots: bots.length, groups: groups.length, joins };
  }),

  adminBotStats: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const now = new Date();
      // 各类型「生效中」机器人数（启用且未过期）
      const active = await db
        .select({ botType: groupBots.botType, c: sql<number>`COUNT(*)` })
        .from(groupBots)
        .where(and(eq(groupBots.enabled, true), or(isNull(groupBots.expiresAt), gt(groupBots.expiresAt, now))))
        .groupBy(groupBots.botType);
      // 7 天内即将到期
      const soon = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const [expiring] = await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(groupBots)
        .where(and(eq(groupBots.enabled, true), gt(groupBots.expiresAt, now), lt(groupBots.expiresAt, soon)));
      const revenue = await getNNRevenue(db);
      // 节点订单概览
      const orderAgg = await db
        .select({ status: nnNodeOrders.status, c: sql<number>`COUNT(*)` })
        .from(nnNodeOrders)
        .groupBy(nnNodeOrders.status);
      const token = await getTokenInfo(db);
      return {
        activeBots: active.map((a) => ({ botType: a.botType, count: Number(a.c) })),
        expiringSoon: Number(expiring?.c ?? 0),
        revenue,
        nodeOrders: orderAgg.map((o) => ({ status: o.status, count: Number(o.c) })),
        token,
      };
    }),

  // ─── 节点认购（USDT 私募） ─────────────────────────────────────────────────
  // 节点等级 + 收款地址（公开）
  getNodeTiers: publicProcedure
    .query(() => ({ tiers: NN_NODE_TIERS, payAddress: USDT_DEPOSIT_ADDRESS, chain: USDT_CHAIN })),

  // 下单认购：创建待支付订单，返回收款地址与应付金额
  createNodeOrder: protectedProcedure
    .input(z.object({ tier: z.enum(["genesis", "super", "standard"]) }))
    .use(rateLimitWrite)
    .mutation(async () => {
      // 节点认购已升级为合伙人计划：停止旧档位下单（历史订单的确认/取消入口保留在下方 admin 接口）
      throw new TRPCError({ code: "BAD_REQUEST", message: "节点认购已升级为「合伙人招募」，请前往代币页 → 合伙人招募认购" });
    }),

  // 回填链上转账哈希（用户支付后提交，等待运营确认）
  submitNodeTx: protectedProcedure
    .input(z.object({ orderId: z.number(), txHash: z.string().min(6).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [o] = await db.select().from(nnNodeOrders).where(eq(nnNodeOrders.id, input.orderId)).limit(1);
      if (!o || o.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "订单不存在" });
      if (o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单状态不可修改" });
      await db.update(nnNodeOrders).set({ txHash: sanitizeInput(input.txHash, 120) }).where(eq(nnNodeOrders.id, input.orderId));
      return { ok: true };
    }),

  // 我的节点订单
  getMyNodeOrders: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(nnNodeOrders)
        .where(eq(nnNodeOrders.userId, ctx.user.id))
        .orderBy(desc(nnNodeOrders.createdAt)).limit(50);
    }),

  // 运营：列订单（可按状态）
  adminListNodeOrders: adminProcedure
    .input(z.object({ status: z.enum(["pending", "confirmed", "cancelled"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = input?.status ? [eq(nnNodeOrders.status, input.status)] : [];
      return db.select().from(nnNodeOrders)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(nnNodeOrders.createdAt)).limit(100);
    }),

  // 运营：确认到账 → 发放 AI（从金库/节点池），订单置为已确认
  adminConfirmNodeOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [o] = await db.select().from(nnNodeOrders).where(eq(nnNodeOrders.id, input.orderId)).limit(1);
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      if (o.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "订单已处理" });
      // 旧节点档位（genesis/super/standard）按旧汇率定的 AI 配额与现行 1:1 锚定冲突：
      // 停止确认发放，请取消订单并引导用户走合伙人计划重新认购
      if (getNodeTier(o.tier)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "旧节点订单已停用（汇率已调整为 1:1），请取消该订单并引导用户通过「合伙人招募」重新认购" });
      }
      // 合伙人订单请走 partner.adminConfirmOrder
      throw new TRPCError({ code: "BAD_REQUEST", message: "请使用合伙人确认入口处理该订单" });
    }),

  // 运营：取消订单
  adminCancelNodeOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [o] = await db.select().from(nnNodeOrders).where(eq(nnNodeOrders.id, input.orderId)).limit(1);
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      if (o.status === "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "已确认订单不可取消" });
      await db.update(nnNodeOrders).set({ status: "cancelled" }).where(eq(nnNodeOrders.id, o.id));
      return { ok: true };
    }),

});


