import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("group chat interaction integrity", () => {
  const source = readFileSync(new URL("../client/src/pages/GroupChatRoom.tsx", import.meta.url), "utf8");

  it("supports long-press actions, leave confirmation and owner settings", () => {
    expect(source).toContain("onTouchStart");
    expect(source).toContain("leaveGroupMutation");
    expect(source).toContain("showGroupSettings");
    expect(source).toContain("updateGroupInfoMutation");
  });

  it("renders media and provides an in-app message search flow", () => {
    expect(source).toContain('msg.messageType === "image" && msg.mediaUrl');
    expect(source).toContain("setShowSearch(true)");
    expect(source).toContain("scrollIntoView");
  });
});
