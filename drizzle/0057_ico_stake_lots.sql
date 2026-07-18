-- 质押批次表:每笔资金各自计龄,新资金/复投从入场起按 aprStart(如200%)起步,沿曲线降到 aprEnd(如50%)。
CREATE TABLE `ico_stake_lots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `amount` decimal(30,8) NOT NULL,
  `stakedAt` timestamp NOT NULL,
  `source` enum('purchase','compound') NOT NULL DEFAULT 'purchase',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `ico_stake_lots_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_icolot_user` ON `ico_stake_lots` (`userId`);

-- 回填:把已有成交流水当作初始批次(入场时间=成交时间)。仅 pre-launch 测试数据,无提取历史。
INSERT INTO `ico_stake_lots` (`userId`, `amount`, `stakedAt`, `source`, `createdAt`)
SELECT `userId`, `tokensBought`, `createdAt`, 'purchase', `createdAt` FROM `ico_purchases`;
