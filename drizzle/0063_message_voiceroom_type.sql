-- 新增「voiceroom」消息类型(分享语音房,可点进房)。content 存 JSON {roomId,title}。
ALTER TABLE `messages` MODIFY COLUMN `messageType` ENUM('text','image','file','system','redpacket','transfer','voice','video','contact','voiceroom') NOT NULL DEFAULT 'text';
