import { COOKIE_NAME } from "@shared/const";
import type { AcceptedImageMime } from "./imageValidation";

export type UploadedAnalysis = { id: number; status: "completed" | "unavailable" | "failed"; prediction: string | null; confidencePercent: number | null; manipulationProbabilityPercent: number | null; modelMode: "live" | "demo" | "offline"; modelName: string; modelVersion: string | null; note: string | null };
type UploadInit = { key: string; uploadUrl: string; imageUrl: string; filename: string };
type ChunkUpload = { key: string; chunkIndex: number };
const FALLBACK_CHUNK_BYTES = 192 * 1024;

function previewAuthorizationHeader() {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw?.split(";").find((value) => value.trim().startsWith(prefix));
    const token = pair?.trim().slice(prefix.length);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function readJson<T extends object = { error?: { message?: string } }>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("The upload service did not return a structured response. Please refresh this page and try again.");
  return response.json() as Promise<T & { error?: { message?: string } }>;
}

async function uploadThroughSameOriginChunks(file: File, storageKey: string, onStatus?: (message: string) => void) {
  const chunkKeys: string[] = [];
  const chunkCount = Math.ceil(file.size / FALLBACK_CHUNK_BYTES);
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = file.slice(index * FALLBACK_CHUNK_BYTES, Math.min(file.size, (index + 1) * FALLBACK_CHUNK_BYTES));
    const bytes = new Uint8Array(await chunk.arrayBuffer());
    let binary = "";
    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) binary += String.fromCharCode(bytes[byteIndex] ?? 0);
    onStatus?.(`Transferring image securely (${index + 1}/${chunkCount})…`);
    const response = await fetch("/api/analysis-upload/chunk", { method: "POST", credentials: "include", cache: "no-store", headers: apiHeaders("application/json"), body: JSON.stringify({ storageKey, chunkIndex: index, chunkData: btoa(binary) }) });
    if (!response.ok) { const body = await readJson(response); throw new Error(explainUploadError(body.error?.message, "The image could not be transferred to secure storage. Please try again shortly.")); }
    const result = await readJson<ChunkUpload>(response);
    if (!result.key) throw new Error("The upload service returned an incomplete chunk target. Please try again.");
    chunkKeys.push(result.key);
  }
  return chunkKeys;
}

function explainUploadError(message: string | undefined, fallback: string) {
  if (message?.toLowerCase().includes("session")) return "Your signed-in session was not attached to this preview. Refresh the page, reopen Verify Image, and try again.";
  return message ?? fallback;
}

function apiHeaders(contentType: string) {
  const headers = new Headers({ "Content-Type": contentType });
  const authorization = previewAuthorizationHeader().Authorization;
  if (authorization) headers.set("Authorization", authorization);
  return headers;
}

export async function uploadAndAnalyzeImage(input: { file: File; filename: string; mimeType: AcceptedImageMime; onStatus?: (message: string) => void }): Promise<UploadedAnalysis> {
  const initResponse = await fetch("/api/analysis-upload/init", { method: "POST", credentials: "include", cache: "no-store", headers: apiHeaders("application/json"), body: JSON.stringify({ filename: input.filename, mimeType: input.mimeType, byteSize: input.file.size }) });
  if (!initResponse.ok) { const body = await readJson(initResponse); throw new Error(explainUploadError(body.error?.message, "VisionVerify could not prepare the image upload.")); }
  const init = await readJson<UploadInit>(initResponse);
  if (!init.uploadUrl || !init.key || !init.imageUrl) throw new Error("The upload service returned an incomplete upload target. Please try again.");

  let chunkKeys: string[] | undefined;
  try {
    const uploadResponse = await fetch(init.uploadUrl, { method: "PUT", cache: "no-store", headers: { "Content-Type": input.mimeType }, body: input.file });
    if (!uploadResponse.ok) chunkKeys = await uploadThroughSameOriginChunks(input.file, init.key, input.onStatus);
  } catch {
    chunkKeys = await uploadThroughSameOriginChunks(input.file, init.key, input.onStatus);
  }

  input.onStatus?.("Running live AI detection…");
  const completeResponse = await fetch("/api/analysis-upload/complete", { method: "POST", credentials: "include", cache: "no-store", headers: apiHeaders("application/json"), body: JSON.stringify({ filename: input.filename, mimeType: input.mimeType, storageKey: init.key, imageUrl: init.imageUrl, ...(chunkKeys ? { chunkKeys } : {}) }) });
  if (!completeResponse.ok) { const body = await readJson(completeResponse); throw new Error(explainUploadError(body.error?.message, "VisionVerify could not complete the image analysis.")); }
  const result = await readJson<UploadedAnalysis>(completeResponse);
  return result;
}
