import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  islandFarms,
  islandInventories,
  islandPets,
  islandPlots,
  itTransactions,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { rateLimitWrite } from "../rateLimit";
import { protectedProcedure, router } from "../_core/trpc";
import { cropReadyAt, ISLAND_CROPS, ISLAND_ECONOMY_BOUNDARY, PET_CARE_COOLDOWN_MS, type IslandCropKey } from "../islandFarmRules";

const cropKeySchema = z.enum(["wheat", "tomato", "moonberry"]);

async function ensureFarm(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number) {
  let [farm] = await db.select().from(islandFarms).where(eq(islandFarms.userId, userId)).limit(1);
  if (!farm) {
    try {
      const created = await db.insert(islandFarms).values({ userId });
      const farmId = Number((created as any)?.insertId ?? (created as any)?.[0]?.insertId ?? 0);
      if (farmId) {
        await db.insert(islandPlots).values(Array.from({ length: 6 }, (_, slotIndex) => ({ farmId, slotIndex })));
        await db.insert(islandPets).values([{ farmId, petKey: "fox" }, { farmId, petKey: "chick" }]);
      }
    } catch {
      // Unique userId ownership safely collapses simultaneous first-load initialization.
    }
    [farm] = await db.select().from(islandFarms).where(eq(islandFarms.userId, userId)).limit(1);
  }
  if (!farm) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "岛屿初始化失败，请稍后重试" });

  const existingPlots = await db.select({ id: islandPlots.id }).from(islandPlots).where(eq(islandPlots.farmId, farm.id));
  if (existingPlots.length === 0) {
    await db.insert(islandPlots).values(Array.from({ length: 6 }, (_, slotIndex) => ({ farmId: farm.id, slotIndex }))).catch(() => {});
  }
  const existingPets = await db.select({ id: islandPets.id }).from(islandPets).where(eq(islandPets.farmId, farm.id));
  if (existingPets.length === 0) {
    await db.insert(islandPets).values([{ farmId: farm.id, petKey: "fox" }, { farmId: farm.id, petKey: "chick" }]).catch(() => {});
  }
  return farm;
}

async function snapshot(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number) {
  const farm = await ensureFarm(db, userId);
  const [plots, inventory, pets, account] = await Promise.all([
    db.select().from(islandPlots).where(eq(islandPlots.farmId, farm.id)).orderBy(islandPlots.slotIndex),
    db.select().from(islandInventories).where(eq(islandInventories.farmId, farm.id)),
    db.select().from(islandPets).where(eq(islandPets.farmId, farm.id)),
    db.select({ it: users.npPoints, bit: users.nnBalance }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  const now = Date.now();
  return {
    farm,
    crops: ISLAND_CROPS,
    plots: plots.map((plot) => ({
      ...plot,
      state: !plot.cropKey ? "empty" : plot.readyAt && plot.readyAt.getTime() <= now ? "ready" : "growing",
      progress: !plot.cropKey || !plot.plantedAt || !plot.readyAt
        ? 0
        : Math.min(1, Math.max(0, (now - plot.plantedAt.getTime()) / (plot.readyAt.getTime() - plot.plantedAt.getTime()))),
    })),
    inventory: inventory.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.itemKey]: row.quantity }), {}),
    pets,
    economy: {
      it: Number(account[0]?.it ?? 0),
      bit: Number(account[0]?.bit ?? 0),
      bitSettlement: "BIT 是岛屿未来市场的统一结算货币；首期市场与兑换尚未开放。",
      itRole: "IT 是不可交易的贡献与资格指标，由服务端验证的种植、收获、建设与照料行为获得。",
      boundaries: ISLAND_ECONOMY_BOUNDARY,
    },
  };
}

async function grantIt(
  db: any,
  userId: number,
  farmId: number,
  amount: number,
  memo: string,
) {
  await db.update(users).set({ npPoints: sql`${users.npPoints} + ${amount}` }).where(eq(users.id, userId));
  await db.update(islandFarms).set({ itEarned: sql`${islandFarms.itEarned} + ${amount}` }).where(eq(islandFarms.id, farmId));
  await db.insert(itTransactions).values({ userId, amount, type: "island_farm", refType: "farm", refId: farmId, memo });
}

export const islandFarmRouter = router({
  getState: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
    return snapshot(db, ctx.user.id);
  }),

  plant: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ slotIndex: z.number().int().min(0).max(5), cropKey: cropKeySchema }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      const crop = ISLAND_CROPS[input.cropKey];
      const plantedAt = new Date();
      const readyAt = cropReadyAt(input.cropKey, plantedAt);
      const changed = await db.update(islandPlots).set({ cropKey: input.cropKey, plantedAt, readyAt })
        .where(and(eq(islandPlots.farmId, farm.id), eq(islandPlots.slotIndex, input.slotIndex), isNull(islandPlots.cropKey)));
      const affected = (changed as any)?.[0]?.affectedRows ?? (changed as any)?.affectedRows ?? 0;
      if (affected <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "这块农田正在生长，等待收获后再种植" });
      return snapshot(db, ctx.user.id);
    }),

  harvest: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ slotIndex: z.number().int().min(0).max(5) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      try {
        await db.transaction(async (tx) => {
          const [plot] = await tx.select().from(islandPlots)
            .where(and(eq(islandPlots.farmId, farm.id), eq(islandPlots.slotIndex, input.slotIndex))).limit(1);
          const cropKey = plot?.cropKey as IslandCropKey | null;
          if (!plot || !cropKey || !plot.readyAt || plot.readyAt.getTime() > Date.now()) throw new Error("NOT_READY");
          const crop = ISLAND_CROPS[cropKey];
          await tx.update(islandPlots).set({ cropKey: null, plantedAt: null, readyAt: null }).where(eq(islandPlots.id, plot.id));
          await tx.insert(islandInventories).values({ farmId: farm.id, itemKey: cropKey, quantity: crop.yield })
            .onDuplicateKeyUpdate({ set: { quantity: sql`${islandInventories.quantity} + ${crop.yield}` } });
          await grantIt(tx, ctx.user.id, farm.id, crop.itReward, `收获${crop.label}`);
        });
      } catch (error: any) {
        if (error?.message === "NOT_READY") throw new TRPCError({ code: "BAD_REQUEST", message: "作物尚未成熟" });
        throw error;
      }
      return snapshot(db, ctx.user.id);
    }),

  upgradeWorkshop: protectedProcedure
    .use(rateLimitWrite)
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      const nextLevel = farm.workshopLevel + 1;
      const wheatCost = nextLevel * 4;
      const tomatoCost = nextLevel * 2;
      try {
        await db.transaction(async (tx) => {
          for (const [itemKey, cost] of [["wheat", wheatCost], ["tomato", tomatoCost]] as const) {
            const spent = await tx.update(islandInventories).set({ quantity: sql`${islandInventories.quantity} - ${cost}` })
              .where(and(eq(islandInventories.farmId, farm.id), eq(islandInventories.itemKey, itemKey), sql`${islandInventories.quantity} >= ${cost}`));
            const affected = (spent as any)?.[0]?.affectedRows ?? (spent as any)?.affectedRows ?? 0;
            if (affected <= 0) throw new Error("INSUFFICIENT_CROPS");
          }
          await tx.update(islandFarms).set({ workshopLevel: nextLevel }).where(eq(islandFarms.id, farm.id));
          await grantIt(tx, ctx.user.id, farm.id, 12, `升级码头工坊 Lv.${nextLevel}`);
        });
      } catch (error: any) {
        if (error?.message === "INSUFFICIENT_CROPS") throw new TRPCError({ code: "BAD_REQUEST", message: `升级需要 ${wheatCost} 小麦与 ${tomatoCost} 番茄` });
        throw error;
      }
      return snapshot(db, ctx.user.id);
    }),

  carePet: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ petKey: z.enum(["fox", "chick"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      const [pet] = await db.select().from(islandPets).where(and(eq(islandPets.farmId, farm.id), eq(islandPets.petKey, input.petKey))).limit(1);
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "宠物不存在" });
      if (pet.lastCaredAt && Date.now() - pet.lastCaredAt.getTime() < PET_CARE_COOLDOWN_MS) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "宠物正在休息，稍后再来看看它吧" });
      }
      await db.transaction(async (tx) => {
        await tx.update(islandPets).set({ affection: sql`LEAST(${islandPets.affection} + 1, 99)`, lastCaredAt: new Date() }).where(eq(islandPets.id, pet.id));
        await grantIt(tx, ctx.user.id, farm.id, 3, `照料${input.petKey === "fox" ? "小狐" : "小鸡"}`);
      });
      return snapshot(db, ctx.user.id);
    }),
});
