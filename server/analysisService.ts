import { TRPCError } from "@trpc/server";
import { createAnalysis } from "./db";
import { getInferenceState, InferenceRequestError, type InferenceResult, runLiveInference } from "./inference";
import { storagePut } from "./storage";

export const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof allowedImageMimeTypes)[number];

export function isAllowedImageMimeType(value: string | undefined): value is AllowedImageMimeType {
  return Boolean(value && (allowedImageMimeTypes as readonly string[]).includes(value));
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

function detectedMimeType(buffer: Buffer): AllowedImageMimeType | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return undefined;
}

export function validateImageBuffer(buffer: Buffer, declaredMimeType: AllowedImageMimeType): Buffer {
  const maxBytes = 5 * 1024 * 1024;
  if (!buffer.length || buffer.length > maxBytes) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Images must be 5 MB or smaller." });
  if (detectedMimeType(buffer) !== declaredMimeType) throw new TRPCError({ code: "BAD_REQUEST", message: "The image contents do not match its declared file type." });
  return buffer;
}

export function parseImageDataUrl(dataUrl: string, declaredMimeType: AllowedImageMimeType): Buffer {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid JPG, PNG, or WEBP image." });
  return validateImageBuffer(Buffer.from(match[2], "base64"), declaredMimeType);
}

function unavailableResult(mode: "demo" | "offline", note: string) {
  return { status: "unavailable" as const, prediction: "unable_to_analyze" as const, confidencePercent: null, manipulationProbabilityPercent: null, modelMode: mode, modelName: mode === "demo" ? "Demo model" : "ML model unavailable", modelVersion: null, evidence: {}, note };
}

export async function submitImageAnalysis(input: { userId: number; filename: string; mimeType: AllowedImageMimeType; imageBuffer: Buffer }) {
  const imageBuffer = validateImageBuffer(input.imageBuffer, input.mimeType);
  const filename = safeFilename(input.filename);
  const state = getInferenceState();
  let image: { key: string; url: string };
  try {
    image = await storagePut(`visionverify/${input.userId}/${filename}`, imageBuffer, input.mimeType);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "VisionVerify could not securely store the selected image. Please try again." });
  }
  if (state.mode !== "live") {
    const result = unavailableResult(state.mode, state.message);
    const id = await createAnalysis({ userId: input.userId, storageKey: image.key, imageUrl: image.url, filename, mimeType: input.mimeType, byteSize: imageBuffer.length, status: result.status, prediction: result.prediction, modelMode: result.modelMode, modelName: result.modelName, analysisData: { note: result.note } });
    return { id, ...result };
  }
  let inference: InferenceResult;
  try {
    inference = await runLiveInference({ buffer: imageBuffer, filename, mimeType: input.mimeType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ML model unavailable — no prediction generated.";
    const incompleteResponse = error instanceof InferenceRequestError && error.reason === "incomplete_response";
    const modelName = incompleteResponse ? "Provider response incomplete" : "ML model unavailable";
    const id = await createAnalysis({ userId: input.userId, storageKey: image.key, imageUrl: image.url, filename, mimeType: input.mimeType, byteSize: imageBuffer.length, status: "failed", prediction: "unable_to_analyze", modelMode: "live", modelName, analysisData: { note: message, providerResponseState: incompleteResponse ? "missing_score" : "provider_unavailable" } });
    return { id, status: "failed" as const, prediction: "unable_to_analyze" as const, confidencePercent: null, manipulationProbabilityPercent: null, modelMode: "live" as const, modelName, modelVersion: null, evidence: {}, note: message };
  }
  const id = await createAnalysis({ userId: input.userId, storageKey: image.key, imageUrl: image.url, filename, mimeType: input.mimeType, byteSize: imageBuffer.length, status: "completed", prediction: null, confidencePercent: inference.confidencePercent, manipulationProbabilityPercent: inference.manipulationProbabilityPercent, modelMode: "live", modelName: inference.modelName, modelVersion: inference.modelVersion, analysisData: { evidence: inference.evidence, providerTimestamp: inference.providerTimestamp } });
  return { id, status: "completed" as const, prediction: null, modelMode: "live" as const, ...inference, note: null };
}
