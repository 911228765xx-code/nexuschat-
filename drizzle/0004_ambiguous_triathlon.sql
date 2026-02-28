CREATE TABLE `friend_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`receiverId` int NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friend_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenId` varchar(100) NOT NULL,
	`tokenSymbol` varchar(20) NOT NULL,
	`tokenName` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_friend_req_receiver` ON `friend_requests` (`receiverId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_friend_req_sender` ON `friend_requests` (`senderId`);--> statement-breakpoint
CREATE INDEX `idx_watchlist_user` ON `user_watchlist` (`userId`);