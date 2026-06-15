/**
 * 好友关系 + 拉黑 判定(给 contacts/chat 等路由共用,放这避免循环依赖)。
 */
import { and, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { friendRequests, userBlocklist } from "../../drizzle/schema";
import { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** a、b 是否互为好友(friendRequests 双向 accepted)。同一人视为 true。 */
export async function areFriends(db: Db, a: number, b: number): Promise<boolean> {
  if (a === b) return true;
  const [r] = await db.select({ id: friendRequests.id }).from(friendRequests)
    .where(and(eq(friendRequests.status, "accepted"), or(
      and(eq(friendRequests.senderId, a), eq(friendRequests.receiverId, b)),
      and(eq(friendRequests.senderId, b), eq(friendRequests.receiverId, a)),
    ))).limit(1);
  return !!r;
}

/** a、b 之间是否存在任一方向的拉黑(任一方拉黑都算)。 */
export async function isBlockedEither(db: Db, a: number, b: number): Promise<boolean> {
  const [r] = await db.select({ id: userBlocklist.id }).from(userBlocklist)
    .where(or(
      and(eq(userBlocklist.blockerId, a), eq(userBlocklist.blockedId, b)),
      and(eq(userBlocklist.blockerId, b), eq(userBlocklist.blockedId, a)),
    )).limit(1);
  return !!r;
}

/** a 是否拉黑了 b(单向)。 */
export async function hasBlocked(db: Db, blocker: number, blocked: number): Promise<boolean> {
  const [r] = await db.select({ id: userBlocklist.id }).from(userBlocklist)
    .where(and(eq(userBlocklist.blockerId, blocker), eq(userBlocklist.blockedId, blocked))).limit(1);
  return !!r;
}

/** 私信权限闸:仅好友可私信 + 任一方拉黑则不可。不满足抛 FORBIDDEN。 */
export async function assertCanDM(db: Db, from: number, to: number): Promise<void> {
  if (from === to) return;
  if (await isBlockedEither(db, from, to)) throw new TRPCError({ code: "FORBIDDEN", message: "无法发送(存在拉黑关系)" });
  if (!(await areFriends(db, from, to))) throw new TRPCError({ code: "FORBIDDEN", message: "仅好友可私信,请先加为好友" });
}
