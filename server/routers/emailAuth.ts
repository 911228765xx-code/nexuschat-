/**
 * emailAuth — 邮箱/密码注册、登录、忘记密码、重置密码
 * 使用 bcryptjs 哈希密码，通过 sdk.signSession() 生成与 Manus OAuth 共用的 JWT session cookie。
 */
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq, and, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { users, passwordResetTokens } from "../../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import { notifyOwner } from "../_core/notification";
import { sendPasswordResetEmail } from "../_core/email";

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** Generate a unique openId for email-registered users */
function emailOpenId(email: string): string {
  return `email:${email.toLowerCase().trim()}`;
}

export const emailAuthRouter = router({
  /** Register a new account with email + password */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱地址").max(320),
        password: z.string().min(8, "密码至少 8 位").max(128),
        name: z.string().min(1, "请输入昵称").max(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });

      const normalizedEmail = input.email.toLowerCase().trim();
      const openId = emailOpenId(normalizedEmail);

      // Check if email already registered
      const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "该邮箱已注册，请直接登录" });
      }

      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      // Determine role: first user with owner openId gets admin
      const role = openId === ENV.ownerOpenId ? "admin" : "user";

      await db.insert(users).values({
        openId,
        email: normalizedEmail,
        name: input.name,
        loginMethod: "email",
        passwordHash,
        role,
        lastSignedIn: new Date(),
      });

      // Create session and set cookie
      const sessionToken = await sdk.signSession(
        { openId, appId: ENV.appId, name: input.name },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, message: "注册成功" };
    }),

  /** Login with email + password */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱地址").max(320),
        password: z.string().min(1, "请输入密码").max(128),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });

      const normalizedEmail = input.email.toLowerCase().trim();
      const openId = emailOpenId(normalizedEmail);

      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      const user = result[0];

      // Generic error to prevent email enumeration
      const invalidError = new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });

      if (!user || !user.passwordHash) throw invalidError;

      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatch) throw invalidError;

      // Update lastSignedIn
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));

      // Create session and set cookie
      const sessionToken = await sdk.signSession(
        { openId, appId: ENV.appId, name: user.name || "" },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, message: "登录成功" };
    }),

  /**
   * Request a password reset — generates a secure token and returns the reset link.
   * Also notifies the project owner via the built-in notification channel.
   * In production, integrate a real email provider (Resend, SendGrid, etc.) here.
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱地址").max(320),
        /** Frontend origin (e.g. https://nexuschat.best) used to build the reset URL */
        origin: z.string().url().max(200),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });

      const normalizedEmail = input.email.toLowerCase().trim();
      const openId = emailOpenId(normalizedEmail);

      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      const user = result[0];

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        return { success: true, message: "如果该邮箱已注册，重置链接已发送" };
      }

      // Generate a cryptographically secure token
      const token = randomBytes(48).toString("hex"); // 96 hex chars
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      // Invalidate any existing unused tokens for this user
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            isNull(passwordResetTokens.usedAt)
          )
        );

      // Insert new token
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const resetUrl = `${input.origin}/reset-password?token=${token}`;

      // Try to send email via Resend; fall back to returning the URL directly
      const emailResult = await sendPasswordResetEmail({
        to: normalizedEmail,
        resetUrl,
        expiresInMinutes: 60,
      });

      const emailSent = emailResult.success;

      // Notify owner (best-effort — non-blocking)
      notifyOwner({
        title: "NexusChat 密码重置请求",
        content: `用户 ${normalizedEmail} 请求重置密码。\n邮件发送：${emailSent ? "成功" : "失败，降级展示链接"}\n\n重置链接（1小时内有效）：\n${resetUrl}`,
      }).catch(() => {});

      // If email was sent, don't expose the URL in the response (security)
      // If email failed (no Resend key), return the URL so UI can display it
      return {
        success: true,
        message: emailSent ? "重置邮件已发送到您的邮筱" : "重置链接已生成",
        emailSent,
        // Only expose resetUrl when email sending is not available
        resetUrl: emailSent ? undefined : resetUrl,
      };
    }),

  /** Verify a reset token is still valid (used for page load check) */
  verifyResetToken: publicProcedure
    .input(z.object({ token: z.string().max(200) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false };

      const result = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, input.token),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      return { valid: result.length > 0 };
    }),

  /** Reset password using a valid token */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().max(200),
        newPassword: z.string().min(8, "密码至少 8 位").max(128),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库暂时不可用" });

      // Find valid token
      const tokenResult = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, input.token),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      const resetToken = tokenResult[0];
      if (!resetToken) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "重置链接无效或已过期，请重新申请" });
      }

      // Get user
      const userResult = await db.select().from(users).where(eq(users.id, resetToken.userId)).limit(1);
      const user = userResult[0];
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      }

      const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

      // Update password and mark token as used (in parallel)
      await Promise.all([
        db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id)),
        db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id)),
      ]);

      // Auto-login: create a new session
      const sessionToken = await sdk.signSession(
        { openId: user.openId, appId: ENV.appId, name: user.name || "" },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, message: "密码已重置，正在登录..." };
    }),
});
