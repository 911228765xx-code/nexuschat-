/**
 * ICO 认购档位 = 平台合伙人等级(按累计认购 USDT,级别递增)。
 * 含:身份徽章(聊天/资料页展示的社交身份象征)+ 认购代币加成。
 * 纯函数,无副作用,可单测。徽章/加成只标记身份与一次性放量奖励,不含金融收益承诺。
 */
export interface IcoTier {
  level: number;        // 1/2/3,越大越高
  key: string;          // seed/core/genesis
  name: string;         // 合伙人档位名(资料页/展示)
  badge: string;        // 徽章短标(名字旁展示)
  color: string;        // 徽章主色(前端渲染)
  bonusPct: number;     // 认购代币加成(0.03 = 认购代币 +3%)
  minUsdt: number;      // 达标门槛(累计认购 ≥)
  maxUsdt: number | null; // 档位上限(展示用;null=无上限)
}

export const ICO_TIERS: IcoTier[] = [
  { level: 1, key: "seed",    name: "种子合伙人", badge: "种子", color: "#10B981", bonusPct: 0.03, minUsdt: 1000,  maxUsdt: 3000 },
  { level: 2, key: "core",    name: "核心合伙人", badge: "核心", color: "#3B82F6", bonusPct: 0.06, minUsdt: 3000,  maxUsdt: 10000 },
  { level: 3, key: "genesis", name: "创世合伙人", badge: "创世", color: "#F0B95C", bonusPct: 0.12, minUsdt: 10000, maxUsdt: null },
];

/** 由累计认购 USDT 推导当前档位;不足最低档返回 null。 */
export function deriveIcoTier(subscribedUsdt: number): IcoTier | null {
  let cur: IcoTier | null = null;
  for (const t of ICO_TIERS) if (subscribedUsdt >= t.minUsdt) cur = t;
  return cur;
}

/** 由档位等级(1/2/3)取定义;0 或越界返回 null。 */
export function tierByLevel(level: number): IcoTier | null {
  return ICO_TIERS.find((t) => t.level === level) ?? null;
}

/** 距离下一档还差多少 USDT;已是最高档返回 null。 */
export function nextTierGap(subscribedUsdt: number): { tier: IcoTier; gap: number } | null {
  for (const t of ICO_TIERS) {
    if (subscribedUsdt < t.minUsdt) return { tier: t, gap: t.minUsdt - subscribedUsdt };
  }
  return null;
}
