import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Capacitor native shell configuration", () => {
  const source = readFileSync(new URL("../capacitor.config.ts", import.meta.url), "utf8");
  const iosInfo = readFileSync(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
  const androidGradle = readFileSync(new URL("../android/gradle.properties", import.meta.url), "utf8");

  it("uses the BitChat name and production web bundle directory", () => {
    expect(source).toContain("appName: 'BitChat'");
    expect(source).toContain("webDir: 'dist/public'");
    expect(source).not.toContain("appName: 'NexusChat'");
  });

  it("keeps keyboard and safe-area settings compatible with the mobile shell", () => {
    expect(source).toContain("Keyboard:");
    expect(source).toContain("resize: 'none'");
    expect(source).toContain("contentInset: 'automatic'");
  });

  it("uses BitChat as the visible iOS app name and supports its custom scheme", () => {
    expect(iosInfo).toContain("<string>BitChat</string>");
    expect(iosInfo).toContain("<string>bitchat</string>");
    expect(iosInfo).toContain("<string>nexuschat</string>");
  });

  it("keeps Android debug builds within the sandbox memory budget", () => {
    expect(androidGradle).toContain("org.gradle.jvmargs=-Xmx768m");
    expect(androidGradle).toContain("org.gradle.workers.max=1");
    expect(androidGradle).toContain("org.gradle.daemon=false");
  });
});
