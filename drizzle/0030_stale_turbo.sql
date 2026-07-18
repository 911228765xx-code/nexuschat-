ALTER TABLE `red_packet_claims` MODIFY COLUMN `groupId` int;--> statement-breakpoint
ALTER TABLE `red_packets` MODIFY COLUMN `groupId` int;--> statement-breakpoint
ALTER TABLE `red_packets` ADD `receiverId` int;