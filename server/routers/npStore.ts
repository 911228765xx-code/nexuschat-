/**
 * NP 出口（NP 模型 Phase 4）：用 NP 兑换平台特权（不可提现 → 合规）。
 *  - 会员体验券：用 NP 换 3 天 Plus 体验（仅当前免费用户可换）。
 *  （动态置顶已有 NN 计价的 posts.promotePost；策展质押见 calls 路由，是 NP 主出口。）
 * 消耗直接扣 NP（销毁 → 控通胀），是 NP 的日常出口。
 */
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { effectiveTier } from "../membership";

const TRIAL_NP_COST = 3000;          // 会员体验券 NP
const TRIAL_DAYS = 3;

/** 原子条件扣 NP（余额不足抛错；防并发双花）。 */
async function spendNp(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, amount: number): Promise<void> {
  const res = await db.update(users)
    .set({ npPoints: sql`npPoints - ${amount}` })
    .where(and(eq(users.id, userId), gte(users.npPoints, amount)));
  const affected = (res as any)?.[0]?.affectedRows ?? (res as any)?.affectedRows ?? 0;
  if (affected < 1) throw new TRPCError({ code: "BAD_REQUEST", message: `NP 不足（需 ${amount}）` });
}

export const npStoreRouter = router({
  // ─── 会员体验券：3000 NP 换 3 天 Plus（仅免费用户）──────────────────────────────
  redeemMembershipTrial: protectedProcedure
    .use(rateLimitWrite)
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [u] = await db.select({ proTier: users.proTier, proUntil: users.proUntil }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null) !== "free") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "你已是会员，无需体验券" });
      }
      await spendNp(db, ctx.user.id, TRIAL_NP_COST);
      const proUntil = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);
      await db.update(users).set({ proTier: "plus", proUntil }).where(eq(users.id, ctx.user.id));
      return { ok: true, tier: "plus", proUntil: proUntil.toISOString(), cost: TRIAL_NP_COST };
    }),

  // ─── 出口价目（前端展示）────────────────────────────────────────────────────
  prices: protectedProcedure.query(() => ({
    membershipTrial: { cost: TRIAL_NP_COST, days: TRIAL_DAYS, tier: "plus" },
  })),
});
