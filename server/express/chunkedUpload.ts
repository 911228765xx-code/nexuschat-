/**
 * 分片上传（视频/文件通用）：每片 ≤16MB（base64 文本体），任何前置代理都不会 413。
 * 流程：/start 建会话 → /part 逐片追加到临时文件 → /finish 校验会员档位体积并入库存储。
 * 鉴权：会话 Cookie；会话归属校验防串用；2 小时过期自动清理。
 */
import type { Request, Response } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { getBenefits } from "../membership";

type Kind = "video" | "file";
interface Session {
  userId: number;
  kind: Kind;
  mime: string;
  name: string;
  filePath: string;
  bytes: number;
  seq: number;
  updatedAt: number;
}
const sessions = new Map<string, Session>();

// 各类型硬上限（最高会员档；档内细分在 finish 按 benefits 校验）
const HARD_MAX: Record<Kind, number> = { video: 250 * 1024 * 1024, file: 500 * 1024 * 1024 };

// 过期会话清理（2 小时）
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of Array.from(sessions.entries())) {
    if (now - s.updatedAt > 2 * 3600 * 1000) {
      try { fs.unlinkSync(s.filePath); } catch { /* ignore */ }
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

async function authUser(req: Request, res: Response): Promise<{ id: number } | null> {
  try {
    const user = await sdk.authenticateRequest(req as any);
    if (user?.id) return user as { id: number };
  } catch { /* fallthrough */ }
  res.status(401).json({ error: "未登录或会话过期" });
  return null;
}

/** POST /api/upload/chunked/start  body: { kind, mime, name? } */
export async function handleChunkStart(req: Request, res: Response): Promise<void> {
  const user = await authUser(req, res);
  if (!user) return;
  const kind: Kind = req.body?.kind === "file" ? "file" : "video";
  const mime = typeof req.body?.mime === "string" ? req.body.mime.split(";")[0] : (kind === "video" ? "video/mp4" : "application/octet-stream");
  const name = typeof req.body?.name === "string" ? req.body.name.slice(-100) : "file";
  const id = crypto.randomBytes(16).toString("hex");
  const filePath = path.join(os.tmpdir(), `nxup_${id}`);
  try { fs.writeFileSync(filePath, Buffer.alloc(0)); } catch {
    res.status(500).json({ error: "服务器存储不可用" });
    return;
  }
  sessions.set(id, { userId: user.id, kind, mime, name, filePath, bytes: 0, seq: 0, updatedAt: Date.now() });
  res.json({ id });
}

/** POST /api/upload/chunked/part?id=&seq=  body: base64 文本 */
export async function handleChunkPart(req: Request, res: Response): Promise<void> {
  const user = await authUser(req, res);
  if (!user) return;
  const id = String(req.query.id ?? "");
  const seq = parseInt(String(req.query.seq ?? "-1"), 10);
  const s = sessions.get(id);
  if (!s || s.userId !== user.id) { res.status(404).json({ error: "上传会话不存在或已过期" }); return; }
  if (seq !== s.seq) { res.status(409).json({ error: "分片顺序错误，请重新上传" }); return; }
  const b64 = typeof req.body === "string" ? req.body : "";
  if (!b64) { res.status(400).json({ error: "空分片" }); return; }
  let chunk: Buffer;
  try { chunk = Buffer.from(b64, "base64"); } catch { res.status(400).json({ error: "分片解码失败" }); return; }
  if (s.bytes + chunk.length > HARD_MAX[s.kind]) {
    try { fs.unlinkSync(s.filePath); } catch { /* ignore */ }
    sessions.delete(id);
    res.status(413).json({ error: `${s.kind === "video" ? "视频" : "文件"}超出最大体积限制` });
    return;
  }
  try {
    fs.appendFileSync(s.filePath, chunk);
  } catch {
    res.status(500).json({ error: "写入失败，请重试" });
    return;
  }
  s.bytes += chunk.length;
  s.seq += 1;
  s.updatedAt = Date.now();
  res.json({ ok: true, bytes: s.bytes, seq: s.seq });
}

/** POST /api/upload/chunked/finish?id=  → 按会员档位校验体积，入库存储返回 URL */
export async function handleChunkFinish(req: Request, res: Response): Promise<void> {
  const user = await authUser(req, res);
  if (!user) return;
  const id = String(req.query.id ?? "");
  const s = sessions.get(id);
  if (!s || s.userId !== user.id) { res.status(404).json({ error: "上传会话不存在或已过期" }); return; }
  sessions.delete(id);

  const cleanup = () => { try { fs.unlinkSync(s.filePath); } catch { /* ignore */ } };
  try {
    // 完整性校验：客户端报告的原始大小必须与服务端累计字节一致，防分片丢失产生坏文件
    const expected = parseInt(String(req.query.size ?? "0"), 10);
    if (expected > 0 && expected !== s.bytes) {
      cleanup();
      res.status(400).json({ error: "上传不完整（网络中断），请重试" });
      return;
    }
    const db = await getDb();
    const benefits = db ? await getBenefits(db, user.id) : null;
    const maxMB = s.kind === "video" ? (benefits?.maxVideoMB ?? 60) : (benefits?.maxFileMB ?? 60);
    if (s.bytes > maxMB * 1024 * 1024) {
      cleanup();
      res.status(413).json({ error: `${s.kind === "video" ? "视频" : "文件"}不能超过 ${maxMB}MB（当前会员档位），升级会员可上传更大${s.kind === "video" ? "视频" : "文件"}` });
      return;
    }
    if (s.bytes === 0) { cleanup(); res.status(400).json({ error: "空文件" }); return; }

    const body = fs.readFileSync(s.filePath);
    const { storagePut } = await import("../storage");
    let key: string;
    if (s.kind === "video") {
      const ext = s.mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "mp4";
      key = `chat-videos/${user.id}/${Date.now()}.${ext}`;
    } else {
      const safe = s.name.replace(/[^\w.\-一-龥]+/g, "_").slice(-100) || "file";
      key = `chat-files/${user.id}/${Date.now()}_${safe}`;
    }
    await storagePut(key, body, s.mime);
    cleanup();
    // 返回本域名代理地址（流式中转）：大陆网络直连海外 CDN 不稳，经 API 域名稳定可达
    const publicUrl = `${req.protocol}://${req.get("host")}/manus-storage/${key}`;
    res.json({ url: publicUrl });
  } catch {
    cleanup();
    res.status(500).json({ error: "上传失败，请重试" });
  }
}
