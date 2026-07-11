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
ALTER TABLE `users` ADD `partnerTier` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `partnerStakeUsdt` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_pbonus_user` ON `partner_bonuses` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_pearn_user` ON `partner_earnings` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_pearn_ymd` ON `partner_earnings` (`ymd`);--> statement-breakpoint
CREATE INDEX `idx_ppayout_user` ON `partner_payouts` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_ppayout_status` ON `partner_payouts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pfee_settled` ON `platform_fee_ledger` (`settled`);