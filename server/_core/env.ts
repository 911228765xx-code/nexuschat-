export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  /** LiveKit 语音房：livekit.cloud 项目设置拿 API Key/Secret + WS URL（密钥仅服务端，绝不下发客户端） */
  livekitUrl: process.env.LIVEKIT_URL ?? "",          // wss://xxx.livekit.cloud
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
  /** Comma-separated list of extra origins allowed to send credentialed cross-origin requests. */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  /** Number of trusted reverse proxies/CDN hops in front of the app (for real client IP). */
  trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "1", 10) || 0,
  /**
   * 对外公网域名(拼绝对链接专用:更新下载地址/邀请链接/上传媒体 URL)。
   * ⚠️ 不能用 req.get("host"):Cloudflare→Cloud Run 架构下 Express 看到的 Host 是
   * *.a.run.app(Google 域名,大陆被墙),拼出去的链接国内用户全打不开。
   */
  publicOrigin: (process.env.PUBLIC_ORIGIN ?? "https://nexuschat.best").replace(/\/+$/, ""),
};

// 安全断言:JWT_SECRET 是整个会话签名的根密钥。原来缺失时静默退化为空 HMAC key → 任何人可用空密钥
// 自签 {openId: 任意/admin/ownerOpenId} 会话冒充任意用户、接管后台。生产必须配置且足够长,否则拒绝启动。
if (ENV.isProduction && (!ENV.cookieSecret || ENV.cookieSecret.length < 16)) {
  throw new Error("[FATAL] JWT_SECRET 未配置或过短(需 ≥16 字节):会话签名密钥缺失会导致会话可被伪造,拒绝启动。");
}
