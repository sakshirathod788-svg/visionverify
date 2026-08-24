import express, { type Express, type Request, type Response } from "express";
import { isAllowedImageMimeType, submitImageAnalysis } from "./analysisService";
import { sdk } from "./_core/sdk";

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
    const message = error instanceof Error ? error.message : "VisionVerify could not process this image.";
    const status = message.includes("session") ? 401 : message.includes("5 MB") ? 413 : 400;
    console.error("[Analysis upload]", error);
    return res.status(status).json({ error: { message } });
  }
}

export function registerAnalysisUploadRoute(app: Express) {
  app.post("/api/analysis-upload", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }), analysisUploadHandler);
}
