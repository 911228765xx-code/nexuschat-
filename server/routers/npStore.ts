/**
 * NP 出口（NP 模型 Phase 4）：用 NP 兑换平台特权（不可提现 → 合规）。
 *  - 动态置顶/加热：用 NP 让自己的动态在广场置顶一段时间。
 *  - 会员体验券：用 NP 换 3 天 Plus 体验（仅当前免费用户可换）。
 * 所有消耗直接扣 NP（销毁 → 控通胀），是 NP 的日常出口。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { rateLimitWrite } from "../rateLimit";
import { getDb } from "../db";
import { users, posts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { effectiveTier } from "../membership";

const PROMOTE_NP_PER_DAY = 2000;     // 动态置顶 NP/天
const TRIAL_NP_COST = 3000;          // 会员体验券 NP
const TRIAL_DAYS = 3;

/** 扣 NP（余额不足抛错）。在事务外做"读-校验-扣"，并发可接受。 */
async function spendNp(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, amount: number): Promise<void> {
  const [u] = await db.select({ np: users.npPoints }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.np < amount) throw new TRPCError({ code: "BAD_REQUEST", message: `NP 不足（需 ${amount}）` });
  await db.update(users).set({ npPoints: sql`npPoints - ${amount}` }).where(eq(users.id, userId));
}

export const npStoreRouter = router({
  // ─── 动态置顶/加热 ───────────────────────────────────────────────────────────
  promotePost: protectedProcedure
    .input(z.object({ postId: z.number(), days: z.number().int().min(1).max(7) }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [p] = await db.select({ authorId: posts.authorId, promotedUntil: posts.promotedUntil }).from(posts).where(eq(posts.id, input.postId)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "动态不存在" });
      if (p.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能置顶自己的动态" });

      await spendNp(db, ctx.user.id, PROMOTE_NP_PER_DAY * input.days);
      const base = p.promotedUntil && p.promotedUntil.getTime() > Date.now() ? p.promotedUntil.getTime() : Date.now();
      const until = new Date(base + input.days * 24 * 3600 * 1000);
      await db.update(posts).set({ promotedUntil: until }).where(eq(posts.id, input.postId));
      return { ok: true, promotedUntil: until.toISOString(), cost: PROMOTE_NP_PER_DAY * input.days };
    }),

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
    promotePerDay: PROMOTE_NP_PER_DAY,
    membershipTrial: { cost: TRIAL_NP_COST, days: TRIAL_DAYS, tier: "plus" },
  })),
});
