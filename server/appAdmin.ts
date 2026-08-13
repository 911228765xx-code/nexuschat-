/**
 * 平台管理员：不受玩法/产出/会员档位限制。
 * 认 role=admin，并固定认 ID 180826（当前唯一管理员，避免库里 role 没写成 admin 时失效）。
 */
export const APP_ADMIN_IDS = new Set<number>([180826]);

export function isAppAdmin(
  user: { id?: number | null; role?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (typeof user.id === "number" && APP_ADMIN_IDS.has(user.id)) return true;
  return false;
}
