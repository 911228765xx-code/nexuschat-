/**
 * email.ts — Resend 邮件发送封装
 * 用于发送密码重置邮件。
 * 如果 RESEND_API_KEY 未配置，则静默失败（降级到页面显示链接模式）。
 */
import { Resend } from "resend";
import { ENV } from "./env";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!ENV.resendApiKey) return null;
  if (!resend) resend = new Resend(ENV.resendApiKey);
  return resend;
}

/** 发件地址：免费账号使用 onboarding@resend.dev，配置自定义域名后可改为 noreply@nexuschat.best */
const FROM_ADDRESS = "NexusChat <onboarding@resend.dev>";
const APP_NAME = "NexusChat";

export type SendEmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

/**
 * 发送密码重置邮件
 * @returns SendEmailResult — 成功时返回 messageId，失败时返回错误信息
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  expiresInMinutes?: number;
}): Promise<SendEmailResult> {
  const client = getResend();
  if (!client) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const { to, resetUrl, expiresInMinutes = 60 } = params;

  const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>重置密码 — ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#12121a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#00d4ff,#a855f7);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:24px;">💬</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.4);font-size:13px;">让AI社交成为生活习惯 · 澳洲 AFT 集团</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:18px;font-weight:600;">密码重置请求</h2>
              <p style="margin:0 0 20px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;">
                我们收到了您的密码重置请求。点击下方按钮设置新密码，链接将在 <strong style="color:rgba(255,255,255,0.8);">${expiresInMinutes} 分钟</strong>后失效。
              </p>
              <!-- CTA Button -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#00d4ff,#a855f7);border-radius:12px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                  重置密码
                </a>
              </div>
              <p style="margin:20px 0 0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
                如果按钮无法点击，请复制以下链接到浏览器地址栏：<br/>
                <span style="color:rgba(0,212,255,0.6);word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;">
                如果您没有请求重置密码，请忽略此邮件，您的账号仍然安全。<br/>
                此邮件由 ${APP_NAME} 自动发送，请勿回复。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `重置您的 ${APP_NAME} 密码`,
      html,
    });

    if (result.error) {
      console.warn("[Email] Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id ?? "unknown" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[Email] Failed to send email:", message);
    return { success: false, error: message };
  }
}
