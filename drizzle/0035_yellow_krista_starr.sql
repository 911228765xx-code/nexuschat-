ALTER TABLE `users` ADD `proTier` varchar(20) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `proUntil` timestamp;