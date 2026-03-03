/**
 * 消息时间格式化工具
 * - 今天：显示 HH:MM（如 14:30）
 * - 昨天：显示"昨天"
 * - 本周内（2-6天前）：显示"周X"（如"周三"）
 * - 更早：显示 MM/DD（如 02/25）
 * - 超过一年：显示 YYYY/MM/DD
 */

const WEEK_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function formatMessageTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400_000);
  const sixDaysAgo = new Date(todayStart.getTime() - 6 * 86400_000);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  if (d >= todayStart) {
    // 今天：显示时间
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } else if (d >= yesterdayStart) {
    // 昨天
    return "昨天";
  } else if (d >= sixDaysAgo) {
    // 本周内
    return WEEK_DAYS[d.getDay()];
  } else if (d >= oneYearAgo) {
    // 今年内：显示 MM/DD
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}`;
  } else {
    // 超过一年
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
}

/**
 * 群聊消息内的时间戳（更详细）
 * - 今天：显示 HH:MM
 * - 昨天：显示"昨天 HH:MM"
 * - 更早：显示 MM/DD HH:MM
 */
export function formatChatTimestamp(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400_000);

  const timeStr = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

  if (d >= todayStart) {
    return timeStr;
  } else if (d >= yesterdayStart) {
    return `昨天 ${timeStr}`;
  } else {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd} ${timeStr}`;
  }
}
