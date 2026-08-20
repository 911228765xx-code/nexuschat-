import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("startup and Service Worker integrity", () => {
  it("keeps exactly one non-disruptive Service Worker registration", () => {
    const main = readProjectFile("../client/src/main.tsx");
    const html = readProjectFile("../client/index.html");

    expect(main).not.toContain("navigator.serviceWorker.register");
    expect(html).toContain("updateViaCache: 'none'");
    expect(html).not.toContain("window.location.reload()");
  });

  it("does not intercept navigation or static chunks through the Service Worker", () => {
    const worker = readProjectFile("../client/public/sw.js");

    expect(worker).not.toContain('addEventListener("fetch"');
    expect(worker).not.toContain("SW_UPDATED");
    expect(worker).toContain('title: "Bitchat"');
  });

  it("keeps the app layout container stable across chat route changes", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");

    expect(layout).not.toContain("key={location}");
    expect(layout).not.toContain('className="page-enter"');
  });

  it("mounts Onboarding inside the internationalization provider", () => {
    const app = readProjectFile("../client/src/App.tsx");
    const onboarding = readProjectFile("../client/src/components/Onboarding.tsx");

    expect(app.indexOf("<I18nProvider>")).toBeLessThan(app.indexOf("<AppContent />"));
    expect(onboarding).toContain('useI18n');
  });

  it("releases the static skeleton after the first React frame", () => {
    const main = readProjectFile("../client/src/main.tsx");
    const html = readProjectFile("../client/index.html");

    expect(main).toContain("requestAnimationFrame");
    expect(main).toContain("__nexusHideSkeleton");
    expect(html).toContain("}, 50);");
    expect(html).toContain("}, 3000);");
  });
});
