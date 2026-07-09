import type { Express, Request, Response } from "express";
import { Readable } from "stream";
import { ENV } from "./env";

/**
 * 存储代理：/manus-storage/<key> 经本域名【流式中转】媒体内容。
 *
 * 为什么不用 307 跳转到 CDN：媒体实际存在海外 CloudFront，大陆网络直连
 * 经常被掐/超时（视频"一直打不开"的结构性原因）。改为后端拉流转发——
 * 服务器到 CDN 链路稳定，用户只需连通本 API 域名（已有多端点容灾）。
 *
 * 鉴权说明：消息里历史存的本就是公开 CDN 直链，代理不再额外要求会话
 * （否则浏览器播视频/系统下载器无会话会 401）；key 含用户ID+毫秒时间戳，
 * 与 CDN 直链暴露面一致。
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      // 1) 取签名下载地址
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // 2) 流式转发（透传 Range，支持视频边下边播/拖进度）
      const upstreamHeaders: Record<string, string> = {};
      if (typeof req.headers.range === "string") upstreamHeaders.Range = req.headers.range;
      const upstream = await fetch(url, { headers: upstreamHeaders });
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status === 404 ? 404 : 502).send("Media fetch failed");
        return;
      }
      res.status(upstream.status);
      for (const h of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      // 防主域名存储型 XSS:上传不校验类型 + 原样内联回源,恶意 evil.html/SVG 会在与会话同源的主域名执行脚本、
      // 带凭证打 /api/trpc/*。可执行类型强制下载为 octet-stream,并统一 nosniff 禁浏览器类型嗅探;安全媒体仍内联。
      const ctype = upstream.headers.get("content-type") || "application/octet-stream";
      const dangerous = /html|svg|xml|javascript|ecmascript/i.test(ctype);
      res.setHeader("Content-Type", dangerous ? "application/octet-stream" : ctype);
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (dangerous) res.setHeader("Content-Disposition", "attachment");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (!upstream.body) { res.end(); return; }
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) res.status(502).send("Storage proxy error");
    }
  });
}
