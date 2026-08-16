import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { referrals, users } from "../../drizzle/schema";
import { eq, and, or, desc, count, sql } from "drizzle-orm";
import { ensureInviteCode, normalizeInviteCode } from "../utils/inviteCode";
import { ENV } from "../_core/env";

// ─── Reward constants ────────────────────────────────────────────────────────
// 按 AC 模型 v3.1 里程碑设计：注册激活档邀请人只给小奖(100)，大头留给后续
// 高价值里程碑(开会员+800/+2000、建群+500 等，见 referralRewards.ts)，降低小号互绑套利动力。
const REFERRER_REWARD = 100; // AC for inviter
const INVITEE_REWARD = 200;  // AC for invitee

// ─── Milestone tiers ─────────────────────────────────────────────────────────
const REWARD_TIERS = [
  { count: 5, reward: "500 AC Bonus", icon: "🎁" },
  { count: 10, reward: "Exclusive Badge", icon: "🏅" },
  { count: 25, reward: "1% Fee Rebate", icon: "💰" },
  { count: 50, reward: "VIP Status", icon: "👑" },
  { count: 100, reward: "Revenue Share", icon: "💎" },
];

export const referralRouter = router({
  // ─── Get invite stats + code ──────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { inviteCode: "", inviteLink: "", totalInvited: 0, activeInvited: 0, totalRewards: 0, tiers: [] };

    const userId = ctx.user!.id;
    const userName = ctx.user!.name ?? "USER";
    // Persist the code so it can be reverse-looked-up in recordReferral, and so the
    // displayed code always matches what's stored (e.g. after a rename).
    const inviteCode = await ensureInviteCode(db, userId, userName);

    // Count referrals
    const [totalResult] = await db
      .select({ cnt: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    const [activeResult] = await db
      .select({ cnt: count() })
      .from(referrals)
      .where(and(eq(referrals.referrerId, userId), eq(referrals.status, "active")));

    const [rewardResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${referrals.referrerReward}), 0)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    const totalInvited = totalResult?.cnt ?? 0;
    const activeInvited = activeResult?.cnt ?? 0;
    const totalRewards = rewardResult?.total ?? 0;

    // Compute tier unlock status
    const tiers = REWARD_TIERS.map((tier) => ({
      ...tier,
      unlocked: activeInvited >= tier.count,
    }));

    return {
      inviteCode,
      inviteLink: `${ENV.publicOrigin}/i/${inviteCode}`, // 别用 req Host:CF→Cloud Run 下是被墙的 *.run.app
      totalInvited,
      activeInvited,
      totalRewards,
      tiers,
    };
  }),

  // ─── List invited friends ─────────────────────────────────────────────────
  listReferrals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;
    const rows = await db
      .select({
        id: referrals.id,
        inviteeId: referrals.inviteeId,
        status: referrals.status,
        referrerReward: referrals.referrerReward,
        createdAt: referrals.createdAt,
        activatedAt: referrals.activatedAt,
        inviteeName: users.name,
        inviteeAvatar: users.avatar,
        inviteeUsername: users.username,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.inviteeId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt))
      .limit(100);

    return rows.map((r) => ({
      id: String(r.id),
      name: r.inviteeUsername || r.inviteeName || `User #${r.inviteeId}`,
      avatar: r.inviteeAvatar || (r.inviteeName?.charAt(0).toUpperCase() ?? "?"),
      status: r.status as "pending" | "active",
      reward: r.referrerReward,
      joinedAt: r.createdAt,
      activatedAt: r.activatedAt,
    }));
  }),

  // ─── 我的绑定状态（是否已被邀请 + 邀请人是谁）────────────────────────────────
  bindStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { bound: false };
    const [r] = await db
      .select({ referrerId: referrals.referrerId })
      .from(referrals).where(eq(referrals.inviteeId, ctx.user!.id)).limit(1);
    if (!r) return { bound: false };
    const [ref] = await db
      .select({ name: users.name, username: users.username })
      .from(users).where(eq(users.id, r.referrerId)).limit(1);
    return { bound: true, referrerName: ref?.name ?? ref?.username ?? `用户 #${r.referrerId}` };
  }),

  // ─── Record a referral (called when invitee signs up with code) ───────────
  recordReferral: protectedProcedure
    .input(z.object({ inviteCode: z.string().max(30) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, message: "Database unavailable" };

      const inviteeId = ctx.user!.id;

      // Check if this user was already referred
      const [existing] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.inviteeId, inviteeId))
        .limit(1);

      if (existing) return { success: false, message: "Already referred" };

      // Direct indexed lookup by stored invite code (O(1), no full-table scan / 10k cap).
      // 输入容错:新码去横线/空格+大写(AI7KQ2);同时保留原样匹配旧存量码 NEXUS-XXXXXX-YYYY(含横线)。
      const norm = normalizeInviteCode(input.inviteCode);
      const rawUpper = input.inviteCode.trim().toUpperCase();
      const [referrer] = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.inviteCode, norm), eq(users.inviteCode, rawUpper)))
        .limit(1);

      if (!referrer) return { success: false, message: "Invalid invite code" };
      if (referrer.id === inviteeId) return { success: false, message: "Cannot invite yourself" };

      // 防多号撸AC（设备维度两条规则）：
      // 1) 同设备的两个账号禁止互绑（自己小号绑自己）；
      // 2) 同一设备最多 3 个账号能建立邀请关系（防一台设备换号无限绑）。
      {
        const [pair] = await db
          .select({ a: users.deviceId })
          .from(users).where(eq(users.id, inviteeId)).limit(1);
        const [refDev] = await db
          .select({ b: users.deviceId })
          .from(users).where(eq(users.id, referrer.id)).limit(1);
        if (pair?.a && refDev?.b && pair.a === refDev.b) {
          return { success: false, message: "Cannot bind same-device account" };
        }
        if (pair?.a) {
          const [{ c: boundCount = 0 } = { c: 0 }] = await db
            .select({ c: count() })
            .from(referrals)
            .innerJoin(users, eq(referrals.inviteeId, users.id))
            .where(and(eq(users.deviceId, pair.a), eq(referrals.status, "active")));
          if (Number(boundCount) >= 3) {
            return { success: false, message: "Device referral limit reached" };
          }
        }
      }

      // 防成环：沿"邀请人"的祖先链上溯（≤100 层），若发现自己 → A↔B 互绑或更深的环，拒绝。
      // 成环会让环内成员互相累积价值分刷段位。
      {
        const refRows = await db
          .select({ inviteeId: referrals.inviteeId, referrerId: referrals.referrerId })
          .from(referrals).where(eq(referrals.status, "active"));
        const parentOf = new Map<number, number>();
        for (const r of refRows) if (!parentOf.has(r.inviteeId)) parentOf.set(r.inviteeId, r.referrerId);
        let cur: number | undefined = referrer.id;
        for (let depth = 0; cur !== undefined && depth < 100; depth++) {
          if (cur === inviteeId) return { success: false, message: "Cannot bind your own downline" };
          cur = parentOf.get(cur);
        }
      }

      // Create referral record + award AC to both atomically, so a partial failure
      // can't leave a referral without its rewards (or one side rewarded but not the other).
      // 并发双铸防护:上面事务外的 existing 检查是 TOCTOU——同一 invitee 的 N 个并发请求会全部
      // 通过检查、全部插入、全部发奖(100·N / 200·N AC,可经 TGE 变现)。这里在事务内锁 invitee
      // 用户行串行化,并在锁内重查 referrals,已存在则中止,保证每人只能被邀请一次。
      const outcome = await db.transaction(async (tx) => {
        // 锁 invitee 用户行:同一 invitee 的并发 recordReferral 在此排队串行
        await tx.select({ id: users.id }).from(users).where(eq(users.id, inviteeId)).for("update").limit(1);
        // 锁内重查:已被邀请则中止(双铸的第二+条请求走这里)
        const [dup] = await tx.select({ id: referrals.id }).from(referrals).where(eq(referrals.inviteeId, inviteeId)).limit(1);
        if (dup) return "dup" as const;
        await tx.insert(referrals).values({
          referrerId: referrer.id,
          inviteeId,
          status: "active",
          referrerReward: REFERRER_REWARD,
          inviteeReward: INVITEE_REWARD,
          activatedAt: new Date(),
        });
        await tx
          .update(users)
          .set({ npPoints: sql`${users.npPoints} + ${REFERRER_REWARD}` })
          .where(eq(users.id, referrer.id));
        await tx
          .update(users)
          .set({ npPoints: sql`${users.npPoints} + ${INVITEE_REWARD}` })
          .where(eq(users.id, inviteeId));
        return "ok" as const;
      });

      if (outcome === "dup") return { success: false, message: "Already referred" };
      return { success: true, message: `Referral recorded! You earned ${INVITEE_REWARD} IT` };
    }),
});
