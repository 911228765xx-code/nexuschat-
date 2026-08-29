import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  islandFarms,
  islandDailyOrders,
  islandGroupContributions,
  islandInventories,
  islandPets,
  islandPlots,
  itTransactions,
  chatGroups,
  groupMembers,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { rateLimitWrite } from "../rateLimit";
import { protectedProcedure, router } from "../_core/trpc";
import { cropReadyAt, currentUtcDay, DAILY_ORDERS, FARM_LEVEL_CAP, FARM_LEVEL_EVERY_IT, GROUP_ISLAND_DAILY_GOAL, ISLAND_CROPS, ISLAND_ECONOMY_BOUNDARY, PET_CARE_COOLDOWN_MS, PET_EXPLORE_COOLDOWN_MS, STARTER_SEEDS, WORKSHOP_RECIPES, type IslandCropKey } from "../islandFarmRules";

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
        await db.insert(islandInventories).values(Object.entries(STARTER_SEEDS).map(([itemKey, quantity]) => ({ farmId, itemKey, quantity })));
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
  const day = currentUtcDay();
  const [plots, inventory, pets, account, claimedOrders] = await Promise.all([
    db.select().from(islandPlots).where(eq(islandPlots.farmId, farm.id)).orderBy(islandPlots.slotIndex),
    db.select().from(islandInventories).where(eq(islandInventories.farmId, farm.id)),
    db.select().from(islandPets).where(eq(islandPets.farmId, farm.id)),
    db.select({ it: users.npPoints, bit: users.nnBalance }).from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(islandDailyOrders).where(and(eq(islandDailyOrders.farmId, farm.id), eq(islandDailyOrders.orderDate, day))),
  ]);
  const now = Date.now();
  const completedCount = claimedOrders.filter((row) => row.status === "claimed").length;
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
    orders: DAILY_ORDERS.map((order) => ({ ...order, status: claimedOrders.find((row) => row.orderKey === order.orderKey)?.status ?? "available" })),
    dailyCycle: {
      day,
      completedCount,
      totalCount: DAILY_ORDERS.length,
      allOrdersClaimed: completedCount >= DAILY_ORDERS.length,
      completionBonus: { label: "码头满载", itReward: 0, seedRewardKey: "seed_wheat", seedRewardQuantity: 0, claimed: completedCount >= DAILY_ORDERS.length },
    },
    recipes: WORKSHOP_RECIPES,
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
  await db.update(islandFarms).set({
    itEarned: sql`${islandFarms.itEarned} + ${amount}`,
    level: sql`LEAST(${FARM_LEVEL_CAP}, FLOOR((${islandFarms.itEarned} + ${amount}) / ${FARM_LEVEL_EVERY_IT}) + 1)`,
  }).where(eq(islandFarms.id, farmId));
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
      try {
        await db.transaction(async (tx) => {
          const spentSeed = await tx.update(islandInventories).set({ quantity: sql`${islandInventories.quantity} - 1` })
            .where(and(eq(islandInventories.farmId, farm.id), eq(islandInventories.itemKey, `seed_${input.cropKey}`), sql`${islandInventories.quantity} >= 1`));
          const seedAffected = (spentSeed as any)?.[0]?.affectedRows ?? (spentSeed as any)?.affectedRows ?? 0;
          if (seedAffected <= 0) throw new Error("INSUFFICIENT_SEED");
          const changed = await tx.update(islandPlots).set({ cropKey: input.cropKey, plantedAt, readyAt })
            .where(and(eq(islandPlots.farmId, farm.id), eq(islandPlots.slotIndex, input.slotIndex), isNull(islandPlots.cropKey)));
          const affected = (changed as any)?.[0]?.affectedRows ?? (changed as any)?.affectedRows ?? 0;
          if (affected <= 0) throw new Error("PLOT_OCCUPIED");
        });
      } catch (error: any) {
        if (error?.message === "INSUFFICIENT_SEED") throw new TRPCError({ code: "BAD_REQUEST", message: "没有对应种子，请先完成订单或宠物探索" });
        if (error?.message === "PLOT_OCCUPIED") throw new TRPCError({ code: "BAD_REQUEST", message: "这块农田正在生长，等待收获后再种植" });
        throw error;
      }
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

  craftWorkshop: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ recipeKey: z.enum(["sunrise_crate"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      const recipe = WORKSHOP_RECIPES[input.recipeKey];
      if (farm.workshopLevel < recipe.requiredWorkshopLevel) throw new TRPCError({ code: "BAD_REQUEST", message: "工坊等级不足" });
      try {
        await db.transaction(async (tx) => {
          for (const [itemKey, quantity] of Object.entries(recipe.inputs)) {
            const spent = await tx.update(islandInventories).set({ quantity: sql`${islandInventories.quantity} - ${quantity}` })
              .where(and(eq(islandInventories.farmId, farm.id), eq(islandInventories.itemKey, itemKey), sql`${islandInventories.quantity} >= ${quantity}`));
            const affected = (spent as any)?.[0]?.affectedRows ?? (spent as any)?.affectedRows ?? 0;
            if (affected <= 0) throw new Error("INSUFFICIENT_RECIPE_INPUT");
          }
          await tx.insert(islandInventories).values({ farmId: farm.id, itemKey: recipe.outputKey, quantity: recipe.outputQuantity })
            .onDuplicateKeyUpdate({ set: { quantity: sql`${islandInventories.quantity} + ${recipe.outputQuantity}` } });
          await grantIt(tx, ctx.user.id, farm.id, recipe.itReward, `制作${recipe.label}`);
        });
      } catch (error: any) {
        if (error?.message === "INSUFFICIENT_RECIPE_INPUT") throw new TRPCError({ code: "BAD_REQUEST", message: "制作材料不足" });
        throw error;
      }
      return snapshot(db, ctx.user.id);
    }),

  claimDailyOrder: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ orderKey: z.enum(["wheat_parcel", "tomato_basket"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      const order = DAILY_ORDERS.find((candidate) => candidate.orderKey === input.orderKey)!;
      const day = currentUtcDay();
      try {
        await db.transaction(async (tx) => {
          const [existing] = await tx.select().from(islandDailyOrders).where(and(eq(islandDailyOrders.farmId, farm.id), eq(islandDailyOrders.orderDate, day), eq(islandDailyOrders.orderKey, order.orderKey))).limit(1);
          if (existing?.status === "claimed") throw new Error("ORDER_ALREADY_CLAIMED");
          if (!existing) await tx.insert(islandDailyOrders).values({ farmId: farm.id, orderDate: day, orderKey: order.orderKey });
          const delivered = await tx.update(islandInventories).set({ quantity: sql`${islandInventories.quantity} - ${order.requiredQuantity}` })
            .where(and(eq(islandInventories.farmId, farm.id), eq(islandInventories.itemKey, order.cropKey), sql`${islandInventories.quantity} >= ${order.requiredQuantity}`));
          const affected = (delivered as any)?.[0]?.affectedRows ?? (delivered as any)?.affectedRows ?? 0;
          if (affected <= 0) throw new Error("INSUFFICIENT_ORDER_CROPS");
          await tx.update(islandDailyOrders).set({ status: "claimed", claimedAt: new Date() })
            .where(and(eq(islandDailyOrders.farmId, farm.id), eq(islandDailyOrders.orderDate, day), eq(islandDailyOrders.orderKey, order.orderKey), eq(islandDailyOrders.status, "available")));
          await tx.insert(islandInventories).values({ farmId: farm.id, itemKey: order.seedRewardKey, quantity: order.seedRewardQuantity })
            .onDuplicateKeyUpdate({ set: { quantity: sql`${islandInventories.quantity} + ${order.seedRewardQuantity}` } });
          await grantIt(tx, ctx.user.id, farm.id, order.itReward, `完成${order.label}`);
        });
      } catch (error: any) {
        if (error?.message === "ORDER_ALREADY_CLAIMED") throw new TRPCError({ code: "CONFLICT", message: "该订单今日已完成" });
        if (error?.message === "INSUFFICIENT_ORDER_CROPS") throw new TRPCError({ code: "BAD_REQUEST", message: `需要 ${order.requiredQuantity} 份${ISLAND_CROPS[order.cropKey].label}` });
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

  exploreWithPet: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ petKey: z.enum(["fox", "chick"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const farm = await ensureFarm(db, ctx.user.id);
      const [pet] = await db.select().from(islandPets).where(and(eq(islandPets.farmId, farm.id), eq(islandPets.petKey, input.petKey))).limit(1);
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "宠物不存在" });
      if (pet.affection < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "亲密度达到 2 后才能探索" });
      if (pet.lastExploredAt && Date.now() - pet.lastExploredAt.getTime() < PET_EXPLORE_COOLDOWN_MS) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "伙伴正在探索，4 小时后再来看看它吧" });
      const rewardKey = input.petKey === "fox" ? "seed_tomato" : "seed_wheat";
      const rewardQuantity = input.petKey === "fox" ? 2 : 3;
      await db.transaction(async (tx) => {
        await tx.update(islandPets).set({ lastExploredAt: new Date(), explorationCount: sql`${islandPets.explorationCount} + 1` }).where(eq(islandPets.id, pet.id));
        await tx.insert(islandInventories).values({ farmId: farm.id, itemKey: rewardKey, quantity: rewardQuantity }).onDuplicateKeyUpdate({ set: { quantity: sql`${islandInventories.quantity} + ${rewardQuantity}` } });
        await grantIt(tx, ctx.user.id, farm.id, 6, `${input.petKey === "fox" ? "小狐" : "小鸡"}探索归来`);
      });
      return snapshot(db, ctx.user.id);
    }),

  getGroupIslandProgress: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
    const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, ctx.user.id));
    if (memberships.length === 0) return { day: currentUtcDay(), groups: [], boundary: "群岛协作不产生 BIT、兑换或市场交易。" };
    const groupIds = memberships.map((membership) => membership.groupId);
    const farm = await ensureFarm(db, ctx.user.id);
    const [groups, contributions] = await Promise.all([
      db.select({ id: chatGroups.id, name: chatGroups.name, avatar: chatGroups.avatar }).from(chatGroups).where(inArray(chatGroups.id, groupIds)),
      db.select().from(islandGroupContributions).where(and(inArray(islandGroupContributions.groupId, groupIds), eq(islandGroupContributions.contributionDate, currentUtcDay()))),
    ]);
    return {
      day: currentUtcDay(),
      groups: groups.map((group) => {
        const rows = contributions.filter((row) => row.groupId === group.id);
        const totalContribution = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
        return {
          ...group,
          myContribution: rows.find((row) => row.farmId === farm.id)?.amount ?? 0,
          participantCount: new Set(rows.map((row) => row.userId)).size,
          totalContribution,
          dailyGoal: GROUP_ISLAND_DAILY_GOAL,
          goalReached: totalContribution >= GROUP_ISLAND_DAILY_GOAL,
        };
      }),
      boundary: "群岛协作只消耗游戏内晨曦补给箱并记录 IT 贡献，不产生 BIT、兑换或市场交易。",
    };
  }),

  contributeToGroupIsland: protectedProcedure
    .use(rateLimitWrite)
    .input(z.object({ groupId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      const [membership] = await db.select({ id: groupMembers.id }).from(groupMembers).where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.user.id))).limit(1);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "仅当前群组成员可以参与群岛协作" });
      const farm = await ensureFarm(db, ctx.user.id);
      const day = currentUtcDay();
      try {
        await db.transaction(async (tx) => {
          const [existing] = await tx.select().from(islandGroupContributions).where(and(eq(islandGroupContributions.farmId, farm.id), eq(islandGroupContributions.groupId, input.groupId), eq(islandGroupContributions.contributionDate, day))).limit(1);
          if (existing) throw new Error("GROUP_CONTRIBUTION_COMPLETE");
          const spent = await tx.update(islandInventories).set({ quantity: sql`${islandInventories.quantity} - 1` })
            .where(and(eq(islandInventories.farmId, farm.id), eq(islandInventories.itemKey, "sunrise_crate"), sql`${islandInventories.quantity} >= 1`));
          const affected = (spent as any)?.[0]?.affectedRows ?? (spent as any)?.affectedRows ?? 0;
          if (affected <= 0) throw new Error("NO_SUNRISE_CRATE");
          await tx.insert(islandGroupContributions).values({ farmId: farm.id, groupId: input.groupId, userId: ctx.user.id, contributionDate: day, amount: 1 });
          await grantIt(tx, ctx.user.id, farm.id, 5, "完成群岛协作贡献");
        });
      } catch (error: any) {
        if (error?.message === "GROUP_CONTRIBUTION_COMPLETE") throw new TRPCError({ code: "CONFLICT", message: "你今天已为该群岛贡献过补给箱" });
        if (error?.message === "NO_SUNRISE_CRATE") throw new TRPCError({ code: "BAD_REQUEST", message: "需要 1 个晨曦补给箱" });
        throw error;
      }
      return snapshot(db, ctx.user.id);
    }),
});
