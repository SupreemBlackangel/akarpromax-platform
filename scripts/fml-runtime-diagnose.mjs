// Find My Land — Runtime Candidate diagnostic (read-only).
//
//   node scripts/fml-runtime-diagnose.mjs            # defaults to http://127.0.0.1:3014
//   node scripts/fml-runtime-diagnose.mjs http://127.0.0.1:3014
//
// Performs GET requests only. Touches no database and writes nothing except
// the report file next to itself. Safe to run against the certification
// candidate.

const BASE = (process.argv[2] || "http://127.0.0.1:3014").replace(/\/+$/, "");
const OUT = new URL("./fml-runtime-diagnose.out.txt", import.meta.url);

const lines = [];
const log = (s = "") => {
  lines.push(s);
  console.log(s);
};

async function timedFetch(url, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "manual" });
    const body = await res.arrayBuffer();
    return {
      ok: true,
      status: res.status,
      ms: Date.now() - started,
      bytes: body.byteLength,
      type: res.headers.get("content-type") || "",
      location: res.headers.get("location") || "",
      text: Buffer.from(body).toString("utf8"),
    };
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: String(err && err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

function collectAssets(html) {
  const urls = new Set();
  const push = (u) => {
    if (!u) return;
    if (u.startsWith("http") && !u.startsWith(BASE)) return; // external CDN/tiles: skip
    urls.add(u.startsWith("http") ? u : BASE + (u.startsWith("/") ? u : "/" + u));
  };
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) push(m[1]);
  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/g)) push(m[1]);
  // Turbopack / webpack chunk references embedded in the flight payload.
  for (const m of html.matchAll(/["'](\/_next\/static\/[^"'\\]+\.(?:js|css))["']/g)) push(m[1]);
  return [...urls];
}

function summarizeBody(html) {
  const out = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  out.push(`  <title>: ${title ? title[1].trim().slice(0, 120) : "(none)"}`);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const stripped = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const text = stripped.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  out.push(`  rendered text length: ${text.length}`);
  out.push(`  rendered text head  : ${text.slice(0, 400) || "(EMPTY — nothing server-rendered)"}`);
  const markers = {
    "tc-skeleton": /tc-skeleton/.test(stripped),
    "tc-tool-loading": /tc-tool-loading/.test(stripped),
    "tc-grid": /tc-grid/.test(stripped),
    "tc-flagship": /tc-flagship/.test(stripped),
    "aria-busy": /aria-busy/.test(stripped),
    "findmyland string": /findmyland/i.test(body),
    "next error digest": /"digest"|__NEXT_ERROR/.test(body),
  };
  out.push("  markers: " + Object.entries(markers).map(([k, v]) => `${k}=${v ? "YES" : "no"}`).join("  "));
  return out.join("\n");
}

async function probePage(label, path) {
  log("");
  log("=".repeat(78));
  log(`PAGE ${label}  ->  ${BASE}${path}`);
  log("=".repeat(78));
  const res = await timedFetch(BASE + path, 30000);
  if (!res.ok) {
    log(`  REQUEST FAILED after ${res.ms}ms: ${res.error}`);
    return null;
  }
  log(`  status ${res.status}  ${res.ms}ms  ${res.bytes} bytes  ${res.type}`);
  if (res.location) log(`  location: ${res.location}`);
  if (res.status >= 300 && res.status < 400) return null;
  log(summarizeBody(res.text));
  return res.text;
}

function extractBuildId(html) {
  const m = html.match(/\/_next\/static\/([A-Za-z0-9_-]{8,})\/_(?:buildManifest|ssgManifest)/)
    || html.match(/"buildId"\s*:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

async function probeAssets(html, label) {
  const assets = collectAssets(html);
  log("");
  log(`  ASSETS referenced by ${label}: ${assets.length}`);
  let bad = 0;
  const results = [];
  for (const url of assets) {
    const r = await timedFetch(url, 15000);
    const short = url.replace(BASE, "");
    if (!r.ok) {
      bad++;
      log(`   FAIL  ${short}  -> ${r.error}`);
    } else if (r.status !== 200) {
      bad++;
      log(`   ${r.status}   ${short}  (${r.bytes} bytes)`);
    }
    results.push({ url: short, status: r.ok ? r.status : "ERR" });
  }
  log(`  asset summary: ${assets.length - bad}/${assets.length} returned 200${bad ? "  <<< FAILURES ABOVE" : ""}`);

  const css = assets.filter((u) => u.endsWith(".css") || u.includes(".css?"));
  log("");
  log(`  STYLESHEETS referenced by ${label}: ${css.length}`);
  if (css.length === 0) {
    log("   NONE — the served HTML references no stylesheet at all.");
    log("   That is the finding: the document is being sent without its CSS links,");
    log("   which is a render/streaming problem, not a static-file problem.");
  }
  for (const url of css) {
    const r = await timedFetch(url, 15000);
    const short = url.replace(BASE, "");
    if (!r.ok) { log(`   FAIL  ${short} -> ${r.error}`); continue; }
    const ct = (r.type || "(none)").split(";")[0];
    const ctOk = ct === "text/css";
    log(`   ${r.status}  content-type=${ct}${ctOk ? "" : "   <<< NOT text/css — browser will refuse it"}  ${r.bytes} bytes  ${short}`);
  }
  return { total: assets.length, bad, results };
}

async function probeApi(path, ms = 20000) {
  const r = await timedFetch(BASE + path, ms);
  if (!r.ok) {
    log(`  ${path.padEnd(34)} FAILED after ${r.ms}ms: ${r.error}`);
    return;
  }
  log(`  ${path.padEnd(34)} ${r.status}  ${String(r.ms).padStart(6)}ms  ${r.bytes} bytes  ${r.type.split(";")[0]}`);
  if (r.bytes && r.bytes < 400) log(`     body: ${r.text.replace(/\s+/g, " ").slice(0, 300)}`);
}

const startedAt = new Date().toISOString();
log(`Find My Land runtime diagnostic`);
log(`base: ${BASE}`);
log(`node: ${process.version}`);
log(`when: ${startedAt}`);

const toolsHtml = await probePage("/tools", "/tools");
const fmlHtml = await probePage("/tools?tool=findmyland", "/tools?tool=findmyland");

if (toolsHtml) await probeAssets(toolsHtml, "/tools");

log("");
log("=".repeat(78));
log("Which build is actually serving?");
log("=".repeat(78));
if (toolsHtml) {
  const served = extractBuildId(toolsHtml);
  log(`  BUILD_ID referenced by the served HTML: ${served || "(not found in HTML)"}`);
  try {
    const { readFileSync } = await import("node:fs");
    const onDisk = readFileSync(new URL("../.next-fml2/BUILD_ID", import.meta.url), "utf8").trim();
    log(`  BUILD_ID of .next-fml2 on disk        : ${onDisk}`);
    if (served && onDisk) {
      log(`  MATCH: ${served === onDisk ? "yes — you are running this build" : "NO — a DIFFERENT build/server is answering on this port"}`);
    }
  } catch {
    log("  (could not read .next-fml2/BUILD_ID from disk)");
  }
}

log("");
log("=".repeat(78));
log("APIs the Tools page calls during render");
log("=".repeat(78));
await probeApi("/api/user-context");
await probeApi("/api/land/resolve");

log("");
log("=".repeat(78));
log("Does the two pages' server-rendered HTML differ?");
log("=".repeat(78));
if (toolsHtml && fmlHtml) {
  log(`  /tools bytes            : ${toolsHtml.length}`);
  log(`  /tools?tool=findmyland  : ${fmlHtml.length}`);
  log(`  identical               : ${toolsHtml === fmlHtml ? "YES (query param not read on the server, as expected)" : "NO"}`);
}

log("");
log("Done. Send this whole output back, together with the browser DevTools");
log("Console tab contents for both URLs (including any red errors).");

const { writeFileSync } = await import("node:fs");
writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
console.log(`\n[report written to ${OUT.pathname}]`);
