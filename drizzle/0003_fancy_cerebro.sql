CREATE TABLE `user_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_follows_follower` ON `user_follows` (`followerId`);--> statement-breakpoint
CREATE INDEX `idx_follows_following` ON `user_follows` (`followingId`);