-- 修正 AI 单价：0051 的 UPDATE 仅命中 aiChatCost=5 的库，
-- 而线上历史值为 500（旧定价），未被更新 → AI 助手仍显示「500 AI/次」。
-- 这里把任何 ≥100 的历史异常值统一拉回 10（不动管理员后台设过的合理值如 10/20/80）。
UPDATE `app_config` SET `aiChatCost` = 10 WHERE `aiChatCost` >= 100;
