/**
 * 把历史 CloudFront / /manus-storage 媒体改写到本域 /app-media 代理。
 * 与 server/utils/mediaUrl.ts 规则对齐，给聊天室展示兜底。
 */
const MEDIA_ORIGIN = "https://nexuschat.best";
const MEDIA_KEY_RE =
  /\/((?:chat-images|chat-videos|chat-files|group-avatars|avatars|posts|voice-messages)\/[^\s?#]+)/i;

export function rewriteMediaUrl(url: string | undefined | null): string | undefined {
  if (!url) return url ?? undefined;
  const next = url.includes("/manus-storage/")
    ? url.replace("/manus-storage/", "/app-media/")
    : url;
  try {
    const parsed = new URL(next, MEDIA_ORIGIN);
    if (/(^|\.)cloudfront\.net$/i.test(parsed.hostname)) {
      const match = parsed.pathname.match(MEDIA_KEY_RE);
      if (match) return `${MEDIA_ORIGIN}/app-media/${match[1]}`;
    }
  } catch {
    /* keep manus-storage rewrite */
  }
  return next;
}
