-- CF-05 修复:usdt_deposits.txHash 全局唯一,杜绝同一笔链上转账拆成多条记录各自确认 = 凭空多入账。
-- 表上线后基本无真实充值(swap 刚开市),理论上无重复行;若有需先人工清理再加索引。
ALTER TABLE `usdt_deposits` ADD UNIQUE INDEX `uq_usdtdep_tx` (`txHash`);
