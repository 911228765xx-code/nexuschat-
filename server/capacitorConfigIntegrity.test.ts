import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Capacitor native shell configuration", () => {
  const source = readFileSync(new URL("../capacitor.config.ts", import.meta.url), "utf8");
  const iosInfo = readFileSync(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
  const androidGradle = readFileSync(new URL("../android/gradle.properties", import.meta.url), "utf8");
  const iosProject = readFileSync(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
  const iosEntitlements = readFileSync(new URL("../ios/App/App/BitChat.entitlements", import.meta.url), "utf8");

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

  it("uses BitChat as the Android launcher and main activity label", () => {
    const androidStrings = readFileSync(
      new URL("../android/app/src/main/res/values/strings.xml", import.meta.url),
      "utf8"
    );
    expect(androidStrings).toContain('<string name="app_name">BitChat</string>');
    expect(androidStrings).toContain('<string name="title_activity_main">BitChat</string>');
    expect(androidStrings).not.toContain(">NexusChat<");
  });

  it("keeps the island farm native update version consistent on Android and iOS", () => {
    const androidAppGradle = readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
    expect(androidAppGradle).toContain('versionCode 194');
    expect(androidAppGradle).toContain('versionName "1.9.4"');
    expect(iosProject).toContain("CURRENT_PROJECT_VERSION = 194;");
    expect(iosProject).toContain("MARKETING_VERSION = 1.9.4;");
  });

  it("enables the BitChat domain as an iOS associated domain", () => {
    expect(iosProject).toContain("CODE_SIGN_ENTITLEMENTS = App/BitChat.entitlements;");
    expect(iosEntitlements).toContain("applinks:nexuschat.best");
  });

  it("keeps Android debug builds within the sandbox memory budget", () => {
    expect(androidGradle).toContain("org.gradle.jvmargs=-Xmx768m");
    expect(androidGradle).toContain("org.gradle.workers.max=1");
    expect(androidGradle).toContain("org.gradle.daemon=false");
  });
});
