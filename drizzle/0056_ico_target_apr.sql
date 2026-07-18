-- ICO 质押收益:「每人目标年化 + 奖励池封顶 + 线性 + 年化可线性递减(可随时调)」
-- aprStart 起始年化(1=100%)、aprEnd 结束年化(线性降到此值;=aprStart 则恒定)、aprDeclineDays 递减天数。
-- 旧 rewardDays/alpha/baseShare 列保留但停用。
ALTER TABLE `ico_config` ADD COLUMN `aprStart` decimal(8,4) NOT NULL DEFAULT '1.0000';
ALTER TABLE `ico_config` ADD COLUMN `aprEnd` decimal(8,4) NOT NULL DEFAULT '1.0000';
ALTER TABLE `ico_config` ADD COLUMN `aprDeclineDays` int NOT NULL DEFAULT 365;
