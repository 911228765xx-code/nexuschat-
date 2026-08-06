import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userFollows, users, notifications, posts } from "../../drizzle/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";

// Helper: create a follow notification
async function createFollowNotification(
  db: Awaited<ReturnType<typeof getDb>>,
  fromUser: { id: number; name: string | null; avatar: string | null },
  toUserId: number
) {
  if (!db || fromUser.id === toUserId) return;
  await db.insert(notifications).values({
    userId: toUserId,
    type: "follow",
    fromUserId: fromUser.id,
    fromUserName: fromUser.name ?? "Anonymous",
    fromUserAvatar: fromUser.avatar ?? null,
    content: `${fromUser.name ?? "Someone"} started following you`,
    isRead: false,
  });
}

export const followRouter = router({
  // Follow a user
  follow: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.targetUserId) {
        throw new Error("Cannot follow yourself");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if already following
      const existing = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, ctx.user.id),
            eq(userFollows.followingId, input.targetUserId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: true, following: true };
      }

      await db.insert(userFollows).values({
        followerId: ctx.user.id,
        followingId: input.targetUserId,
      });

      // Send follow notification
      await createFollowNotification(
        db,
        { id: ctx.user.id, name: ctx.user.name, avatar: ctx.user.avatar ?? null },
        input.targetUserId
      );

      return { success: true, following: true };
    }),

  // Unfollow a user
  unfollow: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, ctx.user.id),
            eq(userFollows.followingId, input.targetUserId)
          )
        );

      return { success: true, following: false };
    }),

  // Check if current user follows a target user
  isFollowing: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { following: false };

      const result = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, ctx.user.id),
            eq(userFollows.followingId, input.targetUserId)
          )
        )
        .limit(1);

      return { following: result.length > 0 };
    }),

  // Get follower/following/likes counts for a user
  getCounts: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { followers: 0, following: 0, likes: 0, posts: 0 };

      const [followerResult, followingResult, likeResult, postResult] = await Promise.all([
        db
          .select({ cnt: count() })
          .from(userFollows)
          .where(eq(userFollows.followingId, input.userId)),
        db
          .select({ cnt: count() })
          .from(userFollows)
          .where(eq(userFollows.followerId, input.userId)),
        db
          .select({ cnt: sql<number>`COALESCE(SUM(${posts.likeCount}), 0)` })
          .from(posts)
          .where(eq(posts.authorId, input.userId)),
        db
          .select({ cnt: count() })
          .from(posts)
          .where(eq(posts.authorId, input.userId)),
      ]);

      return {
        followers: Number(followerResult[0]?.cnt ?? 0),
        following: Number(followingResult[0]?.cnt ?? 0),
        likes: Number(likeResult[0]?.cnt ?? 0),
        posts: Number(postResult[0]?.cnt ?? 0),
      };
    }),

  // Get list of users that the current user follows
  getFollowing: protectedProcedure
    .input(z.object({ userId: z.number().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const uid = input?.userId ?? ctx.user.id;

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          bio: users.bio,
        })
        .from(userFollows)
        .innerJoin(users, eq(users.id, userFollows.followingId))
        .where(eq(userFollows.followerId, uid))
        .orderBy(desc(userFollows.id))
        .limit(input?.limit ?? 50);

      return rows;
    }),

  // Get followers of a user
  getFollowers: protectedProcedure
    .input(z.object({ userId: z.number().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const uid = input?.userId ?? ctx.user.id;

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          bio: users.bio,
        })
        .from(userFollows)
        .innerJoin(users, eq(users.id, userFollows.followerId))
        .where(eq(userFollows.followingId, uid))
        .orderBy(desc(userFollows.id))
        .limit(input?.limit ?? 50);

      return rows;
    }),
});
