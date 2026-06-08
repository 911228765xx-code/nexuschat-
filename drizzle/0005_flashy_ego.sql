CREATE TABLE `trading_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pair` varchar(30) NOT NULL,
	`side` enum('long','short') NOT NULL,
	`entryPrice` varchar(30) NOT NULL,
	`amount` varchar(30) NOT NULL,
	`leverage` int NOT NULL DEFAULT 1,
	`stopLossPrice` varchar(30),
	`takeProfitPrice` varchar(30),
	`liquidationPrice` varchar(30),
	`strategyName` varchar(100),
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_positions_user` ON `trading_positions` (`userId`,`status`);