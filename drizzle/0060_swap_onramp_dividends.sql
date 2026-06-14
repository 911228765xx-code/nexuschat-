-- Swap 出入金(USDT 充值/提现)+ 分红合规闸门
ALTER TABLE `ai_amm_pool` ADD COLUMN `dividendClaimsEnabled` boolean NOT NULL DEFAULT false;

CREATE TABLE `usdt_deposits` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `amount` decimal(30,8) NOT NULL,
  `txHash` varchar(120) NOT NULL,
  `status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `confirmedAt` timestamp NULL,
  CONSTRAINT `usdt_deposits_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_usdtdep_user` ON `usdt_deposits` (`userId`);
CREATE INDEX `idx_usdtdep_status` ON `usdt_deposits` (`status`);

CREATE TABLE `usdt_withdrawals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `amount` decimal(30,8) NOT NULL,
  `address` varchar(80) NOT NULL,
  `status` enum('pending','done','rejected') NOT NULL DEFAULT 'pending',
  `txHash` varchar(120) NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `processedAt` timestamp NULL,
  CONSTRAINT `usdt_withdrawals_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_usdtwd_user` ON `usdt_withdrawals` (`userId`);
CREATE INDEX `idx_usdtwd_status` ON `usdt_withdrawals` (`status`);
