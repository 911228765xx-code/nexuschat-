ALTER TABLE `users` ADD `inviteCode` varchar(32);--> statement-breakpoint
CREATE INDEX `idx_users_invite_code` ON `users` (`inviteCode`);