CREATE TABLE `chat_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`avatar` text,
	`creatorId` int NOT NULL,
	`isTokenGated` boolean NOT NULL DEFAULT false,
	`tokenGateAmount` varchar(50) DEFAULT '0',
	`tokenGateContract` varchar(42),
	`maxMembers` int NOT NULL DEFAULT 500,
	`memberCount` int NOT NULL DEFAULT 0,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`groupId` int,
	`senderId` int NOT NULL,
	`receiverId` int,
	`content` text NOT NULL,
	`messageType` enum('text','image','file','system') NOT NULL DEFAULT 'text',
	`mediaUrl` text,
	`isEncrypted` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`mediaUrls` text,
	`tags` text,
	`likeCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`shareCount` int NOT NULL DEFAULT 0,
	`aiScore` int DEFAULT 0,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenSymbol` varchar(20) NOT NULL,
	`tokenId` varchar(100) NOT NULL,
	`targetPrice` varchar(30) NOT NULL,
	`condition` enum('above','below') NOT NULL,
	`isTriggered` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenSymbol` varchar(20) NOT NULL,
	`tokenName` varchar(100),
	`contractAddress` varchar(42),
	`chain` varchar(20) NOT NULL DEFAULT 'BSC',
	`reportContent` text NOT NULL,
	`priceAtReport` varchar(30),
	`marketCapAtReport` varchar(30),
	`sentiment` enum('bullish','neutral','bearish') DEFAULT 'neutral',
	`riskLevel` enum('low','medium','high') DEFAULT 'medium',
	`nxcCost` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskType` varchar(50) NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`npEarned` int NOT NULL DEFAULT 0,
	CONSTRAINT `user_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `walletAddress` varchar(42);--> statement-breakpoint
ALTER TABLE `users` ADD `walletChain` varchar(20) DEFAULT 'BSC';--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `npPoints` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_group_user` ON `group_members` (`groupId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_group_messages` ON `messages` (`groupId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_dm_messages` ON `messages` (`senderId`,`receiverId`);--> statement-breakpoint
CREATE INDEX `idx_comments_post` ON `post_comments` (`postId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_post_user_like` ON `post_likes` (`postId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_posts_author` ON `posts` (`authorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_alerts_user` ON `price_alerts` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_reports_user` ON `research_reports` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_tasks_user_type` ON `user_tasks` (`userId`,`taskType`,`completedAt`);