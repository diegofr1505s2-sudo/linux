import type { Express } from "express";
import { existsSync } from "node:fs";
import path from "node:path";

export function registerCatalogueAssets(app: Express) {
  app.get("/data/commands.json", (req, res, next) => {
    const base =
      process.env.NODE_ENV === "production" ? "dist/public" : "client/public";
    const compressed = path.resolve(
      process.cwd(),
      base,
      "data/commands.json.gz"
    );
    if (!req.acceptsEncodings("gzip") || !existsSync(compressed)) {
      next();
      return;
    }
    res.set({
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Cache-Control": "public, max-age=300",
    });
    res.vary("Accept-Encoding");
    res.sendFile(compressed);
  });
}
