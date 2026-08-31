/**
 * 分片上传（图片/视频/文件）：每片 ≤16MB（base64 文本体），任何前置代理都不会 413。
 * 流程：/start 建会话 → /part 逐片追加到临时文件 → /finish 校验会员档位体积并入库存储。
 * 鉴权：会话 Cookie；会话归属校验防串用；2 小时过期自动清理。
 */
import type { Request, Response } from "express";
import fs from "fs";
import os from "os";
import { ENV } from "../_core/env";
import path from "path";
import crypto from "crypto";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { getBenefits } from "../membership";

type Kind = "video" | "file" | "image";
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
const HARD_MAX: Record<Kind, number> = {
  video: 250 * 1024 * 1024,
  file: 500 * 1024 * 1024,
  image: 20 * 1024 * 1024,
};

function parseKind(raw: unknown): Kind {
  if (raw === "file") return "file";
  if (raw === "image") return "image";
  return "video";
}

function kindLabel(kind: Kind): string {
  if (kind === "video") return "视频";
  if (kind === "image") return "图片";
  return "文件";
}

function defaultMime(kind: Kind): string {
  if (kind === "video") return "video/mp4";
  if (kind === "image") return "image/jpeg";
  return "application/octet-stream";
}

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
  // DoS 护栏:限制单用户并发上传会话数。原来无上限,可狂刷 /start 生成海量 0 字节临时文件 + 撑大内存 sessions Map,
  // 或并发开 N 个会话各写到接近 HARD_MAX(N×500MB)灌满 os.tmpdir()。
  let userSessions = 0;
  for (const s of Array.from(sessions.values())) if (s.userId === user.id) userSessions++;
  if (userSessions >= 3) { res.status(429).json({ error: "并发上传过多，请等当前上传完成再试" }); return; }
  const kind = parseKind(req.body?.kind);
  const mime = typeof req.body?.mime === "string" ? req.body.mime.split(";")[0] : defaultMime(kind);
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

/** POST /api/upload/chunked/part?id=&seq=&enc=  body: enc=bin 为原始字节，否则 base64 文本（旧客户端） */
export async function handleChunkPart(req: Request, res: Response): Promise<void> {
  const user = await authUser(req, res);
  if (!user) return;
  const id = String(req.query.id ?? "");
  const seq = parseInt(String(req.query.seq ?? "-1"), 10);
  const s = sessions.get(id);
  if (!s || s.userId !== user.id) { res.status(404).json({ error: "上传会话不存在或已过期" }); return; }
  if (seq !== s.seq) { res.status(409).json({ error: "分片顺序错误，请重新上传" }); return; }
  const enc = String(req.query.enc ?? "");
  let chunk: Buffer;
  if (enc === "bin") {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "空分片" });
      return;
    }
    chunk = req.body;
  } else {
    const b64 = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : (typeof req.body === "string" ? req.body : "");
    if (!b64) { res.status(400).json({ error: "空分片" }); return; }
    try { chunk = Buffer.from(b64, "base64"); } catch { res.status(400).json({ error: "分片解码失败" }); return; }
  }
  if (s.bytes + chunk.length > HARD_MAX[s.kind]) {
    try { fs.unlinkSync(s.filePath); } catch { /* ignore */ }
    sessions.delete(id);
    res.status(413).json({ error: `${kindLabel(s.kind)}超出最大体积限制` });
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
    const maxMB = s.kind === "video"
      ? (benefits?.maxVideoMB ?? 60)
      : s.kind === "image"
        ? 20
        : (benefits?.maxFileMB ?? 60);
    if (s.bytes > maxMB * 1024 * 1024) {
      cleanup();
      res.status(413).json({ error: `${kindLabel(s.kind)}不能超过 ${maxMB}MB（当前会员档位），升级会员可上传更大${kindLabel(s.kind)}` });
      return;
    }
    if (s.bytes === 0) { cleanup(); res.status(400).json({ error: "空文件" }); return; }

    const body = fs.readFileSync(s.filePath);
    const { storagePut } = await import("../storage");
    let key: string;
    if (s.kind === "video") {
      const ext = s.mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "mp4";
      key = `chat-videos/${user.id}/${Date.now()}.${ext}`;
    } else if (s.kind === "image") {
      const ext = s.mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
      key = `chat-images/${user.id}/${Date.now()}.${ext}`;
    } else {
      const safe = s.name.replace(/[^\w.\-一-龥]+/g, "_").slice(-100) || "file";
      key = `chat-files/${user.id}/${Date.now()}_${safe}`;
    }
    await storagePut(key, body, s.mime);
    cleanup();
    // 返回公网域名代理地址（流式中转）：大陆网络直连海外 CDN 不稳，经 API 域名稳定可达
    // 别用 req Host(被墙的 *.run.app);别用 /manus-storage(平台边缘 Worker 劫持 307 到 CloudFront)
    const publicUrl = `${ENV.publicOrigin}/app-media/${key}`;
    res.json({ url: publicUrl });
  } catch {
    cleanup();
    res.status(500).json({ error: "上传失败，请重试" });
  }
}
