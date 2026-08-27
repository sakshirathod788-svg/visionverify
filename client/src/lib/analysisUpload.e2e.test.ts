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
    const shellResponse = await nativeFetch(`${baseUrl}/workspace/analyze`, { cache: "no-store" });
    expect(shellResponse.status).toBe(200);
    expect(shellResponse.headers.get("cache-control")).toBe("no-store, max-age=0");
    const stageBatches: string[][] = [];
    let activeStageStatuses: string[] = [];
    const forceChunkFallback = process.env.VISIONVERIFY_FORCE_CHUNK_FALLBACK === "1";
    const repeatCount = Math.max(1, Number.parseInt(process.env.VISIONVERIFY_TEST_REPEAT_COUNT ?? "1", 10) || 1);
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" && input.startsWith("/") ? `${baseUrl}${input}` : input;
      const method = init?.method ?? "GET";
      const url = String(target);
      if (forceChunkFallback && method === "PUT") throw new TypeError("Failed to fetch");
      const response = await nativeFetch(target, init);
      if (url.includes("/api/analysis-upload/init")) activeStageStatuses.push(`init ${response.status}`);
      else if (url.includes("/api/analysis-upload/chunk")) activeStageStatuses.push(`chunk ${response.status}`);
      else if (url.includes("/api/analysis-upload/complete")) activeStageStatuses.push(`complete ${response.status}`);
      else if (method === "PUT") activeStageStatuses.push(`storage ${response.status}`);
      return response;
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
    const fixturePath = process.env.VISIONVERIFY_TEST_IMAGE_PATH ?? "/home/ubuntu/upload/Screenshot_20260825-183951.png";
    try {
      source = await fs.readFile(fixturePath);
    } catch {
      source = await (await nativeFetch("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/320px-Fronalpstock_big.jpg")).arrayBuffer();
    }
    const file = new File([source], process.env.VISIONVERIFY_TEST_IMAGE_NAME ?? "client-helper-live.png", { type: "image/png" });
    const results = [];
    for (let iteration = 0; iteration < repeatCount; iteration += 1) {
      activeStageStatuses = [];
      results.push(await uploadAndAnalyzeImage({ file, filename: file.name, mimeType: "image/png" }));
      stageBatches.push([...activeStageStatuses]);
    }
    const result = results.at(-1)!;

    expect(stageBatches).toHaveLength(repeatCount);
    for (const stageStatuses of stageBatches) {
      if (forceChunkFallback) {
        expect(stageStatuses[0]).toBe("init 200");
        expect(stageStatuses.at(-1)).toBe("complete 200");
        expect(stageStatuses.slice(1, -1).length).toBe(Math.ceil(file.size / (80 * 1024)));
        expect(stageStatuses.slice(1, -1).every((status) => status === "chunk 200")).toBe(true);
      } else {
        expect(stageStatuses).toEqual(["init 200", "storage 200", "complete 200"]);
      }
    }
    console.info(`[live upload statuses] shell ${shellResponse.status}; repeats ${repeatCount}; ${stageBatches.map((batch, index) => `upload ${index + 1}: ${batch.join("; ")}`).join(" | ")}`);
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
  }, 120_000);
});
