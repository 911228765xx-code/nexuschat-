// Swap 链下 FloorAMM 模拟器:复刻 server/routers/swap.ts execute 逻辑(修复后:地板分母=SUM(nnBalance)+F<现价守卫)。
// 跑:node _sim/swapsim.js
'use strict';
const EPS = 1e-3;
let FAIL = 0;
function check(cond, msg) { if (!cond) { console.log('  ❌ 不变量破坏:', msg); FAIL++; } }
const supplyOf = users => Object.values(users).reduce((s, u) => s + u.ai, 0); // = SUM(nnBalance)

// ── 引擎(复刻 floorAmm.ts)──
const spot = p => p.aiReserve > 0 ? p.usdtReserve / p.aiReserve : 0;
const floor = (p, users) => { const s = supplyOf(users); if (s <= 0) return 0; const f = p.reserveR / s; const sp = spot(p); return sp > 0 ? Math.min(f, sp) : f; }; // R/可赎回供应量,封顶现价
function thetaBps(p) { const span = p.thetaHalfBuyUsdt * 2; if (span <= 0 || p.cumBoughtUsdt >= span) return p.thetaEndBps; return p.thetaStartBps - (p.thetaStartBps - p.thetaEndBps) * (p.cumBoughtUsdt / span); }
function effPeak(p, now) { const s = spot(p); if (!p.peakUpdatedAt || p.peakPrice <= 0) return Math.max(s, p.peakPrice); const days = (now - p.peakUpdatedAt) / 86400000; const dec = Math.max(0, p.peakPrice - p.peakPrice * (p.peakDecayPerDayBps / 1e4) * days); return Math.max(s, dec); }
function sellTaxBps(p, now) { const s = spot(p), pk = effPeak(p, now); if (pk <= 0 || s >= pk) return p.baseTaxBps; const dd = (pk - s) / pk; return Math.min(p.maxTaxBps, Math.round(p.baseTaxBps + (p.maxTaxBps - p.baseTaxBps) * dd)); }
function quoteBuy(p, usdtIn) { const th = thetaBps(p) / 1e4; const toR = usdtIn * th; const net = usdtIn - toR; const k = p.aiReserve * p.usdtReserve; return { aiOut: Math.max(0, p.aiReserve - k / (p.usdtReserve + net)), toReserve: toR }; }
function quoteSell(p, aiIn, now, users) {
  const k = p.aiReserve * p.usdtReserve; const gross = p.usdtReserve - k / (p.aiReserve + aiIn);
  const ex = aiIn > 0 ? gross / aiIn : 0; const F = floor(p, users); const s = spot(p);
  if (F > 0 && F < s && ex < F) return { usdtOut: aiIn * F, grossUsdt: aiIn * F, taxBps: 0, baseTax: 0, excessTax: 0, viaFloor: true };
  const spotPost = (p.usdtReserve - gross) / (p.aiReserve + aiIn); const pk = effPeak(p, now);
  const dd = pk > 0 ? Math.max(0, (pk - s) / pk, (pk - spotPost) / pk) : 0;
  const tb = Math.min(p.maxTaxBps, Math.round(p.baseTaxBps + (p.maxTaxBps - p.baseTaxBps) * dd));
  const base = gross * (p.baseTaxBps / 1e4); const exc = tb > p.baseTaxBps ? gross * ((tb - p.baseTaxBps) / 1e4) : 0;
  return { usdtOut: Math.max(0, gross - base - exc), grossUsdt: gross, taxBps: tb, baseTax: base, excessTax: exc, viaFloor: false };
}

// ── execute(复刻 swap.ts)──
function buy(p, u, usdtIn, now) {
  const q = quoteBuy(p, usdtIn); const aiOut = Math.floor(q.aiOut);
  if (aiOut <= 0) return { err: '数量过小' };
  if (aiOut >= p.aiReserve) return { err: '超库存' };
  if (u.usdt < usdtIn - EPS) return { err: 'USDT不足' };
  const net = usdtIn - q.toReserve;
  p.usdtReserve += net; p.aiReserve -= aiOut; p.reserveR += q.toReserve; p.circulatingAi += aiOut; p.cumBoughtUsdt += usdtIn;
  u.usdt -= usdtIn; u.ai += aiOut;
  const mp = p.usdtReserve / p.aiReserve;
  if (mp > effPeak(p, now)) { p.peakPrice = mp; p.peakUpdatedAt = now; }
  return { ok: true, out: aiOut, cost: usdtIn };
}
function sell(p, u, amountIn, now, users) {
  const aiIn = Math.floor(amountIn);
  if (aiIn <= 0) return { err: '数量过小' };
  if (u.ai < aiIn) return { err: 'AI不足' };
  const sPre = spot(p), Fpre = floor(p, users);
  const q = quoteSell(p, aiIn, now, users);
  if (q.usdtOut <= 0) return { err: '过小' };
  let burned = 0;
  if (q.viaFloor) {
    check(Fpre < sPre + EPS, `地板赎回触发但 F(${Fpre.toFixed(4)})≥现价(${sPre.toFixed(4)}) — 守卫失效`);
    if (q.usdtOut >= p.reserveR) return { err: '储备不足' };
    p.reserveR -= q.usdtOut; p.circulatingAi = Math.max(0, p.circulatingAi - aiIn); burned = aiIn;
  } else {
    if (q.grossUsdt >= p.usdtReserve) return { err: '池额度' };
    p.aiReserve += aiIn; p.usdtReserve -= q.grossUsdt; p.circulatingAi = Math.max(0, p.circulatingAi - aiIn); p.divPool += q.baseTax; p.crisisFund += q.excessTax;
  }
  u.ai -= aiIn; u.usdt += q.usdtOut;
  return { ok: true, out: q.usdtOut, viaFloor: q.viaFloor, burned, taxBps: q.taxBps };
}

function mkPool() {
  return { aiReserve: 1_000_000, usdtReserve: 200_000, reserveR: 300_000, circulatingAi: 0, crisisFund: 200_000, divPool: 0,
    thetaStartBps: 5200, thetaEndBps: 2700, thetaHalfBuyUsdt: 100_000, cumBoughtUsdt: 0,
    baseTaxBps: 500, maxTaxBps: 5000, peakDecayPerDayBps: 400, peakPrice: 0.2, peakUpdatedAt: 0 };
}
function ledger() { return { extUsdt: 200_000 + 300_000 + 200_000, extAi: 1_000_000, burnedAi: 0 }; }
function invariants(p, users, lg, tag) {
  for (const k of ['aiReserve', 'usdtReserve', 'reserveR', 'circulatingAi', 'crisisFund', 'divPool'])
    check(p[k] >= -EPS, `${tag}: pool.${k} 变负 = ${p[k]}`);
  for (const u of Object.values(users)) { check(u.ai >= -EPS, `${tag}: user.ai 负`); check(u.usdt >= -EPS, `${tag}: user.usdt 负`); }
  const sumU = Object.values(users).reduce((s, u) => s + u.usdt, 0);
  check(Math.abs((p.usdtReserve + p.reserveR + p.crisisFund + p.divPool + sumU) - lg.extUsdt) < 1, `${tag}: USDT 不守恒 期望${lg.extUsdt.toFixed(2)} 实际${(p.usdtReserve + p.reserveR + p.crisisFund + p.divPool + sumU).toFixed(2)}`);
  const sumA = Object.values(users).reduce((s, u) => s + u.ai, 0);
  check(Math.abs((p.aiReserve + sumA + lg.burnedAi) - lg.extAi) < 1, `${tag}: AI 不守恒 期望${lg.extAi} 实际${(p.aiReserve + sumA + lg.burnedAi).toFixed(2)}`);
  // 偿付:全员按地板赎回 = supply×F = reserveR(构造保证),只需 reserveR≥0(上已查);地板赎回须<现价(sell 内逐笔查)
}
function header(s) { console.log('\n=== ' + s + ' ==='); }
let DAY = 0; const now = () => DAY * 86400000 + 1;

header('场景A:正常买卖(地板应在现价下方)');
{
  const p = mkPool(), lg = ledger(), users = { alice: { ai: 0, usdt: 0 }, bob: { ai: 0, usdt: 0 } };
  users.holders = { ai: 8_000_000, usdt: 0 }; lg.extAi += 8_000_000; // 全网已有 800万 AI 在用户手里
  const dep = (id, u) => { users[id].usdt += u; lg.extUsdt += u; };
  dep('alice', 10000); dep('bob', 10000);
  for (const [who, side, amt] of [['alice', 'buy', 5000], ['bob', 'buy', 3000], ['alice', 'sell', 1000], ['bob', 'buy', 2000], ['alice', 'sell', 500]]) {
    DAY += 0.3;
    const r = side === 'buy' ? buy(p, users[who], amt, now()) : sell(p, users[who], amt, now(), users);
    if (r.burned) lg.burnedAi += r.burned;
    invariants(p, users, lg, `A:${who} ${side}`);
    const F = floor(p, users), s = spot(p);
    check(F < s + EPS, `A: 地板 ${F.toFixed(5)} ≥ 现价 ${s.toFixed(5)}(供应充足时不该发生)`);
    console.log(`  ${who} ${side} ${amt} → ${r.ok ? 'out=' + (r.out || 0).toFixed(2) + (r.viaFloor ? '(地板)' : '') : 'ERR:' + r.err}  现价${s.toFixed(4)} 地板${F.toFixed(4)}(${(F / s * 100).toFixed(1)}%现价) R${p.reserveR.toFixed(0)}`);
  }
}

header('场景B:卖出 ICO/空投得来的 AI → circulatingAi 不再变负,地板不爆');
{
  const p = mkPool(), lg = ledger(), users = { carol: { ai: 500_000, usdt: 0 }, others: { ai: 7_500_000, usdt: 0 } };
  lg.extAi += 8_000_000;
  console.log(`  初始:circulatingAi=${p.circulatingAi}, 全网供应=${supplyOf(users)}, 地板=${floor(p, users).toFixed(5)} 现价=${spot(p).toFixed(4)}`);
  DAY += 1;
  const r = sell(p, users.carol, 100_000, now(), users);
  if (r.burned) lg.burnedAi += r.burned;
  console.log(`  carol 卖 100000 → ${r.ok ? 'out=' + r.out.toFixed(2) + (r.viaFloor ? '(地板)' : '(走税)') : 'ERR:' + r.err}`);
  console.log(`  之后:circulatingAi=${p.circulatingAi}  地板=${floor(p, users).toFixed(5)}`);
  invariants(p, users, lg, 'B:carol sell ICO');
  check(p.circulatingAi >= 0, `B: circulatingAi 变负 = ${p.circulatingAi}`);
}

header('场景C:拉高后崩盘 → 地板赎回 + 危机税');
{
  const p = mkPool(), lg = ledger(), users = { whale: { ai: 0, usdt: 0 }, holders: { ai: 8_000_000, usdt: 0 } };
  lg.extAi += 8_000_000;
  const dep = (id, u) => { users[id].usdt += u; lg.extUsdt += u; };
  dep('whale', 500_000);
  DAY += 0.1; buy(p, users.whale, 300_000, now());
  console.log(`  大买后:现价${spot(p).toFixed(4)} 峰值${p.peakPrice.toFixed(4)} 地板${floor(p, users).toFixed(4)}`);
  DAY += 0.1;
  const r = sell(p, users.whale, users.whale.ai, now(), users);
  if (r.burned) lg.burnedAi += r.burned;
  console.log(`  全卖 → ${r.ok ? 'out=' + r.out.toFixed(2) + (r.viaFloor ? '(走地板)' : '(走税)') : 'ERR:' + r.err} 本笔卖税${r.taxBps}bps(=${(r.taxBps / 100).toFixed(1)}%,防砸盘按卖后回撤计)`);
  invariants(p, users, lg, 'C:whale dump');
  console.log(`  之后:现价${spot(p).toFixed(4)} 地板${floor(p, users).toFixed(4)} R${p.reserveR.toFixed(0)} 危机金${p.crisisFund.toFixed(0)} 分红池${p.divPool.toFixed(2)}`);
}

header('场景D:随机压力(确定性,含ICO持币者)');
{
  const p = mkPool(), lg = ledger(), users = { holders: { ai: 8_000_000, usdt: 0 } };
  lg.extAi += 8_000_000;
  const dep = (id, u) => { users[id] = users[id] || { ai: 0, usdt: 0 }; users[id].usdt += u; lg.extUsdt += u; };
  for (let i = 0; i < 8; i++) dep('u' + i, 50000);
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let buys = 0, sells = 0, errs = 0, floors = 0;
  for (let i = 0; i < 400; i++) {
    DAY += 0.05;
    const u = users['u' + Math.floor(rnd() * 8)];
    if (rnd() < 0.55 || u.ai < 10) { const r = buy(p, u, Math.floor(rnd() * 4000) + 100, now()); r.ok ? buys++ : errs++; }
    else { const r = sell(p, u, Math.floor(rnd() * Math.min(u.ai, 5000)) + 1, now(), users); if (r.ok) { sells++; if (r.viaFloor) floors++; if (r.burned) lg.burnedAi += r.burned; } else errs++; }
    invariants(p, users, lg, `D:#${i}`);
  }
  console.log(`  400 笔:买${buys} 卖${sells}(其中地板赎回${floors}) 拒${errs}`);
  console.log(`  终态:现价${spot(p).toFixed(4)} 地板${floor(p, users).toFixed(4)} R${p.reserveR.toFixed(0)} 池AI${p.aiReserve.toFixed(0)} 池U${p.usdtReserve.toFixed(0)} 危机${p.crisisFund.toFixed(0)} 分红${p.divPool.toFixed(2)}`);
}

header('场景E:买入→立即赎回 套利攻击(应无利可图)');
{
  const p = mkPool(), lg = ledger(), users = { att: { ai: 0, usdt: 100_000 }, holders: { ai: 8_000_000, usdt: 0 } };
  lg.extUsdt += 100_000; lg.extAi += 8_000_000;
  const u = users.att; const before = u.usdt;
  DAY += 0.01; const b = buy(p, u, 50_000, now());
  DAY += 0.01; const s = sell(p, u, u.ai, now(), users); if (s.burned) lg.burnedAi += s.burned;
  console.log(`  攻击者投 50000U 买入得 ${b.out} AI,立即全卖回 ${s.viaFloor ? '(地板)' : '(税)'} → 余 USDT ${u.usdt.toFixed(2)}(初始 ${before}) 盈亏 ${(u.usdt - before).toFixed(2)}`);
  invariants(p, users, lg, 'E:arb');
  check(u.usdt <= before + EPS, `E: 买入→赎回 套利获利 ${(u.usdt - before).toFixed(2)} > 0 — 储备被套`);
}

console.log('\n' + (FAIL === 0 ? '✅ 全部不变量通过(地板<现价、无负值、守恒、无套利)' : `❌ 共 ${FAIL} 处不变量破坏`));
process.exit(FAIL ? 1 : 0);
