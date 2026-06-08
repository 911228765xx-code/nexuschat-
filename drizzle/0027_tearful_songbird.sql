CREATE TABLE `red_packets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` bigint NOT NULL,
	`groupId` int NOT NULL,
	`senderId` int NOT NULL,
	`totalAmount` int NOT NULL,
	`totalShares` int NOT NULL,
	`remainingAmount` int NOT NULL,
	`remainingShares` int NOT NULL,
	`isRandom` boolean NOT NULL DEFAULT true,
	`blessing` varchar(100) NOT NULL DEFAULT '恭喜发财，大吉大利',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `red_packets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `messageType` enum('text','image','file','system','redpacket','transfer','voice','video') NOT NULL DEFAULT 'text';--> statement-breakpoint
ALTER TABLE `messages` ADD `durationSeconds` int;--> statement-breakpoint
ALTER TABLE `red_packet_claims` ADD `amount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_rp_message` ON `red_packets` (`messageId`);--> statement-breakpoint
CREATE INDEX `idx_rp_group` ON `red_packets` (`groupId`);