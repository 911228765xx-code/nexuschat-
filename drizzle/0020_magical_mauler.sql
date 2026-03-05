CREATE TABLE `group_announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`content` text NOT NULL,
	`createdBy` int NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `red_packet_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` bigint NOT NULL,
	`groupId` int NOT NULL,
	`claimedBy` int NOT NULL,
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `red_packet_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ann_group` ON `group_announcements` (`groupId`,`isPinned`);--> statement-breakpoint
CREATE INDEX `idx_rpc_message` ON `red_packet_claims` (`messageId`);--> statement-breakpoint
CREATE INDEX `idx_rpc_claimer` ON `red_packet_claims` (`messageId`,`claimedBy`);