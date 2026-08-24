export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const acceptedImageMimes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageMime = (typeof acceptedImageMimes)[number];

export function detectImageMime(bytes: Uint8Array): AcceptedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" && String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP") return "image/webp";
  return null;
}

export async function inspectImageFile(file: File): Promise<{ mimeType: AcceptedImageMime; previewUrl: string; width: number; height: number }> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 5 MB or smaller.");
  const detectedMime = detectImageMime(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
  if (!detectedMime) throw new Error("Choose a valid JPG, PNG, or WEBP image.");
  const previewUrl = URL.createObjectURL(new Blob([file], { type: detectedMime }));
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("This image cannot be decoded. Please choose a valid JPG, PNG, or WEBP image."));
      image.src = previewUrl;
    });
    if (!dimensions.width || !dimensions.height) throw new Error("This image cannot be decoded. Please choose a valid JPG, PNG, or WEBP image.");
    return { mimeType: detectedMime, previewUrl, ...dimensions };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}
