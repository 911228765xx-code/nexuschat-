import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("APK download integrity", () => {
  it("sends full-file requests to the first-party download page", () => {
    const handler = readProjectFile("./express/apkDownload.ts");

    expect(handler).toContain('if (typeof clientRange !== "string")');
    expect(handler).toContain('res.redirect(302, qs ? `/download?${qs}` : "/download")');
    expect(handler).not.toContain('res.redirect(302, url)');
  });

  it("requires bounded Range responses and validates the APK before saving", () => {
    const page = readProjectFile("../client/src/pages/Download.tsx");
    const handler = readProjectFile("./express/apkDownload.ts");

    expect(page).toContain('Range: `bytes=${start}-${end}`');
    expect(page).toContain('content-range');
    expect(page).toContain('buf[0] !== 0x50 || buf[1] !== 0x4b');
    expect(handler).toContain('res.status(206)');
    expect(handler).toContain('Content-Range');
    expect(handler).toContain('no-store, no-transform');
  });
});
