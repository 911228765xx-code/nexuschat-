/**
 * TGE（AC 模型 Phase 5）：AC → AI 单向兑换。默认关闭，临近发币由管理员快照 + 开启。
 *  - 快照：记录每个用户当下 AC 持有量 + 全站总 AC。
 *  - 兑换：pro-rata —— AI = nnPool × 个人快照AC / 全站快照AC；AC 按快照量销毁，单向不可逆。
 *  - 平时不可兑、不可提现；只有 TGE 开启后每人可领一次。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tgeConfig, tgeClaims, users } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { grantNN, getCirculating, NN_TOTAL_SUPPLY } from "../token";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function loadConfig(db: Db) {
  const [c] = await db.select().from(tgeConfig).where(eq(tgeConfig.id, 1)).limit(1);
  return c ?? null;
}
export function estimateNn(nnPool: number, npSnapshot: number, totalNp: number): number {
  if (totalNp <= 0 || npSnapshot <= 0) return 0;
  return Math.floor((nnPool * npSnapshot) / totalNp);
}

export const tgeRouter = router({
  // ─── 我的 TGE 状态 ───────────────────────────────────────────────────────────
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { enabled: false, hasSnapshot: false };
    const cfg = await loadConfig(db);
    const [claim] = await db.select().from(tgeClaims).where(eq(tgeClaims.userId, ctx.user.id)).limit(1);
    const enabled = !!cfg?.enabled;
    if (!claim) return { enabled, hasSnapshot: false, snapshotAt: cfg?.snapshotAt ?? null };
    const estimatedNn = claim.claimed ? claim.nnAmount : estimateNn(cfg?.nnPool ?? 0, claim.npSnapshot, cfg?.totalNpSnapshot ?? 0);
    return {
      enabled,
      hasSnapshot: true,
      snapshotAt: cfg?.snapshotAt ?? null,
      npSnapshot: claim.npSnapshot,
      claimed: claim.claimed,
      estimatedNn,
    };
  }),

  // ─── 领取（AC→AI，单向，每人一次）───────────────────────────────────────────────
  claim: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cfg = await loadConfig(db);
    if (!cfg?.enabled) throw new TRPCError({ code: "FORBIDDEN", message: "TGE 尚未开启" });
    const [claim] = await db.select().from(tgeClaims).where(eq(tgeClaims.userId, ctx.user.id)).limit(1);
    if (!claim) throw new TRPCError({ code: "BAD_REQUEST", message: "你没有 TGE 快照（快照后才有 AC 可兑换）" });
    if (claim.claimed) throw new TRPCError({ code: "BAD_REQUEST", message: "已领取过" });

    const nn = estimateNn(cfg.nnPool, claim.npSnapshot, cfg.totalNpSnapshot);
    await db.transaction(async (tx) => {
      // 原子条件：仅当仍未领取时置为已领，防并发双领白嫖 AI
      const res = await tx.update(tgeClaims)
        .set({ claimed: true, nnAmount: nn, claimedAt: new Date() })
        .where(and(eq(tgeClaims.id, claim.id), eq(tgeClaims.claimed, false)));
      const affected = (res as any)?.[0]?.affectedRows ?? (res as any)?.affectedRows ?? 0;
      if (affected < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "已领取过" });
      // 守恒发放:走 grantNN(含"流通+发放≤总量"金库护栏),失败 throw → 整个事务回滚、不置 claimed
      const ok = await grantNN(tx as any, ctx.user.id, nn, { type: "tge_claim", refType: "user", refId: ctx.user.id });
      if (!ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "金库余额不足，无法发放" });
      // 销毁对应 AC(grantNN 只管发 AI,这里单独扣 AC)
      await tx.update(users)
        .set({ npPoints: sql`GREATEST(0, npPoints - ${claim.npSnapshot})` })
        .where(eq(users.id, ctx.user.id));
    });
    return { ok: true, nn };
  }),

  // ─── 管理员：拍快照（记录每人 AC + 全站总 AC）────────────────────────────────────
  adminSnapshot: adminProcedure
    .input(z.object({ nnPool: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // 安全护栏：TGE 开启中、或已有人领取过 → 禁止重拍（否则清掉领取记录会导致 AI 双发）
      const cfg = await loadConfig(db);
      if (cfg?.enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "TGE 进行中，请先关闭再重拍快照" });
      const [claimed] = await db.select({ id: tgeClaims.id }).from(tgeClaims).where(eq(tgeClaims.claimed, true)).limit(1);
      if (claimed) throw new TRPCError({ code: "BAD_REQUEST", message: "已有用户领取过 AI，禁止重拍快照（会导致重复发放）" });
      // 守恒护栏:TGE 奖励池不得超过金库当前可用余额,否则全员领取会突破代币总量恒定
      const maxPool = NN_TOTAL_SUPPLY - (await getCirculating(db));
      if (input.nnPool > maxPool) throw new TRPCError({ code: "BAD_REQUEST", message: `奖励池(${input.nnPool})超过金库可用余额,最多 ${maxPool}` });
      const [{ total = 0 } = { total: 0 }] = await db
        .select({ total: sql<number>`COALESCE(SUM(${users.npPoints}),0)` }).from(users);
      // 重建快照
      await db.delete(tgeClaims);
      await db.execute(sql`INSERT INTO tge_claims (userId, npSnapshot) SELECT id, npPoints FROM users WHERE npPoints > 0`);
      await db.insert(tgeConfig)
        .values({ id: 1, nnPool: input.nnPool, totalNpSnapshot: Number(total), snapshotAt: new Date(), enabled: false })
        .onDuplicateKeyUpdate({ set: { nnPool: input.nnPool, totalNpSnapshot: Number(total), snapshotAt: new Date() } });
      return { ok: true, totalNpSnapshot: Number(total), nnPool: input.nnPool };
    }),

  // ─── 管理员：开启/关闭 TGE 兑换 ────────────────────────────────────────────────
  adminSetEnabled: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(tgeConfig)
        .values({ id: 1, enabled: input.enabled })
        .onDuplicateKeyUpdate({ set: { enabled: input.enabled } });
      return { ok: true, enabled: input.enabled };
    }),
});
