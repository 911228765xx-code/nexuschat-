import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

function readClientFile(relativePath: string) {
  return readFileSync(path.join(projectRoot, "client", relativePath), "utf8");
}

function readPublicFile(fileName: string) {
  return readClientFile(path.join("public", fileName));
}

describe("BitChat web branding", () => {
  it("uses BitChat in the PWA manifest", () => {
    const manifest = JSON.parse(readPublicFile("manifest.json")) as {
      name: string;
      short_name: string;
    };

    expect(manifest.name).toContain("BitChat");
    expect(manifest.short_name).toBe("BitChat");
    expect(manifest.name).not.toContain("NexusChat");
  });

  it("uses BitChat for push notification defaults", () => {
    const serviceWorker = readPublicFile("sw.js");

    expect(serviceWorker).toContain('title: "BitChat"');
    expect(serviceWorker).toContain('tag: "bitchat-notification"');
    expect(serviceWorker).not.toContain('title: "NexusChat"');
  });

  it("uses BitChat in the document and company introduction metadata", () => {
    const indexHtml = readClientFile("index.html");
    const aboutHtml = readPublicFile("about.html");

    expect(indexHtml).toContain("比特AI（BitChat）");
    expect(indexHtml).not.toContain("Bitchat");
    expect(aboutHtml).toContain("比特AI（BitChat）");
    expect(aboutHtml).not.toContain("Bitchat");
  });
});
