import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userTasks, posts, referrals, tradingPositions, appConfig, contentViolations, userDailyNp, feedback } from "../../drizzle/schema";
import { eq, desc, sql, and, gte, count, ne, inArray } from "drizzle-orm";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// 读取任务奖励覆盖（app_config.taskRewards JSON）
async function getTaskRewardOverrides(db: Db): Promise<Record<string, number>> {
  try {
    const [row] = await db.select({ tr: appConfig.taskRewards }).from(appConfig).where(eq(appConfig.platform, "all")).limit(1);
    if (row?.tr) {
      const o = JSON.parse(row.tr);
      if (o && typeof o === "object") return o as Record<string, number>;
    }
  } catch {
    // 用默认
  }
  return {};
}
import { storagePut } from "../storage";
import { sanitizeInput, sanitizeUsername } from "../utils/sanitize";
import { RANK_TIERS, tierBonus, tierDaily, reputationBonus, runRankAggregation } from "../rankEngine";
import { isReferralBound } from "../referralRewards";

/** C 折中：这些"高价值任务"需先绑定邀请人才发 AC（基础任务不受限）。 */
const REQUIRES_BINDING = new Set(["first_research", "research_daily"]);

// ─── AC 产出：每日上限 + 连续签到 + 统一发放（防刷地基）─────────────────────────
/** UTC 日期 YYYY-MM-DD */
function ymdUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
/** 当天 UTC 00:00 的 Date */
function startOfUtcDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}
/** 每日 AC 产出上限（号龄分级，防刷）：新号 <7 天 200/天，否则 2000/天 */
export function dailyNpCap(createdAt: Date | string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return ageDays < 7 ? 200 : 2000;
}
/** 连续签到奖励：第 1 天 10，逐日递增，约连签 7 天封顶 80 */
export function signinStreakReward(streak: number): number {
  return Math.min(80, 10 + Math.max(0, streak - 1) * 12);
}
/**
 * 在事务内发放 AC，capped=true 时受每日产出上限约束（按号龄分级，封顶削减）。
 * 返回实际发放额（可能小于 amount）。一次性里程碑任务用 capped=false 不受限。
 */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/**
 * 在事务内发放 AC。capped=true（每日可重复任务）时：
 *  - base 受每日产出上限约束（号龄分级），仅 base 计入每日台账；
 *  - 段位加成 + 声誉加成只乘 base，额外部分一并入账（不再计入上限，体现"加成另算"）。
 * capped=false（一次性里程碑）：原额发放，不受上限、不加段位倍率。
 * 返回最终入账的 AC 总额。
 */
async function creditNp(
  tx: Tx, userId: number, amount: number, capped: boolean,
): Promise<number> {
  if (amount <= 0) return 0;
  let base = amount;
  let total = amount;
  if (capped) {
    const [u] = await tx
      .select({ createdAt: users.createdAt, rankTier: users.rankTier, reputation: users.reputation, deviceId: users.deviceId })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return 0;
    const cap = dailyNpCap(u.createdAt);
    const ymd = ymdUtc();
    // 防多号撸AC：同一设备每天最多 3 个账号正常发放 AC，第 4 个起当日不发
    if (u.deviceId) {
      const [{ c: otherEarners = 0 } = { c: 0 }] = await tx
        .select({ c: sql<number>`COUNT(DISTINCT ${userDailyNp.userId})` })
        .from(userDailyNp)
        .innerJoin(users, eq(userDailyNp.userId, users.id))
        .where(and(
          eq(users.deviceId, u.deviceId),
          eq(userDailyNp.ymd, ymd),
          gte(userDailyNp.earned, 1),
          sql`${userDailyNp.userId} != ${userId}`,
        ));
      if (Number(otherEarners) >= 3) return 0;
    }
    // 先确保当日台账行存在，再 FOR UPDATE 加行锁 → 串行化并发，严格不超每日上限
    await tx.insert(userDailyNp).values({ userId, ymd, earned: 0 })
      .onDuplicateKeyUpdate({ set: { earned: sql`earned` } });
    const [row] = await tx.select({ earned: userDailyNp.earned }).from(userDailyNp)
      .where(and(eq(userDailyNp.userId, userId), eq(userDailyNp.ymd, ymd))).for("update").limit(1);
    const earned = row?.earned ?? 0;
    base = Math.min(amount, Math.max(0, cap - earned));
    if (base <= 0) return 0;
    // 仅 base 计入每日上限台账（行锁内更新，确定值不会超 cap）
    await tx.update(userDailyNp).set({ earned: earned + base })
      .where(and(eq(userDailyNp.userId, userId), eq(userDailyNp.ymd, ymd)));
    // 段位加成 + 声誉加成，只乘 base
    const mult = 1 + tierBonus(u.rankTier ?? 0) + reputationBonus(u.reputation ?? 0);
    total = Math.round(base * mult);
  }
  await tx.update(users).set({ npPoints: sql`npPoints + ${total}` }).where(eq(users.id, userId));
  return total;
}

// ─── Task definitions ─────────────────────────────────────────────────────────
// daily?: 每日可完成次数（设置后为"每日可重复任务"，发放受每日产出上限约束）。
// 不设 daily 的为一次性里程碑任务，受 maxCompletions 限制、不受每日上限约束。
// eventOnly: 仅服务端事件触发（真实发帖/获赞等），禁止客户端 completeTask 认领，防白嫖。
export const TASK_DEFINITIONS: Record<
  string,
  { label: string; description: string; npReward: number; maxCompletions: number; daily?: number; eventOnly?: boolean }
> = {
  connect_wallet: {
    label: "连接钱包",
    description: "首次连接 BSC 钱包",
    npReward: 50,
    maxCompletions: 1,
    eventOnly: true,
  },
  complete_profile: {
    label: "完善资料",
    description: "填写头像、昵称和 Bio",
    npReward: 100,
    maxCompletions: 1,
    eventOnly: true,
  },
  first_post: {
    label: "发布第一条动态",
    description: "在 Discover 发布你的第一条动态",
    npReward: 100,
    maxCompletions: 1,
    eventOnly: true,
  },
  first_message: {
    label: "发送第一条消息",
    description: "在 Chat 发送你的第一条消息",
    npReward: 50,
    maxCompletions: 1,
    eventOnly: true,
  },
  first_research: {
    label: "生成 AI 分析报告",
    description: "使用 AI 生成一份代币分析报告（需先绑定邀请人）",
    npReward: 200,
    maxCompletions: 1,
    eventOnly: true,
  },
  daily_login: {
    label: "每日签到",
    description: "每天签到，连续签到奖励递增（封顶 80 AC）",
    npReward: 10,
    maxCompletions: 999999,
    daily: 1,
  },
  // 邀请好友奖励不走任务中心：绑定时邀请人 +100(referral.ts)，
  // 高价值里程碑(开会员/建群等)另发(referralRewards.ts)，避免与任务奖叠加。
  // ── 每日可重复任务（产出受每日上限约束；仅服务端事件触发，eventOnly）──
  post_daily: {
    label: "发布动态",
    description: "在广场发布优质动态（每日 3 次）",
    npReward: 30,
    maxCompletions: 999999,
    daily: 3,
    eventOnly: true,
  },
  like_received: {
    label: "内容获赞",
    description: "你的内容被点赞（每日 20 次）",
    npReward: 5,
    maxCompletions: 999999,
    daily: 20,
    eventOnly: true,
  },
  comment_made: {
    label: "有效评论",
    description: "发表有价值的评论（每日 10 次）",
    npReward: 10,
    maxCompletions: 999999,
    daily: 10,
    eventOnly: true,
  },
  research_daily: {
    label: "AI 分析报告",
    description: "生成 AI 分析报告（每日 3 次，需先绑定邀请人）",
    npReward: 50,
    maxCompletions: 999999,
    daily: 3,
    eventOnly: true,
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
      const raw = Buffer.from(fileData, "base64");
      if (raw.length > 4 * 1024 * 1024) {
        throw new Error("头像图片不能超过 4MB");
      }
      // 头像缩到 ≤512，足够清晰且体积很小
      const { downscaleImage } = await import("../utils/image");
      const { buffer, mime } = await downscaleImage(raw, 512, 85, mimeType);
      const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const key = `avatars/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
      const { url } = await storagePut(key, buffer, mime);

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

      return rows.map((u, idx) => {
        // walletAddress 只用来算 shortAddress,不能经 ...u 泄漏完整地址给匿名调用者(publicProcedure)
        const { walletAddress, ...pub } = u;
        return {
          ...pub,
          rank: idx + 1,
          displayName: pub.name ?? pub.username ?? `User #${u.id}`,
          shortAddress: walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : null,
        };
      });
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
  // ─── 管理员：用户封禁 ─────────────────────────────────────────────
  adminGetUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [u] = await db
        .select({ id: users.id, name: users.name, username: users.username, role: users.role, isBanned: users.isBanned, npPoints: users.npPoints })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      return u ?? null;
    }),

  setBanned: adminProcedure
    .input(z.object({ userId: z.number(), banned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能封禁自己" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      // 保护:封禁前查目标角色,禁封管理员/机器人(防单个 admin 互封/封 owner 自锁群、封机器人打断运营;
      // 与清零工具"保留管理员+机器人"的护栏一致)。服务端权威——原来仅客户端 disabled,直连 API 可绕过。
      if (input.banned) {
        const [target] = await db.select({ role: users.role, isBot: users.isBot }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (target.role === "admin" || target.isBot) throw new TRPCError({ code: "FORBIDDEN", message: "不能封禁管理员或系统机器人" });
      }
      await db.update(users).set({ isBanned: input.banned }).where(eq(users.id, input.userId));
      // 解封 = 违规记录清零重新开始:否则 30 天窗口内旧记录仍 ≥ 阈值,
      // 解封后哪怕再被误判一次就瞬间二次封号(2026-07-12 误封事故的善后补丁)
      if (!input.banned) {
        try {
          await db.delete(contentViolations).where(eq(contentViolations.userId, input.userId));
        } catch { /* 清理失败不影响解封本身 */ }
      }
      return { success: true, banned: input.banned };
    }),

  // ─── 管理员：内容违规记录（毒品/赌博/贩卖 等拦截记录，供审查封号）──────────
  adminListViolations: adminProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: contentViolations.id,
          userId: contentViolations.userId,
          category: contentViolations.category,
          source: contentViolations.source,
          snippet: contentViolations.snippet,
          createdAt: contentViolations.createdAt,
          userName: users.name,
          isBanned: users.isBanned,
        })
        .from(contentViolations)
        .leftJoin(users, eq(users.id, contentViolations.userId))
        .where(input?.userId ? eq(contentViolations.userId, input.userId) : undefined)
        .orderBy(desc(contentViolations.createdAt))
        .limit(100);
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
      defaultReward: def.npReward,
    }));
  }),

  setTaskRewards: adminProcedure
    .input(z.object({ rewards: z.record(z.string(), z.number().int().min(0).max(100000)) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(input.rewards)) {
        if (TASK_DEFINITIONS[k] && Number.isFinite(v)) clean[k] = v;
      }
      const json = JSON.stringify(clean);
      const existing = await db.select({ id: appConfig.id }).from(appConfig).where(eq(appConfig.platform, "all")).limit(1);
      if (existing.length > 0) {
        await db.update(appConfig).set({ taskRewards: json }).where(eq(appConfig.platform, "all"));
      } else {
        await db.insert(appConfig).values({ platform: "all", taskRewards: json });
      }
      return { success: true };
    }),

  getTaskStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rewardOverrides = await getTaskRewardOverrides(db);

    const completedTasks = await db
      .select({
        taskType: userTasks.taskType,
        completedAt: userTasks.completedAt,
        npEarned: userTasks.npEarned,
      })
      .from(userTasks)
      .where(eq(userTasks.userId, ctx.user.id))
      .orderBy(desc(userTasks.completedAt));

    // Count completions per task type (lifetime + today, UTC)
    const completionCount: Record<string, number> = {};
    const todayCount: Record<string, number> = {};
    const todayStart = startOfUtcDay(ymdUtc());
    completedTasks.forEach((t) => {
      completionCount[t.taskType] = (completionCount[t.taskType] ?? 0) + 1;
      if (t.completedAt && new Date(t.completedAt) >= todayStart) {
        todayCount[t.taskType] = (todayCount[t.taskType] ?? 0) + 1;
      }
    });

    return Object.entries(TASK_DEFINITIONS).map(([taskType, def]) => {
      const completed = completionCount[taskType] ?? 0;
      const todayDone = todayCount[taskType] ?? 0;
      const isDaily = typeof def.daily === "number";
      // 每日任务：今日次数用尽即"已完成"（次日重置）；一次性任务：看 maxCompletions
      const isCompleted = isDaily ? todayDone >= (def.daily as number) : completed >= def.maxCompletions;
      const lastCompleted = completedTasks.find((t) => t.taskType === taskType);
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
      // 事件型任务（发帖/获赞等）只能由服务端真实事件触发，禁止客户端认领
      if (def.eventOnly) throw new TRPCError({ code: "FORBIDDEN", message: "该任务由系统自动发放" });

      return _completeTask(ctx.user.id, input.taskType, db);
    }),

  // ─── 上报设备指纹（防多号撸AC；App 启动后调用）────────────────────────────────
  reportDevice: protectedProcedure
    .input(z.object({ deviceId: z.string().min(8).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      await db.update(users).set({ deviceId: input.deviceId.trim() }).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  // ─── 意见反馈（help.tsx 反馈表单的真实落库）─────────────────────────────────────
  submitFeedback: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(1000),
      contact: z.string().max(120).optional(),
      appVersion: z.string().max(24).optional(),
      platform: z.string().max(16).optional(),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const content = sanitizeInput(input.content, 1000).trim();
      if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "反馈内容不能为空" });
      await db.insert(feedback).values({
        userId: ctx.user.id,
        content,
        contact: input.contact ? sanitizeInput(input.contact, 120) : null,
        appVersion: input.appVersion ? sanitizeInput(input.appVersion, 24) : null,
        platform: input.platform ? sanitizeInput(input.platform, 16) : null,
      });
      return { ok: true };
    }),

  adminListFeedback: adminProcedure
    .input(z.object({ status: z.enum(["new", "read", "resolved"]).optional(), limit: z.number().min(1).max(200).default(100) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conds = input?.status ? [eq(feedback.status, input.status)] : [];
      return db.select().from(feedback)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(feedback.createdAt))
        .limit(input?.limit ?? 100);
    }),

  adminSetFeedbackStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["new", "read", "resolved"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(feedback).set({ status: input.status }).where(eq(feedback.id, input.id));
      return { ok: true };
    }),

  // ─── 段位状态（累积价值分 / 当前段位 / 加成 / 日俸 / 下一段进度 / 我的网体）──────
  getRankStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [u] = await db
      .select({ score: users.rankScore, tier: users.rankTier, reputation: users.reputation })
      .from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const score = u?.score ?? 0;
    const tier = u?.tier ?? 0;
    const next = tier < RANK_TIERS.length ? RANK_TIERS[tier] : null; // 下一段（tier 为 0..10）

    // 我的网体：沿 active 邀请关系向下 BFS（无限层级，安全上限 5 万节点）
    const refRows = await db
      .select({ inviteeId: referrals.inviteeId, referrerId: referrals.referrerId })
      .from(referrals).where(eq(referrals.status, "active"));
    const children = new Map<number, number[]>();
    for (const r of refRows) {
      if (!children.has(r.referrerId)) children.set(r.referrerId, []);
      children.get(r.referrerId)!.push(r.inviteeId);
    }
    const team: number[] = [];
    const seen = new Set<number>([ctx.user.id]);
    let frontier = children.get(ctx.user.id) ?? [];
    let directCount = frontier.length;
    while (frontier.length > 0 && team.length < 50_000) {
      const nextFrontier: number[] = [];
      for (const id of frontier) {
        if (seen.has(id)) continue;
        seen.add(id);
        team.push(id);
        for (const c of children.get(id) ?? []) nextFrontier.push(c);
      }
      frontier = nextFrontier;
    }
    // 网体今日活跃数（今天有任务产出的成员）
    let teamActiveToday = 0;
    if (team.length > 0) {
      const todayStart = startOfUtcDay(ymdUtc());
      const batch = team.slice(0, 10_000); // 安全上限
      const [{ c: activeC = 0 } = { c: 0 }] = await db
        .select({ c: sql<number>`COUNT(DISTINCT ${userTasks.userId})` })
        .from(userTasks)
        .where(and(inArray(userTasks.userId, batch), gte(userTasks.completedAt, todayStart)));
      teamActiveToday = Number(activeC);
    }
    return {
      score,
      tier,
      tierName: tier >= 1 ? RANK_TIERS[tier - 1].name : "无段位",
      bonusPct: Math.round(tierBonus(tier) * 100),
      reputationBonusPct: Math.round(reputationBonus(u?.reputation ?? 0) * 100),
      dailyBonus: tierDaily(tier),
      nextTierName: next?.name ?? null,
      nextTierAt: next?.min ?? null,
      // 我的网体仪表盘
      teamSize: team.length,
      teamDirect: directCount,
      teamActiveToday,
      tiers: RANK_TIERS.map((t, i) => ({ idx: i + 1, name: t.name, min: t.min, bonusPct: Math.round(t.bonus * 100), daily: t.daily })),
    };
  }),

  // ─── 管理员：手动触发某日段位聚合（测试/补算用；幂等）────────────────────────────
  adminRunRankAgg: adminProcedure
    .input(z.object({ ymd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return runRankAggregation(db, input.ymd);
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

      // 仅允许 ID 精确搜索（用户名/昵称不可被搜索，保护隐私）
      if (!/^\d+$/.test(raw)) return [];
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

    // Get user's AC points
    const [userRow] = await db
      .select({ npPoints: users.npPoints })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    // Calculate rank (users with more AC points + 1)
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

  // C 折中：高价值任务需先绑定邀请人才发 AC（基础任务不受限；报告等功能仍可正常使用）
  if (REQUIRES_BINDING.has(taskType) && !(await isReferralBound(db, userId))) {
    return { success: false, npEarned: 0, alreadyCompleted: false };
  }

  const overrides = await getTaskRewardOverrides(db);
  let reward = Number.isFinite(overrides[taskType]) ? overrides[taskType] : def.npReward;

  const isDaily = typeof def.daily === "number";
  const capped = isDaily; // 每日/签到受每日产出上限约束；一次性里程碑不受限
  let granted = 0;
  let blocked = false;
  // 全程一个事务 + 锁用户行:并发同任务调用串行化,频次校验与写入原子,杜绝并发双领
  await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update").limit(1); // 行锁:串行化本用户
    // 频次校验(拿锁后,事务内)
    if (isDaily) {
      const todayStart = startOfUtcDay(ymdUtc());
      const [{ c: todayCount } = { c: 0 }] = await tx
        .select({ c: count() }).from(userTasks)
        .where(and(eq(userTasks.userId, userId), eq(userTasks.taskType, taskType), gte(userTasks.completedAt, todayStart)));
      if (Number(todayCount) >= (def.daily as number)) { blocked = true; return; }
    } else {
      const existing = await tx
        .select({ id: userTasks.id }).from(userTasks)
        .where(and(eq(userTasks.userId, userId), eq(userTasks.taskType, taskType)));
      if (existing.length >= def.maxCompletions) { blocked = true; return; }
    }
    // 连续签到:拿锁后读改一致,奖励递增封顶
    if (taskType === "daily_login") {
      const [u] = await tx
        .select({ streak: users.signinStreak, last: users.lastSigninYmd })
        .from(users).where(eq(users.id, userId)).limit(1);
      const yesterday = ymdUtc(new Date(Date.now() - 86_400_000));
      const newStreak = u?.last === yesterday ? (u.streak ?? 0) + 1 : 1;
      reward = signinStreakReward(newStreak);
      await tx.update(users).set({ signinStreak: newStreak, lastSigninYmd: ymdUtc() }).where(eq(users.id, userId));
    }
    granted = await creditNp(tx, userId, reward, capped);
    await tx.insert(userTasks).values({ userId, taskType, npEarned: granted });
  });
  if (blocked) return { success: false, npEarned: 0, alreadyCompleted: true };
  return { success: true, npEarned: granted, alreadyCompleted: false };
}

/**
 * 服务端事件触发任务发放（供 posts / ai 等 router 调用）。
 * fire-and-forget 用：失败不影响主流程。eventOnly 任务的唯一合法入口。
 */
export async function awardTaskEvent(db: Db, userId: number, taskType: string): Promise<void> {
  try {
    await _completeTask(userId, taskType, db);
  } catch {
    // 任务发放失败不阻断主流程
  }
}
