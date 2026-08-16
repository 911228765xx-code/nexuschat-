/**
 * Alpha 战绩判定（AC 模型 Phase 3）：定时结算到期的 Call。
 *  - 短窗按整根 K 线开盘价对收盘价判涨跌；几乎持平才 void。
 *  - 方向判对 → +AC（直接入账，不farmable：受 5/天发 Call 限频且需真命中）+ 声誉。
 *  - 判错 → 扣声誉（不为负）。声誉抬高个人产出加成，形成正循环。
 */
import { eq, and, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { calls, users, curationStakes } from "../drizzle/schema";
import { fetchCallSpotPrice, fetchCallWindowOHLC } from "./callSpot";
import { alignWindow, deadbandBpForHorizon, horizonToMinutes, overdueVoidMs } from "./callWindow";
import logger from "./utils/logger";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const DEADBAND_BP = 100;        // 旧长窗 ±1% 死区（基点）；短窗见 deadbandBpForHorizon
const WIN_NP = 150;             // 旧版「免费 Call」判对 IT 奖励（有自押下注时不再发）
const WIN_REP = 100;            // 判对 声誉 +
const LOSE_REP = 40;            // 判错 声誉 -
/** 固定赔率 1.8：押对返还本金×1.8（含本金），押错销毁，void 退本 */
export const STAKE_ODDS = 1.8;
const STAKE_WIN_BONUS = STAKE_ODDS - 1; // 0.8

/** 质押/下注结算返还额：押对=本金×1.8，void=退本金，押错=0（销毁）。 */
export function stakePayout(amount: number, callStatus: "win" | "lose" | "void"): number {
  if (callStatus === "win") return Math.round(amount * STAKE_ODDS);
  if (callStatus === "void") return amount;
  return 0;
}

/**
 * 结算某条 Call 上的策展质押。
 * Call 判对 → 质押者拿回本金 + 30% 奖励；判错 → 质押销毁；void → 退本金。
 */
async function settleStakesForCall(db: Db, callId: number, callStatus: "win" | "lose" | "void"): Promise<void> {
  const stakes = await db.select().from(curationStakes)
    .where(and(eq(curationStakes.callId, callId), eq(curationStakes.status, "active")));
  for (const s of stakes) {
    const payout = stakePayout(s.amount, callStatus);
    const status: "won" | "lost" | "void" = callStatus === "win" ? "won" : callStatus === "void" ? "void" : "lost";
    // callStatus === 'lose' → payout 0, status lost（质押销毁）
    await db.update(curationStakes)
      .set({ status, payout, settledAt: new Date() })
      .where(eq(curationStakes.id, s.id));
    if (payout > 0) {
      const credited = await db.update(users)
        .set({ npPoints: sql`npPoints + ${payout}` })
        .where(eq(users.id, s.stakerId));
      const rows = Number((credited as any)?.[0]?.affectedRows ?? (credited as any)?.affectedRows ?? (credited as any)?.rowsAffected ?? 0);
      if (rows < 1) logger.warn({ callId, stakeId: s.id, stakerId: s.stakerId, payout }, "callResolver: 返还 IT 未写入");
      else logger.info({ callId, stakerId: s.stakerId, payout, status }, "callResolver: 下注返还已入账");
    }
  }
}

/** 结算到期未判定的 Call。下注前可只结当前用户，避免「有未结算」卡死、赢了不到账。 */
export async function resolveDueCalls(db: Db, onlyUserId?: number): Promise<number> {
  const due = await db
    .select()
    .from(calls)
    .where(and(
      eq(calls.status, "pending"),
      lte(calls.resolveAt, new Date()),
      onlyUserId ? eq(calls.userId, onlyUserId) : sql`1=1`,
    ))
    .limit(200);
  if (due.length === 0) return 0;

  // 同标的的现价取一次
  const priceCache = new Map<string, number | null>();
  let processed = 0;

  for (const c of due) {
    try {
      const horizonMin = horizonToMinutes(c.horizonHours);
      const win = alignWindow(new Date(c.resolveAt).getTime(), horizonMin);
      const closeMs = win.closeMs;
      const openMs = win.openMs;
      let entry = Number(c.entryPrice);
      let cur: number | null = null;

      if (horizonMin <= 60) {
        const ohlc = await fetchCallWindowOHLC(c.tokenSymbol, openMs, horizonMin);
        if (ohlc) {
          entry = ohlc.open;
          cur = ohlc.close;
        } else if (Date.now() - closeMs < 3 * 60_000) {
          // K 线刚收盘可能还没落库，等下一轮，不要用现价把整根比成「当下」
          continue;
        } else {
          // 多源都拿不到这根 K：用现价当收盘，至少能分出胜负，避免一直 pending / 到期 void
          let spot: number | null;
          const cached = priceCache.get(c.tokenSymbol);
          if (cached !== undefined) spot = cached;
          else {
            spot = await fetchCallSpotPrice(c.tokenSymbol);
            priceCache.set(c.tokenSymbol, spot);
          }
          cur = spot;
        }
      } else {
        let spot: number | null;
        const cached = priceCache.get(c.tokenSymbol);
        if (cached !== undefined) {
          spot = cached;
        } else {
          spot = await fetchCallSpotPrice(c.tokenSymbol);
          priceCache.set(c.tokenSymbol, spot);
        }
        cur = spot;
      }

      if (!cur || !entry || entry <= 0) {
        const overdueMs = Date.now() - closeMs;
        if (overdueMs > overdueVoidMs(horizonMin)) {
          await db.update(calls).set({ status: "void", resolvedAt: new Date() }).where(eq(calls.id, c.id));
          await settleStakesForCall(db, c.id, "void");
          processed++;
        }
        continue;
      }
      const changeBp = Math.round(((cur - entry) / entry) * 10_000);
      let status: "win" | "lose" | "void";
      const deadband = deadbandBpForHorizon(horizonMin) || DEADBAND_BP;
      if (Math.abs(changeBp) < deadband) status = "void";
      else {
        const up = changeBp > 0;
        status = (c.direction === "long" && up) || (c.direction === "short" && !up) ? "win" : "lose";
      }

      const upd = await db.update(calls)
        .set({ status, resolvedPrice: String(cur), entryPrice: String(entry), changeBp, resolvedAt: new Date() })
        .where(and(eq(calls.id, c.id), eq(calls.status, "pending")));
      // 幂等门闩:更新条件加 status='pending'。并发 tick(或将来新增手动触发)若已结算过这条,
      // affectedRows=0 → 跳过,不重复发 AC/声誉/质押返还。
      const changed = Number((upd as any)?.[0]?.affectedRows ?? (upd as any)?.rowsAffected ?? 0);
      if (changed < 1) continue;

      // 自己用 IT 下注的场次：只走质押返还（×1.8），不再额外发 150 IT，避免双倍补贴
      const [selfBet] = await db.select({ id: curationStakes.id }).from(curationStakes)
        .where(and(eq(curationStakes.callId, c.id), eq(curationStakes.stakerId, c.userId)))
        .limit(1);
      if (status === "win") {
        if (selfBet) {
          await db.update(users)
            .set({ reputation: sql`reputation + ${WIN_REP}` })
            .where(eq(users.id, c.userId));
        } else {
          await db.update(users)
            .set({ npPoints: sql`npPoints + ${WIN_NP}`, reputation: sql`reputation + ${WIN_REP}` })
            .where(eq(users.id, c.userId));
        }
      } else if (status === "lose") {
        await db.update(users)
          .set({ reputation: sql`GREATEST(0, reputation - ${LOSE_REP})` })
          .where(eq(users.id, c.userId));
      }
      // 结算这条 Call 上的质押/自押下注
      await settleStakesForCall(db, c.id, status);
      processed++;
    } catch (err) {
      logger.warn({ err, callId: c.id }, "callResolver: 单条结算失败");
    }
  }
  if (processed > 0) logger.info({ processed }, "callResolver: 战绩结算完成");
  return processed;
}

/** 注册战绩结算定时任务（每 1 分钟；支持 15 分钟短窗盘口）。 */
export function startCallResolver(): void {
  const tick = async () => {
    try {
      const db = await getDb();
      if (db) await resolveDueCalls(db);
    } catch (err) {
      logger.warn({ err }, "callResolver: 结算任务异常");
    }
  };
  setInterval(() => { void tick(); }, 60 * 1000);
  void tick();
}
