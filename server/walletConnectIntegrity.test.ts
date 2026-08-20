import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("wallet connection integrity", () => {
  const source = readFileSync(new URL("../client/src/components/WalletConnectModal.tsx", import.meta.url), "utf8");

  it("gives stalled wallet connections a bounded failure path", () => {
    expect(source).toContain("Promise.race");
    expect(source).toContain("15_000");
    expect(source).toContain("连接超时，请检查网络或改用其他钱包");
    expect(source).toContain("clearTimeout(connectTimeout)");
  });

  it("removes deep-link visibility listeners on both outcomes", () => {
    const removals = source.match(/document\.removeEventListener\("visibilitychange", handleVisibilityChange\)/g) ?? [];
    expect(removals.length).toBeGreaterThanOrEqual(2);
  });

  it("offers a desktop WalletConnect QR path when no browser extension is detected", () => {
    expect(source).toContain('import { ConnectButton } from "@rainbow-me/rainbowkit"');
    expect(source).toContain("<ConnectButton.Custom>");
    expect(source).toContain("使用 WalletConnect 扫码连接");
    expect(source).toContain("openConnectModal");
  });
});
