/**
 * ICO 认购逻辑体检:直接 import 真实的 pricing.ts / rewards.ts,跑不变量。
 * 跑:npx tsx _sim/icosim.ts
 */
import { priceAtSold, priceAtFraction, costForTokens, tokensForBudget, quote } from "../server/ico/pricing";
import { vestedFraction, effectiveApr, distributeAprLots, type StakeLot } from "../server/ico/rewards";

let FAIL = 0;
const APPROX = (a: number, b: number, tol = 1e-4) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
function ok(cond: boolean, msg: string) { if (!cond) { console.log("  ❌", msg); FAIL++; } }
function h(s: string) { console.log("\n=== " + s + " ==="); }

const C = { totalTokens: 1_000_000, startPrice: 0.8, endPrice: 2, exponent: 1.5 };
const TIER_BONUS = (cumUsdt: number) => cumUsdt >= 10000 ? 0.12 : cumUsdt >= 3000 ? 0.06 : cumUsdt >= 1000 ? 0.03 : 0; // tiers.ts 同款

// ── A. 曲线定价 ──────────────────────────────────────────────
h("A. 曲线定价(单价单调/积分一致/逆解/不超售)");
{
  // 单价单调不降 + ∈[start,end]
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const p = priceAtFraction(C, i / 100);
    ok(p >= prev - 1e-9, `单价非单调 at x=${i / 100}: ${p} < ${prev}`);
    ok(p >= C.startPrice - 1e-9 && p <= C.endPrice + 1e-9, `单价越界 ${p}`);
    prev = p;
  }
  ok(APPROX(priceAtFraction(C, 0), 0.8), "x=0 应=起步价0.8");
  ok(APPROX(priceAtFraction(C, 1), 2), "x=1 应=封顶价2");

  // cost = 数值积分 ∫price(梯形法细分),抽几个区间核对
  const numericCost = (sold: number, buy: number) => {
    const N = 20000; let s = 0;
    for (let k = 0; k < N; k++) {
      const t = sold + (buy * (k + 0.5)) / N;
      s += priceAtSold(C, t) * (buy / N);
    }
    return s;
  };
  for (const [sold, buy] of [[0, 100000], [200000, 300000], [500000, 500000], [900000, 100000]]) {
    const exact = costForTokens(C, sold, buy), num = numericCost(sold, buy);
    ok(APPROX(exact, num, 2e-3), `cost≠数值积分 sold=${sold} buy=${buy}: 解析${exact.toFixed(2)} vs 数值${num.toFixed(2)}`);
  }

  // cost 对 buy 单调增
  let pc = -1;
  for (let b = 0; b <= 1_000_000; b += 50000) { const c = costForTokens(C, 0, b); ok(c >= pc - 1e-6, `cost 非单调 buy=${b}`); pc = c; }

  // 逆解一致:tokensForBudget 后再 costForTokens ≈ budget
  for (const [sold, budget] of [[0, 50000], [0, 800000], [300000, 200000], [0, 5_000_000]]) {
    const t = tokensForBudget(C, sold, budget);
    ok(t <= C.totalTokens - sold + 1e-6, `逆解超出剩余额度: t=${t} remaining=${C.totalTokens - sold}`);
    if (budget < costForTokens(C, sold, C.totalTokens - sold)) {
      ok(APPROX(costForTokens(C, sold, t), budget, 1e-3), `逆解成本≠预算 sold=${sold} budget=${budget}: 实际${costForTokens(C, sold, t).toFixed(2)}`);
    } else {
      ok(APPROX(t, C.totalTokens - sold), `预算够应扫光剩余,t=${t} remaining=${C.totalTokens - sold}`); // 不超售
    }
  }

  // 均价 ∈ [priceFrom, priceTo]
  const q = quote(C, 100000, 200000);
  ok(q.avgPrice >= q.priceFrom - 1e-9 && q.avgPrice <= q.priceTo + 1e-9, `均价越界 ${q.avgPrice} ∉[${q.priceFrom},${q.priceTo}]`);
  console.log(`  起0.8/封顶2/陡1.5;买[10万→30万]均价${q.avgPrice.toFixed(4)}(${q.priceFrom.toFixed(4)}→${q.priceTo.toFixed(4)})`);
}

// ── B. 成交累加(复刻 settleOrder 的曲线+加成部分)──────────────
h("B. 连续认购成交(售出累加/不超售/价格上行/成本守恒/加成不推曲线)");
{
  let sold = 0, totalCost = 0, totalCredited = 0, totalBase = 0;
  const users: Record<number, number> = {}; // userId -> 累计USDT
  let seed = 99; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let prevPrice = priceAtSold(C, 0);
  for (let i = 0; i < 300; i++) {
    const uid = 1 + Math.floor(rnd() * 20);
    const budget = Math.floor(rnd() * 8000) + 50;
    const base = tokensForBudget(C, sold, budget);      // 基础量(走曲线)
    if (base <= 0) break;                                // 售罄
    const usedCost = costForTokens(C, sold, base);
    users[uid] = (users[uid] ?? 0) + usedCost;
    const bonus = base * TIER_BONUS(users[uid]);         // 档位加成(不推曲线)
    const credited = base + bonus;
    sold += base; totalCost += usedCost; totalCredited += credited; totalBase += base;
    const price = priceAtSold(C, sold);
    ok(price >= prevPrice - 1e-9, `价格回退 ${price}<${prevPrice}`);
    ok(sold <= C.totalTokens + 1e-6, `售出超总额度 ${sold}>${C.totalTokens}`);
    prevPrice = price;
  }
  // 成本守恒:逐笔成本之和 ≈ 从0一次买到 sold 的成本
  ok(APPROX(totalCost, costForTokens(C, 0, sold), 1e-3), `逐笔成本Σ≠整段成本 ${totalCost.toFixed(2)} vs ${costForTokens(C, 0, sold).toFixed(2)}`);
  // 售出只按基础量累加(加成不进 sold)
  ok(APPROX(sold, totalBase), `sold 应=Σbase ${sold} vs ${totalBase}`);
  ok(totalCredited >= totalBase, "实发(含加成)应≥基础量");
  console.log(`  300 笔:售出${sold.toFixed(0)}/总额${C.totalTokens}(${(sold / C.totalTokens * 100).toFixed(1)}%),募集${totalCost.toFixed(0)}U,实发(含加成)${totalCredited.toFixed(0)},现价${priceAtSold(C, sold).toFixed(4)}`);
}

// ── C. 锁仓释放(vestedFraction)──────────────────────────────
h("C. 锁仓释放(悬崖不放/单调/前少后多/不超100%)");
{
  const vm = 12, cliff = 1;
  ok(vestedFraction(0, vm, cliff) === 0 && vestedFraction(1, vm, cliff) === 0, "悬崖月内应=0");
  ok(APPROX(vestedFraction(12, vm, cliff), 1) && APPROX(vestedFraction(99, vm, cliff), 1), "≥vestMonths 应=1");
  let prev = -1;
  for (let m = 0; m <= 13; m += 0.5) {
    const f = vestedFraction(m, vm, cliff);
    ok(f >= -1e-9 && f <= 1 + 1e-9, `释放比例越界 m=${m}: ${f}`);
    ok(f >= prev - 1e-9, `释放比例回退 m=${m}: ${f}<${prev}`);
    prev = f;
  }
  // 前少后多(凸):前半段释放 < 后半段
  const firstHalf = vestedFraction(6.5, vm, cliff) - vestedFraction(1, vm, cliff);   // 月1→6.5
  const secondHalf = vestedFraction(12, vm, cliff) - vestedFraction(6.5, vm, cliff); // 月6.5→12
  ok(secondHalf > firstHalf, `应前少后多:前半${firstHalf.toFixed(3)} 应< 后半${secondHalf.toFixed(3)}`);
  console.log(`  12月悬崖1:月3=${(vestedFraction(3, vm, cliff) * 100).toFixed(1)}% 月6=${(vestedFraction(6, vm, cliff) * 100).toFixed(1)}% 月9=${(vestedFraction(9, vm, cliff) * 100).toFixed(1)}% 月12=100%(前少后多✓)`);
}

// ── D. 质押年化 + 奖励池封顶(effectiveApr + distributeAprLots)──
h("D. 质押收益(新资金起步率/老资金递减/不超发/池尽即止)");
{
  const aprStart = 2.0, aprEnd = 0.5, decline = 365;
  ok(APPROX(effectiveApr(aprStart, aprEnd, decline, 0), aprStart), "age0 应=aprStart");
  ok(APPROX(effectiveApr(aprStart, aprEnd, decline, 365), aprEnd) && APPROX(effectiveApr(aprStart, aprEnd, decline, 999), aprEnd), "age≥decline 应=aprEnd");
  ok(effectiveApr(aprStart, aprEnd, decline, 180) < aprStart && effectiveApr(aprStart, aprEnd, decline, 180) > aprEnd, "中途应在 start/end 之间");

  // 池子充足:factor=1,新批次按 aprStart 率
  const lots: StakeLot[] = [{ userId: 1, amount: 100000, ageDays: 0 }, { userId: 2, amount: 100000, ageDays: 365 }];
  const big = distributeAprLots(lots, aprStart, aprEnd, decline, 1e12);
  ok(APPROX(big.factor, 1), "池充足 factor 应=1");
  ok(APPROX(big.perUser.get(1)!, 100000 * aprStart / 365), "新资金(age0)应按 aprStart 日收益");
  ok(APPROX(big.perUser.get(2)!, 100000 * aprEnd / 365), "老资金(age365)应按 aprEnd 日收益");
  ok(big.emitted > 0 && APPROX(big.emitted, big.uncapped), "池充足 emitted=uncapped");

  // 池子不足:同等下调,emitted≈pool,不超发
  const small = distributeAprLots(lots, aprStart, aprEnd, decline, 100);
  ok(small.factor < 1 && small.factor > 0, `池不足 factor 应∈(0,1):${small.factor}`);
  ok(APPROX(small.emitted, 100, 1e-6) && small.emitted <= 100 + 1e-9, `池不足 emitted 应≈池且不超:${small.emitted}`);

  // 长跑守恒:连续发到池尽,累计 emitted ≤ 池
  let pool = 50000, totalEmit = 0, days = 0;
  const lots2: StakeLot[] = [{ userId: 1, amount: 200000, ageDays: 0 }];
  while (pool > 1e-6 && days < 5000) {
    lots2[0].ageDays = days;
    const d = distributeAprLots(lots2, aprStart, aprEnd, decline, pool);
    pool -= d.emitted; totalEmit += d.emitted; days++;
    if (d.emitted <= 1e-9) break;
  }
  ok(totalEmit <= 50000 + 1e-6, `长跑超发:${totalEmit}>50000`);
  console.log(`  age0率${(effectiveApr(aprStart, aprEnd, decline, 0) * 100).toFixed(0)}%/age365率${(effectiveApr(aprStart, aprEnd, decline, 365) * 100).toFixed(0)}%;5万池发了${days}天累计${totalEmit.toFixed(0)}(≤池✓)`);
}

console.log("\n" + (FAIL === 0 ? "✅ 认购逻辑全部不变量通过(定价/成交/锁仓/质押)" : `❌ 共 ${FAIL} 处不变量破坏`));
process.exit(FAIL ? 1 : 0);
