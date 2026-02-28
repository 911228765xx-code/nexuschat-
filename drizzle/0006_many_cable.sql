CREATE TABLE `contact_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int NOT NULL,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`note` text,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_contact_meta_user` ON `contact_metadata` (`userId`,`contactId`);