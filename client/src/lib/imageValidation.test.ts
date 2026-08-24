import { afterEach, describe, expect, it, vi } from "vitest";
import { detectImageMime, inspectImageFile } from "./imageValidation";

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detectImageMime", () => {
  it("recognizes actual JPEG, PNG, and WEBP signatures independently of filename", () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  });

  it("rejects non-image bytes before preview or provider submission", () => {
    expect(detectImageMime(new Uint8Array([0x4e, 0x4f, 0x50, 0x45]))).toBeNull();
  });

  it("accepts a supported image by its real bytes and returns a preview after the browser decodes it", async () => {
    class DecodableImage {
      naturalWidth = 320;
      naturalHeight = 240;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", DecodableImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:valid-image-preview");

    const result = await inspectImageFile(new Blob([jpegBytes], { type: "application/octet-stream" }) as File);

    expect(result).toEqual({ mimeType: "image/jpeg", previewUrl: "blob:valid-image-preview", width: 320, height: 240 });
  });

  it("rejects image bytes when the browser cannot decode them and revokes the failed preview", async () => {
    class BrokenImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    }
    vi.stubGlobal("Image", BrokenImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:broken-image-preview");
    const revoke = vi.spyOn(URL, "revokeObjectURL");

    await expect(inspectImageFile(new Blob([jpegBytes], { type: "image/jpeg" }) as File)).rejects.toThrow("cannot be decoded");
    expect(revoke).toHaveBeenCalledWith("blob:broken-image-preview");
  });
});
