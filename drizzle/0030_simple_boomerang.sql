CREATE TABLE `ai_daily_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`day` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	CONSTRAINT `ai_daily_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_bots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`botType` varchar(30) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`config` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_bots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nn_node_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` varchar(20) NOT NULL,
	`usdtAmount` int NOT NULL,
	`nnAmount` int NOT NULL,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`txHash` varchar(120),
	`payAddress` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `nn_node_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nn_pool` (
	`id` int NOT NULL,
	`reserveNN` bigint NOT NULL DEFAULT 0,
	`soldNN` bigint NOT NULL DEFAULT 0,
	`priceNnPerUsdt` int NOT NULL DEFAULT 20,
	`raisedUsdt` bigint NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nn_pool_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nn_pool_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usdtAmount` int NOT NULL,
	`nnAmount` int NOT NULL,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`txHash` varchar(120),
	`payAddress` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `nn_pool_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nn_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`type` varchar(30) NOT NULL,
	`refType` varchar(20),
	`refId` int,
	`memo` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nn_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `promotedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `nnBalance` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `proTier` varchar(20) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `proUntil` timestamp;--> statement-breakpoint
CREATE INDEX `idx_aiusage_user_day` ON `ai_daily_usage` (`userId`,`day`);--> statement-breakpoint
CREATE INDEX `idx_groupbots` ON `group_bots` (`groupId`,`botType`);--> statement-breakpoint
CREATE INDEX `idx_nodeorder_user` ON `nn_node_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_nodeorder_status` ON `nn_node_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_poolorder_user` ON `nn_pool_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_poolorder_status` ON `nn_pool_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_nntx_user` ON `nn_transactions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_nntx_type` ON `nn_transactions` (`type`);