/**
 * In-memory sliding window rate limiter for tRPC procedures.
 *
 * Three tiers:
 *   - default:   60 req / 60s per IP (general API)
 *   - strict:    10 req / 60s per user (LLM / AI endpoints)
 *   - write:     30 req / 60s per user (mutations: create, update, delete)
 *
 * Keys are "<tier>:<identifier>" where identifier is userId (authed) or IP (anon).
 * Expired entries are garbage-collected every 5 minutes.
 */

import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// ── bucket store ──────────────────────────────────────────────────────
interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();

// GC every 5 min
setInterval(() => {
  const now = Date.now();
  store.forEach((bucket, key) => {
    bucket.timestamps = bucket.timestamps.filter((ts: number) => now - ts < 120_000);
    if (bucket.timestamps.length === 0) store.delete(key);
  });
}, 300_000);

// ── core check ────────────────────────────────────────────────────────
function checkRate(key: string, windowMs: number, maxHits: number): boolean {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(key, bucket);
  }
  // prune expired
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= maxHits) {
    return false; // rate limited
  }
  bucket.timestamps.push(now);
  return true;
}

// ── helper to extract client IP ───────────────────────────────────────
function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.headers["x-real-ip"]?.toString() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ── tRPC middleware factories ─────────────────────────────────────────
const t = initTRPC.context<TrpcContext>().create();

/**
 * Default rate limit: 60 requests per 60 seconds per IP.
 * Suitable for general read endpoints.
 */
export const rateLimitDefault = t.middleware(async ({ ctx, next }) => {
  const ip = getClientIp(ctx.req);
  const key = `default:${ip}`;
  if (!checkRate(key, 60_000, 60)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
  return next({ ctx });
});

/**
 * Strict rate limit: 10 requests per 60 seconds per user.
 * For expensive operations (LLM calls, AI report generation).
 */
export const rateLimitStrict = t.middleware(async ({ ctx, next }) => {
  const identifier = ctx.user?.id?.toString() || getClientIp(ctx.req);
  const key = `strict:${identifier}`;
  if (!checkRate(key, 60_000, 10)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded for AI operations. Please wait a moment.",
    });
  }
  return next({ ctx });
});

/**
 * Write rate limit: 30 requests per 60 seconds per user.
 * For mutations (create post, send message, etc.).
 */
export const rateLimitWrite = t.middleware(async ({ ctx, next }) => {
  const identifier = ctx.user?.id?.toString() || getClientIp(ctx.req);
  const key = `write:${identifier}`;
  if (!checkRate(key, 60_000, 30)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many write operations. Please slow down.",
    });
  }
  return next({ ctx });
});

/**
 * Factory for custom rate limiters.
 */
export function createRateLimiter(opts: { windowMs: number; maxRequests: number }) {
  return t.middleware(async ({ ctx, next }) => {
    const identifier = ctx.user?.id?.toString() || getClientIp(ctx.req);
    const key = `custom:${opts.windowMs}:${opts.maxRequests}:${identifier}`;
    if (!checkRate(key, opts.windowMs, opts.maxRequests)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Please try again later.",
      });
    }
    return next({ ctx });
  });
}
