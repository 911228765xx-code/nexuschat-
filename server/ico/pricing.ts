/**
 * ICO 联合曲线定价引擎(纯函数,可单测)。
 * 价格曲线: P(x) = P0 + (P1−P0)·x^a,x = 已售比例 = 已售枚数 / 总额度。
 * 买 N 枚的成本 = 曲线下面积 = Q·∫P(x)dx。所有金额计算收口在这里。
 */
export interface IcoCurve {
  totalTokens: number; // Q 总认购额度(枚)
  startPrice: number;  // P0 起步价(USDT)
  endPrice: number;    // P1 封顶价(USDT)
  exponent: number;    // a 曲线陡度
}

/** 已售比例 x∈[0,1] 处的瞬时单价 */
export function priceAtFraction(c: IcoCurve, x: number): number {
  const xc = Math.min(1, Math.max(0, x));
  return c.startPrice + (c.endPrice - c.startPrice) * Math.pow(xc, c.exponent);
}

/** 已售 soldTokens 枚时的当前单价 */
export function priceAtSold(c: IcoCurve, soldTokens: number): number {
  return priceAtFraction(c, soldTokens / c.totalTokens);
}

/** ∫P(x)dx 的原函数 F(x) = P0·x + (P1−P0)·x^(a+1)/(a+1) */
function antideriv(c: IcoCurve, x: number): number {
  return c.startPrice * x + (c.endPrice - c.startPrice) * Math.pow(x, c.exponent + 1) / (c.exponent + 1);
}

/** 从已售 sold 枚起,再买 buy 枚的成本(USDT)= Q·[F(x2)−F(x1)] */
export function costForTokens(c: IcoCurve, sold: number, buy: number): number {
  if (buy <= 0) return 0;
  const x1 = sold / c.totalTokens;
  const x2 = (sold + buy) / c.totalTokens;
  return c.totalTokens * (antideriv(c, x2) - antideriv(c, x1));
}

/** 逆解:已售 sold 枚时,用 budget USDT 能买多少枚(二分,成本对枚数单调) */
export function tokensForBudget(c: IcoCurve, sold: number, budget: number): number {
  const remaining = c.totalTokens - sold;
  if (remaining <= 0 || budget <= 0) return 0;
  if (costForTokens(c, sold, remaining) <= budget) return remaining; // 预算够扫光剩余
  let lo = 0, hi = remaining;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (costForTokens(c, sold, mid) <= budget) lo = mid; else hi = mid;
  }
  return lo;
}

/** 一笔购买的报价:成本、起止价、均价 */
export function quote(c: IcoCurve, sold: number, buy: number): { cost: number; priceFrom: number; priceTo: number; avgPrice: number } {
  const cost = costForTokens(c, sold, buy);
  return {
    cost,
    priceFrom: priceAtSold(c, sold),
    priceTo: priceAtSold(c, sold + buy),
    avgPrice: buy > 0 ? cost / buy : priceAtSold(c, sold),
  };
}
