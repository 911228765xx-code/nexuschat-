/**
 * 聊天/动态图片直传（raw body）。相册压完通常 < 5MB，整文件二进制比分片+base64 快一截。
 * 硬上限 20MB，与分片通道 image 档一致。鉴权同 tRPC 会话 Cookie。
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";

const IMAGE_MAX = 20 * 1024 * 1024;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(userId: string): boolean {
  const now = Date.now();
  const e = rateMap.get(userId);
  if (!e || now > e.resetAt) { rateMap.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 20) return false;
  e.count++;
  return true;
}

export async function handleImageUpload(req: Request, res: Response): Promise<void> {
  let user: { id: number } | null = null;
  try {
    user = await sdk.authenticateRequest(req as any) as { id: number };
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
  if (body.length > IMAGE_MAX) {
    res.status(413).json({ error: "图片不能超过 20MB，请压缩后重试" });
    return;
  }

  const mime = (req.headers["content-type"] as string | undefined)?.split(";")[0] || "image/jpeg";
  if (!mime.startsWith("image/")) {
    res.status(400).json({ error: "仅支持图片文件" });
    return;
  }
  const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";

  try {
    const { storagePut } = await import("../storage");
    const key = `chat-images/${user.id}/${Date.now()}.${ext}`;
    await storagePut(key, body, mime);
    res.json({ url: `${ENV.publicOrigin}/app-media/${key}` });
  } catch {
    res.status(500).json({ error: "上传失败，请重试" });
  }
}
