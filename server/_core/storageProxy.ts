import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    // Root-level objects are public release assets (APK, QR codes). Foldered objects
    // (e.g. chat-images/<userId>/..., voice-messages/...) are user content — require a
    // valid session so the proxy can't be used to anonymously enumerate other users' files.
    if (key.includes("/")) {
      // 外部打开场景（浏览器播视频/系统下载器）没有 App 的会话 Cookie，
      // 允许经 ?auth=<sessionToken> 携带凭证（注入为 cookie 复用统一鉴权）。
      const authParam = typeof req.query.auth === "string" ? req.query.auth : null;
      if (authParam) {
        const merged = [req.headers.cookie, `app_session_id=${authParam}`].filter(Boolean).join("; ");
        (req.headers as Record<string, string | string[] | undefined>).cookie = merged;
      }
      try {
        await sdk.authenticateRequest(req as any);
      } catch {
        res.status(401).send("Unauthorized");
        return;
      }
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
