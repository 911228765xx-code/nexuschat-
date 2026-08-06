-- BIT 段位空投：用户捐献 IT 后领取（每人每天一次）
CREATE TABLE IF NOT EXISTS `bit_rank_airdrop_claim` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `ymd` varchar(10) NOT NULL,
  `tier` int NOT NULL,
  `itCost` int NOT NULL,
  `bitAmount` int NOT NULL,
  `claimedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_bit_airdrop_claim_user_ymd` (`userId`, `ymd`),
  KEY `idx_bit_airdrop_claim_ymd` (`ymd`)
);
