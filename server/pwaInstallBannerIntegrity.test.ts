import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PWA install banner integrity", () => {
  const banner = readFileSync(new URL("../client/src/components/PWAInstallBanner.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

  it("uses BitChat branding, i18n copy, and hides after installation or dismissal", () => {
    expect(banner).toContain('alt="BitChat"');
    expect(banner).not.toContain('alt="NexusChat"');
    expect(banner).toContain('const { t } = useI18n()');
    expect(banner).toContain("if (!canInstall || dismissed) return null");
  });

  it("mounts the banner at the application shell level", () => {
    expect(app).toContain("<PWAInstallBanner />");
  });

  it("defines every PWA banner and iOS guide key in every locale", () => {
    const keys = ["pwa.installTitle", "pwa.installSubtitle", "pwa.installing", "pwa.install", "pwa.androidDesc", "pwa.iosStep1", "pwa.iosStep1b", "pwa.iosStep2", "pwa.iosStep2b", "pwa.iosStep3"];
    const localeDir = new URL("../client/src/locales/", import.meta.url);
    for (const file of readdirSync(localeDir).filter(file => file.endsWith(".json"))) {
      const dictionary = JSON.parse(readFileSync(new URL(file, localeDir), "utf8"));
      for (const key of keys) expect(dictionary[key], `${file}: ${key}`).toBeTruthy();
    }
  });
});
