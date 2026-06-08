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
ALTER TABLE `posts` ADD `promotedUntil` timestamp;--> statement-breakpoint
CREATE INDEX `idx_poolorder_user` ON `nn_pool_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_poolorder_status` ON `nn_pool_orders` (`status`);