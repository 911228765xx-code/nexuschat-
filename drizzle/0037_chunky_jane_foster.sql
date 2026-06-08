CREATE TABLE `ai_daily_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`day` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	CONSTRAINT `ai_daily_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_aiusage_user_day` ON `ai_daily_usage` (`userId`,`day`);