CREATE TABLE `group_bots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`botType` varchar(30) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`config` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_bots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_groupbots` ON `group_bots` (`groupId`,`botType`);