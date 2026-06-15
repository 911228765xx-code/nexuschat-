-- 新增「contact」消息类型(推荐好友名片)。content 存名片 JSON {contactId,name,username,avatar,bio}。
ALTER TABLE `messages` MODIFY COLUMN `messageType` ENUM('text','image','file','system','redpacket','transfer','voice','video','contact') NOT NULL DEFAULT 'text';
