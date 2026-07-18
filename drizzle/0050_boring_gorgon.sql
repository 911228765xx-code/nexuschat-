CREATE TABLE `promo_banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`text` varchar(80) NOT NULL,
	`targetType` enum('group','post','none') NOT NULL DEFAULT 'none',
	`targetId` int,
	`status` enum('active','removed') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promo_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_pbanner_status` ON `promo_banners` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_pbanner_user` ON `promo_banners` (`userId`);