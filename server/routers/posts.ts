import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { posts, postLikes, postComments, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { createNotification } from "./notificationsRouter";
import { sanitizeInput } from "../utils/sanitize";

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
          mediaThumbs: posts.mediaThumbs,
          tags: posts.tags,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          shareCount: posts.shareCount,
          isPinned: posts.isPinned,
          reportId: posts.reportId,
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
          mediaThumbs: p.mediaThumbs ? (JSON.parse(p.mediaThumbs) as string[]) : [],
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
        mediaThumbs: z.array(z.string().url()).max(4).optional(),
        tags: z.array(z.string().max(30)).max(5).optional(),
      })
    )
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(posts).values({
        authorId: ctx.user.id,
        content: sanitizeInput(input.content, 2000),
        mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : undefined,
        mediaThumbs: input.mediaThumbs ? JSON.stringify(input.mediaThumbs) : undefined,
        tags: input.tags ? JSON.stringify(input.tags.map(t => sanitizeInput(t, 30))) : undefined,
      });

      return { postId: (result as any).insertId as number };
    }),

  // ─── Toggle like ───────────────────────────────────────────────────────────
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .use(rateLimitWrite)
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
        // Notify post author
        const [post] = await db
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(eq(posts.id, input.postId))
          .limit(1);
        if (post) {
          const [liker] = await db
            .select({ name: users.name, avatar: users.avatar })
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1);
          await createNotification({
            db,
            targetUserId: post.authorId,
            fromUserId: ctx.user.id,
            fromUserName: liker?.name ?? ctx.user.name ?? "Someone",
            fromUserAvatar: liker?.avatar ?? "👍",
            type: "like",
            content: "liked your post",
            postId: input.postId,
          });
        }
        return { liked: true };
      }
    }),

  // ─── Get single post by ID ──────────────────────────────────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [row] = await db
        .select({
          id: posts.id,
          content: posts.content,
          mediaUrls: posts.mediaUrls,
          mediaThumbs: posts.mediaThumbs,
          tags: posts.tags,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          shareCount: posts.shareCount,
          isPinned: posts.isPinned,
          reportId: posts.reportId,
          createdAt: posts.createdAt,
          authorId: posts.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
          authorUsername: users.username,
          authorWallet: users.walletAddress,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!row) return null;

      // Check if current user liked this post
      let isLiked = false;
      if (ctx.user) {
        const like = await db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(eq(postLikes.postId, input.postId), eq(postLikes.userId, ctx.user.id)))
          .limit(1);
        isLiked = like.length > 0;
      }

      return {
        ...row,
        mediaUrls: row.mediaUrls ? (JSON.parse(row.mediaUrls) as string[]) : [],
        mediaThumbs: row.mediaThumbs ? (JSON.parse(row.mediaThumbs) as string[]) : [],
        tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
        isLiked,
      };
    }),

  // ─── Get comments for a post ─────────────────────────────────────────────────────
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
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(postComments).values({
        postId: input.postId,
        authorId: ctx.user.id,
        content: sanitizeInput(input.content, 1000),
      });

      // Increment comment count
      await db
        .update(posts)
        .set({ commentCount: sql`commentCount + 1` })
        .where(eq(posts.id, input.postId));

      // Notify post author
      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);
      if (post) {
        const [commenter] = await db
          .select({ name: users.name, avatar: users.avatar })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        await createNotification({
          db,
          targetUserId: post.authorId,
          fromUserId: ctx.user.id,
          fromUserName: commenter?.name ?? ctx.user.name ?? "Someone",
          fromUserAvatar: commenter?.avatar ?? "💬",
          type: "comment",
          content: `commented: "${sanitizeInput(input.content, 50)}${input.content.length > 50 ? '...' : ''}"`,
          postId: input.postId,
        });
      }

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
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const { fileData, fileName, mimeType } = input;
      // Decode base64
      const raw = Buffer.from(fileData, "base64");
      if (raw.length > 8 * 1024 * 1024) {
        throw new Error("文件大小超过 8MB 限制");
      }
      // 图片：原图缩到 ≤1600 + 生成 ≤400 缩略图（非图片原样存，无缩略图）
      let buffer: Buffer = raw;
      let mime = mimeType;
      let ext = fileName.split(".").pop() ?? "jpg";
      const stamp = Date.now();
      // 更长的随机串，降低同毫秒并发上传 key 撞车/覆盖的概率
      const randomSuffix = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
      let thumbUrl: string | undefined;
      if (mimeType.startsWith("image/")) {
        const { downscaleImage } = await import("../utils/image");
        const full = await downscaleImage(raw, 1600, 82, mimeType);
        buffer = full.buffer; mime = full.mime;
        ext = mime.split("/")[1] ?? ext;
        const thumb = await downscaleImage(raw, 400, 70, mimeType);
        const thumbExt = thumb.mime.split("/")[1] ?? "jpg";
        const thumbKey = `posts/${ctx.user.id}/${stamp}-${randomSuffix}_thumb.${thumbExt}`;
        const t = await storagePut(thumbKey, thumb.buffer, thumb.mime);
        thumbUrl = t.url;
      }
      const key = `posts/${ctx.user.id}/${stamp}-${randomSuffix}.${ext}`;
      const { url } = await storagePut(key, buffer, mime);
      return { url, thumbUrl, key };
    }),

  // ─── Delete post ──────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .use(rateLimitWrite)
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

  // ─── Search posts ───────────────────────────────────────────────────────
  // ─── Repost (increment shareCount on original post) ─────────────────────
  repost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Increment share count on the original post
      await db
        .update(posts)
        .set({ shareCount: sql`${posts.shareCount} + 1` })
        .where(eq(posts.id, input.postId));

      // Create a new post that references the original
      const [original] = await db
        .select({ content: posts.content, authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!original) throw new Error("Post not found");

      // Get original author name
      const [originalAuthor] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, original.authorId))
        .limit(1);

      const repostContent = `\uD83D\uDD01 Reposted from @${originalAuthor?.name ?? "user"}:\n\n${original.content.slice(0, 500)}`;

      const [result] = await db.insert(posts).values({
        authorId: ctx.user.id,
        content: repostContent,
        tags: JSON.stringify(["#repost"]),
      });

      // Notify original author
      if (original.authorId !== ctx.user.id) {
        try {
          await createNotification({
            db,
            targetUserId: original.authorId,
            fromUserId: ctx.user.id,
            fromUserName: ctx.user.name ?? "Someone",
            fromUserAvatar: ctx.user.avatar ?? "",
            type: "system",
            content: `reposted your post`,
            postId: input.postId,
          });
        } catch (_) { /* notification failure is non-critical */ }
      }

      return { success: true, newPostId: (result as any).insertId as number };
    }),

  // ─── Quote Post (create new post with quote reference) ─────────────────────
  quotePost: protectedProcedure
    .input(z.object({
      postId: z.number(),
      comment: z.string().min(1).max(280),
    }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Increment share count on the original post
      await db
        .update(posts)
        .set({ shareCount: sql`${posts.shareCount} + 1` })
        .where(eq(posts.id, input.postId));

      // Get original post
      const [original] = await db
        .select({ content: posts.content, authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!original) throw new Error("Post not found");

      const [originalAuthor] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, original.authorId))
        .limit(1);

      const quoteContent = `${sanitizeInput(input.comment, 280)}\n\n\uD83D\uDCAC Quoting @${originalAuthor?.name ?? "user"}:\n> ${original.content.slice(0, 300)}`;

      const [result] = await db.insert(posts).values({
        authorId: ctx.user.id,
        content: quoteContent,
        tags: JSON.stringify(["#quote"]),
      });

      // Notify original author
      if (original.authorId !== ctx.user.id) {
        try {
          await createNotification({
            db,
            targetUserId: original.authorId,
            fromUserId: ctx.user.id,
            fromUserName: ctx.user.name ?? "Someone",
            fromUserAvatar: ctx.user.avatar ?? "",
            type: "system",
            content: `quoted your post`,
            postId: input.postId,
          });
        } catch (_) { /* notification failure is non-critical */ }
      }

      return { success: true, newPostId: (result as any).insertId as number };
    }),

  // ─── Search posts ───────────────────────────────────────────────────────
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { posts: [] };

      const keyword = `%${input.query}%`;
      const rows = await db
        .select({
          id: posts.id,
          content: posts.content,
          mediaUrls: posts.mediaUrls,
          mediaThumbs: posts.mediaThumbs,
          tags: posts.tags,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          shareCount: posts.shareCount,
          isPinned: posts.isPinned,
          reportId: posts.reportId,
          createdAt: posts.createdAt,
          authorId: posts.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
          authorUsername: users.username,
          authorWallet: users.walletAddress,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(sql`${posts.content} LIKE ${keyword} OR ${posts.tags} LIKE ${keyword}`)
        .orderBy(desc(posts.createdAt))
        .limit(input.limit);

      let likedPostIds = new Set<number>();
      if (ctx.user) {
        const likes = await db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(eq(postLikes.userId, ctx.user.id));
        likedPostIds = new Set(likes.map((l) => l.postId));
      }

      return {
        posts: rows.map((p) => ({
          ...p,
          mediaUrls: p.mediaUrls ? (JSON.parse(p.mediaUrls) as string[]) : [],
          mediaThumbs: p.mediaThumbs ? (JSON.parse(p.mediaThumbs) as string[]) : [],
          tags: p.tags ? (JSON.parse(p.tags) as string[]) : [],
          isLiked: likedPostIds.has(p.id),
        })),
      };
    }),
});
