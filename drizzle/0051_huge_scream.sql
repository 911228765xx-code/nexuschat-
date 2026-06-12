ALTER TABLE `app_config` MODIFY COLUMN `aiChatCost` int NOT NULL DEFAULT 10;
--> statement-breakpoint
UPDATE `app_config` SET `aiChatCost` = 10 WHERE `aiChatCost` = 5;
