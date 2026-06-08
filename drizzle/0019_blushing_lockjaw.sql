CREATE TABLE `app_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('android','ios','all') NOT NULL DEFAULT 'all',
	`latestVersion` varchar(20) NOT NULL DEFAULT '1.0.0',
	`minVersion` varchar(20) NOT NULL DEFAULT '1.0.0',
	`downloadUrlAndroid` text,
	`downloadUrlIos` text,
	`releaseNotes` text,
	`isForceUpdate` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_config_id` PRIMARY KEY(`id`)
);
