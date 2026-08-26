#!/usr/bin/env node
/**
 * Post-build step for `output: 'standalone'` (next.config.js).
 *
 * Next.js's standalone output does NOT include `public/` or `.next/static/`
 * (they're deliberately left out so multiple deployments can share a CDN-
 * served static tree) — copying them in is a required, documented step for
 * `node .next/standalone/server.js` to actually serve CSS/JS/images instead
 * of 404ing on every asset (P0-4 / N2).
 *
 * It also defends against `.env` (or any `.env*` file) ending up inside the
 * standalone tree, which would leak SESSION_SECRET and the database
 * credentials into the build artifact (P0-8 / N3) — the standalone bundle is
 * meant to be copied/archived/shipped, so real secrets belong only in the
 * runtime process environment, never inside it.
 */
import { existsSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIST_DIR = process.env.NEXT_DIST_DIR || ".next";
const STANDALONE_DIR = join(ROOT, DIST_DIR, "standalone");

if (!existsSync(STANDALONE_DIR)) {
  console.error(`[prepare-standalone] ${STANDALONE_DIR} does not exist — did "next build" run with output: 'standalone'?`);
  process.exit(1);
}

const publicSrc = join(ROOT, "public");
const publicDest = join(STANDALONE_DIR, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log(`[prepare-standalone] copied public/ -> ${publicDest}`);
}

const staticSrc = join(ROOT, DIST_DIR, "static");
const staticDest = join(STANDALONE_DIR, DIST_DIR, "static");
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log(`[prepare-standalone] copied ${DIST_DIR}/static/ -> ${staticDest}`);
}

let removedSecrets = 0;
for (const entry of readdirSync(STANDALONE_DIR)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    rmSync(join(STANDALONE_DIR, entry), { force: true });
    removedSecrets++;
    console.log(`[prepare-standalone] removed leaked secret file from standalone output: ${entry}`);
  }
}
if (removedSecrets === 0) {
  console.log("[prepare-standalone] no .env* files found in standalone output (good).");
}

console.log("[prepare-standalone] done.");
