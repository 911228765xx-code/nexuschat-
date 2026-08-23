import { describe, expect, it } from "vitest";
import {
  PINNED_ANDROID_RELEASE,
  getAndroidApkDirectUrl,
  isOwnDownloadLoop,
  isUnreliableDirectApkUrl,
  resolveAndroidApkSource,
  resolvePublishedAndroidRelease,
} from "./androidApkSource";

const origin = "https://nexuschat.best";
const fallback =
  "https://expo.dev/artifacts/eas/example/AIChat-v1.9.0.apk";

describe("androidApkSource", () => {
  it("detects download routes that would proxy back into this server", () => {
    expect(isOwnDownloadLoop("https://nexuschat.best/apk?v=1.9.0", origin)).toBe(
      true,
    );
    expect(isOwnDownloadLoop("https://nexuschat.best/download", origin)).toBe(
      true,
    );
    expect(
      isOwnDownloadLoop("https://nexuschat.best/download/apk", origin),
    ).toBe(true);
    expect(
      isOwnDownloadLoop("https://nexuschat.best/apk-download?v=1.9.8", origin),
    ).toBe(true);
  });

  it("allows external APK artifacts and same-origin static APK files", () => {
    expect(isOwnDownloadLoop(fallback, origin)).toBe(false);
    expect(
      isOwnDownloadLoop(
        "https://nexuschat.best/app-media/AIChat-v1.9.0.apk",
        origin,
      ),
    ).toBe(false);
  });

  it("falls back when the configured URL would recurse", () => {
    expect(
      resolveAndroidApkSource(
        "https://nexuschat.best/apk?v=1.9.0",
        origin,
        fallback,
      ),
    ).toEqual({ url: fallback, usedFallback: true });
  });

  it("keeps a safe configured URL and exposes it as the direct URL", () => {
    const configured =
      "https://cdn.example.com/releases/AIChat-v1.9.0.apk";

    expect(resolveAndroidApkSource(configured, origin, fallback)).toEqual({
      url: configured,
      usedFallback: false,
    });
    expect(getAndroidApkDirectUrl(configured, origin, fallback)).toBe(
      configured,
    );
  });

  it("hides CloudFront / manus-storage as a browser backup link", () => {
    expect(
      isUnreliableDirectApkUrl(
        "https://nexuschat.best/manus-storage/BitChat-v1.9.8-official_807d4034.apk",
        origin,
      ),
    ).toBe(true);
    expect(
      isUnreliableDirectApkUrl(
        "https://d36hbw14aib5lz.cloudfront.net/BitChat-v1.9.8.apk",
        origin,
      ),
    ).toBe(true);
    expect(getAndroidApkDirectUrl(
      "https://nexuschat.best/manus-storage/BitChat-v1.9.8-official_807d4034.apk",
      origin,
      fallback,
    )).toBe("");
  });

  it("pins admin config that still advertises 1.9.8 to the 1.9.9 EAS artifact", () => {
    const stale = resolvePublishedAndroidRelease(
      "1.9.8",
      "https://nexuschat.best/manus-storage/BitChat-v1.9.8-official_807d4034.apk",
    );
    expect(stale).toEqual({
      version: PINNED_ANDROID_RELEASE.version,
      url: PINNED_ANDROID_RELEASE.url,
      pinned: true,
    });
    const current = resolvePublishedAndroidRelease(
      "1.9.9",
      PINNED_ANDROID_RELEASE.url,
    );
    expect(current.pinned).toBe(false);
    expect(current.url).toBe(PINNED_ANDROID_RELEASE.url);
  });
});
