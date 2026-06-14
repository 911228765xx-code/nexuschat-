-- 用户意见反馈表(help.tsx 反馈表单的真实落库,替换原 setTimeout 假提交)
CREATE TABLE `feedback` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `content` varchar(1000) NOT NULL,
  `contact` varchar(120),
  `appVersion` varchar(24),
  `platform` varchar(16),
  `status` enum('new','read','resolved') NOT NULL DEFAULT 'new',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_feedback_user` ON `feedback` (`userId`);
CREATE INDEX `idx_feedback_status` ON `feedback` (`status`);
