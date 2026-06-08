CREATE TABLE `group_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`uploaderId` int NOT NULL,
	`messageId` bigint,
	`fileName` varchar(255) NOT NULL,
	`fileSize` bigint NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileKey` text NOT NULL,
	`url` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_invite_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`creatorId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`maxUses` int NOT NULL DEFAULT 0,
	`useCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_invite_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_invite_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `group_mutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`mutedBy` int NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_mutes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_read_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` bigint NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_read_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_files_group` ON `group_files` (`groupId`);--> statement-breakpoint
CREATE INDEX `idx_files_uploader` ON `group_files` (`uploaderId`);--> statement-breakpoint
CREATE INDEX `idx_invite_token` ON `group_invite_links` (`token`);--> statement-breakpoint
CREATE INDEX `idx_invite_group` ON `group_invite_links` (`groupId`);--> statement-breakpoint
CREATE INDEX `idx_mutes_group_user` ON `group_mutes` (`groupId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_receipts_message` ON `message_read_receipts` (`messageId`);--> statement-breakpoint
CREATE INDEX `idx_receipts_user_group` ON `message_read_receipts` (`userId`,`groupId`);