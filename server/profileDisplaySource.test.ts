import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profilePage = readFileSync(new URL("../client/src/pages/Profile.tsx", import.meta.url), "utf8");

describe("个人资料展示数据源", () => {
  it("从真实 user.getProfile 查询读取身份卡资料", () => {
    expect(profilePage).toContain("trpc.user.getProfile.useQuery(undefined");
    expect(profilePage).toContain("const displayedProfile = {");
    expect(profilePage).toContain("displayName: profileData?.name || me?.name || profile.displayName");
    expect(profilePage).toContain("avatar: profileData?.avatar ?? profile.avatar");
  });

  it("身份卡渲染和复制地址使用真实资料优先的展示对象", () => {
    expect(profilePage).toContain("displayedProfile.avatar?.startsWith");
    expect(profilePage).toContain("{displayedProfile.displayName}</h2>");
    expect(profilePage).toContain("navigator.clipboard.writeText(displayedProfile.walletAddress)");
  });
});
