/**
 * Referral invite codes.
 *
 * Codes are deterministic from (userId, name) but the id hash is truncated and not
 * reversible, so the code is persisted on the user row (indexed) to allow O(1) reverse
 * lookup in recordReferral — instead of scanning every user in memory.
 */
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * Generate a deterministic invite code from user ID.
 * 新格式(2026-07-07 简化):`AI` + 4 位防混淆字符 = 共 6 位,如 AI7KQ2(展示写作 AI-7KQ2)。
 * - 字符表去掉 0/O/1/I/L,口播/手输不出错;
 * - (id×48271) mod 31⁴ 与 31⁴ 互素 → id→码双射,前 92 万用户零碰撞且序列不可肉眼枚举;
 * - 不再携带昵称 → 改名后码稳定(ensureInviteCode 不再改写)。
 * name 参数保留仅为兼容旧调用签名(ensureInviteCode),不再使用。
 * 旧码 NEXUS-XXXXXX-YYYY 的存量在库里仍可被精确匹配(recordReferral 直接按存储值查)。
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 chars,无 0/O/1/I/L
const CODE_SPACE = 31 ** 4; // 923,521
const CODE_MULT = 48271;    // 素数,与 31⁴ 互素 → 双射

export function generateInviteCode(userId: number, _name?: string | null): string {
  let n = (userId * CODE_MULT) % CODE_SPACE;
  let tail = "";
  for (let i = 0; i < 4; i++) { tail = CODE_ALPHABET[n % 31] + tail; n = Math.floor(n / 31); }
  return `AI${tail}`;
}

/**
 * 输入容错:去掉一切非字母数字的分隔符、转大写 —— "ai-7kq2"、"AI 7KQ2"、展示态 "AI·7KQ2"
 * (中点 U+00B7)都命中 AI7KQ2。原来只去 [\s-] 漏了中点,而邀请页复制/分享的正是 "AI·XXXX",
 * 导致对方填进去绑定必报"邀请码无效"。旧码 NEXUS-XXXXXX-YYYY 仍由 recordReferral 的 rawUpper 分支精确匹配。
 */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/**
 * 绑定输入：统一用用户 ID（资料页那个数字）。
 * 兼容旧分享：AIXXXX、NEXUS-…、名片码 u123。
 */
export function parseInviteInput(raw: string): { userId: number } | { code: string } | null {
  const norm = normalizeInviteCode(raw);
  if (!norm) return null;
  const asId = norm.match(/^U?(\d{1,10})$/);
  if (asId) {
    const userId = Number(asId[1]);
    if (Number.isInteger(userId) && userId > 0) return { userId };
  }
  return { code: norm };
}

/**
 * Ensure the user's stored inviteCode matches the code derived from their current name.
 * Writes only when missing or stale. Returns the current code.
 */
export async function ensureInviteCode(db: Db, userId: number, name: string | null): Promise<string> {
  const code = generateInviteCode(userId, name ?? "USER");
  await db
    .update(users)
    .set({ inviteCode: code })
    .where(and(eq(users.id, userId), or(isNull(users.inviteCode), ne(users.inviteCode, code))));
  return code;
}

/**
 * One-time backfill: assign invite codes to any users missing one.
 * Safe to run on every startup — it only touches rows with a NULL code.
 */
export async function backfillInviteCodes(db: Db): Promise<number> {
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(isNull(users.inviteCode));
  for (const r of rows) {
    await db
      .update(users)
      .set({ inviteCode: generateInviteCode(r.id, r.name ?? "USER") })
      .where(eq(users.id, r.id));
  }
  return rows.length;
}
