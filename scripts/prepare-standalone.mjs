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
import { existsSync, cpSync, rmSync, readdirSync, copyFileSync } from "node:fs";
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

// nodemailer is loaded via a dynamic import() so Next's file tracing misses
// it — copy it into the standalone tree or SMTP email silently has no driver.
const nodemailerSrc = join(ROOT, "node_modules", "nodemailer");
const nodemailerDest = join(STANDALONE_DIR, "node_modules", "nodemailer");
if (existsSync(nodemailerSrc) && !existsSync(nodemailerDest)) {
  cpSync(nodemailerSrc, nodemailerDest, { recursive: true });
  console.log(`[prepare-standalone] copied nodemailer -> ${nodemailerDest}`);
}

// The Next standalone tree ships its own trimmed copy of `next`, and this
// version of `next build` leaves the compiled server runtimes out of it. Of
// the thirteen `*.runtime.prod.js` files the full package carries, the traced
// copy kept three -- the page runtimes -- and dropped the rest, INCLUDING
// `app-route.runtime.prod.js` and `app-route-turbo.runtime.prod.js`, which are
// the runtime for every API route handler.
//
// On the production host it did not fail loudly, because pm2 runs the app from
// the project root, above a full node_modules, and Node resolves `next/...`
// upward into it. So the ROUTE handler loaded from the outer copy of next while
// the bundled app chunks loaded `work-unit-async-storage.external.js` from the
// standalone copy -- two different modules, two different request AsyncLocal-
// Storage instances. A handler that only READS a cookie was unaffected
// (/api/auth/me answered cleanly), but the moment one WROTE a session cookie --
// createSession() on a successful login, and both OAuth callbacks -- cookies()
// reached into the other storage instance, found no active request, and threw
// "`cookies` was called outside a request scope." The login answered 500 to the
// correct password and 401 to the wrong one, and no one ever completed a login.
//
// Copying the prod runtimes in makes the standalone `next` self-contained, so
// every `next/...` specifier resolves inside the one tree and there is one
// storage instance again. Dropping the outer node_modules can no longer take
// the site down either. Modelled on the nodemailer copy above: the same class
// of bug, a file the tracer did not follow.
const nextRuntimeSrc = join(ROOT, "node_modules", "next", "dist", "compiled", "next-server");
const nextRuntimeDest = join(STANDALONE_DIR, "node_modules", "next", "dist", "compiled", "next-server");
if (existsSync(nextRuntimeSrc) && existsSync(nextRuntimeDest)) {
  let copied = 0;
  for (const entry of readdirSync(nextRuntimeSrc)) {
    // Only the production runtimes the server actually loads; the dev and
    // experimental variants are dead weight in a deployed bundle.
    if (!entry.endsWith(".runtime.prod.js")) continue;
    const dest = join(nextRuntimeDest, entry);
    if (existsSync(dest)) continue;
    copyFileSync(join(nextRuntimeSrc, entry), dest);
    copied++;
  }
  console.log(`[prepare-standalone] copied ${copied} missing next server runtime file(s) -> ${nextRuntimeDest}`);

  // The one whose absence took logins down. If a future Next changes these
  // filenames, fail the build here rather than discover it as a 500 in prod.
  const required = "app-route-turbo.runtime.prod.js";
  if (!existsSync(join(nextRuntimeDest, required))) {
    console.error(
      `[prepare-standalone] ${required} is missing from the bundle and was not found at ` +
        `${nextRuntimeSrc}. The API route handler runtime would resolve to an outer node_modules ` +
        `at runtime, splitting the request context and breaking every cookie-writing route.`,
    );
    process.exit(1);
  }
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
