/**
 * 聊天文件直传端点（raw body）：PPT/PDF/压缩包等任意文件。
 * 体积上限按会员档位（getBenefits.maxFileMB：free 60MB / Plus 100MB / Pro 500MB）。
 * 文件名经 ?name= 传入（保留扩展名 → 接收方系统面板能用 WPS/Office 等正确打开）。
 * 鉴权：会话 Cookie（sdk.authenticateRequest）。
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { getBenefits } from "../membership";

// 简易限流：每用户每分钟最多 10 次文件上传
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(userId: string): boolean {
  const now = Date.now();
  const e = rateMap.get(userId);
  if (!e || now > e.resetAt) { rateMap.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function handleFileUpload(req: Request, res: Response): Promise<void> {
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

  const db = await getDb();
  const maxMB = db ? (await getBenefits(db, user.id)).maxFileMB : 60;
  if (body.length > maxMB * 1024 * 1024) {
    res.status(413).json({ error: `文件不能超过 ${maxMB}MB（当前会员档位），升级会员可上传更大文件` });
    return;
  }

  const rawName = typeof req.query.name === "string" ? req.query.name : "file";
  const safe = rawName.replace(/[^\w.\-一-龥]+/g, "_").slice(-100) || "file";
  const mime = (req.headers["content-type"] as string | undefined)?.split(";")[0] || "application/octet-stream";

  try {
    const { storagePut } = await import("../storage");
    const key = `chat-files/${user.id}/${Date.now()}_${safe}`;
    await storagePut(key, body, mime);
    const publicUrl = `${ENV.publicOrigin}/manus-storage/${key}`; // 别用 req Host:CF→Cloud Run 下是被墙的 *.run.app
    res.json({ url: publicUrl, maxMB });
  } catch {
    res.status(500).json({ error: "上传失败，请重试" });
  }
}
