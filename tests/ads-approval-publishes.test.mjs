import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/**
 * Approved ads must actually appear.
 *
 * They did not. Campaigns came out of approval with approval_status =
 * 'approved' and is_active = 1 but status still 'draft', while the audit log
 * recorded autoActivated: true -- the code believed it had activated them. The
 * serving query requires status = 'active', so they were approved and
 * invisible. Two live campaigns were in that state.
 *
 * The cause was choosing the status inside the statement:
 *
 *     status = CASE WHEN ? THEN 'active' ELSE status END
 *
 * Postgres requires the CASE condition to be a boolean, and a bound 1/0 is not
 * one. Both forms were reproduced against the live database:
 *
 *     ERROR: argument of CASE/WHEN must be type boolean, not type integer
 *     ERROR: parameter $4 of type integer cannot be coerced to expected type boolean
 */

test("approval decides the status in code, not inside a CASE expression", async () => {
  const route = await read("app/api/admin/ads/approve/route.ts");

  assert.match(route, /const nextStatus = shouldActivate \? "active" : existing\.status;/);
  assert.match(route, /status = \?,/, "the status must be bound as a plain value");
  assert.doesNotMatch(
    route,
    /status = CASE WHEN \?/,
    "the dialect-sensitive construct must not come back",
  );
});

test("no ads statement chooses a value with CASE WHEN on a bound parameter", async () => {
  // The same shape anywhere else would fail the same way, and silently: the
  // statement succeeds, the column simply does not change.
  //
  // Comments are stripped first. The approve route explains the old construct
  // on purpose, and a sweep that reads its own explanation as the offence
  // teaches whoever hits it to delete the explanation.
  const withoutComments = (source) =>
    source
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");

  for (const file of [
    "app/api/admin/ads/approve/route.ts",
    "app/api/admin/ads/route.ts",
    "app/api/admin/ads/restore/route.ts",
  ]) {
    const source = withoutComments(await read(file));
    assert.doesNotMatch(source, /CASE\s+WHEN\s+\?/i, `${file} uses CASE WHEN on a bound parameter`);
  }
});

test("approval records the status it ended on, not only what it intended", async () => {
  // The audit said autoActivated: true while the row stayed draft. Recording
  // the outcome as well as the intention is what makes the next such
  // divergence visible in the log instead of invisible.
  const route = await read("app/api/admin/ads/approve/route.ts");
  assert.match(route, /statusAfter: nextStatus/);
});

test("approving drops the servable-ads cache", async () => {
  // The engine caches for thirty seconds. Approval is done by a person who then
  // looks at the site, and a rejected campaign kept being served for that long.
  const route = await read("app/api/admin/ads/approve/route.ts");
  assert.match(route, /invalidateActiveAdsCache\(\)/);

  const engine = await read("lib/ads/engine.ts");
  assert.match(engine, /export function invalidateActiveAdsCache\(\): void \{/);
  assert.match(engine, /activeAdsCache = null;/);
  assert.match(engine, /activeAdsPromise = null;/, "an in-flight load would otherwise repopulate the stale value");
});

test("an editor without publish permission cannot unpublish a live campaign", async () => {
  // The old rule forced "active" to "draft" whenever it was submitted, which
  // reads as "you may not publish" but also silently took a running campaign
  // off the site when somebody fixed a typo on it.
  const route = await read("app/api/admin/ads/route.ts");

  assert.match(route, /if \(!canPublish && existing && status !== existing\.status\) \{\s*status = existing\.status;/);
  assert.match(route, /SELECT id, countries, approval_status, status FROM ad_campaigns/,
    "the current status must be read before it can be preserved");
});

test("the serving query still demands every condition it should", async () => {
  // The fix must not have widened what is servable. An unapproved, inactive or
  // deleted campaign appearing publicly is a far worse defect than an approved
  // one staying hidden.
  const engine = await read("lib/ads/engine.ts");

  for (const condition of [
    /status = 'active'/,
    /approval_status = 'approved'/,
    /is_active = 1/,
    /deleted_at IS NULL/,
  ]) {
    assert.match(engine, condition, `the serving query must keep: ${condition}`);
  }
});

test("the four gates are all set coherently by approval", async () => {
  // A campaign is servable only when status, approval_status, is_active and
  // deleted_at all agree. Approval is the moment they are decided together;
  // any one left behind makes the ad invisible with nothing on screen to say
  // why.
  const route = await read("app/api/admin/ads/approve/route.ts");
  assert.match(route, /approval_status = \?/);
  assert.match(route, /is_active = \?/);
  assert.match(route, /status = \?/);
});
