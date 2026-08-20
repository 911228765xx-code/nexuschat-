import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production build configuration", () => {
  const source = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

  it("uses low-memory esbuild minification instead of two-pass Terser", () => {
    expect(source).toContain('minify: "esbuild"');
    expect(source).not.toContain("terserOptions:");
    expect(source).not.toContain("experimentalMinChunkSize");
  });
});
