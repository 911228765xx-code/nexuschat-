CREATE TABLE `tge_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`npSnapshot` bigint NOT NULL,
	`nnAmount` bigint NOT NULL DEFAULT 0,
	`claimed` boolean NOT NULL DEFAULT false,
	`claimedAt` timestamp,
	CONSTRAINT `tge_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_tge_user` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `tge_config` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`nnPool` bigint NOT NULL DEFAULT 0,
	`totalNpSnapshot` bigint NOT NULL DEFAULT 0,
	`snapshotAt` timestamp,
	CONSTRAINT `tge_config_id` PRIMARY KEY(`id`)
);
