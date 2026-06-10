CREATE TABLE `content_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(20) NOT NULL,
	`source` varchar(20) NOT NULL,
	`snippet` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_violation_user` ON `content_violations` (`userId`,`createdAt`);