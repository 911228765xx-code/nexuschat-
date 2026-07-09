/**
 * 用户端 AI(对话流 / 研报流 / research.generate)的全局每日预算(防成本失控)。
 *
 * 这三个端点保持「免费」(仅限流,不扣费),但原来只有进程内每用户限流、无全局上限,
 * 理论上多用户/多实例并发可把大模型成本拉到无上限。这里加一个全局日调用次数天花板:
 * 达上限后当天后续调用一律拒绝(返回繁忙),保护运营成本。
 *
 * 与 botBudget 相互独立(机器人预算不占用户额度)。进程内计数、跨自然日归零;
 * 多实例部署时为「每实例」上限(与 botBudget 同限制)。可用 USER_AI_LLM_DAILY_CAP 调整(默认 8000)。
 */
const DAILY_CAP = Math.max(0, Number(process.env.USER_AI_LLM_DAILY_CAP || 8000));

let dayKey = "";
let count = 0;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 消耗一次用户 AI 额度。返回 true=允许并已计数;false=今日全局已达上限,调用方应拒绝并提示繁忙。 */
export function consumeUserAiBudget(): boolean {
  const t = todayKey();
  if (t !== dayKey) { dayKey = t; count = 0; }
  if (count >= DAILY_CAP) return false;
  count++;
  return true;
}

/** 当前用量(供后台/日志)。 */
export function userAiBudgetStatus(): { used: number; cap: number } {
  const t = todayKey();
  return { used: t === dayKey ? count : 0, cap: DAILY_CAP };
}
