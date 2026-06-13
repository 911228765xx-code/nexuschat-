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
  /** 腾讯云实时音视频 TRTC：控制台「应用管理」拿 SDKAppID 与密钥（密钥仅服务端持有，绝不下发客户端） */
  trtcSdkAppId: Number.parseInt(process.env.TRTC_SDKAPPID ?? "0", 10) || 0,
  trtcSecretKey: process.env.TRTC_SECRET_KEY ?? "",
  /** Comma-separated list of extra origins allowed to send credentialed cross-origin requests. */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  /** Number of trusted reverse proxies/CDN hops in front of the app (for real client IP). */
  trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "1", 10) || 0,
};
