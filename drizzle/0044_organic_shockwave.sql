CREATE TABLE `referral_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteeId` int NOT NULL,
	`milestone` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_milestones_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_ref_milestone` UNIQUE(`inviteeId`,`milestone`)
);
