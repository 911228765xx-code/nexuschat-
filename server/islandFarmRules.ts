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

export const DAILY_ORDERS = [
  { orderKey: "wheat_parcel", label: "码头粮食订单", cropKey: "wheat", requiredQuantity: 6, itReward: 16, seedRewardKey: "seed_tomato", seedRewardQuantity: 2 },
  { orderKey: "tomato_basket", label: "商店鲜果订单", cropKey: "tomato", requiredQuantity: 4, itReward: 24, seedRewardKey: "seed_moonberry", seedRewardQuantity: 1 },
] as const;

export const GROUP_ISLAND_DAILY_GOAL = 5;

export const WORKSHOP_RECIPES = {
  sunrise_crate: {
    label: "晨曦补给箱",
    inputs: { wheat: 3, tomato: 2 },
    outputKey: "sunrise_crate",
    outputQuantity: 1,
    itReward: 8,
    requiredWorkshopLevel: 1,
  },
} as const;

export function currentUtcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function levelForIslandIt(itEarned: number): number {
  return Math.min(FARM_LEVEL_CAP, Math.max(1, Math.floor(Math.max(0, itEarned) / FARM_LEVEL_EVERY_IT) + 1));
}

export function cropReadyAt(cropKey: IslandCropKey, plantedAt: Date): Date {
  return new Date(plantedAt.getTime() + ISLAND_CROPS[cropKey].growMinutes * 60_000);
}
