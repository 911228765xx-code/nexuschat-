import { describe, expect, it } from "vitest";
import {
  getAndroidApkDirectUrl,
  isOwnDownloadLoop,
  resolveAndroidApkSource,
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
});
