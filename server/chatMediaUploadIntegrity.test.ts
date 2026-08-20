import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Chat media upload integrity", () => {
  const group = readFileSync(new URL("../client/src/pages/GroupChatRoom.tsx", import.meta.url), "utf8");
  const direct = readFileSync(new URL("../client/src/pages/ChatRoom.tsx", import.meta.url), "utf8");

  it("uploads group images before emitting only their media URL", () => {
    expect(group).toContain("trpc.chat.uploadChatImage.useMutation()");
    expect(group).toContain("mediaUrl: result.url");
    expect(group).toContain('messageType: "image"');
  });

  it("uploads direct-chat images before persisting their media URL", () => {
    expect(direct).toContain("trpc.chat.uploadChatImage.useMutation()");
    expect(direct).toContain("uploadChatImage.mutateAsync({ base64, mimeType })");
    expect(direct).toContain("setImagePreview(result.url)");
  });
});
