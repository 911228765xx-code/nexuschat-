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
CREATE INDEX `idx_stake_call` ON `curation_stakes` (`callId`);