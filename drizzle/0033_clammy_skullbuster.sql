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
CREATE INDEX `idx_nodeorder_user` ON `nn_node_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_nodeorder_status` ON `nn_node_orders` (`status`);