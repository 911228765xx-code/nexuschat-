import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chatPage = readFileSync(new URL("../client/src/pages/Chat.tsx", import.meta.url), "utf8");

describe("聊天会话头像", () => {
  it("保留私聊的真实头像 URL，不将其截断为首字母", () => {
    const dmMapping = chatPage.slice(
      chatPage.indexOf("...(dmConversations ?? []).map"),
      chatPage.indexOf("].filter((conv")
    );

    expect(dmMapping).toContain("avatar: dm.avatar || dm.name?.slice(0, 1) || \"U\"");
    expect(dmMapping).not.toContain("dm.avatar.slice(0, 2)");
  });

  it("会话头像组件将 URL 交给 AvatarImage 渲染", () => {
    expect(chatPage).toContain('conv.avatar?.startsWith("http")');
    expect(chatPage).toContain("<AvatarImage src={conv.avatar}");
  });
});
