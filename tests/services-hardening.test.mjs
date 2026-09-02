import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RATE_LIMIT_CONFIGS } from "../lib/security/rate-limit.ts";

/**
 * Rate limiting and query shape on the services marketplace.
 *
 * It had neither. Sixty-four routes with no limit anywhere, while the
 * advertising surface next door was rate limited; and queries inside loops on
 * paths a person waits on.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

// ---- rate limits ------------------------------------------------------------

/**
 * The endpoints that must be limited, and why each one is on the list.
 * Public reads because they are anonymous and do real query work; writes
 * because they create rows other people see; reports because each one costs a
 * moderator time.
 */
const MUST_LIMIT = [
  ["app/api/service-providers/route.ts", "services_public_read", "the anonymous provider directory runs geo queries"],
  ["app/api/service-reviews/route.ts", "services_public_read", "anonymous, and scraped as easily as the directory"],
  ["app/api/service-requests/route.ts", "services_write", "creates a request other people are matched to"],
  ["app/api/service-offers/route.ts", "services_write", "creates an offer a customer must read"],
  ["app/api/service-bookings/route.ts", "services_write", "creates a booking"],
  ["app/api/service-messages/route.ts", "services_message", "sends a message to another person"],
  ["app/api/service-disputes/route.ts", "services_report", "opens a dispute a moderator must handle"],
  ["app/api/service-reports/route.ts", "services_report", "reports somebody, which a moderator must judge"],
];

test("the endpoints that create work for other people are rate limited", async () => {
  const offenders = [];
  for (const [file, operation, why] of MUST_LIMIT) {
    const source = await read(file);
    if (!source.includes(`limitOr429`) || !source.includes(`"${operation}"`)) {
      offenders.push(`${file} (${why})`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("every operation used by a route is actually configured", async () => {
  // A typo in the operation name would otherwise be a limit that never fires,
  // which is worse than no limit because it looks like protection.
  for (const [, operation] of MUST_LIMIT) {
    assert.ok(RATE_LIMIT_CONFIGS[operation], `${operation} has no configuration`);
    assert.ok(RATE_LIMIT_CONFIGS[operation].limit > 0);
    assert.ok(RATE_LIMIT_CONFIGS[operation].windowMs > 0);
  }
});

test("the limits sit above real use and below abuse", async () => {
  // Numbers, not vibes: a person browsing the directory pages through it, and a
  // conversation is bursty, but nobody opens ten disputes a minute.
  assert.ok(RATE_LIMIT_CONFIGS.services_public_read.limit >= 60, "browsing must not trip the limiter");
  assert.ok(RATE_LIMIT_CONFIGS.services_write.limit <= 60, "publishing is not a high-frequency act");
  assert.ok(RATE_LIMIT_CONFIGS.services_report.limit <= 20, "reports are rare and each costs moderation time");
  assert.ok(
    RATE_LIMIT_CONFIGS.services_report.windowMs >= RATE_LIMIT_CONFIGS.services_write.windowMs,
    "the rarest action gets the longest window",
  );
});

test("a refusal tells the client when to come back", async () => {
  // A limiter without Retry-After turns one burst into a retry storm.
  const helper = await read("lib/services/rate-limit.ts");
  assert.match(helper, /"Retry-After": String\(result\.retryAfterSeconds\)/);
  assert.match(helper, /status: 429/);
});

test("the limit runs before the work, not after it", async () => {
  // A limit checked after the database call has already protected nothing.
  for (const [file] of MUST_LIMIT) {
    const source = await read(file);
    const guard = source.indexOf("limitOr429");
    const firstAwaitDb = source.search(/await (get|list|create|add|upsert)[A-Z]/);
    if (firstAwaitDb >= 0) {
      assert.ok(guard < firstAwaitDb, `${file} does its work before checking the limit`);
    }
  }
});

// ---- query shape ------------------------------------------------------------

test("candidate providers are fetched without a query per provider", async () => {
  const matching = await read("lib/services/matching.ts");
  assert.match(matching, /WHERE is_active = 1 AND provider_id IN \(/);
  const loop = matching.slice(matching.indexOf("for (const profile of rows)"));
  assert.doesNotMatch(loop.slice(0, 600), /\.prepare\(/);
});

test("offer revisions are fetched without a query per offer", async () => {
  // This is the screen where a customer compares the offers they received, so
  // the cost grew with how successful their request was.
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /FROM service_offer_revisions\s+WHERE offer_id IN \(/);
  assert.doesNotMatch(
    marketplace,
    /SELECT \* FROM service_offer_revisions WHERE offer_id = \?1/,
    "the per-offer query is gone, not merely supplemented",
  );
});

test("both batched queries build placeholders rather than interpolating ids", async () => {
  // An id reaching a statement as SQL is how a batching change becomes an
  // injection.
  for (const file of ["lib/services/matching.ts", "lib/services/marketplace.ts"]) {
    const source = await read(file);
    assert.match(source, /map\(\(_, index\) => `\?\$\{index \+ 1\}`\)\.join\(","\)/, `${file} must parameterise the IN list`);
  }
});

// ---- the rest of the surface ------------------------------------------------

test("no services route is left with a limit that is only half applied", async () => {
  // Importing the helper and never calling it, or calling it with an operation
  // that is not configured, both look like protection and are not.
  async function routeFiles(dir) {
    const out = [];
    let entries;
    try {
      entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
    } catch {
      return out;
    }
    for (const entry of entries) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) out.push(...(await routeFiles(rel)));
      else if (entry.name === "route.ts") out.push(rel);
    }
    return out;
  }

  const files = [];
  for (const family of ["app/api/service-requests", "app/api/service-offers", "app/api/service-providers", "app/api/service-messages", "app/api/service-reports", "app/api/service-disputes", "app/api/service-bookings", "app/api/service-reviews"]) {
    files.push(...(await routeFiles(family)));
  }
  assert.ok(files.length > 0, "the sweep must find the routes");

  for (const file of files) {
    const source = await read(file);
    if (!source.includes("limitOr429")) continue;
    const used = [...source.matchAll(/limitOr429\([^,]+,\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.ok(used.length > 0, `${file} imports the limiter without using it`);
    for (const operation of used) {
      assert.ok(RATE_LIMIT_CONFIGS[operation], `${file} uses unconfigured operation ${operation}`);
    }
  }
});
