import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { posts, postLikes, postComments, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storagePut } from "../storage";

export const postsRouter = router({
  // ─── List posts (public feed) ──────────────────────────────────────────────
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        tag: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { posts: [], hasMore: false };

      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const rows = await db
        .select({
          id: posts.id,
          content: posts.content,
          mediaUrls: posts.mediaUrls,
          tags: posts.tags,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          shareCount: posts.shareCount,
          isPinned: posts.isPinned,
          createdAt: posts.createdAt,
          authorId: posts.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
          authorUsername: users.username,
          authorWallet: users.walletAddress,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(desc(posts.isPinned), desc(posts.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = rows.length > limit;
      const data = rows.slice(0, limit);

      // Check if current user liked each post
      let likedPostIds = new Set<number>();
      if (ctx.user) {
        const likes = await db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(eq(postLikes.userId, ctx.user.id));
        likedPostIds = new Set(likes.map((l) => l.postId));
      }

      return {
        posts: data.map((p) => ({
          ...p,
          mediaUrls: p.mediaUrls ? (JSON.parse(p.mediaUrls) as string[]) : [],
          tags: p.tags ? (JSON.parse(p.tags) as string[]) : [],
          isLiked: likedPostIds.has(p.id),
        })),
        hasMore,
      };
    }),

  // ─── Create post ───────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(2000),
        mediaUrls: z.array(z.string().url()).max(4).optional(),
        tags: z.array(z.string().max(30)).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(posts).values({
        authorId: ctx.user.id,
        content: input.content,
        mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : undefined,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
      });

      return { postId: (result as any).insertId as number };
    }),

  // ─── Toggle like ───────────────────────────────────────────────────────────
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, input.postId), eq(postLikes.userId, ctx.user.id)))
        .limit(1);

      if (existing.length > 0) {
        // Unlike
        await db
          .delete(postLikes)
          .where(and(eq(postLikes.postId, input.postId), eq(postLikes.userId, ctx.user.id)));
        await db
          .update(posts)
          .set({ likeCount: sql`GREATEST(likeCount - 1, 0)` })
          .where(eq(posts.id, input.postId));
        return { liked: false };
      } else {
        // Like
        await db.insert(postLikes).values({ postId: input.postId, userId: ctx.user.id });
        await db
          .update(posts)
          .set({ likeCount: sql`likeCount + 1` })
          .where(eq(posts.id, input.postId));
        return { liked: true };
      }
    }),

  // ─── Get comments for a post ───────────────────────────────────────────────
  getComments: publicProcedure
    .input(z.object({ postId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: postComments.id,
          content: postComments.content,
          createdAt: postComments.createdAt,
          authorId: postComments.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
          authorUsername: users.username,
        })
        .from(postComments)
        .leftJoin(users, eq(postComments.authorId, users.id))
        .where(eq(postComments.postId, input.postId))
        .orderBy(desc(postComments.createdAt))
        .limit(input.limit);
    }),

  // ─── Add comment ──────────────────────────────────────────────────────────
  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        content: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(postComments).values({
        postId: input.postId,
        authorId: ctx.user.id,
        content: input.content,
      });

      // Increment comment count
      await db
        .update(posts)
        .set({ commentCount: sql`commentCount + 1` })
        .where(eq(posts.id, input.postId));

      return { commentId: (result as any).insertId as number };
    }),

  // ─── Upload media to S3 ────────────────────────────────────────────────
  uploadMedia: protectedProcedure
    .input(
      z.object({
        // base64-encoded file content
        fileData: z.string().max(10_000_000), // ~7.5MB base64
        fileName: z.string().max(200),
        mimeType: z.string().max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileData, fileName, mimeType } = input;
      // Decode base64
      const buffer = Buffer.from(fileData, "base64");
      if (buffer.length > 8 * 1024 * 1024) {
        throw new Error("文件大小超过 8MB 限制");
      }
      // Sanitize filename and add random suffix
      const ext = fileName.split(".").pop() ?? "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const key = `posts/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);
      return { url, key };
    }),

  // ─── Delete post ──────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Only author can delete
      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!post || post.authorId !== ctx.user.id) {
        throw new Error("Not authorized to delete this post");
      }

      await db.delete(postComments).where(eq(postComments.postId, input.postId));
      await db.delete(postLikes).where(eq(postLikes.postId, input.postId));
      await db.delete(posts).where(eq(posts.id, input.postId));

      return { success: true };
    }),
});
