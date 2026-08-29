/**
 * 聊天/动态媒体一律走本域 /app-media 代理，避免把 Forge CloudFront 直链写进库。
 * 大陆直连 CloudFront 经常超时；/manus-storage 还会被平台边缘 Worker 307 到 CloudFront。
 */
import { ENV } from "../_core/env";

const MEDIA_KEY_RE =
  /\/((?:chat-images|chat-videos|chat-files|group-avatars|avatars|posts|voice-messages)\/[^\s?#]+)/i;

export function appMediaUrl(key: string, origin = ENV.publicOrigin): string {
  return `${origin.replace(/\/+$/, "")}/app-media/${key.replace(/^\/+/, "")}`;
}

export function rewriteMediaUrl(
  url: string | null | undefined,
  origin = ENV.publicOrigin,
): string | null {
  if (url == null || url === "") return url ?? null;
  const next = url.includes("/manus-storage/")
    ? url.replace("/manus-storage/", "/app-media/")
    : url;
  try {
    const parsed = new URL(next, origin);
    if (/(^|\.)cloudfront\.net$/i.test(parsed.hostname)) {
      const match = parsed.pathname.match(MEDIA_KEY_RE);
      if (match) return appMediaUrl(match[1], origin);
    }
  } catch {
    /* keep rewritten /manus-storage path even if URL parse fails */
  }
  return next;
}

const MEDIA_FIELDS = ["mediaUrl", "senderAvatar", "avatar", "url", "thumbUrl"] as const;

export function rewriteRowMedia<T extends object>(row: T, origin?: string): T {
  const record = row as Record<string, unknown>;
  for (const key of MEDIA_FIELDS) {
    const value = record[key];
    if (typeof value === "string") {
      record[key] = rewriteMediaUrl(value, origin);
    }
  }
  return row;
}
