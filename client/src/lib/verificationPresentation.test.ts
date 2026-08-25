import { describe, expect, it } from "vitest";
import { displayScore, providerScore, verificationSummary } from "./verificationPresentation";

describe("verification presentation", () => {
  it("presents provider scores without deriving an unsupported authenticity label", () => {
    const item = { status: "completed" as const, evidence: { ai_generated_probability_percent: 72.5, deepfake_score_percent: 14.2 } };
    expect(verificationSummary(item)).toMatchObject({ label: "Likely AI-Generated", tone: "violet" });
    expect(providerScore(item.evidence, "ai_generated_probability_percent")).toBe(72.5);
    expect(displayScore(providerScore(item.evidence, "deepfake_score_percent"))).toBe("14.2%");
  });

  it("makes missing scores and unavailable provider responses explicit", () => {
    expect(verificationSummary({ status: "completed", evidence: {} })).toMatchObject({ label: "Inconclusive", tone: "amber" });
    expect(verificationSummary({ status: "failed", note: "The ML model could not be reached." })).toMatchObject({ label: "No prediction generated", tone: "rose" });
    expect(verificationSummary({ status: "failed", note: "The ML model returned no usable detection score. No prediction was generated." })).toMatchObject({ label: "Inconclusive — provider response incomplete", tone: "amber" });
    expect(displayScore(null)).toBe("Score unavailable from detection model.");
  });
});
