/** 浏览器端分片上传：图片/视频/文件走 /api/upload/chunked，避开 tRPC 请求体上限。 */
const CHUNK_BYTES = 6 * 1024 * 1024;

async function errorFrom(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch { /* optional */ }
  return fallback;
}

export async function uploadFileChunked(
  file: File,
  kind: "image" | "video" | "file",
): Promise<{ url: string }> {
  const startRes = await fetch("/api/upload/chunked/start", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      mime: file.type || (kind === "image" ? "image/jpeg" : "application/octet-stream"),
      name: file.name || (kind === "image" ? "image.jpg" : "file"),
    }),
  });
  if (!startRes.ok) throw new Error(await errorFrom(startRes, "上传初始化失败，请重试"));
  const { id } = await startRes.json();
  if (!id) throw new Error("上传初始化失败，请重试");

  let offset = 0;
  let seq = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK_BYTES);
    const partRes = await fetch(
      `/api/upload/chunked/part?id=${encodeURIComponent(id)}&seq=${seq}&enc=bin`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/octet-stream" },
        body: slice,
      },
    );
    if (!partRes.ok) throw new Error(await errorFrom(partRes, "分片上传失败，请重试"));
    offset += slice.size;
    seq += 1;
  }

  const finishRes = await fetch(
    `/api/upload/chunked/finish?id=${encodeURIComponent(id)}&size=${file.size}`,
    { method: "POST", credentials: "include" },
  );
  if (!finishRes.ok) throw new Error(await errorFrom(finishRes, "上传失败，请重试"));
  const { url } = await finishRes.json();
  if (!url) throw new Error("上传失败，请重试");
  return { url };
}
