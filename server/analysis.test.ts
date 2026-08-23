import { describe, expect, it } from "vitest";
import { requireOwnedAnalysis } from "./analysisPolicy";
import { getInferenceState } from "./inference";
import { parseImageDataUrl } from "./routers";

describe("VisionVerify analysis safeguards", () => {
  it("accepts a JPEG payload only when its declared type matches its image signature", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

    expect(parseImageDataUrl(dataUrl, "image/jpeg")).toEqual(jpeg);
    expect(() => parseImageDataUrl(dataUrl, "image/png")).toThrow("declared file type");
  });

  it("does not announce live inference unless both explicit live mode and an endpoint are configured", () => {
    const previousMode = process.env.VISIONVERIFY_MODEL_MODE;
    const previousEndpoint = process.env.VISIONVERIFY_ML_ENDPOINT;
    delete process.env.VISIONVERIFY_MODEL_MODE;
    delete process.env.VISIONVERIFY_ML_ENDPOINT;

    expect(getInferenceState()).toMatchObject({ mode: "offline", available: false });

    process.env.VISIONVERIFY_MODEL_MODE = "demo";
    expect(getInferenceState()).toMatchObject({ mode: "demo", available: false });

    process.env.VISIONVERIFY_MODEL_MODE = "live";
    process.env.VISIONVERIFY_ML_ENDPOINT = "https://example.invalid/infer";
    expect(getInferenceState()).toMatchObject({ mode: "live", available: true });

    if (previousMode === undefined) delete process.env.VISIONVERIFY_MODEL_MODE;
    else process.env.VISIONVERIFY_MODEL_MODE = previousMode;
    if (previousEndpoint === undefined) delete process.env.VISIONVERIFY_ML_ENDPOINT;
    else process.env.VISIONVERIFY_ML_ENDPOINT = previousEndpoint;
  });

  it("refuses analysis records that do not belong to the requesting user", () => {
    expect(() => requireOwnedAnalysis({ userId: 12, id: 8 }, 11)).toThrow("not found");
    expect(requireOwnedAnalysis({ userId: 12, id: 8 }, 12)).toEqual({ userId: 12, id: 8 });
  });
});
