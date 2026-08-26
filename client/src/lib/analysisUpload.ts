import { COOKIE_NAME } from "@shared/const";
import type { AcceptedImageMime } from "./imageValidation";

export type UploadedAnalysis = { id: number; status: "completed" | "unavailable" | "failed"; prediction: string | null; confidencePercent: number | null; manipulationProbabilityPercent: number | null; modelMode: "live" | "demo" | "offline"; modelName: string; modelVersion: string | null; note: string | null };
type UploadInit = { key: string; uploadUrl: string; imageUrl: string; filename: string };

function previewAuthorizationHeader() {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw?.split(";").find((value) => value.trim().startsWith(prefix));
    const token = pair?.trim().slice(prefix.length);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("The upload service did not return a structured response. Please refresh this page and try again.");
  return response.json() as Promise<{ error?: { message?: string } }>;
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

export async function uploadAndAnalyzeImage(input: { file: File; filename: string; mimeType: AcceptedImageMime }): Promise<UploadedAnalysis> {
  const initResponse = await fetch("/api/analysis-upload/init", { method: "POST", credentials: "include", cache: "no-store", headers: apiHeaders("application/json"), body: JSON.stringify({ filename: input.filename, mimeType: input.mimeType, byteSize: input.file.size }) });
  if (!initResponse.ok) { const body = await readJson(initResponse); throw new Error(explainUploadError(body.error?.message, "VisionVerify could not prepare the image upload.")); }
  const init = await initResponse.json() as UploadInit;
  if (!init.uploadUrl || !init.key || !init.imageUrl) throw new Error("The upload service returned an incomplete upload target. Please try again.");

  let uploadResponse: Response;
  try { uploadResponse = await fetch(init.uploadUrl, { method: "PUT", cache: "no-store", headers: { "Content-Type": input.mimeType }, body: input.file }); } catch { throw new Error("The image could not be transferred to secure storage. Please try again shortly."); }
  if (!uploadResponse.ok) throw new Error("The image could not be transferred to secure storage. Please try again shortly.");

  const completeResponse = await fetch("/api/analysis-upload/complete", { method: "POST", credentials: "include", cache: "no-store", headers: apiHeaders("application/json"), body: JSON.stringify({ filename: input.filename, mimeType: input.mimeType, storageKey: init.key, imageUrl: init.imageUrl }) });
  if (!completeResponse.ok) { const body = await readJson(completeResponse); throw new Error(explainUploadError(body.error?.message, "VisionVerify could not complete the image analysis.")); }
  const result = await readJson(completeResponse);
  return result as UploadedAnalysis;
}
