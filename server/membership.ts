/**
 * Pro 会员体系（订阅制，AI 计价）
 *
 * - 三档：free / plus / pro。特权：建群数、群人数上限、AI 每日免费额度、免广告、文件大小、徽章。
 * - 过期降级：proUntil 早于现在即视为 free。
 * - 会员费用 AI 扣减（回流金库），记入 AI 流水。
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
  maxVideoMB: number;       // 单视频大小上限（直传通道）
  adFree: boolean;          // 免广告
  badge: string | null;     // 资料页徽章
  publicGroups: boolean;    // 可创建公开群（发现社区可见）；free 仅私密群
  bannerSlot: boolean;      // 发现页滚动广告位投放权（Pro 专属）
  voiceRoomFreeMonthly: number; // 每月免费开「智能体语音房」次数；超出按 10 AI/次
}

export interface MembershipTier {
  key: ProTier;
  name: string;
  monthlyNN: number;        // 月费（AI），free=0
  color: string;
  tagline: string;
  benefits: TierBenefits;
  perks: string[];          // 展示用权益列表
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    key: "free", name: "免费用户", monthlyNN: 0, color: "#94A3B8", tagline: "基础社交体验",
    benefits: { maxGroups: 5, maxGroupMembers: 100, aiDailyFree: 0, maxFileMB: 60, maxVideoMB: 60, adFree: false, badge: null, publicGroups: false, bannerSlot: false, voiceRoomFreeMonthly: 0 },
    perks: ["建群上限 5 个（仅私密群）", "群人数上限 100", "AI 按次付费 10 AI/次", "智能体语音房 10 AI/次开房", "文件 ≤ 60MB", "视频 ≤ 60MB"],
  },
  {
    key: "plus", name: "会员 Plus", monthlyNN: 80, color: "#6366F1", tagline: "进阶社群运营",
    benefits: { maxGroups: 10, maxGroupMembers: 500, aiDailyFree: 3, maxFileMB: 100, maxVideoMB: 120, adFree: true, badge: "Plus", publicGroups: true, bannerSlot: false, voiceRoomFreeMonthly: 10 },
    perks: ["可创建公开群（发现社区曝光）", "建群上限 10 个", "群人数上限 500", "每日 3 次免费 AI（超出 10 AI/次）", "智能体语音房每月 10 次免费开房", "文件 ≤ 100MB", "视频 ≤ 120MB", "免广告", "Plus 专属徽章"],
  },
  {
    key: "pro", name: "高级会员 Pro", monthlyNN: 200, color: "#F59E0B", tagline: "专业玩家 / KOL",
    benefits: { maxGroups: 50, maxGroupMembers: 2000, aiDailyFree: 10, maxFileMB: 500, maxVideoMB: 250, adFree: true, badge: "Pro", publicGroups: true, bannerSlot: true, voiceRoomFreeMonthly: 20 },
    perks: ["发现页滚动广告位投放（Pro 专属）", "可创建公开群（发现社区曝光）", "建群上限 50 个", "群人数上限 2000", "每日 10 次免费 AI（超出 10 AI/次）", "智能体语音房每月 20 次免费开房", "文件 ≤ 500MB", "视频 ≤ 250MB", "免广告", "Pro 金色徽章", "AI 优先响应"],
  },
];

/** 订阅期限折扣：3 个月 8 折、12 个月 5 折 */
export const MEMBERSHIP_TERMS = [
  { months: 1, discount: 1, label: "1 个月" },
  { months: 3, discount: 0.8, label: "3 个月 · 8 折" },
  { months: 12, discount: 0.5, label: "12 个月 · 5 折" },
];
export function membershipCost(monthlyNN: number, months: number): number {
  const term = MEMBERSHIP_TERMS.find((t) => t.months === months);
  const discount = term?.discount ?? 1;
  return Math.ceil(monthlyNN * months * discount);
}

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
    terms: MEMBERSHIP_TERMS,
  };
}

/** 当前有效权益（用于后端各处限额校验） */
export async function getBenefits(db: Db, userId: number): Promise<TierBenefits> {
  const [u] = await db
    .select({ proTier: users.proTier, proUntil: users.proUntil })
    .from(users).where(eq(users.id, userId)).limit(1);
  return getTier(effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null)).benefits;
}

/** 开通/续费会员：扣 AI，叠加有效期。返回新状态。 */
export async function buyMembership(db: Db, userId: number, tierKey: ProTier, months: number) {
  const tier = getTier(tierKey);
  if (tier.key === "free" || tier.monthlyNN <= 0) throw new Error("invalid tier");
  const cost = membershipCost(tier.monthlyNN, months);

  // 并发双扣防护:原实现"扣费(原子) → 读 proUntil → 算 → 写 proUntil"非原子,两个并发请求
  // (双击/客户端重试)会各扣一次 AI(共 2×cost),却都读到同一旧 proUntil、都写 base+months →
  // last-write-wins 只延一次期 = 用户白扣一倍。这里事务包全流程 + 锁用户行串行化,扣费/读/续期
  // 都在锁内完成,并发被排队,proUntil 正确累积(不再丢失已扣的会期)。
  const proUntil = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    const ok = await spendNN(tx as unknown as Db, userId, cost, { type: "membership", refType: "user", refId: userId, memo: `${tier.key}x${months}` });
    if (!ok) throw new Error("insufficient_nn");
    const [u] = await tx.select({ proTier: users.proTier, proUntil: users.proUntil }).from(users).where(eq(users.id, userId)).limit(1);
    const curEff = effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null);
    // 续同档：在现有有效期上叠加；升档或过期：从现在起算
    const sameActiveTier = curEff === tierKey && u?.proUntil && u.proUntil.getTime() > Date.now();
    const base = sameActiveTier ? u!.proUntil!.getTime() : Date.now();
    const until = new Date(base + months * 30 * 24 * 3600 * 1000);
    await tx.update(users).set({ proTier: tierKey, proUntil: until }).where(eq(users.id, userId));
    return until;
  });

  // 裂变奖励：消费分成（每次续费）+ 首次开会员里程碑奖（一次性），给直接邀请人(事务外,失败不回滚主流程)
  void awardMembershipShare(db, userId, tierKey);
  void awardReferrerMilestone(db, userId, `membership_${tierKey}`, tierKey === "pro" ? 2000 : 800);

  return { tier: tierKey, proUntil: proUntil.toISOString() };
}
