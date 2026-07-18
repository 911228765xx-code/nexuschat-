import type { Request, Response } from "express";
import { Readable } from "stream";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { appConfig } from "../../drizzle/schema";
import { resolveAndroidApkSource } from "../utils/androidApkSource";

/**
 * /apk — 固定下载短链（对外只发这一个地址，永不过期）。
 *
 * 行为：
 *  1) 读 appConfig.downloadUrlAndroid（后台「版本发布」里配置的地址，随版本更新）。
 *  2) 同源相对路径（如 /manus-storage/xxx.apk）→ 302 跳过去（本域名已有多端点容灾）。
 *  3) 外部绝对 URL（如 expo.dev 的 EAS 构建产物）→ 【流式中转】而非 302：
 *     大陆网络直连海外 CDN 常被掐/超时（与 storageProxy 同一结构性原因），
 *     服务器到 CDN 链路稳定，用户只需连通本 API 域名。
 *     顺带把文件名规范成 AIChat-v{版本}.apk（EAS 原始链接是一串乱码哈希名）。
 *
 * 支持 Range 断点续传透传（系统下载器/浏览器分段下载依赖它）。
 */
export async function handleApkDownload(req: Request, res: Response) {
  try {
    const db = await getDb();
    let url = "";
    let version = "";
    if (db) {
      const rows = await db.select().from(appConfig).where(eq(appConfig.platform, "all")).limit(1);
      if (rows.length > 0) {
        url = (rows[0] as { downloadUrlAndroid?: string | null }).downloadUrlAndroid ?? "";
        version = (rows[0] as { latestVersion?: string | null }).latestVersion ?? "";
      }
    }
    const source = resolveAndroidApkSource(url);
    url = source.url;
    if (source.usedFallback) {
      console.warn("[APK] downloadUrlAndroid 为空或指回本站下载入口，已切换应急 APK 源");
    }

    // 同源相对路径：直接 302（storageProxy 等本域名路由自己会流式中转）
    // /manus-storage 换成 /app-media 别名——旧路径在平台边缘被 Worker 劫持 307 到 CloudFront(大陆挂)
    if (url.startsWith("/")) {
      res.redirect(302, url.replace(/^\/manus-storage\//, "/app-media/"));
      return;
    }

    // 外部 URL：流式中转 + 规范文件名。
    // 关键:对上游【一律】用 Range 取(非 Range 客户端也强制 bytes=0-)。实测非 Range 完整 GET 会让
    //   Cloud Run 实例 500 崩溃(应内更新首次下载正是非 Range→装不上→反复提示),而分片通道稳定可用。
    //   非 Range 客户端仍回 200 + 完整 Content-Length(用上游 content-range 里的总长),行为等价一次完整下载。
    const clientRange = req.headers.range;
    const upstreamHeaders: Record<string, string> = {
      Range: typeof clientRange === "string" ? clientRange : "bytes=0-",
    };

    const upstream = await fetch(url, { headers: upstreamHeaders, redirect: "follow" });
    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).send(`下载源暂不可用（${upstream.status}），请稍后再试`);
      return;
    }
    if (typeof clientRange === "string" && upstream.status !== 206) {
      res.status(502).send("下载源不支持分段读取，请使用备用下载线路");
      return;
    }
    if (!upstream.body) {
      res.status(502).send("下载源返回为空");
      return;
    }
    const upstreamType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
    if (upstreamType.includes("text/html")) {
      res.status(502).send("下载源返回了网页而不是 APK，请稍后再试");
      return;
    }
    const cr = upstream.headers.get("content-range"); // "bytes 0-N/TOTAL"
    if (typeof clientRange === "string" && !/^bytes\s+\d+-\d+\/\d+$/i.test(cr ?? "")) {
      res.status(502).send("下载源缺少有效 Content-Range，无法保证文件完整");
      return;
    }

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    const fname = `AIChat${version ? `-v${version}` : ""}.apk`;
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    // identity + no-transform:APK 已是压缩包,禁二次 gzip(0 收益、丢 Content-Length 让进度失效)。
    // no-store(2026-07-12 事故):曾用 public max-age=1800,一次被截断的传输(384KB)被边缘当完整
    // 200 缓存,之后所有人(含带 Range 的应内更新)拿到的都是残包 → 「解析包出现问题」。APK 下载
    // 频次低,禁缓存换正确性。
    res.setHeader("Content-Encoding", "identity");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("Accept-Ranges", "bytes");
    const total = cr ? Number(cr.split("/")[1]) : Number(upstream.headers.get("content-length") || 0);
    if (typeof clientRange === "string") {
      // 客户端确实请求了范围:如实回 206 + Content-Range
      res.status(206);
      if (cr) res.setHeader("Content-Range", cr);
      const len = upstream.headers.get("content-length");
      if (len) res.setHeader("Content-Length", len);
    } else {
      // 客户端要整包:回 200 + 完整长度(而非 206,符合 HTTP 语义,进度条/下载器正常)
      res.status(200);
      if (total) res.setHeader("Content-Length", String(total));
    }

    const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    // 完整性守卫:上游若"干净地"早收(收到字节<应有长度),绝不能让响应看起来正常结束——
    // 那会被客户端当完整文件安装(解析包错误)、还可能被边缘缓存成残包。硬 destroy 造成
    // 传输错误,下载器会报错/重试,残包不落地。
    const expected = typeof clientRange === "string"
      ? Number(upstream.headers.get("content-length") || 0)
      : total;
    let piped = 0;
    nodeStream.on("data", (c: Buffer) => { piped += c.length; });
    nodeStream.on("end", () => {
      if (expected > 0 && piped < expected) {
        console.error(`[APK] upstream短传 ${piped}/${expected},硬断连接防残包`);
        // 先解管再销毁:否则 pipe 的 end 回调还会对已销毁的响应调 res.end()
        try { nodeStream.unpipe(res); } catch { /* ignore */ }
        try { res.destroy(); } catch { /* ignore */ }
      }
    });
    nodeStream.pipe(res);
    nodeStream.on("error", () => { try { res.destroy(); } catch { /* ignore */ } });
    req.on("close", () => { try { nodeStream.destroy(); } catch { /* ignore */ } });
  } catch {
    res.status(500).send("下载暂时不可用，请稍后再试");
  }
}
