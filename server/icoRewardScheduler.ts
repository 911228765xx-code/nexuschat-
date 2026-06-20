/**
 * ICO 质押收益：每日结算调度。
 * settleIcoRewards 幂等（按 runDate）：每小时检查一次 → 每个 UTC 日首次触发时真正结算一次。
 * 未配置 ICO 时安静跳过（不报错、不刷日志）。
 * 之前只有 adminRunRewards 需管理员手动跑，导致「待领收益」长期为 0；此调度补上自动结算。
 */
import { settleIcoRewards } from "./routers/ico";
import logger from "./utils/logger";

export function startIcoRewardScheduler(): void {
  const tick = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10); // UTC 日期 YYYY-MM-DD
      const r = await settleIcoRewards(date);
      if (r && !r.skipped) logger.info({ date, emitted: r.emitted, stakers: r.stakers, factor: r.factor }, "ICO 质押收益已结算");
    } catch (e) {
      logger.warn({ err: e }, "ICO 收益结算失败（非致命）");
    }
  };
  setInterval(() => { void tick(); }, 60 * 60 * 1000); // 每小时检查
  setTimeout(() => { void tick(); }, 30_000);          // 启动 30s 后先跑一次
}
