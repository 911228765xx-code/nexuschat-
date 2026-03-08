CREATE TABLE `consulting_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`walletAddress` varchar(42) NOT NULL,
	`txHash` varchar(100),
	`amount` varchar(20) NOT NULL DEFAULT '10',
	`chain` varchar(20) NOT NULL DEFAULT 'BSC',
	`status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consulting_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consulting_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`queryType` enum('project','security','market') NOT NULL DEFAULT 'project',
	`queryText` text NOT NULL,
	`summary` text,
	`fullContent` text,
	`status` enum('pending_payment','generating','completed','failed') NOT NULL DEFAULT 'pending_payment',
	`pricePaid` varchar(20) DEFAULT '10',
	`txHash` varchar(100),
	`cacheKey` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consulting_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_cpay_report` ON `consulting_payments` (`reportId`);--> statement-breakpoint
CREATE INDEX `idx_cpay_user` ON `consulting_payments` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_cpay_tx` ON `consulting_payments` (`txHash`);--> statement-breakpoint
CREATE INDEX `idx_consulting_user` ON `consulting_reports` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_consulting_cache` ON `consulting_reports` (`cacheKey`);--> statement-breakpoint
CREATE INDEX `idx_consulting_tx` ON `consulting_reports` (`txHash`);