import { describe, expect, it } from "vitest";

describe("GitHub repository authentication", () => {
  it("can read the nexuschat repository metadata with GITHUB_PAT", async () => {
    const token = process.env.GITHUB_PAT;
    expect(token, "GITHUB_PAT must be configured for this validation").toBeTruthy();

    const response = await fetch("https://api.github.com/repos/911228765xx-code/nexuschat-", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "nexuschat-manus-auth-check",
      },
    });

    expect(response.status).toBe(200);
    const metadata = (await response.json()) as { name?: string; full_name?: string };
    expect(metadata.name).toBe("nexuschat-");
    expect(metadata.full_name).toBe("911228765xx-code/nexuschat-");
  }, 15_000);
});
