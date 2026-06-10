/**
 * 裂变层奖励（NP 模型 Phase 2b）：
 *  - 邀请里程碑奖：被邀请人首次达成高价值动作（开会员/建群/…）→ 直接邀请人一次性 NP（幂等）。
 *  - 会员消费分成：被邀请人每次续费会员 → 直接邀请人持续 NP（仅 1 级，合法分销）。
 *
 * 合规：均只奖【直接邀请人】（1 级），不向上多级分润；奖励为不可提现 NP；
 *       里程碑奖一次性、消费分成挂真实付费，不与段位加成叠加（独立 NP 流）。
 */
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, referrals, referralMilestones } from "../drizzle/schema";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** 该用户是否已绑定邀请人（active 关系）。用于"高价值任务/出口需绑定"的门槛。 */
export async function isReferralBound(db: Db, userId: number): Promise<boolean> {
  const [r] = await db
    .select({ id: referrals.id }).from(referrals)
    .where(and(eq(referrals.inviteeId, userId), eq(referrals.status, "active"))).limit(1);
  return !!r;
}

/** 找 inviteeId 的直接邀请人（active 关系）；无则 null */
async function directReferrer(db: Db, inviteeId: number): Promise<number | null> {
  const [r] = await db
    .select({ referrerId: referrals.referrerId })
    .from(referrals)
    .where(and(eq(referrals.inviteeId, inviteeId), eq(referrals.status, "active")))
    .limit(1);
  return r?.referrerId ?? null;
}

/**
 * 一次性里程碑奖：被邀请人首次达成某里程碑 → 邀请人得 NP（每人每里程碑仅一次）。
 * fire-and-forget 调用，失败不影响主流程。
 */
export async function awardReferrerMilestone(
  db: Db, inviteeId: number, milestone: string, npAmount: number,
): Promise<void> {
  try {
    if (npAmount <= 0) return;
    const referrerId = await directReferrer(db, inviteeId);
    if (!referrerId || referrerId === inviteeId) return;
    // 幂等占位：唯一键冲突说明该里程碑已发放过
    try {
      await db.insert(referralMilestones).values({ inviteeId, milestone });
    } catch {
      return;
    }
    await db.update(users).set({ npPoints: sql`npPoints + ${npAmount}` }).where(eq(users.id, referrerId));
    logger.info({ inviteeId, referrerId, milestone, npAmount }, "referralRewards: 里程碑奖发放");
  } catch (err) {
    logger.warn({ err, milestone }, "referralRewards: 里程碑奖失败");
  }
}

/**
 * 会员消费分成（1 级，每次续费都发）：Plus +200 / Pro +500 NP 给直接邀请人。
 * fire-and-forget 调用。
 */
export async function awardMembershipShare(
  db: Db, inviteeId: number, tierKey: string,
): Promise<void> {
  try {
    const np = tierKey === "pro" ? 500 : tierKey === "plus" ? 200 : 0;
    if (np <= 0) return;
    const referrerId = await directReferrer(db, inviteeId);
    if (!referrerId || referrerId === inviteeId) return;
    await db.update(users).set({ npPoints: sql`npPoints + ${np}` }).where(eq(users.id, referrerId));
    logger.info({ inviteeId, referrerId, tierKey, np }, "referralRewards: 会员消费分成发放");
  } catch (err) {
    logger.warn({ err }, "referralRewards: 消费分成失败");
  }
}
