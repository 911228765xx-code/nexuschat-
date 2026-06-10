CREATE TABLE `user_daily_np` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`earned` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `user_daily_np_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_daily_np_user_ymd` UNIQUE(`userId`,`ymd`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `reputation` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `signinStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastSigninYmd` varchar(10);