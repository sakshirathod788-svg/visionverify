import { describe, expect, it } from "vitest";
import { runLiveInference } from "./inference";

const SIGHTENGINE_CHECK_URL = "https://api.sightengine.com/1.0/check.json";
const OFFICIAL_SAMPLE_IMAGE = "https://sightengine.com/assets/img/examples/example-fac-1000.jpg";

describe.runIf(process.env.VISIONVERIFY_RUN_LIVE_TESTS === "true")("Sightengine credential configuration", () => {
  it("authenticates to the documented deepfake detection endpoint", async () => {
    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    expect(apiUser, "SIGHTENGINE_API_USER must be configured").toBeTruthy();
    expect(apiSecret, "SIGHTENGINE_API_SECRET must be configured").toBeTruthy();

    const endpoint = new URL(SIGHTENGINE_CHECK_URL);
    endpoint.searchParams.set("models", "deepfake");
    endpoint.searchParams.set("api_user", apiUser!);
    endpoint.searchParams.set("api_secret", apiSecret!);
    endpoint.searchParams.set("url", OFFICIAL_SAMPLE_IMAGE);

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) });
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as {
      status?: string;
      type?: { deepfake?: number };
    };
    expect(payload.status).toBe("success");
    expect(typeof payload.type?.deepfake).toBe("number");
  }, 25_000);

  it("runs the VisionVerify live adapter against the provider sample image", async () => {
    const sampleResponse = await fetch(OFFICIAL_SAMPLE_IMAGE, { signal: AbortSignal.timeout(20_000) });
    expect(sampleResponse.ok).toBe(true);

    const result = await runLiveInference({
      buffer: Buffer.from(await sampleResponse.arrayBuffer()),
      filename: "sightengine-provider-sample.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.modelName).toBe("Sightengine Deepfake Detection + AI-Generated Image Detection");
    expect(result.confidencePercent).toBeNull();
    expect(result.manipulationProbabilityPercent).toBeNull();
    expect(Object.keys(result.evidence)).toContain("deepfake_score_percent");
  }, 40_000);
});
