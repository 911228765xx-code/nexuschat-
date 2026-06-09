/**
 * Shared CORS origin allow-list, used by both the Express HTTP layer and Socket.IO.
 *
 * Goal: keep credentialed cross-origin requests working for the native (Capacitor)
 * app while rejecting arbitrary attacker origins. The web app is served from the
 * same origin as the API, so its requests are same-origin and don't depend on this.
 */
import { ENV } from "./env";

// Origins used by Capacitor/Ionic native webviews.
const STATIC_ALLOWED = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]);

/**
 * Decide whether a request Origin is allowed to receive CORS credentials.
 * A missing origin (same-origin navigations, native HTTP clients) is always allowed.
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true; // no Origin header → not a cross-origin browser request
  if (STATIC_ALLOWED.has(origin)) return true;
  if (ENV.allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    // 主域及其全部子域（含备用直连源站子域，如 api-hk.nexuschat.best）
    if (host === "nexuschat.best" || host.endsWith(".nexuschat.best")) return true;
  } catch {
    return false;
  }
  return false;
}

/** Express `cors` package origin callback. */
export function corsOriginDelegate(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
): void {
  // Reflect the origin only when allow-listed; otherwise omit CORS headers (browser blocks it).
  cb(null, isAllowedOrigin(origin));
}
