/**
 * 好友关系 + 拉黑 判定(给 contacts/chat 等路由共用,放这避免循环依赖)。
 */
import { and, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { friendRequests, userBlocklist, userSettings } from "../../drizzle/schema";
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

/** 是否可看对方完整主页（简介/动态/粉丝数）。关了「公开主页」时仅本人与好友可见。 */
export async function canViewFullProfile(db: Db, viewerId: number | null | undefined, targetId: number): Promise<boolean> {
  if (viewerId === targetId) return true;
  try {
    const [st] = await db.select({ v: userSettings.profileVisible }).from(userSettings)
      .where(eq(userSettings.userId, targetId)).limit(1);
    if (!st || st.v) return true;
  } catch { return true; }
  if (viewerId && await areFriends(db, viewerId, targetId)) return true;
  return false;
}

/** 私信权限闸:任一方拉黑不可发;默认对所有人开放,仅当【接收方】开了「仅好友可私信我」才要求好友关系。
 *  产品拍板(2026-07-12):默认开放兼顾拉新(陌生人打招呼场景),想清净的用户自己开开关。 */
export async function assertCanDM(db: Db, from: number, to: number): Promise<void> {
  if (from === to) return;
  if (await isBlockedEither(db, from, to)) throw new TRPCError({ code: "FORBIDDEN", message: "无法发送(存在拉黑关系)" });
  let onlyFriends = false;
  try {
    const [s] = await db.select({ v: userSettings.dmOnlyFriends }).from(userSettings)
      .where(eq(userSettings.userId, to)).limit(1);
    onlyFriends = !!s?.v;
  } catch { /* 列尚未补齐(启动补丁未跑完)时按默认开放,别把私信整体打挂 */ }
  if (onlyFriends && !(await areFriends(db, from, to))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "对方设置了仅好友可私信,请先加为好友" });
  }
}
