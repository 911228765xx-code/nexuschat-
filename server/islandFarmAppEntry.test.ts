import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appLayout = fs.readFileSync(path.join(root, "client/src/components/AppLayout.tsx"), "utf8");
const gameCanvas = fs.readFileSync(path.join(root, "client/src/components/island/GameCanvas.tsx"), "utf8");

describe("island farm App entry", () => {
  it("exposes the island farm through the persistent App bottom navigation", () => {
    expect(appLayout).toContain('path: "/app/island"');
    expect(appLayout).toContain('labelKey: "tab.island"');
    expect(appLayout).toContain('Gamepad2');
    expect(appLayout).toContain('() => import("@/pages/IslandFarm")');
  });

  it("treats the island path as an active navigation destination", () => {
    expect(appLayout).toContain('tab.path === "/app/island" && location.startsWith("/app/island")');
  });

  it("does not hide the persistent App navigation on the island route", () => {
    const app = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
    expect(app).toContain('<Route path="/app/island">\n              <AppLayout requireAuth=');
    expect(app).not.toContain('<Route path="/app/island">\n              <AppLayout hideNav');
  });

  it("uses the authored 2D island scene instead of the Babylon low-poly placeholder", () => {
    expect(gameCanvas).toContain('data-testid="island-2d-world"');
    expect(gameCanvas).toContain("files.manuscdn.com/user_upload_by_module/session_file");
    expect(gameCanvas).not.toContain("@babylonjs");
    expect(gameCanvas).not.toContain("new Engine(");
  });

  it("keeps all six farm plots available as accessible touch targets over the 2D scene", () => {
    expect(gameCanvas).toContain("const plotAreas = [");
    expect(gameCanvas).toContain("data-testid={`farm-plot-${area.slotIndex}`}");
    expect(gameCanvas).toContain("aria-pressed={isActive}");
  });
});
