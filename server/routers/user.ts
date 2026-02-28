import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userTasks, posts } from "../../drizzle/schema";
import { eq, desc, sql, and, gte, count, like, or, ne } from "drizzle-orm";

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
    const result = await db
      .select()
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Partial<typeof users.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.username !== undefined) updateData.username = input.username;
      if (input.bio !== undefined) updateData.bio = input.bio;
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
    .input(z.object({ taskType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const def = TASK_DEFINITIONS[input.taskType];
      if (!def) throw new Error("Unknown task type");

      return _completeTask(ctx.user.id, input.taskType, db);
    }),

  // ─── Get user stats (posts count, tasks completed, rank) ───────────────────────────
  // ─── Search users by name or username ──────────────────────────────────────
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = `%${input.query.trim()}%`;
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          bio: users.bio,
        })
        .from(users)
        .where(
          and(
            ne(users.id, ctx.user.id),
            or(like(users.name, q), like(users.username, q))
          )
        )
        .limit(20);
      return rows.map(u => ({
        id: u.id,
        name: u.name ?? u.username ?? `User #${u.id}`,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
      }));
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
