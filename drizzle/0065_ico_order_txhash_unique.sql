-- 认购订单 txHash 全局唯一(NULL 允许多个=未填哈希的 pending 单不受限):
-- 杜绝同一笔链上转账填到多张订单各自确认 → 凭空多发认购代币。
-- 若历史已有重复 txHash 需先人工清理再加索引。
ALTER TABLE `ico_orders` ADD UNIQUE INDEX `uq_icoord_tx` (`txHash`);
