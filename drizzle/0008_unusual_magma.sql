CREATE TABLE `user_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyPrefix` varchar(10) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`label` varchar(100) DEFAULT 'Default',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`showWallet` boolean NOT NULL DEFAULT false,
	`showActivity` boolean NOT NULL DEFAULT true,
	`showNFTs` boolean NOT NULL DEFAULT true,
	`readReceipts` boolean NOT NULL DEFAULT true,
	`profileVisible` boolean NOT NULL DEFAULT true,
	`twoFAEnabled` boolean NOT NULL DEFAULT false,
	`biometricEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `idx_api_keys_user` ON `user_api_keys` (`userId`);