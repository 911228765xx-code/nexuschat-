CREATE TABLE `swap_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletAddress` varchar(64) NOT NULL,
	`fromToken` varchar(20) NOT NULL,
	`toToken` varchar(20) NOT NULL,
	`fromAmount` varchar(50) NOT NULL,
	`toAmount` varchar(50) NOT NULL,
	`rate` varchar(50) NOT NULL,
	`dex` varchar(50) NOT NULL,
	`txHash` varchar(70) NOT NULL,
	`slippage` varchar(10) NOT NULL DEFAULT '0.5',
	`status` enum('pending','success','failed') NOT NULL DEFAULT 'success',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `swap_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_swap_user` ON `swap_history` (`userId`,`createdAt`);