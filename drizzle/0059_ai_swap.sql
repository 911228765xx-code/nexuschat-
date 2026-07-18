-- AI/USDT 二级市场 Swap:内部 USDT 余额 + 链下 x*y=k AMM 池 + 成交流水(K线)
ALTER TABLE `users` ADD COLUMN `usdtBalance` decimal(30,8) NOT NULL DEFAULT '0';

CREATE TABLE `ai_amm_pool` (
  `id` int NOT NULL,
  `aiReserve` decimal(30,8) NOT NULL DEFAULT '0',
  `usdtReserve` decimal(30,8) NOT NULL DEFAULT '0',
  `reserveR` decimal(30,8) NOT NULL DEFAULT '0',
  `circulatingAi` decimal(30,8) NOT NULL DEFAULT '0',
  `crisisFund` decimal(30,8) NOT NULL DEFAULT '0',
  `divPool` decimal(30,8) NOT NULL DEFAULT '0',
  `thetaStartBps` int NOT NULL DEFAULT 5200,
  `thetaEndBps` int NOT NULL DEFAULT 2700,
  `thetaHalfBuyUsdt` decimal(30,8) NOT NULL DEFAULT '100000',
  `cumBoughtUsdt` decimal(40,8) NOT NULL DEFAULT '0',
  `baseTaxBps` int NOT NULL DEFAULT 500,
  `maxTaxBps` int NOT NULL DEFAULT 5000,
  `peakDecayPerDayBps` int NOT NULL DEFAULT 400,
  `peakPrice` decimal(30,10) NOT NULL DEFAULT '0',
  `peakUpdatedAt` timestamp NULL,
  `seeded` boolean NOT NULL DEFAULT false,
  `totalVolUsdt` decimal(40,8) NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `ai_amm_pool_id` PRIMARY KEY(`id`)
);

CREATE TABLE `ai_swap_trades` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `side` enum('buy','sell') NOT NULL,
  `aiAmount` decimal(30,8) NOT NULL,
  `usdtAmount` decimal(30,8) NOT NULL,
  `price` decimal(30,10) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `ai_swap_trades_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_aiswap_time` ON `ai_swap_trades` (`createdAt`);
