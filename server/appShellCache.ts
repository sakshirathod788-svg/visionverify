import type { NextFunction, Request, Response } from "express";

export function applyAppShellNoCache(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" && !req.path.startsWith("/api/") && (req.path === "/" || !req.path.includes("."))) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }
  next();
}
