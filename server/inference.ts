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
};

export type InferenceResult = {
  prediction: Prediction;
  confidencePercent: number | null;
  manipulationProbabilityPercent: number | null;
  modelName: string;
  modelVersion: string | null;
  providerTimestamp: string | null;
  evidence: Record<string, unknown>;
};

const providerResponseSchema = z.object({
  prediction: predictionSchema,
  confidence: z.number().finite().optional(),
  manipulationProbability: z.number().finite().optional(),
  model: z.string().trim().min(1),
  modelVersion: z.string().trim().min(1).optional(),
  timestamp: z.string().trim().min(1).optional(),
  analysis: z.record(z.string(), z.unknown()).default({}),
});

export class InferenceRequestError extends Error {
  public readonly safeMessage: string;

  constructor(safeMessage: string) {
    super(safeMessage);
    this.safeMessage = safeMessage;
  }
}

/**
 * A live endpoint is deliberately opt-in. The app remains honest when no model
 * endpoint is configured and never substitutes a fabricated classification.
 */
export function getInferenceState(): InferenceState {
  const configuredMode = process.env.VISIONVERIFY_MODEL_MODE?.toLowerCase();
  const endpoint = process.env.VISIONVERIFY_ML_ENDPOINT;

  if (configuredMode === "demo") {
    return {
      mode: "demo",
      available: false,
      label: "Demo mode — no real inference",
      message:
        "Demo mode is intended for interface testing only. No authenticity prediction will be generated.",
    };
  }

  if (configuredMode === "live" && endpoint) {
    return {
      mode: "live",
      available: true,
      label: "Live model connected",
      message:
        "A configured model will return a probabilistic assessment for supported images.",
    };
  }

  return {
    mode: "offline",
    available: false,
    label: "Model not connected",
    message:
      "A model endpoint has not been configured. VisionVerify will not claim an authenticity result.",
  };
}

function scoreAsPercent(value: number | undefined): number | null {
  if (value === undefined) return null;
  const percent = value <= 1 ? value * 100 : value;
  if (percent < 0 || percent > 100) {
    throw new InferenceRequestError("The connected model returned an invalid score.");
  }
  return Math.round(percent * 10) / 10;
}

/**
 * Calls a real, server-configured model endpoint. The endpoint must receive a
 * multipart `image` field and return the documented response shape in README.
 */
export async function runLiveInference(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<InferenceResult> {
  const state = getInferenceState();
  const endpoint = process.env.VISIONVERIFY_ML_ENDPOINT;

  if (state.mode !== "live" || !endpoint) {
    throw new InferenceRequestError(state.message);
  }

  const formData = new FormData();
  formData.append(
    "image",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.filename,
  );

  const apiKey = process.env.VISIONVERIFY_ML_API_KEY;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      body: formData,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new InferenceRequestError(
      "VisionVerify could not connect to the configured analysis model. Please try again later.",
    );
  }

  if (!response.ok) {
    throw new InferenceRequestError(
      "The configured analysis model could not complete this request. Please try again later.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new InferenceRequestError("The configured analysis model returned an invalid response.");
  }

  const parsed = providerResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InferenceRequestError("The configured analysis model returned an unsupported response.");
  }

  return {
    prediction: parsed.data.prediction,
    confidencePercent: scoreAsPercent(parsed.data.confidence),
    manipulationProbabilityPercent: scoreAsPercent(parsed.data.manipulationProbability),
    modelName: parsed.data.model,
    modelVersion: parsed.data.modelVersion ?? null,
    providerTimestamp: parsed.data.timestamp ?? null,
    evidence: parsed.data.analysis,
  };
}
