/**
 * 机器人 LLM 调用的全局日预算(防成本失控)。
 *
 * 氛围/自动回复/定时机器人都共用这一个计数器:每天累计调用 invokeLLM 的次数
 * 到达上限后,后续机器人调用一律跳过(不影响用户自己的 AI 助手——只 gate 机器人发起的调用)。
 * 进程内计数,跨自然日(本地时区)自动归零。多实例部署时为「每实例」上限。
 * 可用 BOT_LLM_DAILY_CAP 调整(默认 2000 次/天)。
 */
const DAILY_CAP = Math.max(0, Number(process.env.BOT_LLM_DAILY_CAP || 2000));

let dayKey = "";
let count = 0;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 消耗一次机器人 LLM 额度。返回 true=允许并已计数;false=今日已达上限,调用方应跳过 invokeLLM。 */
export function consumeBotLLMBudget(): boolean {
  const t = todayKey();
  if (t !== dayKey) { dayKey = t; count = 0; }
  if (count >= DAILY_CAP) return false;
  count++;
  return true;
}

/** 当前用量(供后台/日志查看)。 */
export function botLLMBudgetStatus(): { used: number; cap: number } {
  const t = todayKey();
  return { used: t === dayKey ? count : 0, cap: DAILY_CAP };
}
