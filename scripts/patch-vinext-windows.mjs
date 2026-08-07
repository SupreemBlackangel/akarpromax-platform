/*
 * Idempotent postinstall patch for vinext 0.0.50 on Windows.
 *
 * Fixes the 404-on-Windows static-asset bug: walkFilesWithStats builds cache
 * keys with path.relative() which yields backslashes, but requests arrive with
 * forward slashes, so /assets/* always miss the cache.
 *
 * Safe to run repeatedly and on non-Windows: no-op if the target string is
 * absent (already patched, or upstream fixed, or vinext not installed).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const rel = join("node_modules", "vinext", "dist", "server", "static-file-cache.js");

function patch() {
  if (!existsSync(rel)) {
    console.log(`[patch-vinext-windows] ${rel} not found; skipping (vinext not installed).`);
    return;
  }
  const before = "relativePath: path.relative(base, batch[j]),";
  const after = 'relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),';
  let src = readFileSync(rel, "utf8");
  if (src.includes(after)) {
    console.log("[patch-vinext-windows] already patched; nothing to do.");
    return;
  }
  if (!src.includes(before)) {
    console.log("[patch-vinext-windows] target string not found (unexpected vinext version?); skipping.");
    return;
  }
  src = src.replace(before, after);
  writeFileSync(rel, src, "utf8");
  console.log(`[patch-vinext-windows] patched ${rel}.`);
}

patch();
