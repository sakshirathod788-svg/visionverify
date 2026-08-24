import { COOKIE_NAME } from "@shared/const";
import type { AcceptedImageMime } from "./imageValidation";

export type UploadedAnalysis = { id: number; status: "completed" | "unavailable" | "failed"; prediction: string | null; confidencePercent: number | null; manipulationProbabilityPercent: number | null; modelMode: "live" | "demo" | "offline"; modelName: string; modelVersion: string | null; note: string | null };

function previewAuthorizationHeader() {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw?.split(";").find((value) => value.trim().startsWith(prefix));
    const token = pair?.trim().slice(prefix.length);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function uploadAndAnalyzeImage(input: { file: File; filename: string; mimeType: AcceptedImageMime }): Promise<UploadedAnalysis> {
  const headers = new Headers({ "Content-Type": input.mimeType, "X-File-Name": encodeURIComponent(input.filename) });
  const authorization = previewAuthorizationHeader().Authorization;
  if (authorization) headers.set("Authorization", authorization);
  const response = await fetch("/api/analysis-upload", { method: "POST", credentials: "include", headers, body: input.file });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("The image upload was blocked before reaching VisionVerify. Please try a smaller image or try again shortly.");
  const body = await response.json() as UploadedAnalysis | { error?: { message?: string } };
  if (!response.ok) throw new Error("error" in body ? body.error?.message ?? "VisionVerify could not process this image." : "VisionVerify could not process this image.");
  return body as UploadedAnalysis;
}
