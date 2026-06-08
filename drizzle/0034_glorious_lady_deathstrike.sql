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
CREATE INDEX `idx_nntx_user` ON `nn_transactions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_nntx_type` ON `nn_transactions` (`type`);