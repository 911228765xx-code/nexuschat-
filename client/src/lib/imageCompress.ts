/**
 * Compress an image file to reduce size before upload.
 * Uses canvas to resize and re-encode at lower quality.
 * Returns a base64 string (without data URI prefix).
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; maxSizeBytes?: number } = {}
): Promise<{ base64: string; mimeType: string }> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8, maxSizeBytes = 5 * 1024 * 1024 } = options;

  // If file is small enough, just read it directly
  if (file.size <= maxSizeBytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Need to compress
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if larger than max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Always output as JPEG for compression (unless PNG is needed for transparency)
      const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outputMime, quality);
      const base64 = dataUrl.split(",")[1];

      // If still too large, try lower quality
      if (base64.length > maxSizeBytes * 1.34 && outputMime === "image/jpeg") {
        const lowerQuality = canvas.toDataURL("image/jpeg", 0.5);
        resolve({ base64: lowerQuality.split(",")[1], mimeType: "image/jpeg" });
      } else {
        resolve({ base64, mimeType: outputMime });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}
