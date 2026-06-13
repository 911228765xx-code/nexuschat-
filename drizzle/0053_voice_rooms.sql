CREATE TABLE `voice_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`title` varchar(60) NOT NULL,
	`topic` varchar(80),
	`category` enum('trade','study','project','chat') NOT NULL DEFAULT 'chat',
	`hostUserId` int NOT NULL,
	`isMembersOnly` boolean NOT NULL DEFAULT false,
	`status` enum('live','ended') NOT NULL DEFAULT 'live',
	`speakerCount` int NOT NULL DEFAULT 1,
	`listenerCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `voice_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_vroom_roomid` UNIQUE(`roomId`)
);
--> statement-breakpoint
CREATE INDEX `idx_vroom_status` ON `voice_rooms` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_vroom_host` ON `voice_rooms` (`hostUserId`);
