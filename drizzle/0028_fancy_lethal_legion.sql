CREATE TABLE `conversation_prefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`convKey` varchar(40) NOT NULL,
	`isMuted` boolean NOT NULL DEFAULT false,
	`isPinned` boolean NOT NULL DEFAULT false,
	`clearedBeforeId` bigint NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_prefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_join_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_join_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_groups` ADD `joinApproval` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `replyToId` bigint;--> statement-breakpoint
ALTER TABLE `messages` ADD `forwardFromId` bigint;--> statement-breakpoint
ALTER TABLE `messages` ADD `isPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `recalledAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_convpref_user` ON `conversation_prefs` (`userId`,`convKey`);--> statement-breakpoint
CREATE INDEX `idx_gjr_group` ON `group_join_requests` (`groupId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_msg_pinned` ON `messages` (`groupId`,`isPinned`);