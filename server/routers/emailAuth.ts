/**
 * emailAuth — 邮箱/密码注册与登录
 * 使用 bcryptjs 哈希密码，通过 sdk.signSession() 生成与 Manus OAuth 共用的 JWT session cookie。
 */
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { ENV } from "../_core/env";

const SALT_ROUNDS = 10;

/** Generate a unique openId for email-registered users */
function emailOpenId(email: string): string {
  return `email:${email.toLowerCase().trim()}`;
}

export const emailAuthRouter = router({
  /** Register a new account with email + password */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱地址"),
        password: z.string().min(8, "密码至少 8 位"),
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
        email: z.string().email("请输入有效的邮箱地址"),
        password: z.string().min(1, "请输入密码"),
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
});
