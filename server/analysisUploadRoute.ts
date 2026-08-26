import express, { type Express, type Request, type Response } from "express";
import { completeChunkedImageUpload, completeDirectImageUpload, isAllowedImageMimeType, prepareDirectImageUpload, storeImageUploadChunk, submitImageAnalysis } from "./analysisService";
import { sdk } from "./_core/sdk";

function safeJsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "VisionVerify could not process this image.";
  const status = message.includes("session") ? 401 : message.includes("5 MB") ? 413 : 400;
  return { status, body: { error: { message } } };
}

export async function analysisUploadHandler(req: Request, res: Response) {
  try {
    const mimeType = req.headers["content-type"]?.split(";", 1)[0]?.trim();
    if (!isAllowedImageMimeType(mimeType)) return res.status(415).json({ error: { message: "Choose a valid JPG, PNG, or WEBP image." } });
    if (!Buffer.isBuffer(req.body)) return res.status(400).json({ error: { message: "VisionVerify did not receive image data." } });
    const user = await sdk.authenticateRequest(req);
    const encodedName = req.headers["x-file-name"];
    const filename = typeof encodedName === "string" ? decodeURIComponent(encodedName) : "upload";
    const result = await submitImageAnalysis({ userId: user.id, filename, mimeType, imageBuffer: req.body });
    return res.status(200).json(result);
  } catch (error) {
    const { status, body } = safeJsonError(error);
    console.error("[Analysis upload]", error);
    return res.status(status).json(body);
  }
}

export async function analysisUploadInitHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    const { filename, mimeType, byteSize } = req.body ?? {};
    if (typeof filename !== "string" || !isAllowedImageMimeType(mimeType) || !Number.isInteger(byteSize)) return res.status(400).json({ error: { message: "Choose a valid JPG, PNG, or WEBP image." } });
    const result = await prepareDirectImageUpload({ userId: user.id, filename, mimeType, byteSize });
    return res.status(200).json(result);
  } catch (error) {
    const { status, body } = safeJsonError(error);
    console.error("[Analysis upload init]", error);
    return res.status(status).json(body);
  }
}

export async function analysisUploadChunkHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    const { storageKey, chunkIndex, chunkData } = req.body ?? {};
    if (typeof storageKey !== "string" || !Number.isInteger(chunkIndex) || typeof chunkData !== "string") return res.status(400).json({ error: { message: "The upload chunk is invalid." } });
    const result = await storeImageUploadChunk({ userId: user.id, storageKey, chunkIndex, chunkData });
    return res.status(200).json(result);
  } catch (error) {
    const { status, body } = safeJsonError(error);
    console.error("[Analysis upload chunk]", error);
    return res.status(status).json(body);
  }
}

export async function analysisUploadCompleteHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    const { filename, mimeType, storageKey, imageUrl, chunkKeys } = req.body ?? {};
    if (typeof filename !== "string" || !isAllowedImageMimeType(mimeType) || typeof storageKey !== "string" || typeof imageUrl !== "string" || !storageKey.startsWith(`visionverify/${user.id}/`)) return res.status(400).json({ error: { message: "The uploaded image could not be verified." } });
    const result = Array.isArray(chunkKeys)
      ? await completeChunkedImageUpload({ userId: user.id, filename, mimeType, storageKey, imageUrl, chunkKeys })
      : await completeDirectImageUpload({ userId: user.id, filename, mimeType, storageKey, imageUrl });
    return res.status(200).json(result);
  } catch (error) {
    const { status, body } = safeJsonError(error);
    console.error("[Analysis upload complete]", error);
    return res.status(status).json(body);
  }
}

export function registerAnalysisUploadRoute(app: Express) {
  app.post("/api/analysis-upload/init", express.json({ limit: "16kb" }), analysisUploadInitHandler);
  app.post("/api/analysis-upload/chunk", express.json({ limit: "512kb" }), analysisUploadChunkHandler);
  app.post("/api/analysis-upload/complete", express.json({ limit: "16kb" }), analysisUploadCompleteHandler);
  app.post("/api/analysis-upload", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }), analysisUploadHandler);
}
