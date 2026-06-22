CREATE TABLE `device_push_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`platform` varchar(16) NOT NULL DEFAULT 'android',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_device_push_token` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_device_push_user` ON `device_push_tokens` (`userId`);
