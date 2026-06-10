CREATE TABLE `rank_agg_run` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rank_agg_run_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_rank_agg_ymd` UNIQUE(`ymd`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `rankScore` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `rankTier` int DEFAULT 0 NOT NULL;