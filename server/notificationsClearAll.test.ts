import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("../server/routers/notificationsRouter.ts", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../client/src/pages/Notifications.tsx", import.meta.url), "utf8");

describe("通知全部清除", () => {
  it("只删除当前用户的真实通知", () => {
    const deleteAllSection = routerSource.slice(
      routerSource.indexOf("deleteAll: protectedProcedure"),
      routerSource.indexOf("});\n\n// ─── Helper")
    );

    expect(deleteAllSection).toContain("db.delete(notifications)");
    expect(deleteAllSection).toContain("eq(notifications.userId, ctx.user.id)");
    expect(deleteAllSection).toContain("rateLimitWrite");
  });

  it("通知中心调用服务器批量删除并刷新列表与未读数", () => {
    expect(pageSource).toContain("trpc.notifications.deleteAll.useMutation");
    expect(pageSource).toContain("clearAllMutation.mutate()");
    expect(pageSource).toContain("utils.notifications.list.invalidate()");
    expect(pageSource).toContain("utils.notifications.unreadCount.invalidate()");
  });
});
