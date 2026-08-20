import { describe, expect, it } from "vitest";

describe("Resend 发件地址配置", () => {
  it("使用已验证域名发件地址，且 Resend API 凭据可被认证", async () => {
    expect(process.env.RESEND_FROM).toBe("noreply@nexuschat.best");

    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const responseBody = await response.text();

    // Sending access 密钥只能发送邮件，访问域名读取接口会返回 401 和明确的权限限制说明。
    // 该响应表明 Resend 已识别密钥；无效密钥应返回 403。
    expect([200, 401]).toContain(response.status);
    if (response.status === 401) {
      expect(responseBody.toLowerCase()).toContain("restricted to only send emails");
    }
  });
});
