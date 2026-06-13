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
	CONSTRAINT `ico_orders_id` PRIMARY KEY(`id`)
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
CREATE INDEX `idx_icoord_user` ON `ico_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_icoord_status` ON `ico_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_icopur_user` ON `ico_purchases` (`userId`);
