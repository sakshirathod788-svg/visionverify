import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAndAnalyzeImage } from "./analysisUpload";

afterEach(() => vi.unstubAllGlobals());

const image = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }) as File;
const result = { id: 42, status: "completed", prediction: null, confidencePercent: null, manipulationProbabilityPercent: null, modelMode: "live", modelName: "Sightengine", modelVersion: null, note: null } as const;

describe("uploadAndAnalyzeImage", () => {
  it("turns an unexpected HTML init response into a clear upload error instead of attempting JSON parsing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html><h1>403 Forbidden</h1></html>", { status: 403, headers: { "content-type": "text/html" } })));
    await expect(uploadAndAnalyzeImage({ file: image, filename: "sample.png", mimeType: "image/png" })).rejects.toThrow("structured response");
  });

  it("surfaces a structured server error from the small init request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Images must be 5 MB or smaller." } }), { status: 413, headers: { "content-type": "application/json" } })));
    await expect(uploadAndAnalyzeImage({ file: image, filename: "sample.png", mimeType: "image/png" })).rejects.toThrow("Images must be 5 MB or smaller.");
  });

  it("falls back to same-origin chunks when presigned storage is blocked by browser CORS", async () => {
    const statuses: string[] = [];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ key: "visionverify/1/sample.png_hash", uploadUrl: "https://storage.example/upload", imageUrl: "/manus-storage/visionverify/1/sample.png_hash", filename: "sample.png" }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ key: "visionverify/1/sample.png_hash.part-0_hash", chunkIndex: 0 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadAndAnalyzeImage({ file: image, filename: "sample.png", mimeType: "image/png", onStatus: (status) => statuses.push(status) })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/analysis-upload/chunk");
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({ storageKey: "visionverify/1/sample.png_hash", chunkIndex: 0 });
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toMatchObject({ chunkKeys: ["visionverify/1/sample.png_hash.part-0_hash"] });
    expect(statuses).toEqual(["Transferring image securely (1/1)…", "Running live AI detection…"]);
  });

  it("sends image bytes directly to presigned storage, then completes real analysis", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ key: "visionverify/1/sample.png_hash", uploadUrl: "https://storage.example/upload", imageUrl: "/manus-storage/visionverify/1/sample.png_hash", filename: "sample.png" }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadAndAnalyzeImage({ file: image, filename: "sample.png", mimeType: "image/png" })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/analysis-upload/init");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://storage.example/upload");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT", body: image });
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/analysis-upload/complete");
  });
});
