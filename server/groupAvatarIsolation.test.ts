import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("group avatar isolation", () => {
  const router = readFileSync(new URL("../server/routers/chat.ts", import.meta.url), "utf8");
  const groupRoom = readFileSync(new URL("../client/src/pages/GroupChatRoom.tsx", import.meta.url), "utf8");

  it("uploads group images to a group-specific key without updating user profiles", () => {
    const uploadSection = router.slice(router.indexOf("uploadGroupAvatar:"), router.indexOf("// Upload chat video"));
    expect(uploadSection).toContain("group-avatars/${input.groupId}");
    expect(uploadSection).toContain("仅群主或管理员可更新群头像");
    expect(uploadSection).not.toContain("db.update(users)");
  });

  it("keeps group avatar state separate from the personal avatar mutation", () => {
    expect(groupRoom).toContain("trpc.chat.uploadGroupAvatar.useMutation()");
    expect(groupRoom).toContain("setEditGroupAvatar(result.url)");
    expect(groupRoom).not.toContain("trpc.user.uploadAvatar");
    expect(groupRoom).toContain("updateGroupInfoMutation.mutate({ groupId");
  });

  it("updates only the edited group cache after saving group settings", () => {
    const saveSection = groupRoom.slice(
      groupRoom.indexOf("const updateGroupInfoMutation"),
      groupRoom.indexOf("// ─── Group management mutations")
    );

    expect(saveSection).toContain("utils.chat.getGroupInfo.setData({ groupId: input.groupId }");
    expect(saveSection).toContain("utils.chat.myGroups.invalidate()");
    expect(saveSection).not.toContain("utils.auth.me.invalidate()");
    expect(saveSection).not.toContain("utils.user.getProfile.invalidate()");
    expect(saveSection).not.toContain("updateProfile(");
  });
});
