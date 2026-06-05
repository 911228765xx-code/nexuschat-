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
 * Generate a deterministic invite code from user ID + name.
 * Format: NEXUS-XXXXXX-YYYY where X is from name, Y is a hash of the user id.
 */
export function generateInviteCode(userId: number, name: string): string {
  const namePart = (name || "USER").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, "X");
  const idHash = ((userId * 2654435761) >>> 0).toString(36).toUpperCase().slice(0, 4);
  return `NEXUS-${namePart}-${idHash}`;
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
