// AKARPROMAX — legacy FX safety.
//
// Currency conversion is DEFERRED by the product owner. The historical route
// `POST /api/currencies/convert` is preserved as a path but MUST NOT be able to
// perform a conversion: no exchange-rate read, no CurrencyService call, no
// database connection, no converted amount in the response, and no runtime
// bypass.
//
// These tests are deliberately DB-free and Next-free. They exercise the pure
// resolver that backs the route, and then prove by static module-graph
// analysis that the route itself cannot reach the deferred FX code.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CURRENCY_CONVERSION_DISABLED_MESSAGES,
  CURRENCY_CONVERSION_DISABLED_STATUS,
  resolveDisabledCurrencyConversion,
} from "../../lib/api/currency-conversion-disabled.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ROUTE_REL = "app/api/currencies/convert/route.ts";
const ROUTE_ABS = path.join(ROOT, ROUTE_REL);
const RESOLVER_REL = "lib/api/currency-conversion-disabled.ts";

/** Source with comments removed, so documentation prose never satisfies a test. */
function codeOf(absPath) {
  return fs
    .readFileSync(absPath, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
}

// ---------------------------------------------------------------------------
// 1. The disabled contract
// ---------------------------------------------------------------------------

test("the approved disabled status is 501 (Not Implemented)", () => {
  assert.equal(CURRENCY_CONVERSION_DISABLED_STATUS, 501);
  assert.equal(resolveDisabledCurrencyConversion().status, 501);
});

test("the body is the stable structured refusal", () => {
  const { body } = resolveDisabledCurrencyConversion();
  assert.equal(body.success, false);
  assert.equal(body.conversionSupported, false);
  assert.equal(body.error, "CURRENCY_CONVERSION_DISABLED");
  assert.equal(body.message, CURRENCY_CONVERSION_DISABLED_MESSAGES.ar);
  assert.equal(body.messageEn, CURRENCY_CONVERSION_DISABLED_MESSAGES.en);
  assert.equal(
    body.messageEn,
    "Currency conversion is not supported at this time.",
  );
  assert.ok(body.message.length > 0, "an Arabic safe message is required");
  // Arabic script, so the public message is safe to render in the RTL UI.
  assert.ok(/[؀-ۿ]/.test(body.message), "message must be Arabic");
  assert.deepEqual(
    Object.keys(body).sort(),
    ["conversionSupported", "error", "message", "messageEn", "success"],
    "the refusal payload shape drifted",
  );
});

test("the response returns no exchange rate and no converted amount", () => {
  const serialized = JSON.stringify(resolveDisabledCurrencyConversion().body).toLowerCase();
  for (const forbidden of [
    "exchangerate",
    "exchange_rate",
    "rate",
    "tousd",
    "to_usd",
    "converted",
    "conversionresult",
    "amount",
    "\"from\"",
    "\"to\"",
    "isdefault",
    "is_default",
    "defaultcurrency",
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `disabled response leaked "${forbidden}": ${serialized}`,
    );
  }
});

test("the refusal is constant — nothing a caller sends can change it", () => {
  const baseline = JSON.stringify(resolveDisabledCurrencyConversion());
  // The resolver takes no parameters at all; extra arguments are ignored.
  for (const attempt of [
    undefined,
    { amount: 100, from: "ILS", to: "USD" },
    { amount: 1, from: "USD", to: "SAR" },
    { enableFx: true },
    { force: true, rate: 3.75 },
  ]) {
    assert.equal(
      JSON.stringify(resolveDisabledCurrencyConversion(attempt)),
      baseline,
      `input changed the refusal: ${JSON.stringify(attempt)}`,
    );
  }
});

test("ILS, USD and SAR cannot be converted — in any direction", () => {
  const codes = ["ILS", "USD", "SAR"];
  for (const from of codes) {
    for (const to of codes) {
      const res = resolveDisabledCurrencyConversion({ amount: 1000, from, to });
      assert.equal(res.status, 501, `${from}->${to} must be refused`);
      assert.equal(res.body.conversionSupported, false, `${from}->${to}`);
      assert.equal(res.body.error, "CURRENCY_CONVERSION_DISABLED", `${from}->${to}`);
      assert.equal("data" in res.body, false, `${from}->${to} carried a data payload`);
      const serialized = JSON.stringify(res.body);
      assert.equal(serialized.includes("1000"), false, `${from}->${to} echoed the amount`);
      assert.equal(serialized.includes(from), false, `${from}->${to} echoed the source currency`);
    }
  }
});

test("no database connection is necessary to refuse", () => {
  const saved = { ...process.env };
  for (const key of ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "MYSQL_URL"]) {
    delete process.env[key];
  }
  try {
    const res = resolveDisabledCurrencyConversion();
    assert.equal(res.status, 501);
    assert.equal(res.body.error, "CURRENCY_CONVERSION_DISABLED");
  } finally {
    process.env.DATABASE_URL = saved.DATABASE_URL ?? "";
    if (!saved.DATABASE_URL) delete process.env.DATABASE_URL;
  }
});

// ---------------------------------------------------------------------------
// 2. The route cannot reach the deferred FX code
// ---------------------------------------------------------------------------

test("the route delegates to the disabled resolver and exports only POST", () => {
  const code = codeOf(ROUTE_ABS);
  assert.ok(
    code.includes("resolveDisabledCurrencyConversion"),
    "the route must answer through the disabled resolver",
  );
  assert.ok(/export\s+async\s+function\s+POST\s*\(/.test(code), "POST must still exist");
  assert.equal(
    /export\s+(async\s+)?function\s+(GET|PUT|PATCH|DELETE)\s*\(/.test(code),
    false,
    "the disabled route must not grow new verbs",
  );
});

test("the route source never names the conversion service or a rate column", () => {
  const code = codeOf(ROUTE_ABS);
  for (const forbidden of [
    "CurrencyService",
    "currency.service",
    "exchange_rate_to_usd",
    "exchangeRateToUSD",
    "getDb",
    "drizzle-orm",
    "@/lib/db",
    ".convert(",
    ".format(",
  ]) {
    assert.equal(
      code.includes(forbidden),
      false,
      `the disabled route references "${forbidden}" in executable code`,
    );
  }
});

test("no environment or query bypass can re-enable conversion", () => {
  for (const rel of [ROUTE_REL, RESOLVER_REL]) {
    const code = codeOf(path.join(ROOT, rel));
    assert.equal(code.includes("process.env"), false, `${rel} reads the environment`);
    assert.equal(/ENABLE_FX/i.test(code), false, `${rel} references an FX flag`);
    assert.equal(code.includes("searchParams"), false, `${rel} reads query parameters`);
    assert.equal(code.includes("request.json"), false, `${rel} reads the request body`);
  }
});

/** Walks the local (first-party) import graph reachable from a source file. */
function localImportGraph(entryRel) {
  const seen = new Set();
  const queue = [entryRel];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const code = codeOf(abs);
    const specifiers = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    for (const spec of specifiers) {
      let base = null;
      if (spec.startsWith("@/")) base = spec.slice(2);
      else if (spec.startsWith(".")) {
        base = path.posix.normalize(path.posix.join(path.posix.dirname(rel.split(path.sep).join("/")), spec));
      }
      if (!base) continue; // package import — not first-party
      for (const ext of ["", ".ts", ".tsx", ".mts", "/index.ts", "/index.tsx"]) {
        const candidate = base + ext;
        if (fs.existsSync(path.join(ROOT, candidate)) && fs.statSync(path.join(ROOT, candidate)).isFile()) {
          queue.push(candidate);
          break;
        }
      }
    }
  }
  return seen;
}

test("CurrencyService is unreachable from the route's whole import graph", () => {
  const graph = localImportGraph(ROUTE_REL);
  assert.ok(graph.has(RESOLVER_REL), "the resolver must be in the route's import graph");
  for (const rel of graph) {
    assert.equal(
      /currency\.service|lib\/db|schemas\/currency-schema/.test(rel),
      false,
      `the route can reach FX/database code through ${rel}`,
    );
  }
});

test("the disabled resolver module exposes no way to convert", async () => {
  const mod = await import("../../lib/api/currency-conversion-disabled.ts");
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value !== "function") continue;
    assert.ok(
      /disabled/i.test(name),
      `an executable export that is not a refusal: ${name}`,
    );
  }
  assert.equal(typeof mod.resolveDisabledCurrencyConversion, "function");
});

// ---------------------------------------------------------------------------
// 3. Consumers
// ---------------------------------------------------------------------------

test("the conversion endpoint has zero active consumers", () => {
  const SCAN_DIRS = ["app", "components", "lib", "src", "tests", "scripts"];
  const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
  const SELF = path.posix.join("tests", "market", "currency-conversion-disabled.test.mjs");
  const hits = [];

  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        walk(childRel);
        continue;
      }
      if (!entry.isFile() || !SOURCE_RE.test(entry.name)) continue;
      if (childRel === SELF) continue;
      if (childRel === ROUTE_REL.split(path.sep).join("/")) continue;
      const code = codeOf(path.join(ROOT, childRel));
      if (code.includes("currencies/convert")) hits.push(childRel);
    }
  };

  for (const dir of SCAN_DIRS) walk(dir);
  assert.deepEqual(hits, [], `the disabled endpoint gained consumers: ${hits.join(", ")}`);
});

test("CurrencyService has no importer anywhere in the source tree", () => {
  const SCAN_DIRS = ["app", "components", "lib", "src", "scripts"];
  const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
  const SERVICE_REL = "lib/services/currency/currency.service.ts";
  const importers = [];

  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        walk(childRel);
        continue;
      }
      if (!entry.isFile() || !SOURCE_RE.test(entry.name)) continue;
      if (childRel === SERVICE_REL) continue;
      const code = codeOf(path.join(ROOT, childRel));
      if (/from\s+["'][^"']*currency\.service["']/.test(code)) importers.push(childRel);
    }
  };

  for (const dir of SCAN_DIRS) walk(dir);
  assert.deepEqual(
    importers,
    [],
    `the deferred FX service was re-wired into: ${importers.join(", ")}`,
  );
});

// ---------------------------------------------------------------------------
// 4. The deferred service is preserved, not deleted
// ---------------------------------------------------------------------------

test("the historical CurrencyService source is preserved and marked deferred", () => {
  const abs = path.join(ROOT, "lib/services/currency/currency.service.ts");
  assert.ok(fs.existsSync(abs), "historical FX code must not be deleted");
  const raw = fs.readFileSync(abs, "utf8");
  assert.ok(raw.includes("OWNER-DEFERRED"), "the service must be marked OWNER-DEFERRED");
  assert.ok(raw.includes("NOT ACTIVE PRODUCT PATH"), "the service must be marked inactive");
  assert.ok(
    raw.includes("The canonical pricing path does not use FX."),
    "the service must state the accurate FX rule",
  );
  assert.ok(/async\s+convert\s*\(/.test(raw), "convert() must be preserved as inventory");
});
