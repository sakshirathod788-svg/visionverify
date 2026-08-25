export type VerificationRecord = { status: "completed" | "unavailable" | "failed"; note?: string | null; evidence?: Record<string, unknown> | null };

export function providerScore(evidence: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = evidence?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function verificationSummary(item: VerificationRecord) {
  if (item.status !== "completed") {
    if (item.note?.includes("no usable detection score")) return { label: "Inconclusive — provider response incomplete", tone: "amber", description: "The provider completed its response but returned no usable detection score. No verification prediction was generated." };
    return { label: "No prediction generated", tone: "rose", description: item.note ?? "The model did not return a usable prediction for this image." };
  }
  const ai = providerScore(item.evidence, "ai_generated_probability_percent");
  const deepfake = providerScore(item.evidence, "deepfake_score_percent");
  if (ai !== null && ai >= 50) return { label: "Likely AI-Generated", tone: "violet", description: `This display state is derived from Sightengine’s returned AI-generated score of ${ai}% using a visible 50% UI threshold. It is not a provider-supplied authenticity verdict.` };
  if (deepfake !== null && deepfake >= 50) return { label: "Potential manipulation signal", tone: "violet", description: `This display state is derived from Sightengine’s returned deepfake score of ${deepfake}% using a visible 50% UI threshold. It is not definitive proof.` };
  if (ai !== null || deepfake !== null) return { label: "Not flagged by returned scores", tone: "violet", description: "The returned provider scores are below VisionVerify’s visible 50% display threshold. This is not a claim that the image is authentic." };
  return { label: "Inconclusive", tone: "amber", description: "The provider completed the request but returned no usable detection score." };
}

export function displayScore(score: number | null, fallback = "Score unavailable from detection model.") { return score === null ? fallback : `${score}%`; }
