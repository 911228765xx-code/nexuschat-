/**
 * AC 出口（AC 模型 Phase 4）：用 AC 兑换平台特权（不可提现 → 合规）。
 *  - 会员体验券：用 AC 换 3 天 Plus 体验（仅当前免费用户可换）。
 *  （动态置顶已有 AI 计价的 posts.promotePost；策展质押见 calls 路由，是 AC 主出口。）
 * 消耗直接扣 AC（销毁 → 控通胀），是 AC 的日常出口。
 */
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { effectiveTier } from "../membership";

const TRIAL_NP_COST = 3000;          // 会员体验券 AC
const TRIAL_DAYS = 3;

export const npStoreRouter = router({
  // ─── 会员体验券：3000 AC 换 3 天 Plus（仅免费用户）──────────────────────────────
  redeemMembershipTrial: protectedProcedure
    .use(rateLimitWrite)
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [u] = await db.select({ proTier: users.proTier, proUntil: users.proUntil }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (effectiveTier(u?.proTier ?? "free", u?.proUntil ?? null) !== "free") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "你已是会员，无需体验券" });
      }
      const proUntil = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);
      // 扣 AC + 开通体验放同一事务：开通失败则 AC 回滚，不白扣
      await db.transaction(async (tx) => {
        const res = await tx.update(users)
          .set({ npPoints: sql`npPoints - ${TRIAL_NP_COST}` })
          .where(and(eq(users.id, ctx.user.id), gte(users.npPoints, TRIAL_NP_COST)));
        const affected = (res as any)?.[0]?.affectedRows ?? (res as any)?.affectedRows ?? 0;
        if (affected < 1) throw new TRPCError({ code: "BAD_REQUEST", message: `IT 不足（需 ${TRIAL_NP_COST}）` });
        await tx.update(users).set({ proTier: "plus", proUntil }).where(eq(users.id, ctx.user.id));
      });
      return { ok: true, tier: "plus", proUntil: proUntil.toISOString(), cost: TRIAL_NP_COST };
    }),

  // ─── 出口价目（前端展示）────────────────────────────────────────────────────
  prices: protectedProcedure.query(() => ({
    membershipTrial: { cost: TRIAL_NP_COST, days: TRIAL_DAYS, tier: "plus" },
  })),
});
