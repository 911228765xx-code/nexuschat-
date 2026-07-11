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
	`peakUpdatedAt` timestamp,
	`dividendClaimsEnabled` boolean NOT NULL DEFAULT false,
	`seeded` boolean NOT NULL DEFAULT false,
	`totalVolUsdt` decimal(40,8) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_amm_pool_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenSymbol` varchar(20) NOT NULL,
	`direction` enum('long','short') NOT NULL,
	`horizonHours` int NOT NULL,
	`entryPrice` varchar(40) NOT NULL,
	`resolvedPrice` varchar(40),
	`changeBp` int,
	`status` enum('pending','win','lose','void') NOT NULL DEFAULT 'pending',
	`note` varchar(280),
	`createdYmd` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolveAt` timestamp NOT NULL,
	`resolvedAt` timestamp,
	CONSTRAINT `calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(20) NOT NULL,
	`source` varchar(20) NOT NULL,
	`snippet` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curation_stakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stakerId` int NOT NULL,
	`callId` int NOT NULL,
	`amount` int NOT NULL,
	`status` enum('active','won','lost','void') NOT NULL DEFAULT 'active',
	`payout` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`settledAt` timestamp,
	CONSTRAINT `curation_stakes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_stake_user_call` UNIQUE(`stakerId`,`callId`)
);
--> statement-breakpoint
CREATE TABLE `device_push_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`platform` varchar(16) NOT NULL DEFAULT 'android',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_device_push_token` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` varchar(1000) NOT NULL,
	`contact` varchar(120),
	`appVersion` varchar(24),
	`platform` varchar(16),
	`status` enum('new','read','resolved') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ico_accounts` (
	`userId` int NOT NULL,
	`lockedTotal` decimal(30,8) NOT NULL DEFAULT '0',
	`withdrawnPrincipal` decimal(30,8) NOT NULL DEFAULT '0',
	`stakedBalance` decimal(30,8) NOT NULL DEFAULT '0',
	`pendingReward` decimal(30,8) NOT NULL DEFAULT '0',
	`claimedReward` decimal(30,8) NOT NULL DEFAULT '0',
	`autoCompound` boolean NOT NULL DEFAULT true,
	`firstPurchaseAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ico_accounts_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `ico_config` (
	`id` int NOT NULL,
	`totalTokens` decimal(30,8) NOT NULL,
	`tokensSold` decimal(30,8) NOT NULL DEFAULT '0',
	`startPrice` decimal(18,8) NOT NULL,
	`endPrice` decimal(18,8) NOT NULL,
	`exponent` decimal(8,4) NOT NULL DEFAULT '1.5000',
	`listingPrice` decimal(18,8) NOT NULL DEFAULT '3',
	`status` enum('paused','active','ended') NOT NULL DEFAULT 'paused',
	`perWalletCap` decimal(30,8) NOT NULL DEFAULT '0',
	`rewardPoolTotal` decimal(30,8) NOT NULL DEFAULT '0',
	`rewardEmitted` decimal(30,8) NOT NULL DEFAULT '0',
	`aprStart` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`aprEnd` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`aprDeclineDays` int NOT NULL DEFAULT 365,
	`rewardDays` int NOT NULL DEFAULT 730,
	`alpha` decimal(6,3) NOT NULL DEFAULT '0.500',
	`baseShare` decimal(6,3) NOT NULL DEFAULT '0.200',
	`vestMonths` int NOT NULL DEFAULT 12,
	`vestCliffMonths` int NOT NULL DEFAULT 1,
	`startAt` timestamp,
	`endAt` timestamp,
	CONSTRAINT `ico_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ico_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usdtAmount` decimal(20,6) NOT NULL,
	`minTokens` decimal(30,8) NOT NULL DEFAULT '0',
	`txHash` varchar(120),
	`payAddress` varchar(120),
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`purchaseId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `ico_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_icoord_tx` UNIQUE(`txHash`)
);
--> statement-breakpoint
CREATE TABLE `ico_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usdtAmount` decimal(20,6) NOT NULL,
	`tokensBought` decimal(30,8) NOT NULL,
	`priceFrom` decimal(18,8) NOT NULL,
	`priceTo` decimal(18,8) NOT NULL,
	`avgPrice` decimal(18,8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ico_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ico_reward_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runDate` varchar(10) NOT NULL,
	`stakers` int NOT NULL DEFAULT 0,
	`totalWeight` decimal(40,8) NOT NULL DEFAULT '0',
	`emitted` decimal(30,8) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ico_reward_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_icorun_date` UNIQUE(`runDate`)
);
--> statement-breakpoint
CREATE TABLE `ico_stake_lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(30,8) NOT NULL,
	`stakedAt` timestamp NOT NULL,
	`source` enum('purchase','compound') NOT NULL DEFAULT 'purchase',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ico_stake_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_bonuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`totalUsdt` int NOT NULL,
	`periods` int NOT NULL DEFAULT 6,
	`claimedPeriods` int NOT NULL DEFAULT 0,
	`claimedUsdt` int NOT NULL DEFAULT 0,
	`startAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_bonuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_earnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('fee','revenue') NOT NULL,
	`amountNN` int NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_earnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bonusId` int NOT NULL,
	`period` int NOT NULL,
	`amountUsdt` int NOT NULL,
	`address` varchar(120) NOT NULL,
	`status` enum('pending','paid','rejected') NOT NULL DEFAULT 'pending',
	`txHash` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `partner_payouts_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_ppayout_bonus_period` UNIQUE(`bonusId`,`period`)
);
--> statement-breakpoint
CREATE TABLE `partner_settle_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`kind` varchar(10) NOT NULL,
	`poolNN` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_settle_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_psettle_ymd_kind` UNIQUE(`ymd`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `platform_fee_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseNN` int NOT NULL,
	`poolNN` int NOT NULL,
	`source` varchar(30) NOT NULL,
	`settled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_fee_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promo_banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`text` varchar(80) NOT NULL,
	`targetType` enum('group','post','none') NOT NULL DEFAULT 'none',
	`targetId` int,
	`status` enum('active','removed') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promo_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rank_agg_run` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rank_agg_run_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_rank_agg_ymd` UNIQUE(`ymd`)
);
--> statement-breakpoint
CREATE TABLE `referral_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteeId` int NOT NULL,
	`milestone` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_milestones_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_ref_milestone` UNIQUE(`inviteeId`,`milestone`)
);
--> statement-breakpoint
CREATE TABLE `tge_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`npSnapshot` bigint NOT NULL,
	`nnAmount` bigint NOT NULL DEFAULT 0,
	`claimed` boolean NOT NULL DEFAULT false,
	`claimedAt` timestamp,
	CONSTRAINT `tge_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_tge_user` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `tge_config` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`nnPool` bigint NOT NULL DEFAULT 0,
	`totalNpSnapshot` bigint NOT NULL DEFAULT 0,
	`snapshotAt` timestamp,
	CONSTRAINT `tge_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usdt_deposits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(30,8) NOT NULL,
	`txHash` varchar(120) NOT NULL,
	`status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `usdt_deposits_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_usdtdep_tx` UNIQUE(`txHash`)
);
--> statement-breakpoint
CREATE TABLE `usdt_withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(30,8) NOT NULL,
	`address` varchar(80) NOT NULL,
	`status` enum('pending','done','rejected') NOT NULL DEFAULT 'pending',
	`txHash` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `usdt_withdrawals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_blocklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`blockedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_blocklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_block_pair` UNIQUE(`blockerId`,`blockedId`)
);
--> statement-breakpoint
CREATE TABLE `user_daily_np` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`earned` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `user_daily_np_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_daily_np_user_ymd` UNIQUE(`userId`,`ymd`)
);
--> statement-breakpoint
CREATE TABLE `voice_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`title` varchar(60) NOT NULL,
	`topic` varchar(80),
	`category` enum('trade','study','project','chat') NOT NULL DEFAULT 'chat',
	`hostUserId` int NOT NULL,
	`isMembersOnly` boolean NOT NULL DEFAULT false,
	`isPublic` boolean NOT NULL DEFAULT true,
	`status` enum('live','ended') NOT NULL DEFAULT 'live',
	`speakerCount` int NOT NULL DEFAULT 1,
	`listenerCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `voice_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_vroom_roomid` UNIQUE(`roomId`)
);
--> statement-breakpoint
ALTER TABLE `app_config` MODIFY COLUMN `aiChatCost` int NOT NULL DEFAULT 10;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `messageType` enum('text','image','file','system','redpacket','transfer','voice','video','contact','voiceroom') NOT NULL DEFAULT 'text';--> statement-breakpoint
ALTER TABLE `chat_groups` ADD `forbidAddFriend` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contact_metadata` ADD `remarkName` varchar(50);--> statement-breakpoint
ALTER TABLE `group_members` ADD `alias` varchar(50);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `dmOnlyFriends` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `usdtBalance` decimal(30,8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `reputation` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `rankScore` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `rankTier` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `signinStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastSigninYmd` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `deviceId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `partnerTier` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `partnerStakeUsdt` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `icoTier` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_aiswap_time` ON `ai_swap_trades` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_calls_user` ON `calls` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_calls_pending` ON `calls` (`status`,`resolveAt`);--> statement-breakpoint
CREATE INDEX `idx_violation_user` ON `content_violations` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_stake_call` ON `curation_stakes` (`callId`);--> statement-breakpoint
CREATE INDEX `idx_device_push_user` ON `device_push_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_user` ON `feedback` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_status` ON `feedback` (`status`);--> statement-breakpoint
CREATE INDEX `idx_icoord_user` ON `ico_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_icoord_status` ON `ico_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_icopur_user` ON `ico_purchases` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_icolot_user` ON `ico_stake_lots` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_pbonus_user` ON `partner_bonuses` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_pearn_user` ON `partner_earnings` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_pearn_ymd` ON `partner_earnings` (`ymd`);--> statement-breakpoint
CREATE INDEX `idx_ppayout_user` ON `partner_payouts` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_ppayout_status` ON `partner_payouts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pfee_settled` ON `platform_fee_ledger` (`settled`);--> statement-breakpoint
CREATE INDEX `idx_pbanner_status` ON `promo_banners` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_pbanner_user` ON `promo_banners` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_usdtdep_user` ON `usdt_deposits` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_usdtdep_status` ON `usdt_deposits` (`status`);--> statement-breakpoint
CREATE INDEX `idx_usdtwd_user` ON `usdt_withdrawals` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_usdtwd_status` ON `usdt_withdrawals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_block_blocked` ON `user_blocklist` (`blockedId`);--> statement-breakpoint
CREATE INDEX `idx_vroom_status` ON `voice_rooms` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_vroom_host` ON `voice_rooms` (`hostUserId`);--> statement-breakpoint
CREATE INDEX `idx_users_device` ON `users` (`deviceId`);