import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { PLATFORM_MAX_SERVICE_RADIUS_KM } from "../lib/services/match-score.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/**
 * The matching policy document against the matching code.
 *
 * These drifted apart and nobody noticed, because nothing connected them. The
 * document promised a 50km default that is "configurable per provider"; the
 * code caps every provider at PLATFORM_MAX_SERVICE_RADIUS_KM with a Math.min,
 * so any value above the ceiling changes nothing and the write path's own
 * default of 50 is silently reduced to it.
 *
 * The ceiling itself is a product decision and is deliberately not changed
 * here. What these tests do is make the next divergence fail loudly.
 */

test("the policy document states the ceiling the code actually enforces", async () => {
  const doc = await read("docs/services/GEOGRAPHIC_MATCHING_POLICY.md");
  assert.match(
    doc,
    // Not a template literal with \b: inside one that is the backspace
    // character, not a word boundary, so the pattern searched for a control
    // code and failed against a document that plainly contained the text.
    new RegExp(`PLATFORM_MAX_SERVICE_RADIUS_KM = ${PLATFORM_MAX_SERVICE_RADIUS_KM};`),
    `the document must name the ceiling the code enforces (${PLATFORM_MAX_SERVICE_RADIUS_KM}km)`,
  );
});

test("the document records that the ceiling overrides the per-provider value", async () => {
  const doc = await read("docs/services/GEOGRAPHIC_MATCHING_POLICY.md");
  assert.match(doc, /Math\.min/, "the clamp is the whole point and must be visible in the policy");
});

test("the ceiling is still applied by a clamp, not by trusting the column", async () => {
  const source = await read("lib/services/match-score.ts");
  assert.match(
    source,
    /Math\.min\(providerRadius, PLATFORM_MAX_SERVICE_RADIUS_KM\)/,
    "if this clamp goes, the addendum in the policy document is wrong and must be removed with it",
  );
});

test("the write path default is recorded as being above the ceiling", async () => {
  // The mismatch itself: the form offers 50, the matcher grants 10.
  const route = await read("app/api/service-providers/route.ts");
  assert.match(route, /SERVICE_RADIUS_KM\) \?\? 50/, "the write default is 50");
  assert.ok(
    PLATFORM_MAX_SERVICE_RADIUS_KM < 50,
    "if the ceiling is raised to 50 or above, the addendum is resolved and should be rewritten",
  );
});
