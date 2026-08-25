import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "@shared/const";
import { uploadAndAnalyzeImage } from "./analysisUpload";
import { SignJWT } from "jose";

const shouldRun = process.env.VISIONVERIFY_RUN_LIVE_UPLOAD_TESTS === "1";
const runLive = shouldRun ? it : it.skip;
const baseUrl = process.env.VISIONVERIFY_TEST_BASE_URL ?? "http://localhost:3000";

async function signTestSession() {
  const openId = process.env.VISIONVERIFY_TEST_OPEN_ID;
  if (!openId || !process.env.JWT_SECRET || !process.env.VITE_APP_ID) throw new Error("VISIONVERIFY_TEST_OPEN_ID, JWT_SECRET, and VITE_APP_ID are required for the gated live upload test");
  return new SignJWT({ openId, appId: process.env.VITE_APP_ID, name: "Client Helper Regression User" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

describe("live client upload flow", () => {
  afterEach(() => vi.unstubAllGlobals());

  runLive("uploads through init, direct storage, completion, and reopens the private record", async () => {
    const token = await signTestSession();
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string" && input.startsWith("/")) return nativeFetch(`${baseUrl}${input}`, init);
      return nativeFetch(input, init);
    };
    (globalThis as typeof globalThis & { sessionStorage: Storage }).sessionStorage = {
      getItem: (key: string) => key === "manus-cookie" ? `${COOKIE_NAME}=${token}` : null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage;

    let source: ArrayBuffer | Buffer;
    try {
      source = await fs.readFile("/home/ubuntu/upload/Screenshot_20260825-183951.png");
    } catch {
      source = await (await nativeFetch("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/320px-Fronalpstock_big.jpg")).arrayBuffer();
    }
    const file = new File([source], "client-helper-live.png", { type: "image/png" });
    const result = await uploadAndAnalyzeImage({ file, filename: file.name, mimeType: "image/png" });

    expect(result.id).toBeGreaterThan(0);
    expect(result.status).toBe("completed");
    expect(result.modelMode).toBe("live");
    expect(result.modelName).toContain("Sightengine");

    const input = encodeURIComponent(JSON.stringify({ json: { id: result.id } }));
    const detailResponse = await nativeFetch(`${baseUrl}/api/trpc/analysis.get?input=${input}`, { headers: { Authorization: `Bearer ${token}` } });
    const detailBody = await detailResponse.json() as { result?: { data?: { json?: { id: number; status: string } } } };
    expect(detailResponse.ok).toBe(true);
    expect(detailBody.result?.data?.json?.id).toBe(result.id);
    expect(detailBody.result?.data?.json?.status).toBe("completed");

    const historyInput = encodeURIComponent(JSON.stringify({ json: { limit: 200 } }));
    const historyResponse = await nativeFetch(`${baseUrl}/api/trpc/analysis.list?input=${historyInput}`, { headers: { Authorization: `Bearer ${token}` } });
    const historyBody = await historyResponse.json() as { result?: { data?: { json?: Array<{ id: number }> } } };
    expect(historyResponse.ok).toBe(true);
    expect(historyBody.result?.data?.json?.some((record) => record.id === result.id)).toBe(true);

    const appSource = await fs.readFile(new URL("../App.tsx", import.meta.url), "utf8");
    expect(appSource).toContain('<Route path="/workspace/report/:id" component={AnalysisDetail} />');
    const reportRouteResponse = await nativeFetch(`${baseUrl}/workspace/report/${result.id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(reportRouteResponse.ok).toBe(true);
    expect(await reportRouteResponse.text()).toContain('id="root"');
  }, 20_000);
});
