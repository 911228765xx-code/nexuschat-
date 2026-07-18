ALTER TABLE `app_config` ADD `aiChatCost` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `app_config` ADD `taskRewards` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `isRead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isBanned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_dm_unread` ON `messages` (`receiverId`,`isRead`);--> statement-breakpoint
CREATE INDEX `idx_msg_expires` ON `messages` (`expiresAt`);