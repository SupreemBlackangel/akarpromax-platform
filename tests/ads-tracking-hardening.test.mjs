import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * The ad event intake.
 *
 * Every one of these writes into the counters that decide when a campaign's
 * budget is exhausted and what an advertiser is billed. They are public by
 * necessity -- a browser reports them -- so a signed token, a nonce and a rate
 * limit are the only things separating a real event from a script in a loop.
 *
 * /api/ad-events had none of the three. It accepted POST with no
 * authentication, no permission, no rate limit and no token, and wrote straight
 * into ad_events. Anyone able to send a request could exhaust any active
 * campaign's budget as fast as the server would answer.
 */

/** Every route that writes an ad event. */
const TRACKING_ROUTES = [
  "app/api/ads/impression/route.ts",
  "app/api/ads/click/route.ts",
  "app/api/ads/conversion/route.ts",
  "app/api/ad-events/route.ts",
];

test("every tracking route is rate limited", async () => {
  for (const file of TRACKING_ROUTES) {
    const source = await read(file);
    assert.match(source, /enforceRateLimit\(/, `${file} has no rate limit`);
    assert.match(source, /status: 429/, `${file} does not refuse with 429`);
    assert.match(source, /"Retry-After"/, `${file} refuses without telling the client when to return`);
  }
});

test("every tracking route requires a token this server minted", async () => {
  // The token is bound to the campaign and expires. Without it there is nothing
  // separating a real event from a forged one.
  for (const file of TRACKING_ROUTES) {
    const source = await read(file);
    assert.match(source, /resolveTrackRequest\(/, `${file} accepts events without a signed token`);
  }
});

test("every billable event is claimed once", async () => {
  // A valid token replayed a thousand times would otherwise bill a thousand
  // events. Conversions had a token but no nonce claim.
  for (const file of ["app/api/ads/impression/route.ts", "app/api/ads/click/route.ts", "app/api/ads/conversion/route.ts"]) {
    const source = await read(file);
    assert.match(source, /claimNonce\(/, `${file} does not claim its nonce`);
  }
});

test("a duplicate is answered 200, not an error", async () => {
  // A retry, StrictMode's double effect and a replay all present the same
  // nonce. Answering an error makes a client retry something it cannot fix.
  const conversion = await read("app/api/ads/conversion/route.ts");
  assert.match(conversion, /duplicate: true/);
});

test("no tracking route parses a body without catching", async () => {
  // request.json() on a malformed body throws, and an unhandled throw is a 500
  // -- an error page for what is only a bad request.
  for (const file of TRACKING_ROUTES) {
    const source = await read(file);
    assert.doesNotMatch(
      source,
      /await request\.json\(\)(?!\s*\.catch)/,
      `${file} parses the body without a catch`,
    );
  }
});

test("the conversion value is bounded at both ends", async () => {
  // It was floored at zero and had no ceiling, so one forged conversion could
  // carry a value larger than the marketplace has ever transacted and make
  // every report downstream meaningless.
  const source = await read("app/api/ads/conversion/route.ts");
  assert.match(source, /MAX_CONVERSION_VALUE/);
  assert.match(source, /raw >= 0 && raw <= MAX_CONVERSION_VALUE/);
  // Out of range is treated as absent rather than clamped: a clamped maximum is
  // a number nobody sent, and it would look real.
  assert.doesNotMatch(source, /Math\.min\([^)]*MAX_CONVERSION_VALUE/);
});

test("ad-events uses the campaign id from the verified token, not the body", async () => {
  // Taking it from the body would let a token minted for one campaign write an
  // event against another.
  const source = await read("app/api/ad-events/route.ts");
  assert.match(source, /resolved\.campaignId/);
  assert.doesNotMatch(
    source,
    /\.bind\(campaignId,/,
    "the body's campaignId must not reach the statement",
  );
});

test("ad-events records that it was used, so its removal is decided on evidence", async () => {
  // It is deprecated rather than deleted: a stale bundle under dist/ still
  // names the path, and a route that vanishes answers 404 with nothing to read.
  const source = await read("app/api/ad-events/route.ts");
  assert.match(source, /console\.warn\("\[ad-events\] deprecated endpoint used"/);
});

test("no ads route left writes an event with no protection at all", async () => {
  // Guards the guard: a new tracking route added tomorrow is caught by the
  // sweep rather than by whoever notices the bill.
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

  const files = [...(await routeFiles("app/api/ads")), ...(await routeFiles("app/api/ad-events"))];
  assert.ok(files.length >= 5, `the sweep must find the routes, found ${files.length}`);

  for (const file of files) {
    const source = await read(file);
    // Only routes that INSERT an event need this; matching and asset routes do not.
    if (!/INSERT INTO ad_events|recordImpression|recordClick|recordConversion/.test(source)) continue;
    assert.match(source, /enforceRateLimit\(/, `${file} writes an event with no rate limit`);
    assert.match(source, /resolveTrackRequest\(/, `${file} writes an event with no signed token`);
  }
});
