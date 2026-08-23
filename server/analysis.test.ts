import { afterEach, describe, expect, it, vi } from "vitest";
import { requireOwnedAnalysis } from "./analysisPolicy";
import { getInferenceState, runLiveInference } from "./inference";
import { parseImageDataUrl } from "./routers";

const originalEnvironment = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnvironment };
});

describe("VisionVerify real-model safeguards", () => {
  it("accepts a JPEG payload only when its declared type matches its image signature", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

    expect(parseImageDataUrl(dataUrl, "image/jpeg")).toEqual(jpeg);
    expect(() => parseImageDataUrl(dataUrl, "image/png")).toThrow("declared file type");
  });

  it("does not announce live inference unless Sightengine mode and both server credentials are configured", () => {
    delete process.env.VISIONVERIFY_MODEL_MODE;
    delete process.env.VISIONVERIFY_INFERENCE_PROVIDER;
    delete process.env.SIGHTENGINE_API_USER;
    delete process.env.SIGHTENGINE_API_SECRET;

    expect(getInferenceState()).toMatchObject({
      mode: "offline",
      available: false,
      message: "ML model unavailable — no prediction generated.",
    });

    process.env.VISIONVERIFY_MODEL_MODE = "demo";
    expect(getInferenceState()).toMatchObject({
      mode: "demo",
      available: false,
      label: "DEMO MODE — NO REAL ML INFERENCE",
    });

    process.env.VISIONVERIFY_MODEL_MODE = "live";
    process.env.VISIONVERIFY_INFERENCE_PROVIDER = "sightengine";
    expect(getInferenceState()).toMatchObject({ mode: "offline", available: false });

    process.env.SIGHTENGINE_API_USER = "test-user";
    process.env.SIGHTENGINE_API_SECRET = "test-secret";
    expect(getInferenceState()).toMatchObject({
      mode: "live",
      available: true,
      provider: "sightengine",
    });
  });

  it("maps only a validated Sightengine response and preserves raw provider scores", async () => {
    process.env.VISIONVERIFY_MODEL_MODE = "live";
    process.env.VISIONVERIFY_INFERENCE_PROVIDER = "sightengine";
    process.env.SIGHTENGINE_API_USER = "test-user";
    process.env.SIGHTENGINE_API_SECRET = "test-secret";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          request: { id: "provider-request", timestamp: 1_700_000_000 },
          type: { deepfake: 0.12, ai_generated: 0.76, ai_generators: { flux: 0.61 } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await runLiveInference({
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      filename: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      confidencePercent: null,
      manipulationProbabilityPercent: null,
      modelName: "Sightengine Deepfake Detection + AI-Generated Image Detection",
      evidence: {
        deepfake_score_percent: 12,
        ai_generated_probability_percent: 76,
        ai_generator_scores: { flux: 0.61 },
        provider_request_id: "provider-request",
      },
    });
  });

  it("refuses analysis records that do not belong to the requesting user", () => {
    expect(() => requireOwnedAnalysis({ userId: 12, id: 8 }, 11)).toThrow("not found");
    expect(requireOwnedAnalysis({ userId: 12, id: 8 }, 12)).toEqual({ userId: 12, id: 8 });
  });
});
