import { z } from "zod";

export const predictionSchema = z.enum([
  "likely_authentic",
  "suspicious",
  "likely_manipulated",
  "unable_to_analyze",
]);

export type Prediction = z.infer<typeof predictionSchema>;
export type ModelMode = "live" | "demo" | "offline";

export type InferenceState = {
  mode: ModelMode;
  available: boolean;
  label: string;
  message: string;
  provider: "sightengine" | null;
};

export type InferenceResult = {
  /** Sightengine does not return a unified confidence for the combined classification. */
  confidencePercent: number | null;
  /** Sightengine returns individual scores in evidence rather than this generic field. */
  manipulationProbabilityPercent: number | null;
  modelName: string;
  modelVersion: string | null;
  providerTimestamp: string | null;
  evidence: Record<string, unknown>;
};

const SIGHTENGINE_ENDPOINT = "https://api.sightengine.com/1.0/check.json";
const SIGHTENGINE_MODELS = "deepfake,genai";

const sightengineResponseSchema = z.object({
  status: z.string(),
  request: z
    .object({
      id: z.string().optional(),
      timestamp: z.number().finite().optional(),
    })
    .optional(),
  type: z
    .object({
      deepfake: z.number().min(0).max(1).optional(),
      ai_generated: z.number().min(0).max(1).optional(),
      ai_generators: z.record(z.string(), z.number().min(0).max(1)).optional(),
    })
    .optional(),
  error: z.unknown().optional(),
});

export class InferenceRequestError extends Error {
  public readonly safeMessage: string;
  public readonly reason: "provider_unavailable" | "incomplete_response";

  constructor(safeMessage: string, reason: "provider_unavailable" | "incomplete_response" = "provider_unavailable") {
    super(safeMessage);
    this.safeMessage = safeMessage;
    this.reason = reason;
  }
}

function isSightengineConfigured() {
  return Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
}

/**
 * Model availability is intentionally strict. A live badge appears only when
 * Sightengine credentials are configured server-side. No fallback model or
 * synthetic result is used.
 */
export function getInferenceState(): InferenceState {
  const configuredMode = process.env.VISIONVERIFY_MODEL_MODE?.toLowerCase();

  if (configuredMode === "demo") {
    return {
      mode: "demo",
      available: false,
      label: "DEMO MODE — NO REAL ML INFERENCE",
      message:
        "Demo mode is only for interface testing. No prediction, confidence score, or forensic evidence will be generated.",
      provider: null,
    };
  }

  if (configuredMode !== "offline" && isSightengineConfigured()) {
    return {
      mode: "live",
      available: true,
      label: "Live ML model connected",
      message:
        "Sightengine’s Deepfake Detection and AI-Generated Image Detection models will return actual provider scores for supported images.",
      provider: "sightengine",
    };
  }

  return {
    mode: "offline",
    available: false,
    label: "ML model unavailable",
    message: "ML model unavailable — no prediction generated.",
    provider: null,
  };
}

function percent(score: number) {
  return Math.round(score * 1000) / 10;
}

function scoreForEvidence(value: number | undefined): number | null {
  return value === undefined ? null : percent(value);
}

/**
 * Runs the real Sightengine image-analysis request. Credentials stay on the
 * server, and each returned field is schema-validated before it can become a
 * user-visible result or persistent analysis record.
 */
export async function runLiveInference(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<InferenceResult> {
  const state = getInferenceState();
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (state.mode !== "live" || !apiUser || !apiSecret) {
    throw new InferenceRequestError("ML model unavailable — no prediction generated.");
  }

  const formData = new FormData();
  formData.append(
    "media",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.filename,
  );
  formData.append("models", SIGHTENGINE_MODELS);
  formData.append("api_user", apiUser);
  formData.append("api_secret", apiSecret);

  let response: Response;
  try {
    response = await fetch(SIGHTENGINE_ENDPOINT, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new InferenceRequestError(
      "The ML model could not be reached. No prediction was generated; please try again later.",
    );
  }

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "The ML model credentials were rejected. No prediction was generated."
      : response.status === 429
        ? "The ML model is rate-limited. No prediction was generated; please try again later."
        : "The ML model could not complete this request. No prediction was generated.";
    throw new InferenceRequestError(message);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new InferenceRequestError("The ML model returned an unreadable response. No prediction was generated.");
  }

  const parsed = sightengineResponseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.status !== "success") {
    throw new InferenceRequestError("The ML model returned an invalid result. No prediction was generated.");
  }

  const deepfakeScore = parsed.data.type?.deepfake;
  const aiGeneratedScore = parsed.data.type?.ai_generated;
  if (deepfakeScore === undefined && aiGeneratedScore === undefined) {
    throw new InferenceRequestError("The ML model returned no usable detection score. No prediction was generated.", "incomplete_response");
  }

  const providerTimestamp = parsed.data.request?.timestamp
    ? new Date(parsed.data.request.timestamp * 1000).toISOString()
    : null;
  const evidence: Record<string, unknown> = {};
  if (deepfakeScore !== undefined) {
    evidence.deepfake_score_percent = scoreForEvidence(deepfakeScore);
  }
  if (aiGeneratedScore !== undefined) {
    evidence.ai_generated_probability_percent = scoreForEvidence(aiGeneratedScore);
  }
  if (parsed.data.type?.ai_generators) {
    evidence.ai_generator_scores = parsed.data.type.ai_generators;
  }
  if (parsed.data.request?.id) {
    evidence.provider_request_id = parsed.data.request.id;
  }

  return {
    confidencePercent: null,
    manipulationProbabilityPercent: null,
    modelName: "Sightengine Deepfake Detection + AI-Generated Image Detection",
    modelVersion: null,
    providerTimestamp,
    evidence,
  };
}
