import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const groupRoom = readFileSync(new URL("../client/src/pages/GroupChatRoom.tsx", import.meta.url), "utf8");

describe("群聊已读回执交互", () => {
  it("支持点击与键盘操作展开已读成员明细", () => {
    const receiptSection = groupRoom.slice(
      groupRoom.indexOf("function ReadReceiptAvatars"),
      groupRoom.indexOf("// 视频气泡组件")
    );

    expect(receiptSection).toContain("onClick={() => setShowTooltip((visible) => !visible)}");
    expect(receiptSection).toContain('event.key === "Enter" || event.key === " "');
    expect(receiptSection).toContain('aria-label="查看已读成员"');
    expect(receiptSection).toContain("enabled: showTooltip");
  });
});
