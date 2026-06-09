CREATE TABLE `nn_vesting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`source` varchar(20) NOT NULL,
	`refId` int,
	`totalNN` int NOT NULL,
	`claimedNN` int NOT NULL DEFAULT 0,
	`startAt` timestamp NOT NULL,
	`cliffMonths` int NOT NULL DEFAULT 0,
	`durationMonths` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nn_vesting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_vesting_user` ON `nn_vesting` (`userId`);