CREATE TABLE `bit_rank_airdrop_run` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ymd` varchar(10) NOT NULL,
	`monthIndex` int NOT NULL DEFAULT 0,
	`dailyPool` int NOT NULL DEFAULT 0,
	`paidUsers` int NOT NULL DEFAULT 0,
	`paidTotal` int NOT NULL DEFAULT 0,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bit_rank_airdrop_run_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_bit_rank_airdrop_ymd` UNIQUE(`ymd`)
);
