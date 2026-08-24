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
});
