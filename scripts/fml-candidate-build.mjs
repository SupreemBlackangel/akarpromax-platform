// Find My Land — rebuild the isolated production candidate.
//
//   node scripts/fml-candidate-build.mjs
//
// What it does, in order:
//   1. backs up next.config.js
//   2. rewrites it with distDir: '.next-fml2' so the locked .next is never touched
//   3. runs `next build`
//   4. ALWAYS restores the original next.config.js, even if the build fails
//   5. copies .next-fml2/static  -> .next-fml2/standalone/.next-fml2/static
//      copies public            -> .next-fml2/standalone/public
//      (Next does not copy these itself; skipping step 5 is the classic cause
//       of a page that renders its HTML with no CSS and no JS)
//   6. prints the start command
//
// It does not start the server and does not touch any database.

import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync, cpSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = ".next-fml2";
const CONFIG = join(ROOT, "next.config.js");
const BACKUP = join(ROOT, "next.config.js.candidate-backup");

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);

if (!existsSync(CONFIG)) {
  console.error(`next.config.js not found at ${CONFIG}`);
  process.exit(1);
}

const original = readFileSync(CONFIG, "utf8");

if (existsSync(BACKUP)) {
  console.error(`\nA backup already exists at:\n  ${BACKUP}\n`);
  console.error("That means a previous run did not finish cleanly. Compare it with");
  console.error("next.config.js, restore it by hand if it is the good one, delete it,");
  console.error("then run this again. Refusing to overwrite it.");
  process.exit(1);
}

step(1, "backing up next.config.js");
copyFileSync(CONFIG, BACKUP);
console.log(`    -> ${BACKUP}`);

let buildOk = false;
try {
  step(2, `injecting distDir: '${DIST}'`);
  if (/distDir\s*:/.test(original)) {
    console.log("    next.config.js already sets distDir — leaving it untouched.");
  } else {
    const patched = original.replace(
      /const\s+nextConfig\s*=\s*\{/,
      (m) => `${m}\n  distDir: '${DIST}',`
    );
    if (patched === original) {
      throw new Error(
        "Could not find `const nextConfig = {` to patch. Set distDir manually, build, then revert."
      );
    }
    writeFileSync(CONFIG, patched, "utf8");
    console.log("    patched.");
  }

  step(3, "running next build (this takes a few minutes)");
  const res = spawnSync("npx", ["next", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_ENV: "production" },
  });
  if (res.status !== 0) throw new Error(`next build exited with code ${res.status}`);
  buildOk = true;
} catch (err) {
  console.error(`\nBUILD FAILED: ${err.message}`);
} finally {
  step(4, "restoring the original next.config.js");
  writeFileSync(CONFIG, original, "utf8");
  rmSync(BACKUP, { force: true });
  console.log("    restored; backup removed.");
}

if (!buildOk) {
  console.error("\nStopping. next.config.js is back to its original contents.");
  process.exit(1);
}

step(5, "copying static assets into the standalone output");
const standalone = join(ROOT, DIST, "standalone");
if (!existsSync(standalone)) {
  console.error(`    standalone output missing at ${standalone}`);
  console.error("    Is `output: 'standalone'` still set in next.config.js?");
  process.exit(1);
}

const staticSrc = join(ROOT, DIST, "static");
const staticDest = join(standalone, DIST, "static");
rmSync(staticDest, { recursive: true, force: true });
mkdirSync(dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
console.log(`    static  -> ${staticDest}`);

const publicSrc = join(ROOT, "public");
if (existsSync(publicSrc)) {
  const publicDest = join(standalone, "public");
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log(`    public  -> ${publicDest}`);
}

const buildId = readFileSync(join(ROOT, DIST, "BUILD_ID"), "utf8").trim();
console.log(`\n    BUILD_ID: ${buildId}`);

step(6, "start the candidate");
console.log(`
    cd "${standalone}"
    set PORT=3014
    node server.js

  Set the same isolated certification database env vars the earlier run used.
  Do not point it at production data.

  Then, from the project root:

    node scripts/fml-runtime-diagnose.mjs http://127.0.0.1:3014
`);
