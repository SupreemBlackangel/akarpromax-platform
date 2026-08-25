// AkarProMax L1C-0.5B1 — Services demo-seed containment.
//
// The Services demo graph (4 hard-coded providers, 4 hard-coded customer
// requests and their offer/order/review/timeline children) is operational
// Services data. Before L1C-0.5B1 it was inserted by ANY non-production boot
// (lib/content-schema.ts) and UNCONDITIONALLY by the MySQL bootstrap
// (lib/mysql-runtime.ts). These tests hold the containment closed:
//
//   * development alone never permits it,
//   * production never permits it,
//   * only an explicit SEED_DEMO_DATA=true in a non-production runtime does,
//   * the service TAXONOMY stays independent reference data,
//   * both manual seed scripts refuse before opening a database connection.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  SERVICES_DEMO_SEED_ENV,
  SERVICES_DEMO_SEED_OPT_IN,
  hasServicesDemoSeedOptIn,
  isProductionEnv,
  isServicesDemoSeedEnabled,
  servicesDemoSeedRefusal,
} from "../lib/services/demo-seed-gate.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/** A DATABASE_URL that would fail loudly if anything actually tried to connect. */
const UNREACHABLE_DB = "postgres://gate:gate@127.0.0.1:1/should-never-be-opened";

// ---------------------------------------------------------------------------
// 1. The gate itself
// ---------------------------------------------------------------------------

test("development alone does NOT permit the Services demo seed", () => {
  assert.equal(isServicesDemoSeedEnabled({ NODE_ENV: "development" }), false);
  assert.equal(isServicesDemoSeedEnabled({ NODE_ENV: "test" }), false);
  assert.equal(isServicesDemoSeedEnabled({}), false, "an empty environment is a refusal");
  const refusal = servicesDemoSeedRefusal({ NODE_ENV: "development" });
  assert.match(String(refusal), /SEED_DEMO_DATA/);
  assert.match(String(refusal), /Non-production mode alone does NOT enable/);
});

test("production NEVER permits the Services demo seed, opt-in or not", () => {
  assert.equal(isProductionEnv({ NODE_ENV: "production" }), true);
  assert.equal(isServicesDemoSeedEnabled({ NODE_ENV: "production" }), false);
  assert.equal(
    isServicesDemoSeedEnabled({ NODE_ENV: "production", SEED_DEMO_DATA: "true" }),
    false,
    "the opt-in must not override production",
  );
  assert.equal(isServicesDemoSeedEnabled({ NODE_ENV: "PRODUCTION", SEED_DEMO_DATA: "true" }), false);
  assert.match(
    String(servicesDemoSeedRefusal({ NODE_ENV: "production", SEED_DEMO_DATA: "true" })),
    /NODE_ENV=production/,
  );
});

test("explicit SEED_DEMO_DATA=true permits the demo path only in non-production", () => {
  assert.equal(SERVICES_DEMO_SEED_ENV, "SEED_DEMO_DATA");
  assert.equal(SERVICES_DEMO_SEED_OPT_IN, "true");
  assert.equal(isServicesDemoSeedEnabled({ NODE_ENV: "development", SEED_DEMO_DATA: "true" }), true);
  assert.equal(isServicesDemoSeedEnabled({ NODE_ENV: "test", SEED_DEMO_DATA: "true" }), true);
  assert.equal(servicesDemoSeedRefusal({ NODE_ENV: "development", SEED_DEMO_DATA: "true" }), null);
});

test("only the EXACT opt-in string counts — no trimming, no case folding (R1)", () => {
  // R1: the comparison is strict. A stray space in a CI variable or shell script
  // must fail closed rather than be silently repaired into an opt-in.
  for (const value of ["1", "yes", "TRUE", "True", "on", " ", "", "  true  ", " true", "true ", "\ttrue", "true\n"]) {
    assert.equal(
      hasServicesDemoSeedOptIn({ SEED_DEMO_DATA: value }),
      false,
      `${JSON.stringify(value)} must not be read as an opt-in`,
    );
    assert.equal(
      isServicesDemoSeedEnabled({ NODE_ENV: "development", SEED_DEMO_DATA: value }),
      false,
      `${JSON.stringify(value)} must not enable the demo seed in development either`,
    );
  }
  assert.equal(hasServicesDemoSeedOptIn({ SEED_DEMO_DATA: "true" }), true);
  assert.equal(hasServicesDemoSeedOptIn({}), false, "an absent variable is a refusal");
});

// ---------------------------------------------------------------------------
// 2. The two runtime bootstrap paths
// ---------------------------------------------------------------------------

test("the development request-path bootstrap gates Services demo data on the opt-in", async () => {
  const source = await read("lib/content-schema.ts");
  assert.match(source, /isServicesDemoSeedEnabled/, "content-schema must consult the containment gate");

  // The Services marketplace demo call must NOT sit inside the generic
  // `seedDemo` block (which is satisfied by non-production alone).
  const seedDemoStart = source.indexOf("const seedDemo =");
  assert.ok(seedDemoStart > 0, "the generic demo block still exists");
  const seedDemoBlock = source.slice(seedDemoStart, source.indexOf("await db.prepare(SCHEMA_META_SQL)", seedDemoStart));
  const genericBlock = seedDemoBlock.slice(0, seedDemoBlock.indexOf("isServicesDemoSeedEnabled"));
  assert.doesNotMatch(
    genericBlock,
    /seedServicesMarketplace/,
    "seedServicesMarketplace must not run under `!isProduction() || SEED_DEMO_DATA` alone",
  );

  const gated = seedDemoBlock.slice(seedDemoBlock.indexOf("isServicesDemoSeedEnabled"));
  assert.match(gated, /isServicesDemoSeedEnabled\(\)\) \{\s*await seedServicesMarketplace\(db\);/);
});

test("the MySQL bootstrap no longer seeds the Services demo graph unconditionally", async () => {
  const source = await read("lib/mysql-runtime.ts");
  const calls = source.match(/^\s*await seedServicesMarketplace\(db\);/gm) ?? [];
  assert.equal(calls.length, 1, "there is exactly one Services demo seed call left");
  assert.match(
    source,
    /if \(isServicesDemoSeedEnabled\(\)\) \{\s*await seedServicesMarketplace\(db\);/,
    "the remaining call must be inside the containment gate",
  );
});

test("seedServiceTaxonomy remains independent reference data on both paths", async () => {
  const content = await read("lib/content-schema.ts");
  const taxonomyCall = content.indexOf("await seedServiceTaxonomy(db);", content.indexOf("await ensureNewsSchema(db);"));
  assert.ok(taxonomyCall > 0, "the taxonomy seed still runs on the shared bootstrap");
  assert.ok(
    taxonomyCall < content.indexOf("isServicesDemoSeedEnabled()"),
    "the taxonomy seed runs before — and outside — the demo gate",
  );

  const mysql = await read("lib/mysql-runtime.ts");
  assert.match(mysql, /await seedServiceTaxonomy\(db\);/, "MySQL keeps reference taxonomy after demo containment");
  const mysqlTaxonomy = mysql.indexOf("await seedServiceTaxonomy(db);");
  assert.ok(
    mysqlTaxonomy < mysql.indexOf("isServicesDemoSeedEnabled()"),
    "MySQL taxonomy is not inside the demo gate",
  );
});

// ---------------------------------------------------------------------------
// 3. The two manual seed scripts
// ---------------------------------------------------------------------------

const MANUAL_SCRIPTS = [
  { file: "scripts/seed-services-marketplace.ts", tag: "seed-services-marketplace" },
  { file: "scripts/seed-services.ts", tag: "seed-services" },
];

for (const script of MANUAL_SCRIPTS) {
  test(`${script.file} gates before it can reach the database`, async () => {
    const source = await read(script.file);
    assert.match(source, /assertServicesDemoSeedAllowed\(SCRIPT\);/, "the gate must be a top-level statement");
    assert.doesNotMatch(
      source,
      /^import \{[^}]*getRuntimeDb[^}]*\} from/m,
      "getRuntimeDb must be imported dynamically, after the gate",
    );
    // Position checks ignore the file header comment.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
    const gateAt = code.indexOf("assertServicesDemoSeedAllowed(SCRIPT);");
    assert.ok(gateAt > 0, "the gate call is present in executable code");
    assert.ok(
      gateAt < code.indexOf("await import(\"@/lib/runtime-db\")"),
      "the gate runs before the runtime-db module is loaded",
    );
    assert.equal(
      code.indexOf("getRuntimeDb") > gateAt,
      true,
      "no getRuntimeDb reference precedes the gate in executable code",
    );
  });

  test(`${script.file} refuses without the opt-in and opens no connection`, () => {
    const result = runScript(script.file, { SEED_DEMO_DATA: undefined, NODE_ENV: "development" });
    assert.equal(result.failed, true, "the script must exit non-zero");
    assert.match(result.stderr, new RegExp(`\\[${script.tag}\\] Refusing to seed the Services demo graph`));
    assert.match(result.stderr, /SEED_DEMO_DATA is not exactly "true"/);
    assert.match(result.stderr, /no database connection was opened/);
    assert.doesNotMatch(result.stdout, /seed complete|categories:|requests:/);
  });

  test(`${script.file} refuses under NODE_ENV=production even with the opt-in`, () => {
    const result = runScript(script.file, { SEED_DEMO_DATA: "true", NODE_ENV: "production" });
    assert.equal(result.failed, true, "the script must exit non-zero");
    assert.match(result.stderr, /NODE_ENV=production/);
    assert.match(result.stderr, /no database connection was opened/);
    assert.doesNotMatch(result.stdout, /seed complete|categories:|requests:/);
  });
}

function runScript(relativePath, overrides) {
  const env = { ...process.env, DATABASE_URL: UNREACHABLE_DB };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--import", "tsx", path.join(ROOT, relativePath)],
      { cwd: ROOT, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] },
    );
    return { failed: false, stdout: String(stdout), stderr: "" };
  } catch (error) {
    return { failed: true, stdout: String(error.stdout ?? ""), stderr: String(error.stderr ?? "") };
  }
}
