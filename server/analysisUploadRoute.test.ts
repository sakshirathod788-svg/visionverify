import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { registerAnalysisUploadRoute } from "./analysisUploadRoute";

let stop: (() => Promise<void>) | undefined;

afterEach(async () => { await stop?.(); stop = undefined; });

describe("analysis upload endpoint", () => {
  it("returns a structured JSON error rather than HTML for an invalid binary upload", async () => {
    const app = express();
    registerAnalysisUploadRoute(app);
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    stop = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

    const response = await fetch(`http://127.0.0.1:${address.port}/api/analysis-upload`, { method: "POST", headers: { "content-type": "text/plain" }, body: "not an image" });

    expect(response.status).toBe(415);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: { message: "Choose a valid JPG, PNG, or WEBP image." } });
  });

  it("accepts a near-2 MB PNG body at the raw route and returns JSON from route authentication", async () => {
    const app = express();
    registerAnalysisUploadRoute(app);
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    stop = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

    const pngBody = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1_900_000, 0x61)]);
    const response = await fetch(`http://127.0.0.1:${address.port}/api/analysis-upload`, { method: "POST", headers: { "content-type": "image/png", "x-file-name": "mobile.png" }, body: pngBody });

    expect(pngBody.byteLength).toBeGreaterThan(1_900_000);
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: { message: "Invalid session cookie" } });
  });

  it("returns JSON authentication errors for the small init and completion requests", async () => {
    const app = express();
    registerAnalysisUploadRoute(app);
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    stop = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

    const initResponse = await fetch(`http://127.0.0.1:${address.port}/api/analysis-upload/init`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: "mobile.png", mimeType: "image/png", byteSize: 1_900_000 }) });
    const completeResponse = await fetch(`http://127.0.0.1:${address.port}/api/analysis-upload/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: "mobile.png", mimeType: "image/png", storageKey: "visionverify/1/mobile.png_hash", imageUrl: "/manus-storage/visionverify/1/mobile.png_hash" }) });

    expect(initResponse.status).toBe(401);
    expect(initResponse.headers.get("content-type")).toContain("application/json");
    expect(completeResponse.status).toBe(401);
    expect(completeResponse.headers.get("content-type")).toContain("application/json");
    await expect(initResponse.json()).resolves.toEqual({ error: { message: "Invalid session cookie" } });
    await expect(completeResponse.json()).resolves.toEqual({ error: { message: "Invalid session cookie" } });
  });
});
