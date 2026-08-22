CREATE TABLE `island_daily_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmId` int NOT NULL,
	`orderDate` varchar(10) NOT NULL,
	`orderKey` varchar(40) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'available',
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `island_daily_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_island_daily_order` UNIQUE(`farmId`,`orderDate`,`orderKey`)
);
--> statement-breakpoint
CREATE TABLE `island_group_contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmId` int NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`contributionDate` varchar(10) NOT NULL,
	`amount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `island_group_contributions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_island_group_daily` UNIQUE(`farmId`,`groupId`,`contributionDate`)
);
--> statement-breakpoint
ALTER TABLE `island_pets` ADD `lastExploredAt` timestamp;--> statement-breakpoint
ALTER TABLE `island_pets` ADD `explorationCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_island_group_daily` ON `island_group_contributions` (`groupId`,`contributionDate`);