-- 拉黑(防骚扰):blockerId 拉黑 blockedId。配合"仅好友可私信"封堵骚扰。
CREATE TABLE `user_blocklist` (
  `id` int AUTO_INCREMENT NOT NULL,
  `blockerId` int NOT NULL,
  `blockedId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `user_blocklist_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_block_pair` UNIQUE(`blockerId`,`blockedId`)
);
CREATE INDEX `idx_block_blocked` ON `user_blocklist` (`blockedId`);
