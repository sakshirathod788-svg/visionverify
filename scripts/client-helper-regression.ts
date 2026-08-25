import fs from "node:fs/promises";
import { SignJWT } from "jose";
import { COOKIE_NAME } from "@shared/const";
import { uploadAndAnalyzeImage } from "../client/src/lib/analysisUpload";

const imageBytes = await fs.readFile("/home/ubuntu/upload/Screenshot_20260825-183951.png");
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string" && input.startsWith("/")) return nativeFetch(`http://localhost:3000${input}`, init);
  return nativeFetch(input, init);
};
const token = await new SignJWT({ openId: "NmyZJt2CbQSkqGksvXofFZ", appId: process.env.VITE_APP_ID, name: "Client Helper Regression User" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime("10m")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));

(globalThis as typeof globalThis & { sessionStorage: Storage }).sessionStorage = {
  getItem: (key: string) => key === "manus-cookie" ? `${COOKIE_NAME}=${token}` : null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
} as Storage;

const file = new File([imageBytes], "client-helper-regression.png", { type: "image/png" });
const result = await uploadAndAnalyzeImage({ file, filename: file.name, mimeType: "image/png" });
console.log(JSON.stringify({ inputBytes: file.size, id: result.id, status: result.status, modelMode: result.modelMode, modelName: result.modelName, providerTimestamp: (result as typeof result & { providerTimestamp?: string | null }).providerTimestamp ?? null, confidencePercent: result.confidencePercent, manipulationProbabilityPercent: result.manipulationProbabilityPercent }, null, 2));
