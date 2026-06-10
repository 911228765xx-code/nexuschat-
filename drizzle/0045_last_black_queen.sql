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
CREATE INDEX `idx_calls_user` ON `calls` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_calls_pending` ON `calls` (`status`,`resolveAt`);