CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('like','comment','follow','mention','system') NOT NULL,
	`fromUserId` int,
	`fromUserName` varchar(100),
	`fromUserAvatar` varchar(200),
	`postId` int,
	`content` varchar(500) NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_notif_user` ON `notifications` (`userId`,`isRead`,`createdAt`);