import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userTasks, posts, referrals, tradingPositions } from "../../drizzle/schema";
import { eq, desc, sql, and, gte, count, like, or, ne } from "drizzle-orm";
import { storagePut } from "../storage";
import { sanitizeInput, sanitizeUsername } from "../utils/sanitize";

// ─── Task definitions ─────────────────────────────────────────────────────────
export const TASK_DEFINITIONS: Record<
  string,
  { label: string; description: string; npReward: number; maxCompletions: number }
> = {
  connect_wallet: {
    label: "连接钱包",
    description: "首次连接 BSC 钱包",
    npReward: 50,
    maxCompletions: 1,
  },
  complete_profile: {
    label: "完善资料",
    description: "填写头像、昵称和 Bio",
    npReward: 100,
    maxCompletions: 1,
  },
  first_post: {
    label: "发布第一条动态",
    description: "在 Discover 发布你的第一条动态",
    npReward: 100,
    maxCompletions: 1,
  },
  first_message: {
    label: "发送第一条消息",
    description: "在 Chat 发送你的第一条消息",
    npReward: 50,
    maxCompletions: 1,
  },
  first_research: {
    label: "生成 AI 投研报告",
    description: "使用 AI 生成一份代币投研报告",
    npReward: 200,
    maxCompletions: 1,
  },
  daily_login: {
    label: "每日登录",
    description: "每天登录 NexusChat",
    npReward: 10,
    maxCompletions: 999,
  },
  invite_friend: {
    label: "邀请好友",
    description: "邀请一位好友加入 NexusChat",
    npReward: 150,
    maxCompletions: 10,
  },
};

export const userRouter = router({
  // ─── Get current user profile ──────────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // 显式选取安全字段：绝不返回 passwordHash 等敏感列
    const result = await db
      .select({
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
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return result[0] ?? null;
  }),

  // ─── Update profile ────────────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).optional(),
        username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores").optional(),
        bio: z.string().max(200).optional(),
        avatar: z.string().max(500).optional(),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Partial<typeof users.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = sanitizeInput(input.name, 50);
      if (input.username !== undefined) updateData.username = sanitizeUsername(input.username);
      if (input.bio !== undefined) updateData.bio = sanitizeInput(input.bio, 200);
      if (input.avatar !== undefined) updateData.avatar = input.avatar;

      await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

      // Auto-complete profile task if all fields filled
      const updated = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const u = updated[0];
      if (u && u.name && u.bio && u.avatar) {
        // Try to complete the task (will no-op if already done)
        await _completeTask(ctx.user.id, "complete_profile", db);
      }

      return { success: true };
    }),

  // ─── Upload avatar to S3 ─────────────────────────────────────────────────
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        fileData: z.string().max(6_000_000), // ~4.5MB base64
        mimeType: z.string().max(100),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { fileData, mimeType } = input;
      const buffer = Buffer.from(fileData, "base64");
      if (buffer.length > 4 * 1024 * 1024) {
        throw new Error("头像图片不能超过 4MB");
      }
      const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const key = `avatars/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      // Auto-update user avatar field
      const db = await getDb();
      if (db) {
        await db.update(users).set({ avatar: url }).where(eq(users.id, ctx.user.id));
      }

      return { url };
    }),

  // ─── Get leaderboard ──────────────────────────────────────────────────────
  leaderboard: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 50;
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          npPoints: users.npPoints,
          walletAddress: users.walletAddress,
        })
        .from(users)
        .orderBy(desc(users.npPoints))
        .limit(limit);

      return rows.map((u, idx) => ({
        ...u,
        rank: idx + 1,
        displayName: u.name ?? u.username ?? `User #${u.id}`,
        shortAddress: u.walletAddress
          ? `${u.walletAddress.slice(0, 6)}...${u.walletAddress.slice(-4)}`
          : null,
      }));
    }),

  // ─── Get current user's rank ───────────────────────────────────────────────
  myRank: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [me] = await db
      .select({ npPoints: users.npPoints })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!me) return null;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(sql`npPoints > ${me.npPoints}`);

    return {
      rank: Number(count) + 1,
      npPoints: me.npPoints,
    };
  }),

  // ─── Get task status for current user ─────────────────────────────────────
  getTaskStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const completedTasks = await db
      .select({
        taskType: userTasks.taskType,
        completedAt: userTasks.completedAt,
        npEarned: userTasks.npEarned,
      })
      .from(userTasks)
      .where(eq(userTasks.userId, ctx.user.id))
      .orderBy(desc(userTasks.completedAt));

    // Count completions per task type
    const completionCount: Record<string, number> = {};
    completedTasks.forEach((t) => {
      completionCount[t.taskType] = (completionCount[t.taskType] ?? 0) + 1;
    });

    return Object.entries(TASK_DEFINITIONS).map(([taskType, def]) => {
      const completed = completionCount[taskType] ?? 0;
      const isCompleted = completed >= def.maxCompletions;
      const lastCompleted = completedTasks.find((t) => t.taskType === taskType);
      return {
        taskType,
        label: def.label,
        description: def.description,
        npReward: def.npReward,
        maxCompletions: def.maxCompletions,
        completions: completed,
        isCompleted,
        lastCompletedAt: lastCompleted?.completedAt ?? null,
        totalEarned: completedTasks
          .filter((t) => t.taskType === taskType)
          .reduce((s, t) => s + t.npEarned, 0),
      };
    });
  }),

  // ─── Complete a task ───────────────────────────────────────────────────────
  completeTask: protectedProcedure
    .input(z.object({ taskType: z.string().max(50) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const def = TASK_DEFINITIONS[input.taskType];
      if (!def) throw new Error("Unknown task type");

      return _completeTask(ctx.user.id, input.taskType, db);
    }),

  // ─── Get user stats (posts count, tasks completed, rank) ───────────────────────────
  // ─── Search users ─────────────────────────────────────────────────────────
  // 纯数字 query → 按唯一 ID 精确查找（移动端好友搜索走这条：用户名可重复，ID 唯一）
  // 非数字 query → 按昵称/用户名模糊匹配（保留给 Web 端等按名字搜人的入口）
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const raw = input.query.trim();
      if (!raw) return [];

      const cols = {
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        bio: users.bio,
      };

      // 纯数字：按唯一 ID 精确查找
      if (/^\d+$/.test(raw)) {
        const idNum = Number(raw);
        if (!Number.isSafeInteger(idNum) || idNum <= 0) return [];
        const rows = await db
          .select(cols)
          .from(users)
          .where(and(ne(users.id, ctx.user.id), eq(users.id, idNum)))
          .limit(1);
        return rows.map(u => ({
          id: u.id,
          name: u.name ?? u.username ?? `User #${u.id}`,
          username: u.username,
          avatar: u.avatar,
          bio: u.bio,
        }));
      }

      // 非数字：按昵称/用户名模糊匹配
      const q = `%${raw}%`;
      const rows = await db
        .select(cols)
        .from(users)
        .where(and(ne(users.id, ctx.user.id), or(like(users.name, q), like(users.username, q))))
        .limit(20);
      return rows.map(u => ({
        id: u.id,
        name: u.name ?? u.username ?? `User #${u.id}`,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
      }));
    }),

  // ─── Invite leaderboard (by referral count) ────────────────────────────
  inviteLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 50;
      const rows = await db
        .select({
          referrerId: referrals.referrerId,
          cnt: count(),
        })
        .from(referrals)
        .where(eq(referrals.status, "active"))
        .groupBy(referrals.referrerId)
        .orderBy(desc(count()))
        .limit(limit);

      if (rows.length === 0) return [];

      // Fetch user info for these referrers
      const userIds = rows.map(r => r.referrerId);
      const userRows = await db
        .select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

      const userMap = new Map(userRows.map(u => [u.id, u]));
      return rows.map((r, idx) => {
        const u = userMap.get(r.referrerId);
        return {
          rank: idx + 1,
          displayName: u?.name ?? u?.username ?? `User #${r.referrerId}`,
          avatar: u?.avatar ?? "👤",
          inviteCount: r.cnt,
        };
      });
    }),

  // ─── Profit leaderboard (by closed position count as proxy) ────────────
  profitLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 50;
      // Count closed positions per user as a proxy for trading activity
      const rows = await db
        .select({
          userId: tradingPositions.userId,
          tradeCount: count(),
        })
        .from(tradingPositions)
        .where(eq(tradingPositions.status, "closed"))
        .groupBy(tradingPositions.userId)
        .orderBy(desc(count()))
        .limit(limit);

      if (rows.length === 0) return [];

      const userIds = rows.map(r => r.userId);
      const userRows = await db
        .select({ id: users.id, name: users.name, username: users.username, avatar: users.avatar })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

      const userMap = new Map(userRows.map(u => [u.id, u]));
      return rows.map((r, idx) => {
        const u = userMap.get(r.userId);
        return {
          rank: idx + 1,
          displayName: u?.name ?? u?.username ?? `User #${r.userId}`,
          avatar: u?.avatar ?? "👤",
          tradeCount: r.tradeCount,
        };
      });
    }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Count posts by this user
    const [postCountRow] = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, ctx.user.id));

    // Count completed tasks
    const [taskCountRow] = await db
      .select({ count: count() })
      .from(userTasks)
      .where(eq(userTasks.userId, ctx.user.id));

    // Get user's NP points
    const [userRow] = await db
      .select({ npPoints: users.npPoints })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    // Calculate rank (users with more NP points + 1)
    const [rankRow] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`npPoints > ${userRow?.npPoints ?? 0}`);

    return {
      postCount: postCountRow?.count ?? 0,
      taskCount: taskCountRow?.count ?? 0,
      npPoints: userRow?.npPoints ?? 0,
      rank: (rankRow?.count ?? 0) + 1,
    };
  }),
});

// ─── Internal helper ──────────────────────────────────────────────────────────
async function _completeTask(
  userId: number,
  taskType: string,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{ success: boolean; npEarned: number; alreadyCompleted: boolean }> {
  const def = TASK_DEFINITIONS[taskType];
  if (!def) return { success: false, npEarned: 0, alreadyCompleted: false };

  // Check existing completions
  const existing = await db
    .select({ id: userTasks.id })
    .from(userTasks)
    .where(and(eq(userTasks.userId, userId), eq(userTasks.taskType, taskType)));

  if (existing.length >= def.maxCompletions) {
    return { success: false, npEarned: 0, alreadyCompleted: true };
  }

  // For daily_login, check if already completed today
  if (taskType === "daily_login") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompletion = await db
      .select({ id: userTasks.id })
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.taskType, taskType),
          gte(userTasks.completedAt, today)
        )
      )
      .limit(1);

    if (todayCompletion.length > 0) {
      return { success: false, npEarned: 0, alreadyCompleted: true };
    }
  }

  // Record task completion
  await db.insert(userTasks).values({
    userId,
    taskType,
    npEarned: def.npReward,
  });

  // Add NP points to user
  await db
    .update(users)
    .set({ npPoints: sql`npPoints + ${def.npReward}` })
    .where(eq(users.id, userId));

  return { success: true, npEarned: def.npReward, alreadyCompleted: false };
}
