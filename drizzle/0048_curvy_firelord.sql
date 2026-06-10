ALTER TABLE `users` ADD `deviceId` varchar(64);--> statement-breakpoint
CREATE INDEX `idx_users_device` ON `users` (`deviceId`);