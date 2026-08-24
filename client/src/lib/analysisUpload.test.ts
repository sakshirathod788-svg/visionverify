import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAndAnalyzeImage } from "./analysisUpload";

afterEach(() => vi.unstubAllGlobals());

const image = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }) as File;

describe("uploadAndAnalyzeImage", () => {
  it("turns an unexpected HTML gateway response into a clear upload error instead of attempting JSON parsing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html><h1>403 Forbidden</h1></html>", { status: 403, headers: { "content-type": "text/html" } })));

    await expect(uploadAndAnalyzeImage({ file: image, filename: "sample.png", mimeType: "image/png" })).rejects.toThrow("blocked before reaching VisionVerify");
  });

  it("surfaces a structured server error message from the raw upload endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Images must be 5 MB or smaller." } }), { status: 413, headers: { "content-type": "application/json" } })));

    await expect(uploadAndAnalyzeImage({ file: image, filename: "sample.png", mimeType: "image/png" })).rejects.toThrow("Images must be 5 MB or smaller.");
  });
});
