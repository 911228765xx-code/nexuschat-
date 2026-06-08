import { describe, it, expect } from "vitest";

describe("WalletConnect ProjectID configuration", () => {
  it("should have VITE_WALLETCONNECT_PROJECT_ID set", () => {
    // The ProjectID should be set in environment
    const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID;
    expect(projectId).toBeDefined();
    expect(projectId).not.toBe("00000000000000000000000000000000");
    expect(projectId?.length).toBeGreaterThan(10);
  });

  it("should have a valid hex format ProjectID", () => {
    const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID;
    if (projectId) {
      // WalletConnect ProjectIDs are hex strings
      expect(/^[a-f0-9]+$/.test(projectId)).toBe(true);
    }
  });
});
