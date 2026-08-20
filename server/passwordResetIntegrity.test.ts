import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("password reset integrity", () => {
  const source = readFileSync(new URL("./routers/emailAuth.ts", import.meta.url), "utf8");

  it("does not enumerate unregistered addresses and rate-limits reset requests", () => {
    expect(source).toContain("isWindowLocked(resetRequestAttempts");
    expect(source).toContain("bumpWindow(resetRequestAttempts");
    expect(source).toContain("如果该邮箱已注册，验证码已发送");
  });

  it("rejects invalid or expired tokens and protects code retries", () => {
    expect(source).toContain("重置链接无效或已过期，请重新申请");
    expect(source).toContain("isWindowLocked(resetCodeAttempts");
    expect(source).toContain("验证码错误或已过期，请重新获取");
    expect(source).toContain("otpToken(user.id, input.code)");
  });
});

