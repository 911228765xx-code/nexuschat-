import { rateLimitWrite } from "../rateLimit";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { posts, postLikes, postComments, users, notifications } from "../../drizzle/schema";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { storagePut } from "../storage";
import { createNotification } from "./notificationsRouter";
import { awardTaskEvent } from "./user";
import { sanitizeInput } from "../utils/sanitize";
import { spendNN } from "../token";
import { TRPCError } from "@trpc/server";
import { enforceContent } from "../moderation";

// 广场推广档位（NN 计价，按天）
export const PROMOTE_PLANS = [
  { key: "day1", days: 1, priceNN: 30, label: "1 天" },
  { key: "day3", days: 3, priceNN: 75, label: "3 天" },
  { key: "day7", days: 7, priceNN: 150, label: "7 天" },
];

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
          promotedUntil: posts.promotedUntil,
          reportId: posts.reportId,
          createdAt: posts.createdAt,
          authorId: posts.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
          authorUsername: users.username,
          authorWallet: users.walletAddress,
          authorProTier: users.proTier,
          authorProUntil: users.proUntil,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        // 推广中(promotedUntil > now)优先置顶，其次置顶贴，再按时间倒序
        .orderBy(
          desc(sql`CASE WHEN ${posts.promotedUntil} > NOW() THEN 1 ELSE 0 END`),
          desc(posts.isPinned),
          desc(posts.createdAt),
        )
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
          isPromoted: !!p.promotedUntil && p.promotedUntil.getTime() > Date.now(),
          authorBadge: (p.authorProTier && p.authorProTier !== "free" && (!p.authorProUntil || p.authorProUntil.getTime() > Date.now()))
            ? (p.authorProTier === "pro" ? "Pro" : "Plus") : null,
        })),
        hasMore,
      };
    }),

  // ─── 广场推广位（付费置顶，NN 计价） ──────────────────────────────────────
  promotePlans: publicProcedure.query(() => ({ plans: PROMOTE_PLANS })),

  promotePost: protectedProcedure
    .input(z.object({ postId: z.number(), planKey: z.string() }))
    .use(rateLimitWrite)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [post] = await db.select({ authorId: posts.authorId, promotedUntil: posts.promotedUntil })
        .from(posts).where(eq(posts.id, input.postId)).limit(1);
      if (!post || post.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能推广自己的动态" });
      const plan = PROMOTE_PLANS.find((p) => p.key === input.planKey);
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "未知推广档位" });
      const ok = await spendNN(db, ctx.user.id, plan.priceNN, { type: "promote", refType: "post", refId: input.postId, memo: plan.key });
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "NN 余额不足" });
      const base = post.promotedUntil && post.promotedUntil.getTime() > Date.now() ? post.promotedUntil.getTime() : Date.now();
      const until = new Date(base + plan.days * 24 * 3600 * 1000);
      await db.update(posts).set({ promotedUntil: until }).where(eq(posts.id, input.postId));
      return { ok: true, promotedUntil: until.toISOString() };
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
      // 内容审核：违禁(毒品/赌博/贩卖)内容拦截 + 累犯封号
      await enforceContent(db, ctx.user.id, input.content, "post", { useAI: true });

      const [result] = await db.insert(posts).values({
        authorId: ctx.user.id,
        content: sanitizeInput(input.content, 2000),
        mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : undefined,
        mediaThumbs: input.mediaThumbs ? JSON.stringify(input.mediaThumbs) : undefined,
        tags: input.tags ? JSON.stringify(input.tags.map(t => sanitizeInput(t, 30))) : undefined,
      });

      // NP 产出：首次发帖里程碑 + 每日发帖（每日上限内）。
      // 质量门槛（防灌水刷分）：内容 ≥15 字，且当天没发过相同内容，才计每日发帖分。
      void awardTaskEvent(db, ctx.user.id, "first_post");
      const trimmed = input.content.trim();
      if (trimmed.length >= 15) {
        const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
        const [dup] = await db
          .select({ id: posts.id })
          .from(posts)
          .where(and(
            eq(posts.authorId, ctx.user.id),
            eq(posts.content, sanitizeInput(input.content, 2000)),
            gt(posts.createdAt, todayStart),
            sql`${posts.id} != ${(result as any).insertId}`,
          ))
          .limit(1);
        if (!dup) void awardTaskEvent(db, ctx.user.id, "post_daily");
      }

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
        if (post && post.authorId !== ctx.user.id) {
          // 防刷：同一人对同一帖只发一次奖/通知（取消再点赞不重复）。用历史 like 通知做去重。
          const [seen] = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(and(
              eq(notifications.userId, post.authorId),
              eq(notifications.fromUserId, ctx.user.id),
              eq(notifications.postId, input.postId),
              eq(notifications.type, "like"),
            ))
            .limit(1);
          if (!seen) {
            // NP 产出：内容获赞奖励给作者（仅首次）
            void awardTaskEvent(db, post.authorId, "like_received");
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

      // NP 产出：有效评论（每日上限内）。质量门槛：≥5 字才计分（"好""赞"类水评不计）。
      if (input.content.trim().length >= 5) {
        void awardTaskEvent(db, ctx.user.id, "comment_made");
      }

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
