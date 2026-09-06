export const ISLAND_CROPS = {
  wheat: { label: "金穗小麦", growMinutes: 1, yield: 3, itReward: 4, color: "#f8c860" },
  tomato: { label: "珊瑚番茄", growMinutes: 2, yield: 2, itReward: 6, color: "#ef6a62" },
  moonberry: { label: "星辉浆果", growMinutes: 3, yield: 1, itReward: 10, color: "#8e7cff" },
} as const;

export type IslandCropKey = keyof typeof ISLAND_CROPS;

export const ISLAND_ECONOMY_BOUNDARY = {
  settlementCurrency: "BIT",
  bitMarketEnabled: false,
  bitConversionEnabled: false,
  automaticBitRewardsEnabled: false,
  itTransferable: false,
  itRole: "contribution_and_access",
} as const;

export const PET_CARE_COOLDOWN_MS = 10 * 60 * 1000;
export const PET_EXPLORE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const FARM_LEVEL_EVERY_IT = 80;
export const FARM_LEVEL_CAP = 20;

export const STARTER_SEEDS = {
  seed_wheat: 12,
  seed_tomato: 8,
  seed_moonberry: 4,
} as const;

/** 六块地解锁所需农场等级（与客户端历史 LAND_LEVELS 对齐） */
export const LAND_UNLOCK_LEVELS = [1, 1, 1, 3, 5, 8] as const;

export function plotUnlocked(level: number, slotIndex: number): boolean {
  const need = LAND_UNLOCK_LEVELS[slotIndex];
  if (need == null) return false;
  return level >= need;
}

export function unlockedPlotCount(level: number): number {
  return LAND_UNLOCK_LEVELS.filter((need) => level >= need).length;
}

export function nextLandUnlockLevel(level: number): number | null {
  const next = LAND_UNLOCK_LEVELS.find((need) => need > level);
  return next ?? null;
}

export const DAILY_ORDERS = [
  { orderKey: "wheat_parcel", label: "码头粮食订单", cropKey: "wheat", requiredQuantity: 6, itReward: 16, seedRewardKey: "seed_tomato", seedRewardQuantity: 2 },
  { orderKey: "tomato_basket", label: "商店鲜果订单", cropKey: "tomato", requiredQuantity: 4, itReward: 24, seedRewardKey: "seed_moonberry", seedRewardQuantity: 1 },
  { orderKey: "moonberry_lantern", label: "港湾浆果订单", cropKey: "moonberry", requiredQuantity: 2, itReward: 20, seedRewardKey: "seed_wheat", seedRewardQuantity: 2 },
] as const;

export type IslandOrderKey = (typeof DAILY_ORDERS)[number]["orderKey"];

export const DOCK_COMPLETION_BONUS = {
  label: "码头满载",
  itReward: 8,
  seedRewardKey: "seed_wheat",
  seedRewardQuantity: 2,
} as const;

export const GROUP_ISLAND_DAILY_GOAL = 5;

export const PET_SPECIALTIES = {
  fox: { label: "小狐", specialty: "番茄种", rewardKey: "seed_tomato", rewardQuantity: 2, itReward: 6 },
  chick: { label: "小鸡", specialty: "小麦种", rewardKey: "seed_wheat", rewardQuantity: 3, itReward: 6 },
} as const;

export const WORKSHOP_RECIPES = {
  sunrise_crate: {
    label: "晨曦补给箱",
    inputs: { wheat: 3, tomato: 2 },
    outputKey: "sunrise_crate",
    outputQuantity: 1,
    itReward: 8,
    requiredWorkshopLevel: 1,
  },
  moonlit_seedling: {
    label: "月辉苗箱",
    inputs: { moonberry: 2, wheat: 2 },
    outputKey: "seed_moonberry",
    outputQuantity: 3,
    itReward: 10,
    requiredWorkshopLevel: 2,
  },
} as const;

export type IslandRecipeKey = keyof typeof WORKSHOP_RECIPES;

export const DOCK_BONUS_ORDER_KEY = "dock_full";

export function landSnapshot(level: number) {
  return {
    unlocked: unlockedPlotCount(level),
    total: LAND_UNLOCK_LEVELS.length,
    nextUnlockLevel: nextLandUnlockLevel(level),
    unlockLevels: [...LAND_UNLOCK_LEVELS],
  };
}

export function progressionSnapshot(level: number) {
  const next = nextLandUnlockLevel(level);
  const nextSlot = LAND_UNLOCK_LEVELS.findIndex((need) => need > level);
  return {
    level,
    maxLevel: FARM_LEVEL_CAP,
    nextMilestone: next == null
      ? null
      : {
          level: next,
          label: nextSlot >= 0 ? `开垦第 ${nextSlot + 1} 块地` : "继续成长",
          focus: "继续种植、交单、照料伙伴积累岛屿 IT",
        },
    milestones: [
      { level: 3, label: "开垦第 4 块地", focus: "累计岛屿 IT 解锁更多田地" },
      { level: 5, label: "开垦第 5 块地", focus: "累计岛屿 IT 解锁更多田地" },
      { level: 8, label: "开垦第 6 块地", focus: "累计岛屿 IT 解锁全部田地" },
    ],
  };
}

export function petReadyTimes(pet: { petKey: string; lastCaredAt?: Date | null; lastExploredAt?: Date | null }, now = new Date()) {
  const specialty = PET_SPECIALTIES[pet.petKey as keyof typeof PET_SPECIALTIES] ?? PET_SPECIALTIES.chick;
  const careReadyAt = pet.lastCaredAt ? new Date(pet.lastCaredAt.getTime() + PET_CARE_COOLDOWN_MS) : null;
  const exploreReadyAt = pet.lastExploredAt ? new Date(pet.lastExploredAt.getTime() + PET_EXPLORE_COOLDOWN_MS) : null;
  return {
    careReadyAt: careReadyAt?.toISOString() ?? null,
    exploreReadyAt: exploreReadyAt?.toISOString() ?? null,
    careReady: !careReadyAt || now.getTime() >= careReadyAt.getTime(),
    exploreReady: !exploreReadyAt || now.getTime() >= exploreReadyAt.getTime(),
    specialty,
  };
}

export function groupIslandVisual(totalContribution: number, dailyGoal: number) {
  const percent = dailyGoal <= 0 ? 0 : Math.min(100, Math.round((totalContribution / dailyGoal) * 100));
  if (percent >= 100) return { percent, stage: 4 as const, icon: "⭐", label: "今日建成" };
  if (percent >= 67) return { percent, stage: 3 as const, icon: "🌳", label: "绿意铺开" };
  if (percent >= 34) return { percent, stage: 2 as const, icon: "🏝️", label: "沙岸成形" };
  return { percent, stage: 1 as const, icon: "🌊", label: "潮水初起" };
}

export function currentUtcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function levelForIslandIt(itEarned: number): number {
  return Math.min(FARM_LEVEL_CAP, Math.max(1, Math.floor(Math.max(0, itEarned) / FARM_LEVEL_EVERY_IT) + 1));
}

export function cropReadyAt(cropKey: IslandCropKey, plantedAt: Date): Date {
  return new Date(plantedAt.getTime() + ISLAND_CROPS[cropKey].growMinutes * 60_000);
}
