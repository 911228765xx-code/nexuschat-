ALTER TABLE `messages` ADD `isRead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_dm_unread` ON `messages` (`receiverId`,`isRead`);