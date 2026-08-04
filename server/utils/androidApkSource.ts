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
 * 是否误填了「构建详情页」而不是 APK 文件直链。
 * 例如 https://expo.dev/accounts/.../builds/<id> 会返回 HTML，导致 App 内更新失败。
 * 正确示例：https://expo.dev/artifacts/eas/xxxx.apk
 */
export function isExpoBuildPageUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (!/(^|\.)expo\.dev$/i.test(u.hostname)) return false;
    // /artifacts/eas/*.apk 是合法文件源
    if (/\/artifacts\/eas\//i.test(u.pathname) && /\.apk$/i.test(u.pathname)) return false;
    // /accounts/.../builds/... 或任意非 artifacts 的 expo 页面
    return /\/builds\//i.test(u.pathname) || !/\/artifacts\//i.test(u.pathname);
  } catch {
    return false;
  }
}

/** 是否为可用的 Android APK 文件源（拒绝本站回环与 Expo 构建页） */
export function assertAndroidApkSource(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  if (isOwnDownloadLoop(raw)) {
    return "Android 下载地址必须是 APK 文件源，不能填写本站 /apk 或 /download";
  }
  if (isExpoBuildPageUrl(raw)) {
    return "请填写 APK 直链（…/artifacts/eas/xxx.apk），不要填构建详情页（…/builds/…）";
  }
  return null;
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
