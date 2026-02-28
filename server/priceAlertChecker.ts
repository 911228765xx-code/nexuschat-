/**
 * Price Alert Checker
 *
 * Runs every 2 minutes. Fetches current prices from CoinGecko for all
 * active (non-triggered) alert token IDs, then compares against each
 * user's target price. When a condition is met:
 *   1. Inserts a "system" notification for the user.
 *   2. Marks the alert as triggered (isTriggered = true, isActive = false).
 */

import { getDb } from "./db";
import { priceAlerts, notifications } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// Fetch current USD prices for a list of CoinGecko token IDs
async function fetchPrices(tokenIds: string[]): Promise<Record<string, number>> {
  if (tokenIds.length === 0) return {};
  const ids = Array.from(new Set(tokenIds)).join(",");
  try {
    const res = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, { usd: number }>;
    const result: Record<string, number> = {};
    for (const [id, val] of Object.entries(data)) {
      result[id] = val.usd;
    }
    return result;
  } catch {
    return {};
  }
}

async function checkAlerts() {
  const db = await getDb();
  if (!db) return;

  // Fetch all active, non-triggered alerts
  const activeAlerts = await db
    .select()
    .from(priceAlerts)
    .where(and(eq(priceAlerts.isActive, true), eq(priceAlerts.isTriggered, false)));

  if (activeAlerts.length === 0) return;

  // Collect unique token IDs and fetch prices
  const tokenIds = activeAlerts.map((a) => a.tokenId);
  const prices = await fetchPrices(tokenIds);

  if (Object.keys(prices).length === 0) return;

  for (const alert of activeAlerts) {
    const currentPrice = prices[alert.tokenId];
    if (currentPrice === undefined) continue;

    const target = parseFloat(alert.targetPrice);
    if (isNaN(target)) continue;

    const triggered =
      (alert.condition === "above" && currentPrice >= target) ||
      (alert.condition === "below" && currentPrice <= target);

    if (!triggered) continue;

    // 1. Mark alert as triggered
    await db
      .update(priceAlerts)
      .set({ isTriggered: true, isActive: false })
      .where(eq(priceAlerts.id, alert.id));

    // 2. Insert a system notification for the user
    const directionLabel = alert.condition === "above" ? "above ↑" : "below ↓";
    const content =
      `🔔 Price Alert: ${alert.tokenSymbol} is now $${currentPrice.toLocaleString()} — ` +
      `your target of $${target.toLocaleString()} (${directionLabel}) has been reached!`;

    await db.insert(notifications).values({
      userId: alert.userId,
      type: "system",
      fromUserId: null,
      fromUserName: "NexusChat",
      fromUserAvatar: "🔔",
      content,
      isRead: false,
    });

    console.log(
      `[PriceAlert] Triggered alert #${alert.id} for user ${alert.userId}: ` +
        `${alert.tokenSymbol} ${alert.condition} $${target} (current: $${currentPrice})`
    );
  }
}

export function startPriceAlertChecker() {
  console.log("[PriceAlert] Checker started — interval: 2 min");
  // Run immediately on startup, then on interval
  checkAlerts().catch(console.error);
  setInterval(() => {
    checkAlerts().catch(console.error);
  }, CHECK_INTERVAL_MS);
}
