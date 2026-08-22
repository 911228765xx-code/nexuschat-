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

export function cropReadyAt(cropKey: IslandCropKey, plantedAt: Date): Date {
  return new Date(plantedAt.getTime() + ISLAND_CROPS[cropKey].growMinutes * 60_000);
}
