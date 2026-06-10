/**
 * Pro 会员体系（订阅制，NN 计价）
 *
 * - 三档：free / plus / pro。特权：建群数、群人数上限、AI 每日免费额度、免广告、文件大小、徽章。
 * - 过期降级：proUntil 早于现在即视为 free。
 * - 会员费用 NN 扣减（回流金库），记入 NN 流水。
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { spendNN } from "./token";
import { awardMembershipShare, awardReferrerMilestone } from "./referralRewards";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type ProTier = "free" | "plus" | "pro";

export interface TierBenefits {
  maxGroups: number;        // 可创建群数量上限
  maxGroupMembers: number;  // 新建群默认人数上限
  aiDailyFree: number;      // 每日免费 AI 次数
  maxFileMB: number;        // 单文件大小上限
  adFree: boolean;          // 免广告
  badge: string | null;     // 资料页徽章
}

export interface MembershipTier {
  key: ProTier;
  name: string;
  monthlyNN: number;        // 月费（NN），free=0
  color: string;
  tagline: string;
  benefits: TierBenefits;
  perks: string[];          // 展示用权益列表
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    key: "free", name: "免费用户", monthlyNN: 0, color: "#94A3B8", tagline: "基础社交体验",
    benefits: { maxGroups: 3, maxGroupMembers: 200, aiDailyFree: 3, maxFileMB: 20, adFree: false, badge: null },
    perks: ["建群上限 3 个", "群人数上限 200", "每日 3 次免费 AI", "文件 ≤ 20MB"],
  },
  {
    key: "plus", name: "会员 Plus", monthlyNN: 99, color: "#6366F1", tagline: "进阶社群运营",
    benefits: { maxGroups: 10, maxGroupMembers: 500, aiDailyFree: 30, maxFileMB: 100, adFree: true, badge: "Plus" },
    perks: ["建群上限 10 个", "群人数上限 500", "每日 30 次免费 AI", "文件 ≤ 100MB", "免广告", "Plus 专属徽章"],
  },
  {
    key: "pro", name: "高级会员 Pro", monthlyNN: 299, color: "#F59E0B", tagline: "专业玩家 / KOL",
    benefits: { maxGroups: 50, maxGroupMembers: 2000, aiDailyFree: 200, maxFileMB: 500, adFree: true, badge: "Pro" },
    perks: ["建群上限 50 个", "群人数上限 2000", "每日 200 次免费 AI", "文件 ≤ 500MB", "免广告", "Pro 金色徽章", "AI 优先响应"],
  },
];

const tierByKey = new Map(MEMBERSHIP_TIERS.map((t) => [t.key, t]));
export function getTier(key: string): MembershipTier {
  return tierByKey.get(key as ProTier) ?? MEMBERSHIP_TIERS[0];
}

/** 计算用户当前有效等级（过期降级为 free） */
export function effectiveTier(proTier: string | null, proUntil: Date | null): ProTier {
  if (!proTier || proTier === "free") return "free";
  if (proUntil && proUntil.getTime() < Date.now()) return "free";
  return (proTier as ProTier) ?? "free";
}

/** 读取用户会员信息（含有效等级与权益） */
export async function getMembership(db: Db, userId: number) {
  const [u] = await db
    .select({ proTier: users.proTier, proUntil: users.proUntil, nn: users.nnBalance })
    .from(users).where(eq(users.id, userId)).limit(1);
  const eff = effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null);
  const tier = getTier(eff);
  const daysLeft = u?.proUntil ? Math.ceil((u.proUntil.getTime() - Date.now()) / (24 * 3600 * 1000)) : null;
  return {
    tier: eff,
    name: tier.name,
    benefits: tier.benefits,
    proUntil: u?.proUntil ? u.proUntil.toISOString() : null,
    daysLeft: eff === "free" ? null : daysLeft,
    nnBalance: Number(u?.nn ?? 0),
    tiers: MEMBERSHIP_TIERS,
  };
}

/** 当前有效权益（用于后端各处限额校验） */
export async function getBenefits(db: Db, userId: number): Promise<TierBenefits> {
  const [u] = await db
    .select({ proTier: users.proTier, proUntil: users.proUntil })
    .from(users).where(eq(users.id, userId)).limit(1);
  return getTier(effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null)).benefits;
}

/** 开通/续费会员：扣 NN，叠加有效期。返回新状态。 */
export async function buyMembership(db: Db, userId: number, tierKey: ProTier, months: number) {
  const tier = getTier(tierKey);
  if (tier.key === "free" || tier.monthlyNN <= 0) throw new Error("invalid tier");
  const cost = tier.monthlyNN * months;
  const ok = await spendNN(db, userId, cost, { type: "membership", refType: "user", refId: userId, memo: `${tier.key}x${months}` });
  if (!ok) throw new Error("insufficient_nn");

  const [u] = await db.select({ proTier: users.proTier, proUntil: users.proUntil }).from(users).where(eq(users.id, userId)).limit(1);
  const curEff = effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null);
  // 续同档：在现有有效期上叠加；升档或过期：从现在起算
  const sameActiveTier = curEff === tierKey && u?.proUntil && u.proUntil.getTime() > Date.now();
  const base = sameActiveTier ? u!.proUntil!.getTime() : Date.now();
  const proUntil = new Date(base + months * 30 * 24 * 3600 * 1000);
  await db.update(users).set({ proTier: tierKey, proUntil }).where(eq(users.id, userId));

  // 裂变奖励：消费分成（每次续费）+ 首次开会员里程碑奖（一次性），给直接邀请人
  void awardMembershipShare(db, userId, tierKey);
  void awardReferrerMilestone(db, userId, `membership_${tierKey}`, tierKey === "pro" ? 2000 : 800);

  return { tier: tierKey, proUntil: proUntil.toISOString() };
}
