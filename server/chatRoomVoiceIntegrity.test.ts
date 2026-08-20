import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ChatRoom voice recording integrity", () => {
  const source = readFileSync(new URL("../client/src/pages/ChatRoom.tsx", import.meta.url), "utf8");

  it("uses the real press-and-hold recorder rather than a simulated timer", () => {
    expect(source).toContain('import VoiceRecorder from "@/components/VoiceRecorder"');
    expect(source).toContain("<VoiceRecorder");
    expect(source).toContain('messageType: "file", mediaUrl: audioUrl');
    expect(source).not.toContain("recordingInterval.current = setInterval");
  });
});

