import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { referrals, users } from "../../drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

// ─── Reward constants ────────────────────────────────────────────────────────
const REFERRER_REWARD = 500; // NP for inviter
const INVITEE_REWARD = 200;  // NP for invitee

// ─── Milestone tiers ─────────────────────────────────────────────────────────
const REWARD_TIERS = [
  { count: 5, reward: "500 NP Bonus", icon: "🎁" },
  { count: 10, reward: "Exclusive Badge", icon: "🏅" },
  { count: 25, reward: "1% Fee Rebate", icon: "💰" },
  { count: 50, reward: "VIP Status", icon: "👑" },
  { count: 100, reward: "Revenue Share", icon: "💎" },
];

/**
 * Generate a deterministic invite code from user ID + name.
 * Format: NEXUS-XXXXXX-YYYY where X is from name, Y is user id hash.
 */
function generateInviteCode(userId: number, name: string): string {
  const namePart = (name || "USER").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, "X");
  const idHash = ((userId * 2654435761) >>> 0).toString(36).toUpperCase().slice(0, 4);
  return `NEXUS-${namePart}-${idHash}`;
}

export const referralRouter = router({
  // ─── Get invite stats + code ──────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { inviteCode: "", inviteLink: "", totalInvited: 0, activeInvited: 0, totalRewards: 0, tiers: [] };

    const userId = ctx.user!.id;
    const userName = ctx.user!.name ?? "USER";
    const inviteCode = generateInviteCode(userId, userName);

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
      inviteLink: `${ctx.req.protocol}://${ctx.req.get("host")}/invite/${inviteCode}`,
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

  // ─── Record a referral (called when invitee signs up with code) ───────────
  recordReferral: protectedProcedure
    .input(z.object({ inviteCode: z.string().max(30) }))
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

      // Find referrer by invite code pattern: NEXUS-XXXXXX-YYYY
      // We need to find the user whose generated code matches
      const allUsers = await db.select({ id: users.id, name: users.name }).from(users).limit(10000);
      const referrer = allUsers.find(
        (u: { id: number; name: string | null }) => generateInviteCode(u.id, u.name ?? "USER") === input.inviteCode
      );

      if (!referrer) return { success: false, message: "Invalid invite code" };
      if (referrer.id === inviteeId) return { success: false, message: "Cannot invite yourself" };

      // Create referral record
      await db!.insert(referrals).values({
        referrerId: referrer.id,
        inviteeId,
        status: "active",
        referrerReward: REFERRER_REWARD,
        inviteeReward: INVITEE_REWARD,
        activatedAt: new Date(),
      });

      // Award NP to both
      await db!
        .update(users)
        .set({ npPoints: sql`${users.npPoints} + ${REFERRER_REWARD}` })
        .where(eq(users.id, referrer.id));

      await db!
        .update(users)
        .set({ npPoints: sql`${users.npPoints} + ${INVITEE_REWARD}` })
        .where(eq(users.id, inviteeId));

      return { success: true, message: `Referral recorded! You earned ${INVITEE_REWARD} NP` };
    }),
});
