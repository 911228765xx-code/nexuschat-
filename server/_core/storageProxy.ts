import type { Express, Request, Response } from "express";
import { Readable } from "stream";
import { ENV } from "./env";

/**
 * 存储代理：/app-media/<key>（及旧路径 /manus-storage/<key>）经本域名【流式中转】媒体内容。
 *
 * 为什么不用 307 跳转到 CDN：媒体实际存在海外 CloudFront，大陆网络直连
 * 经常被掐/超时（视频"一直打不开"的结构性原因）。改为后端拉流转发——
 * 服务器到 CDN 链路稳定，用户只需连通本 API 域名（已有多端点容灾）。
 *
 * 为什么要 /app-media 别名：/manus-storage/* 在托管平台的 Cloudflare 边缘被一个
 * 平台级 Worker 拦截、307 到 CloudFront 签名直链（我们删不掉，域名 NS 也不在自己
 * Cloudflare 上）——本文件的流式逻辑在该路径上永远收不到请求。/app-media/* 平台
 * 不认识，原样放行到源站，流式中转才真正生效。新 URL 一律铸 /app-media；旧路径
 * 保留兼容（直连源站的容灾端点仍可用）。
 *
 * 鉴权说明：消息里历史存的本就是公开 CDN 直链，代理不再额外要求会话
 * （否则浏览器播视频/系统下载器无会话会 401）；key 含用户ID+毫秒时间戳，
 * 与 CDN 直链暴露面一致。
 */
export function registerStorageProxy(app: Express) {
  app.get(["/app-media/*", "/manus-storage/*"], async (req: Request, res: Response) => {
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
      // 1) 取签名下载地址——必须用与上传(v1/storage/upload?path=)同族的 v1/storage/downloadUrl(storageGet)。
      // 之前用 v1/storage/presign/get:它签出的存储位置与 upload 实际落盘位置不一致,拿到的 URL
      // 一律 403/404——「视频/文件打不开」的最深层原因(好网络也打不开;图片没事是因为图片消息
      // 存的是上传接口返回的公开直链,不走本代理取件)。
      const { storageGet } = await import("../storage");
      const { url } = await storageGet(key);
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
