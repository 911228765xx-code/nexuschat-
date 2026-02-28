CREATE TABLE `copy_trader_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`traderId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `copy_trader_follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copy_traders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`avatar` varchar(10) DEFAULT '🤖',
	`badge` enum('gold','silver','bronze','none') NOT NULL DEFAULT 'none',
	`description` text,
	`riskLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`totalReturn` varchar(30) DEFAULT '0',
	`winRate` int DEFAULT 0,
	`trades30d` int DEFAULT 0,
	`maxDrawdown` varchar(30) DEFAULT '0',
	`topPairs` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copy_traders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_strategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`type` enum('grid','dca','momentum','arbitrage','custom') NOT NULL DEFAULT 'custom',
	`pair` varchar(30),
	`riskLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`isActive` boolean NOT NULL DEFAULT true,
	`totalReturn` varchar(30) DEFAULT '0',
	`winRate` int DEFAULT 0,
	`totalTrades` int DEFAULT 0,
	`maxDrawdown` varchar(30) DEFAULT '0',
	`stopLoss` varchar(30),
	`takeProfit` varchar(30),
	`maxPosition` varchar(30),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_strategies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ct_follows_user` ON `copy_trader_follows` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_ct_follows_trader` ON `copy_trader_follows` (`traderId`);--> statement-breakpoint
CREATE INDEX `idx_copy_traders_user` ON `copy_traders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_strategies_user` ON `trading_strategies` (`userId`);