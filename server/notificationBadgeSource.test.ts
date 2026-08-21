import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayout = readFileSync(new URL("../client/src/components/AppLayout.tsx", import.meta.url), "utf8");
const chatPage = readFileSync(new URL("../client/src/pages/Chat.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../client/src/pages/Profile.tsx", import.meta.url), "utf8");

describe("真实通知未读徽标", () => {
  it("应用壳和聊天页仅使用服务端未读计数", () => {
    expect(appLayout).toContain("const notifUnread = unreadData?.count ?? 0");
    expect(appLayout).not.toContain("localNotifUnread");
    expect(chatPage).toContain("const unreadNotificationCount = notifCountData?.count ?? 0");
    expect(chatPage).not.toContain("unreadNotificationCount: localUnreadCount");
  });

  it("个人中心从服务端未读计数渲染通知徽标", () => {
    expect(profilePage).toContain("trpc.notifications.unreadCount.useQuery");
    expect(profilePage).toContain("const notificationUnreadCount = notificationUnreadData?.count ?? 0");
    expect(profilePage).toContain("{notificationUnreadCount > 0 && (");
  });
});
