/**
 * 图片处理：上传时等比缩放到合理尺寸，避免存储/下发 4000px 原图。
 * 失败（非图片/解码错误）时回退原始 buffer，绝不阻断上传。
 */
import { Jimp } from "jimp";
import logger from "./logger";

export interface ProcessedImage {
  buffer: Buffer;
  mime: string;
}

/**
 * 把图片等比缩放到「最长边 ≤ maxDim」，并重编码为 JPEG。
 * - 动图（gif）原样保留（重编码会丢动画）
 * - 处理后若反而更大，则用原图
 */
export async function downscaleImage(
  buffer: Buffer,
  maxDim: number,
  quality = 82,
  mimeIn?: string,
): Promise<ProcessedImage> {
  const m = (mimeIn || "").toLowerCase();
  if (m.includes("gif")) return { buffer, mime: mimeIn || "image/gif" };
  try {
    const img = await Jimp.read(buffer);
    if (img.width > maxDim || img.height > maxDim) {
      img.scaleToFit({ w: maxDim, h: maxDim });
    }
    const out = await img.getBuffer("image/jpeg", { quality });
    if (out.length < buffer.length) return { buffer: out, mime: "image/jpeg" };
    return { buffer, mime: "image/jpeg" };
  } catch (err) {
    logger.warn({ err }, "downscaleImage failed, using original");
    return { buffer, mime: mimeIn || "image/jpeg" };
  }
}
