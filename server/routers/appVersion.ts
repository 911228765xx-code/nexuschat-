import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { appConfig } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { assertAndroidApkSource, getAndroidApkDirectUrl } from "../utils/androidApkSource";
import { isAppAdmin } from "../appAdmin";

// Current native shell version (bump this when releasing a new APK/IPA)
export const CURRENT_APP_VERSION = "1.9.2";

/**
 * Compare semver strings: returns negative if a < b, 0 if equal, positive if a > b
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export const appVersionRouter = router({
  /**
   * Public: Check if the current app version needs an update.
   * Called on app startup and from Settings page.
   */
  checkVersion: publicProcedure
    .input(
      z.object({
        currentVersion: z.string().max(20).default(CURRENT_APP_VERSION),
        platform: z.enum(["android", "ios", "web"]).default("web"),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Default config if DB unavailable or not seeded
      const defaultConfig = {
        latestVersion: CURRENT_APP_VERSION,
        minVersion: CURRENT_APP_VERSION,
        downloadUrlAndroid: ENV.androidApkFallbackUrl,
        downloadUrlIos: "https://nexuschat.best/download",
        downloadUrlWeb: "https://nexuschat.best/download",
        releaseNotes: "初始版本",
        isForceUpdate: false,
      };

      let config = defaultConfig;

      if (db) {
        const rows = await db
          .select()
          .from(appConfig)
          .where(eq(appConfig.platform, "all"))
          .limit(1);

        if (rows.length > 0) {
          config = {
            latestVersion: rows[0].latestVersion,
            minVersion: rows[0].minVersion,
            downloadUrlAndroid: rows[0].downloadUrlAndroid ?? defaultConfig.downloadUrlAndroid,
            downloadUrlIos: rows[0].downloadUrlIos ?? defaultConfig.downloadUrlIos,
            downloadUrlWeb: rows[0].downloadUrlWeb ?? defaultConfig.downloadUrlWeb,
            releaseNotes: rows[0].releaseNotes ?? "",
            isForceUpdate: rows[0].isForceUpdate,
          };
        }
      }

      const isForceUpdate =
        compareSemver(input.currentVersion, config.minVersion) < 0;
      const hasUpdate =
        compareSemver(input.currentVersion, config.latestVersion) < 0;

      // Return platform-specific download URL
      let downloadUrl: string;
      if (input.platform === "ios") {
        downloadUrl = config.downloadUrlIos;
      } else if (input.platform === "web") {
        downloadUrl = config.downloadUrlWeb;
      } else {
        // Android 应内更新的下载地址一律走公网域名 /apk 流式短链,而不是配置里的 expo.dev 原始直链:
        // 直连海外 CDN 在大陆常超时/失败 → 用户点"立即更新"下不动或装不上 → 原生版本没变 → 反复提示。
        // /apk 由本服务器把 downloadUrlAndroid 流式中转(稳定+断点续传),让更新真正装得上。
        // ⚠️ 域名必须用 ENV.publicOrigin:CF→Cloud Run 下 req Host 是 *.a.run.app(大陆被墙)。
        // 这是实时接口,存量老包下次检查即生效,无需先更新 App。
        // ?v=版本:换缓存键——边缘若曾把某次截断传输缓存成残包(2026-07-12 事故),新版本号立刻绕开毒缓存
        downloadUrl = `${ENV.publicOrigin}/apk?v=${encodeURIComponent(config.latestVersion || "")}`;
      }

      // directUrl:原始外部直链(expo.dev 等),【绕开平台边缘】。
      // 平台边缘对 >32MiB 单响应会掐断吐 SPA → 浏览器/下载器【无 Range 整包 GET /apk】必拿到网页
      // → 「解析包出现问题」(2026-07-12 事故根因)。/apk 只适合带【有界 Range】的分块客户端;
      // 浏览器直下/复制链接场景必须给这条绕边缘的整包直链。仅当配的是 http(s) 外链时提供。
      const directUrl = getAndroidApkDirectUrl(config.downloadUrlAndroid);

      return {
        currentVersion: input.currentVersion,
        latestVersion: config.latestVersion,
        minVersion: config.minVersion,
        hasUpdate,
        isForceUpdate: isForceUpdate || config.isForceUpdate,
        platform: input.platform,
        downloadUrl,
        directUrl,
        releaseNotes: config.releaseNotes,
      };
    }),

  /**
   * Admin: Update the version config (latest/min version, download URLs, etc.)
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        latestVersion: z.string().max(20),
        minVersion: z.string().max(20),
        downloadUrlAndroid: z.string().url().max(500).optional(),
        downloadUrlIos: z.string().url().max(500).optional(),
        downloadUrlWeb: z.string().url().max(500).optional(),
        releaseNotes: z.string().max(2000).optional(),
        isForceUpdate: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAppAdmin(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const apkErr = assertAndroidApkSource(input.downloadUrlAndroid);
      if (apkErr) {
        throw new TRPCError({ code: "BAD_REQUEST", message: apkErr });
      }

      // Upsert: update if exists, insert if not
      const existing = await db
        .select()
        .from(appConfig)
        .where(eq(appConfig.platform, "all"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(appConfig)
          .set({
            latestVersion: input.latestVersion,
            minVersion: input.minVersion,
            downloadUrlAndroid: input.downloadUrlAndroid,
            downloadUrlIos: input.downloadUrlIos,
            downloadUrlWeb: input.downloadUrlWeb,
            releaseNotes: input.releaseNotes,
            isForceUpdate: input.isForceUpdate ?? false,
          })
          .where(eq(appConfig.platform, "all"));
      } else {
        await db.insert(appConfig).values({
          platform: "all",
          latestVersion: input.latestVersion,
          minVersion: input.minVersion,
          downloadUrlAndroid: input.downloadUrlAndroid,
          downloadUrlIos: input.downloadUrlIos,
          downloadUrlWeb: input.downloadUrlWeb,
          releaseNotes: input.releaseNotes,
          isForceUpdate: input.isForceUpdate ?? false,
        });
      }

      return { success: true };
    }),
});
