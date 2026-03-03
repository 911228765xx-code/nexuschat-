CREATE TABLE `group_unread_counts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int NOT NULL,
	`lastReadMessageId` bigint NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_unread_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_unread_user_group` ON `group_unread_counts` (`userId`,`groupId`);