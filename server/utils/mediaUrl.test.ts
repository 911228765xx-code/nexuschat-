import { describe, expect, it } from "vitest";
import { appMediaUrl, rewriteMediaUrl, rewriteRowMedia } from "./mediaUrl";

const ORIGIN = "https://nexuschat.best";

describe("appMediaUrl", () => {
  it("joins origin and storage key", () => {
    expect(appMediaUrl("chat-images/1/2.jpg", ORIGIN)).toBe(
      "https://nexuschat.best/app-media/chat-images/1/2.jpg",
    );
  });
});

describe("rewriteMediaUrl", () => {
  it("rewrites /manus-storage to /app-media", () => {
    expect(rewriteMediaUrl("https://nexuschat.best/manus-storage/chat-images/1/a.jpg", ORIGIN)).toBe(
      "https://nexuschat.best/app-media/chat-images/1/a.jpg",
    );
  });

  it("rewrites CloudFront chat keys to the same-origin proxy", () => {
    expect(
      rewriteMediaUrl(
        "https://d2xsxph8kpxj0f.cloudfront.net/3105/abc/chat-images/88/123.jpg",
        ORIGIN,
      ),
    ).toBe("https://nexuschat.best/app-media/chat-images/88/123.jpg");
  });

  it("leaves brand CloudFront assets that are not chat keys", () => {
    const brand = "https://d2xsxph8kpxj0f.cloudfront.net/3105/abc/icon-192.png";
    expect(rewriteMediaUrl(brand, ORIGIN)).toBe(brand);
  });

  it("leaves already-proxied URLs", () => {
    const ok = "https://nexuschat.best/app-media/chat-videos/1/a.mp4";
    expect(rewriteMediaUrl(ok, ORIGIN)).toBe(ok);
  });
});

describe("rewriteRowMedia", () => {
  it("rewrites mediaUrl and senderAvatar in place", () => {
    const row = {
      mediaUrl: "https://dxx.cloudfront.net/p/chat-videos/3/a.mp4",
      senderAvatar: "https://nexuschat.best/manus-storage/avatars/3/a.jpg",
      content: "hi",
    };
    rewriteRowMedia(row, ORIGIN);
    expect(row.mediaUrl).toBe("https://nexuschat.best/app-media/chat-videos/3/a.mp4");
    expect(row.senderAvatar).toBe("https://nexuschat.best/app-media/avatars/3/a.jpg");
    expect(row.content).toBe("hi");
  });
});
