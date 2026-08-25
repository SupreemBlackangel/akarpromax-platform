// OCR V2 — Windows runtime gate probe (read-only).
//
//   node scripts\ocr-v2-windows-gate.mjs http://127.0.0.1:3022
//
// GET/POST against the running production server only. Touches no source,
// writes one report file next to itself. Uploads the real H-corpus PDFs from
// tmp/_scratch/holdout through the real /api/land/analyze route.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.argv[2] || "http://127.0.0.1:3022").replace(/\/+$/, "");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOLDOUT = join(ROOT, "tmp", "_scratch", "holdout");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "ocr-v2-windows-gate.out.txt");

const lines = [];
const log = (s = "") => { lines.push(s); console.log(s); };

async function timedFetch(url, options = {}, ms = 170_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    return { ok: true, status: res.status, ms: Date.now() - started, bytes: text.length, text };
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

log(`OCR V2 Windows gate probe`);
log(`base: ${BASE}   node: ${process.version}   when: ${new Date().toISOString()}`);
log("");

// ── 3. Runtime endpoints ────────────────────────────────────────────────
for (const path of ["/", "/tools", "/tools?tool=findmyland"]) {
  const r = await timedFetch(BASE + path, {}, 30_000);
  if (!r.ok) { log(`PAGE ${path}  FAILED ${r.error}`); continue; }
  const css = (r.text.match(/<link[^>]+\.css/g) || []).length;
  const js = (r.text.match(/<script[^>]+src=/g) || []).length;
  log(`PAGE ${path}  status=${r.status}  ${r.ms}ms  ${r.bytes}b  cssLinks=${css} scripts=${js}`);
}
log("");

// ── 4–9. Real files through the real API ────────────────────────────────
async function upload(name, label) {
  const file = join(HOLDOUT, name);
  if (!existsSync(file)) { log(`${label}: FILE MISSING ${file}`); return null; }
  const bytes = readFileSync(file);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/pdf" }), name);
  const r = await timedFetch(`${BASE}/api/land/analyze`, { method: "POST", body: form });
  if (!r.ok) { log(`${label}: REQUEST FAILED after ${r.ms}ms: ${r.error}`); return null; }
  let body = {};
  try { body = JSON.parse(r.text); } catch { /* keep raw */ }
  const d = body.data ?? {};
  const q = d.extractedData?.ocrQuality;
  log(`${label}: HTTP ${r.status}  ${(r.ms / 1000).toFixed(1)}s`);
  if (r.status === 200) {
    log(`  coordinates: ${d.coordinates?.length ?? 0}`);
    if (d.coordinates?.length) {
      for (const [i, p] of d.coordinates.entries()) log(`    P${i + 1}: ${p.lat}, ${p.lng}`);
    }
    if (d.geometry) log(`  geometry: area=${d.geometry.area}  perimeter=${d.geometry.perimeter}  points=${d.geometry.pointCount}`);
  } else {
    log(`  body: ${r.text.slice(0, 220)}`);
  }
  if (q) log(`  ocrQuality: ${JSON.stringify(q)}`);
  return { status: r.status, ms: r.ms, data: d };
}

log("── H01 ─────────────────────────────");
await upload("H01_Oman_Duqm_Krooki.pdf", "H01");
log(""); log("── H02 ─────────────────────────────");
await upload("H02_Turkey_Manisa.pdf", "H02");
log(""); log("── H03 / H04 ───────────────────────");
await upload("H03_Turkey_Manyas.pdf", "H03");
await upload("H04_Turkey_Golmarmara.pdf", "H04");
log(""); log("── H05 / H06 negative safety ───────");
await upload("H05_Oman_Duqm_MasterPlan.pdf", "H05");
await upload("H06_UAE_AbuDhabi_SitePlan.pdf", "H06");
log(""); log("── OCR stress: H02 ×3 sequential ───");
for (let i = 1; i <= 3; i += 1) {
  const r = await upload("H02_Turkey_Manisa.pdf", `H02 run ${i}`);
  if (!r) break;
}
log("");
log("Done. Send this whole output back (a copy was saved next to the script).");
writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
console.log(`[report saved to ${OUT}]`);
