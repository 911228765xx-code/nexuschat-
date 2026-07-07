/**
 * 聊天视频直传端点（raw body，绕开 base64-JSON 通道的体积限制）。
 * App 用 FileSystem.uploadAsync(BINARY_CONTENT) 从磁盘流式上传，客户端零内存压力；
 * 体积上限按会员档位：free 60MB / Plus 120MB / Pro 250MB（getBenefits.maxVideoMB）。
 * 鉴权：与 tRPC 相同的会话 Cookie（sdk.authenticateRequest）。
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { getBenefits } from "../membership";

// 简易限流：每用户每分钟最多 6 次视频上传
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(userId: string): boolean {
  const now = Date.now();
  const e = rateMap.get(userId);
  if (!e || now > e.resetAt) { rateMap.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 6) return false;
  e.count++;
  return true;
}

export async function handleVideoUpload(req: Request, res: Response): Promise<void> {
  // 鉴权
  let user: any;
  try {
    user = await sdk.authenticateRequest(req as any);
  } catch {
    res.status(401).json({ error: "未登录或会话过期" });
    return;
  }
  if (!user?.id) { res.status(401).json({ error: "未登录" }); return; }
  if (!checkRate(String(user.id))) { res.status(429).json({ error: "上传过于频繁，请稍后再试" }); return; }

  const body = req.body as Buffer | undefined;
  if (!body || !Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "空的上传内容" });
    return;
  }

  // 会员档位体积上限
  const db = await getDb();
  const maxMB = db ? (await getBenefits(db, user.id)).maxVideoMB : 60;
  if (body.length > maxMB * 1024 * 1024) {
    res.status(413).json({ error: `视频不能超过 ${maxMB}MB（当前会员档位），升级会员可上传更大视频` });
    return;
  }

  const mime = (req.headers["content-type"] as string | undefined)?.split(";")[0] || "video/mp4";
  if (!mime.startsWith("video/")) {
    res.status(400).json({ error: "仅支持视频文件" });
    return;
  }
  const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "mp4";

  try {
    const { storagePut } = await import("../storage");
    const key = `chat-videos/${user.id}/${Date.now()}.${ext}`;
    await storagePut(key, body, mime);
    const publicUrl = `${ENV.publicOrigin}/manus-storage/${key}`; // 别用 req Host:CF→Cloud Run 下是被墙的 *.run.app
    res.json({ url: publicUrl, maxMB });
  } catch (err) {
    res.status(500).json({ error: "上传失败，请重试" });
  }
}
