/**
 * LiveKit 服务端 RoomService 调用（twirp API）。用 roomAdmin 令牌调用，
 * 实现"房主抱人上麦/请下麦"——更新参与者的 canPublish 权限，对方连接实时生效（无需重连）。
 */
import crypto from "crypto";
import { ENV } from "./env";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 签发一个带 roomAdmin 的服务端管理令牌（仅服务端内部用，10 分钟有效） */
function adminToken(room: string): string {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify({
    iss: ENV.livekitApiKey, sub: ENV.livekitApiKey, nbf: now, exp: now + 600, jti: `admin_${now}`,
    video: { room, roomAdmin: true },
  }));
  const s = b64url(crypto.createHmac("sha256", ENV.livekitApiSecret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${s}`;
}

function httpsHost(): string {
  return ENV.livekitUrl.replace(/^wss?:\/\//, "");
}

/** 调 LiveKit twirp RoomService。失败抛错。 */
async function callRoomService(method: string, room: string, body: Record<string, unknown>): Promise<any> {
  const host = httpsHost();
  if (!host) throw new Error("LiveKit 未配置");
  const res = await fetch(`https://${host}/twirp/livekit.RoomService/${method}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken(room)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`LiveKit ${method} ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

/** 设置某参与者能否发声（抱上麦 canPublish=true / 请下麦 false）。实时生效。 */
export async function setParticipantCanPublish(room: string, identity: string, canPublish: boolean): Promise<void> {
  await callRoomService("UpdateParticipant", room, {
    room, identity,
    permission: { canPublish, canSubscribe: true, canPublishData: true },
  });
}

/** 房主把某人移出房间（可选能力，留作踢人用） */
export async function removeParticipant(room: string, identity: string): Promise<void> {
  await callRoomService("RemoveParticipant", room, { room, identity });
}
