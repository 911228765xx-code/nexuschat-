/**
 * 旧 Capacitor 套壳会把官网整站嵌进 WebView。
 * 官方只认 Expo 原生包；套壳里不再渲染 /app。
 */
type CapWindow = {
  Capacitor?: { isNativePlatform?: () => boolean };
  location?: { protocol?: string };
};

export function detectCapacitorShell(win: CapWindow): boolean {
  const cap = win.Capacitor;
  if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) {
    return true;
  }
  return win.location?.protocol === "capacitor:";
}

export function isCapacitorShell(): boolean {
  if (typeof window === "undefined") return false;
  return detectCapacitorShell(window);
}
