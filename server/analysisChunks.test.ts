import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ createAnalysis: vi.fn().mockResolvedValue(77) }));
vi.mock("./storage", () => ({
  storagePresignPut: vi.fn(),
  storagePut: vi.fn(),
  storageReadBuffer: vi.fn(),
}));

import { createAnalysis } from "./db";
import { completeChunkedImageUpload, storeImageUploadChunk, uploadChunkBytes } from "./analysisService";
import { storagePut, storageReadBuffer } from "./storage";

const originalEnvironment = { ...process.env };

afterEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnvironment };
});

describe("same-origin chunked image upload", () => {
  it("stores a bounded authenticated chunk under the requesting user's key", async () => {
    vi.mocked(storagePut).mockResolvedValue({ key: "visionverify/9/image.png.part-0_hash", url: "/manus-storage/visionverify/9/image.png.part-0_hash" });
    const bytes = Buffer.from("chunk-data");

    await expect(storeImageUploadChunk({ userId: 9, storageKey: "visionverify/9/image.png_hash", chunkIndex: 0, chunkData: bytes.toString("base64") })).resolves.toEqual({ key: "visionverify/9/image.png.part-0_hash", chunkIndex: 0 });
    expect(storagePut).toHaveBeenCalledWith("visionverify/9/image.png_hash.part-0", bytes, "application/octet-stream");
  });

  it("reassembles stored chunks, validates the image signature, stores the final image, and persists the result", async () => {
    process.env.VISIONVERIFY_MODEL_MODE = "offline";
    delete process.env.VISIONVERIFY_INFERENCE_PROVIDER;
    delete process.env.SIGHTENGINE_API_USER;
    delete process.env.SIGHTENGINE_API_SECRET;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    vi.mocked(storageReadBuffer).mockResolvedValue(png);
    vi.mocked(storagePut).mockResolvedValue({ key: "visionverify/9/image.png_final_hash", url: "/manus-storage/visionverify/9/image.png_final_hash" });

    const result = await completeChunkedImageUpload({ userId: 9, filename: "image.png", mimeType: "image/png", storageKey: "visionverify/9/image.png_hash", imageUrl: "/manus-storage/visionverify/9/image.png_hash", chunkKeys: ["visionverify/9/image.png_hash.part-0_hash"] });

    expect(storageReadBuffer).toHaveBeenCalledWith("visionverify/9/image.png_hash.part-0_hash", uploadChunkBytes);
    expect(storagePut).toHaveBeenCalledWith("visionverify/9/image.png_hash", png, "image/png");
    expect(createAnalysis).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: 77, status: "unavailable", modelMode: "offline" });
  });
});
