/**
 * FloorAMM 经济引擎(链下版,纯函数)——与链上 contracts/src/FloorAMM.sol 同一套数学。
 * 买入 θ 分流进储备 R(储备绝对值**只增不减**;注意:单位地板 F=R/供应量,深跌区单笔买入因供应同增,F 可能**微降**,并非每笔必抬);
 * 卖出动态税(距峰回撤越深税越高,按 max(盘前,卖后)回撤计防一次性砸盘)走瀑布(基础→分红池、超额→危机金);
 * 地板价 F=R/供应量(全体用户持仓 SUM(nnBalance)),卖到地板价以下走 redeem 免税兜底。
 * 链下简化:用「峰值+按天衰减」代替链上抗操纵 TWAP(链下撮合无 MEV)。
 */
export interface PoolState {
  aiReserve: number; usdtReserve: number;
  // ⚠️ circulatingAi 已废弃:曾作地板分母(错误,见 floorPrice),现地板分母改用 SUM(nnBalance)。仅留作 swap 净买入统计,勿再用于定价。
  reserveR: number; circulatingAi: number; crisisFund: number; divPool: number;
  thetaStartBps: number; thetaEndBps: number; thetaHalfBuyUsdt: number; cumBoughtUsdt: number;
  baseTaxBps: number; maxTaxBps: number; peakDecayPerDayBps: number;
  peakPrice: number; peakUpdatedAt: number | null; // ms epoch
}

export function spotPrice(p: PoolState): number {
  return p.aiReserve > 0 ? p.usdtReserve / p.aiReserve : 0;
}
/**
 * 地板价 F = 储备R / 可赎回供应量(= 全体用户持仓 SUM(nnBalance),对应链上 R/totalSupply)。
 * ⚠️ 分母**不是** circulatingAi(swap 净买入):那个从 0 起步会算出远高于现价的天价地板,
 * 且用户卖出 ICO/空投得来的币时会变负。调用方必须传入 SUM(nnBalance)。
 */
export function floorPrice(p: PoolState, supply: number): number {
  return supply > 0 ? p.reserveR / supply : 0;
}
/** 当前 θ(基点):随累计买入从 start 线性降到 end(达 2×half 触底) */
export function currentThetaBps(p: PoolState): number {
  const span = p.thetaHalfBuyUsdt * 2;
  if (span <= 0 || p.cumBoughtUsdt >= span) return p.thetaEndBps;
  return p.thetaStartBps - (p.thetaStartBps - p.thetaEndBps) * (p.cumBoughtUsdt / span);
}
/** 有效峰值 = max(现价, 存储峰值按天线性衰减) */
export function effectivePeak(p: PoolState, now: number): number {
  const spot = spotPrice(p);
  if (!p.peakUpdatedAt || p.peakPrice <= 0) return Math.max(spot, p.peakPrice);
  const days = (now - p.peakUpdatedAt) / 86_400_000;
  const decayed = Math.max(0, p.peakPrice - p.peakPrice * (p.peakDecayPerDayBps / 1e4) * days);
  return Math.max(spot, decayed);
}
/** 当前卖税(基点):按距峰回撤从 base 线性升到 max */
export function currentSellTaxBps(p: PoolState, now: number): number {
  const spot = spotPrice(p);
  const peak = effectivePeak(p, now);
  if (peak <= 0 || spot >= peak) return p.baseTaxBps;
  const dd = (peak - spot) / peak; // 0..1 回撤
  return Math.min(p.maxTaxBps, Math.round(p.baseTaxBps + (p.maxTaxBps - p.baseTaxBps) * dd));
}

/** 报价·买入:usdtIn → θ 进储备,其余 x*y=k 出 AI */
export function quoteBuy(p: PoolState, usdtIn: number): { aiOut: number; toReserve: number } {
  const theta = currentThetaBps(p) / 1e4;
  const toReserve = usdtIn * theta;
  const net = usdtIn - toReserve;
  const k = p.aiReserve * p.usdtReserve;
  const aiOut = p.aiReserve - k / (p.usdtReserve + net);
  return { aiOut: Math.max(0, aiOut), toReserve };
}
/**
 * 报价·卖出:aiIn → x*y=k 毛额,扣动态税;若执行价 < 地板则走 redeem 免税按地板价。
 * supply = SUM(nnBalance)。地板赎回仅在 **0 < F < 现价** 且本笔执行价跌破地板时触发(深跌兜底)——
 * F≥现价说明储备过厚/供应过小,此时禁用赎回(否则会按高于现价的地板付款 → 买入再赎回套利掏空储备)。
 */
export function quoteSell(p: PoolState, aiIn: number, now: number, supply: number): {
  usdtOut: number; grossUsdt: number; taxBps: number; baseTax: number; excessTax: number; viaFloor: boolean;
} {
  const k = p.aiReserve * p.usdtReserve;
  const grossUsdt = p.usdtReserve - k / (p.aiReserve + aiIn);
  const execPrice = aiIn > 0 ? grossUsdt / aiIn : 0;
  const F = floorPrice(p, supply);
  const spot = spotPrice(p);
  if (F > 0 && F < spot && execPrice < F) {
    const usdtOut = aiIn * F; // 地板赎回,免税
    return { usdtOut, grossUsdt: usdtOut, taxBps: 0, baseTax: 0, excessTax: 0, viaFloor: true };
  }
  // 动态税:防砸盘——税率按 max(盘前回撤, 本笔卖出后回撤) 计,单笔砸得越深税越高(否则鲸鱼从峰值一次性清仓只付基础税)
  const spotPost = (p.usdtReserve - grossUsdt) / (p.aiReserve + aiIn);
  const peak = effectivePeak(p, now);
  const dd = peak > 0 ? Math.max(0, (peak - spot) / peak, (peak - spotPost) / peak) : 0;
  const taxBps = Math.min(p.maxTaxBps, Math.round(p.baseTaxBps + (p.maxTaxBps - p.baseTaxBps) * dd));
  const baseTax = grossUsdt * (p.baseTaxBps / 1e4);
  const excessTax = taxBps > p.baseTaxBps ? grossUsdt * ((taxBps - p.baseTaxBps) / 1e4) : 0;
  return { usdtOut: Math.max(0, grossUsdt - baseTax - excessTax), grossUsdt, taxBps, baseTax, excessTax, viaFloor: false };
}

export function poolFromRow(r: any): PoolState {
  return {
    aiReserve: Number(r.aiReserve), usdtReserve: Number(r.usdtReserve),
    reserveR: Number(r.reserveR), circulatingAi: Number(r.circulatingAi),
    crisisFund: Number(r.crisisFund), divPool: Number(r.divPool),
    thetaStartBps: r.thetaStartBps, thetaEndBps: r.thetaEndBps,
    thetaHalfBuyUsdt: Number(r.thetaHalfBuyUsdt), cumBoughtUsdt: Number(r.cumBoughtUsdt),
    baseTaxBps: r.baseTaxBps, maxTaxBps: r.maxTaxBps, peakDecayPerDayBps: r.peakDecayPerDayBps,
    peakPrice: Number(r.peakPrice), peakUpdatedAt: r.peakUpdatedAt ? new Date(r.peakUpdatedAt).getTime() : null,
  };
}
