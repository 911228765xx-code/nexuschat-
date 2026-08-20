import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home PWA install entry integrity", () => {
  const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

  it("prioritizes native install, presents the iOS guide, and retains download fallback", () => {
    expect(source).toContain("const handleInstallOrDownload = async () =>");
    expect(source).toContain('if (platform === "ios")');
    expect(source).toContain("setShowIOSGuide(true)");
    expect(source).toContain("canInstall && await triggerInstall()");
    expect(source).toContain('setLocation("/download")');
  });
});
