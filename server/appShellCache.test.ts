import { describe, expect, it } from "vitest";
import { applyAppShellNoCache } from "./appShellCache";

function run(path: string, method = "GET") {
  const headers: Record<string, string> = {};
  let nextCalled = false;
  applyAppShellNoCache({ path, method } as never, { setHeader: (name: string, value: string) => { headers[name] = value; } } as never, () => { nextCalled = true; });
  return { headers, nextCalled };
}

describe("app shell cache policy", () => {
  it("marks extensionless app routes as no-store", () => {
    expect(run("/workspace/analyze")).toEqual({ headers: { "Cache-Control": "no-store, max-age=0" }, nextCalled: true });
    expect(run("/").headers["Cache-Control"]).toBe("no-store, max-age=0");
  });

  it("does not change API, asset, or non-GET responses", () => {
    expect(run("/api/analysis-upload/init").headers["Cache-Control"]).toBeUndefined();
    expect(run("/assets/index.js").headers["Cache-Control"]).toBeUndefined();
    expect(run("/workspace/analyze", "POST").headers["Cache-Control"]).toBeUndefined();
  });
});
