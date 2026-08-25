// AkarProMax Office — static integration verification.
//
//   node scripts/verify-office-integration.mjs
//   node scripts/verify-office-integration.mjs "F:\\akarpromax-office\\AkarApp_Next"
//
// Read-only. Asserts the seven conditions from the targeted integration repair.
// Exits non-zero if any assertion fails, so it can gate a build.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] || "F:\\akarpromax-office\\AkarApp_Next";
const APP = join(ROOT, "AkarApp");
const SERVICES = join(APP, "Services");

const results = [];
const ok = (name, detail = "") => results.push({ pass: true, name, detail });
const fail = (name, detail = "") => results.push({ pass: false, name, detail });

function read(p) {
  try { return readFileSync(p, "utf8"); } catch { return null; }
}

if (!existsSync(SERVICES)) {
  console.error(`Services directory not found: ${SERVICES}`);
  console.error("Pass the AkarApp_Next path as the first argument.");
  process.exit(2);
}

const csFiles = readdirSync(SERVICES).filter((f) => f.endsWith(".cs"));
const sources = new Map(csFiles.map((f) => [f, read(join(SERVICES, f)) ?? ""]));

const FOUR = [
  "RadarService.cs",
  "DesktopNewsTickerService.cs",
  "OnlinePropertyService.cs",
  "DesktopAdService.cs",
];

// 1 — no legacy desktop namespace left in the four services
{
  const offenders = FOUR.filter((f) => (sources.get(f) ?? "").includes("/api/desktop"));
  offenders.length === 0
    ? ok("1. no legacy /api/desktop reference in the four services")
    : fail("1. legacy /api/desktop reference still present", offenders.join(", "));
}

// 2 — canonical routes are declared centrally and used
{
  const provider = read(join(SERVICES, "OfficeBaseUrl.cs"));
  if (!provider) {
    fail("2. canonical routes", "OfficeBaseUrl.cs not found");
  } else {
    const required = [
      "/api/office/v1/pairing/complete",
      "/api/office/v1/auth",
      "/api/office/v1/news",
      "/api/office/v1/ads",
      "/api/office/v1/sync",
      "/api/office/v1/radar",
    ];
    const missing = required.filter((r) => !provider.includes(r));
    missing.length === 0
      ? ok("2. canonical /api/office/v1 routes declared centrally")
      : fail("2. canonical routes missing", missing.join(", "));
  }
}

// 3 — production default is the canonical https URL
{
  const provider = read(join(SERVICES, "OfficeBaseUrl.cs")) ?? "";
  provider.includes('ProductionBaseUrl = "https://akarpromax.com"')
    ? ok("3. production base URL is https://akarpromax.com")
    : fail("3. production base URL not set to https://akarpromax.com");
}

// 4 — a development override path exists
{
  const provider = read(join(SERVICES, "OfficeBaseUrl.cs")) ?? "";
  provider.includes("AKARPROMAX_API_BASE_URL") && provider.includes("IsDevelopment")
    ? ok("4. development override + development mode supported")
    : fail("4. development override missing");
}

// 5 — no service falls back to a localhost URL.
//     OfficeBaseUrl.cs is exempt: it names loopback hosts in order to REJECT
//     them in a production build.
{
  const offenders = [...sources.entries()]
    .filter(([name]) => name !== "OfficeBaseUrl.cs")
    .filter(([, body]) => /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(body))
    .map(([f]) => f);
  offenders.length === 0
    ? ok("5. no localhost URL literal in any service")
    : fail("5. localhost URL still hardcoded", offenders.join(", "));
}

// 6 — no developer absolute path in runtime configuration
{
  const cfg = read(join(APP, "app.config")) ?? "";
  /[A-Za-z]:\\Users\\/.test(cfg)
    ? fail("6. developer absolute path still in app.config")
    : ok("6. no developer absolute path in app.config");
}

// 7 — invalid URLs are rejected
{
  const provider = read(join(SERVICES, "OfficeBaseUrl.cs")) ?? "";
  const hasValidation =
    provider.includes("Uri.TryCreate") &&
    provider.includes("UriSchemeHttps") &&
    provider.includes("IsLoopbackHost");
  hasValidation
    ? ok("7. base URL validated (absolute, scheme, loopback rejected in production)")
    : fail("7. base URL validation incomplete");
}

// bonus — every service that talks to the office API authenticates with the device token
{
  const callers = ["DesktopNewsTickerService.cs", "OnlinePropertyService.cs", "DesktopAdService.cs"];
  const bad = callers.filter((f) => {
    const body = sources.get(f) ?? "";
    return body.includes("HttpRequestMessage") || body.includes("PostAsync") || body.includes("GetAsync")
      ? !body.includes("DeviceCredentialStore.GetDeviceToken")
      : false;
  });
  bad.length === 0
    ? ok("8. office callers authenticate with the paired device credential")
    : fail("8. caller not using the device credential", bad.join(", "));
}

// bonus — no secret is written to a log
{
  const offenders = [...sources.entries()]
    .filter(([, b]) => /(Debug\.WriteLine|Console\.WriteLine|Trace\.Write)[^\n]*(deviceToken|apiKey|GetDeviceToken\(\)|Bearer \{)/.test(b))
    .map(([f]) => f);
  offenders.length === 0
    ? ok("9. no credential written to a log")
    : fail("9. credential appears in a log statement", offenders.join(", "));
}

const width = Math.max(...results.map((r) => r.name.length));
console.log(`\nAkarProMax Office — static integration verification`);
console.log(`root: ${ROOT}\n`);
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}${r.detail ? "  — " + r.detail : ""}`);
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed\n`);
process.exit(failed === 0 ? 0 : 1);
