import { ENV } from "../_core/env";

const LOOP_PATHS = new Set(["/apk", "/download", "/download/apk"]);

/** 是否把本站下载入口误当成了真正 APK 文件源。 */
export function isOwnDownloadLoop(
  url: string | null | undefined,
  publicOrigin = ENV.publicOrigin,
): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    const origin = new URL(publicOrigin);
    const target = new URL(raw, origin);
    const path = target.pathname.replace(/\/+$/, "") || "/";
    return target.origin === origin.origin && LOOP_PATHS.has(path);
  } catch {
    return true;
  }
}

/**
 * 返回可读取的真实 APK 文件源。
 * DB 为空、URL 非法或指回本站下载入口时，使用已验证的应急源，避免 /apk 回环后被边缘改写成 HTML。
 */
export function resolveAndroidApkSource(
  url: string | null | undefined,
  publicOrigin = ENV.publicOrigin,
  fallbackUrl = ENV.androidApkFallbackUrl,
): {
  url: string;
  usedFallback: boolean;
} {
  const raw = url?.trim() ?? "";
  if (!raw || isOwnDownloadLoop(raw, publicOrigin)) {
    return { url: fallbackUrl, usedFallback: true };
  }
  return { url: raw, usedFallback: false };
}

/** 浏览器整包备用线路只允许绝对 http(s) 文件源。 */
export function getAndroidApkDirectUrl(
  url: string | null | undefined,
  publicOrigin = ENV.publicOrigin,
  fallbackUrl = ENV.androidApkFallbackUrl,
): string {
  const source = resolveAndroidApkSource(
    url,
    publicOrigin,
    fallbackUrl,
  ).url;
  return /^https?:\/\//i.test(source) ? source : "";
}
