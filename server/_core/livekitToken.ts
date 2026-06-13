/**
 * LiveKit 访问令牌（JWT）签发。服务端用 API Secret 签名，密钥绝不下发客户端。
 *
 * LiveKit 的 access token 就是标准 HS256 JWT：
 *   payload = { iss: apiKey, sub: identity, nbf, exp, jti, video: {room, roomJoin, canPublish, canSubscribe, ...} }
 * 客户端拿 token + wsUrl 即可用 @livekit/react-native 连接房间。
 * 参考：https://docs.livekit.io/home/get-started/authentication/
 */
import crypto from "crypto";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface LiveKitGrant {
  room: string;
  identity: string;
  canPublish: boolean;   // 麦上（房主/嘉宾）可发声；听众 false
  name?: string;         // 显示名
  ttlSeconds?: number;   // 默认 6h
}

/** 生成 LiveKit JWT 访问令牌 */
export function genLiveKitToken(apiKey: string, apiSecret: string, grant: LiveKitGrant): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = grant.ttlSeconds ?? 6 * 3600;
  const header = { alg: "HS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: apiKey,
    sub: grant.identity,
    nbf: now,
    exp: now + ttl,
    jti: grant.identity,
    ...(grant.name ? { name: grant.name } : {}),
    video: {
      room: grant.room,
      roomJoin: true,
      canPublish: grant.canPublish,
      canSubscribe: true,
      canPublishData: true,
    },
  };
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", apiSecret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}
