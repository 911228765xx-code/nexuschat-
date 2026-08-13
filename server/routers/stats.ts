/**
 * 社区生态仪表盘：真实统计 + 后台展示加成 / 额外指标行。
 * 用户侧只看到最终数字，不暴露加成；最终数字再叠一层按时段波动，避免钉死。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { appConfig, chatGroups, posts, users } from "../../drizzle/schema";
import { applyDashboardLive } from "../utils/dashboardLive";

export type DashboardBoosts = {
  usersTotal: number;
  activeToday: number;
  subscribers: number;
};

export type DashboardExtra = {
  id: string;
  label: string;
  value: number;
  icon?: string;
};

export type DashboardConfig = {
  boosts: DashboardBoosts;
  extras: DashboardExtra[];
};

const DEFAULT_BOOSTS: DashboardBoosts = { usersTotal: 0, activeToday: 0, subscribers: 0 };

const extraSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(20),
  value: z.number().int().min(0).max(1_000_000_000),
  icon: z.string().max(40).optional(),
});

const configSchema = z.object({
  boosts: z.object({
    usersTotal: z.number().int().min(0).max(1_000_000_000),
    activeToday: z.number().int().min(0).max(1_000_000_000),
    subscribers: z.number().int().min(0).max(1_000_000_000),
  }),
  extras: z.array(extraSchema).max(8),
});

function parseConfig(raw: string | null | undefined): DashboardConfig {
  if (!raw) return { boosts: { ...DEFAULT_BOOSTS }, extras: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
    const b = parsed.boosts ?? {};
    return {
      boosts: {
        usersTotal: Math.max(0, Math.floor(Number((b as DashboardBoosts).usersTotal) || 0)),
        activeToday: Math.max(0, Math.floor(Number((b as DashboardBoosts).activeToday) || 0)),
        subscribers: Math.max(0, Math.floor(Number((b as DashboardBoosts).subscribers) || 0)),
      },
      extras: Array.isArray(parsed.extras)
        ? parsed.extras
            .filter((e) => e && typeof e.label === "string" && Number.isFinite(Number(e.value)))
            .slice(0, 8)
            .map((e, i) => ({
              id: String(e.id || `e${i + 1}`).slice(0, 40),
              label: String(e.label).slice(0, 20),
              value: Math.max(0, Math.floor(Number(e.value) || 0)),
              icon: e.icon ? String(e.icon).slice(0, 40) : undefined,
            }))
        : [],
    };
  } catch {
    return { boosts: { ...DEFAULT_BOOSTS }, extras: [] };
  }
}

let cache: { at: number; payload: Awaited<ReturnType<typeof computeDashboard>> } | null = null;
const CACHE_MS = 30_000;

async function loadConfigRow() {
  const db = await getDb();
  if (!db) return { db: null as Awaited<ReturnType<typeof getDb>>, config: parseConfig(null) };
  const [row] = await db
    .select({ dashboardConfig: appConfig.dashboardConfig })
    .from(appConfig)
    .where(eq(appConfig.platform, "all"))
    .limit(1);
  return { db, config: parseConfig(row?.dashboardConfig) };
}

async function computeDashboard() {
  const { db, config } = await loadConfigRow();
  let realUsers = 0;
  let realActive = 0;
  let realSubs = 0;
  let realOnline = 0;
  let realGroups = 0;
  let realPostsToday = 0;

  if (db) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const onlineSince = new Date(Date.now() - 15 * 60 * 1000);
    const now = new Date();
    const [[usersRow], [activeRow], [subsRow], [onlineRow], [groupRow], [postRow]] = await Promise.all([
      db.select({ n: count() }).from(users).where(eq(users.isBot, false)),
      db.select({ n: count() }).from(users).where(and(eq(users.isBot, false), gt(users.lastSignedIn, since))),
      db.select({ n: count() }).from(users).where(and(
        eq(users.isBot, false),
        inArray(users.proTier, ["plus", "pro"]),
        gt(users.proUntil, now),
      )),
      db.select({ n: count() }).from(users).where(and(eq(users.isBot, false), gt(users.lastSignedIn, onlineSince))),
      db.select({ n: count() }).from(chatGroups).where(eq(chatGroups.isPublic, true)),
      db.select({ n: count() }).from(posts).where(gt(posts.createdAt, since)),
    ]);
    realUsers = Number(usersRow?.n ?? 0);
    realActive = Number(activeRow?.n ?? 0);
    realSubs = Number(subsRow?.n ?? 0);
    realOnline = Number(onlineRow?.n ?? 0);
    realGroups = Number(groupRow?.n ?? 0);
    realPostsToday = Number(postRow?.n ?? 0);
  }

  const autoExtras = [
    { id: "online", label: "当前在线", value: realOnline },
    { id: "groups", label: "公开社群", value: realGroups },
    { id: "posts", label: "今日动态", value: realPostsToday },
  ];
  const extras = [
    ...autoExtras,
    ...config.extras.filter((e) =>
      !autoExtras.some((a) => a.id === e.id || a.label === e.label)
    ),
  ].slice(0, 8);

  return {
    usersTotal: realUsers + config.boosts.usersTotal,
    activeToday: realActive + config.boosts.activeToday,
    subscribers: realSubs + config.boosts.subscribers,
    extras,
    updatedAt: new Date().toISOString(),
    _real: {
      usersTotal: realUsers,
      activeToday: realActive,
      subscribers: realSubs,
      online: realOnline,
      groups: realGroups,
      postsToday: realPostsToday,
    },
  };
}

export const statsRouter = router({
  /** 发现页：所有登录用户可见的展示数字（已含加成 + 时段波动） */
  getCommunityDashboard: protectedProcedure.query(async () => {
    const now = Date.now();
    if (!cache || now - cache.at >= CACHE_MS) {
      cache = { at: now, payload: await computeDashboard() };
    }
    const { _real: _, ...publicPayload } = cache.payload;
    const live = applyDashboardLive(publicPayload, now);
    return { ...live, updatedAt: new Date(now).toISOString() };
  }),

  /** 管理端：原始配置 + 真实数预览 */
  adminGetDashboardConfig: adminProcedure.query(async () => {
    const payload = await computeDashboard();
    const { config } = await loadConfigRow();
    const live = applyDashboardLive({
      usersTotal: payload.usersTotal,
      activeToday: payload.activeToday,
      subscribers: payload.subscribers,
      extras: payload.extras,
    }, Date.now());
    return {
      boosts: config.boosts,
      extras: config.extras,
      real: payload._real,
      display: {
        usersTotal: live.usersTotal,
        activeToday: live.activeToday,
        subscribers: live.subscribers,
      },
    };
  }),

  adminSetDashboardConfig: adminProcedure
    .input(configSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const clean: DashboardConfig = {
        boosts: {
          usersTotal: input.boosts.usersTotal,
          activeToday: input.boosts.activeToday,
          subscribers: input.boosts.subscribers,
        },
        extras: input.extras.map((e, i) => ({
          id: e.id || `e${i + 1}`,
          label: e.label.trim(),
          value: e.value,
          icon: e.icon?.trim() || undefined,
        })),
      };
      const json = JSON.stringify(clean);
      const existing = await db.select({ id: appConfig.id }).from(appConfig).where(eq(appConfig.platform, "all")).limit(1);
      if (existing.length > 0) {
        await db.update(appConfig).set({ dashboardConfig: json }).where(eq(appConfig.platform, "all"));
      } else {
        await db.insert(appConfig).values({ platform: "all", dashboardConfig: json });
      }
      cache = null; // 立刻让发现页拿到新数字
      return { success: true };
    }),
});
