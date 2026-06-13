/**
 * 腾讯云 TRTC UserSig 生成（服务端签发，密钥绝不下发客户端）。
 *
 * 实现官方 GenerateUserSig 算法：
 *   sig = base64( HMAC-SHA256(secretKey, 待签名串) )
 *   待签名串 = "TLS.identifier:{userId}\nTLS.sdkappid:{sdkAppId}\nTLS.time:{now}\nTLS.expire:{expire}\n"
 *   UserSig = base64url( zlib.deflate( JSON ) )
 * 参考：https://cloud.tencent.com/document/product/647/17275
 */
import crypto from "crypto";
import zlib from "zlib";

function base64urlFromBuffer(buf: Buffer): string {
  // 腾讯使用的是「base64 后再把 +/= 做 URL 安全替换」的变体
  return buf.toString("base64").replace(/\+/g, "*").replace(/\//g, "-").replace(/=/g, "_");
}

function hmacSha256(
  identifier: string,
  sdkAppId: number,
  currTime: number,
  expire: number,
  secretKey: string,
): string {
  const contentToBeSigned =
    `TLS.identifier:${identifier}\n` +
    `TLS.sdkappid:${sdkAppId}\n` +
    `TLS.time:${currTime}\n` +
    `TLS.expire:${expire}\n`;
  return crypto.createHmac("sha256", secretKey).update(contentToBeSigned, "utf8").digest("base64");
}

/**
 * 生成 UserSig。
 * @param userId 用户标识（建议用我们自己的用户 id 字符串）
 * @param sdkAppId 腾讯 TRTC SDKAppID
 * @param secretKey 腾讯 TRTC 密钥（仅服务端）
 * @param expireSeconds 有效期秒数（默认 24h）
 */
export function genTRTCUserSig(
  userId: string,
  sdkAppId: number,
  secretKey: string,
  expireSeconds = 24 * 3600,
): string {
  const currTime = Math.floor(Date.now() / 1000);
  const sig = hmacSha256(userId, sdkAppId, currTime, expireSeconds, secretKey);
  const obj = {
    "TLS.ver": "2.0",
    "TLS.identifier": userId,
    "TLS.sdkappid": sdkAppId,
    "TLS.expire": expireSeconds,
    "TLS.time": currTime,
    "TLS.sig": sig,
  };
  const compressed = zlib.deflateSync(Buffer.from(JSON.stringify(obj), "utf8"));
  return base64urlFromBuffer(compressed);
}
