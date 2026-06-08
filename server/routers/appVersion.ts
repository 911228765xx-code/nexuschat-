import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { appConfig } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// Current native shell version (bump this when releasing a new APK/IPA)
export const CURRENT_APP_VERSION = "1.5.6";

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
    .query(async ({ input }) => {
      const db = await getDb();

      // Default config if DB unavailable or not seeded
      const defaultConfig = {
        latestVersion: CURRENT_APP_VERSION,
        minVersion: CURRENT_APP_VERSION,
        downloadUrlAndroid: "https://nexuschat.best/download",
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
        downloadUrl = config.downloadUrlAndroid;
      }

      return {
        currentVersion: input.currentVersion,
        latestVersion: config.latestVersion,
        minVersion: config.minVersion,
        hasUpdate,
        isForceUpdate: isForceUpdate || config.isForceUpdate,
        platform: input.platform,
        downloadUrl,
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
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

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
