import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("native deep link integrity", () => {
  const manifest = readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  const assetLinks = JSON.parse(readFileSync(new URL("../client/public/.well-known/assetlinks.json", import.meta.url), "utf8"));

  it("declares the BitChat domain as an auto-verified Android App Link", () => {
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:host="nexuschat.best"');
    expect(manifest).toContain('android:scheme="nexuschat"');
  });

  it("publishes a debug signing association for the native package", () => {
    expect(assetLinks).toHaveLength(1);
    expect(assetLinks[0].target.package_name).toBe("com.nexuschat.app");
    expect(assetLinks[0].target.sha256_cert_fingerprints[0]).toMatch(/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/);
  });
});
