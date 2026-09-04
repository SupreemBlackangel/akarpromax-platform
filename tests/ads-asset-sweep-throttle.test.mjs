import assert from "node:assert/strict";
import test from "node:test";

import {
  maybePruneAdRequestAssets,
  resetAssetSweepForTests,
} from "../lib/ads/asset-retention.ts";

/**
 * The throttle in front of the asset sweep.
 *
 * The sweep itself is covered by tests/ads-data-integrity.test.mjs: what it
 * deletes, what it refuses to delete, and that a missing referencing table does
 * not turn it destructive. This file covers the part that decides HOW OFTEN it
 * runs, which was not covered anywhere.
 *
 * That matters because of where it is hung. The upload route is the only place
 * new rows appear, so it is the cheapest place to trigger cleanup -- but the
 * upload route is also public. Without the throttle, every public ad-request
 * upload would run a full sweep, and the cheapest way to make the server do
 * expensive work would be to upload repeatedly.
 *
 * The measurement that led here: ad_request_assets holds raw image bytes, and
 * on production it is 15 MB across nine rows -- about 1.7 MB each. Retention is
 * the only thing between that and a database that grows with every request
 * anyone ever makes.
 */

/** A db that records the statements it is asked for and answers nothing. */
function recordingDb() {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      statements.push(sql);
      const stmt = {
        bind() { return stmt; },
        async all() { return { results: [] }; },
        async first() { return null; },
        async run() { return {}; },
      };
      return stmt;
    },
  };
}

test("the first call sweeps", async () => {
  resetAssetSweepForTests();
  const db = recordingDb();

  maybePruneAdRequestAssets(db, Date.now());
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(
    db.statements.some((sql) => sql.includes("FROM ad_request_assets")),
    "the sweep must actually look at the table",
  );
});

test("a second call moments later does not sweep again", async () => {
  // Otherwise every public upload runs a full sweep, and repeated uploads
  // become the cheapest way to make the server do expensive work.
  resetAssetSweepForTests();
  const now = Date.now();

  const first = recordingDb();
  maybePruneAdRequestAssets(first, now);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(first.statements.length > 0, "the first call must sweep");

  const second = recordingDb();
  maybePruneAdRequestAssets(second, now + 1000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(second.statements, [], "a call moments later must not sweep");
});

test("it sweeps again once the interval has passed", async () => {
  resetAssetSweepForTests();
  const now = Date.now();

  maybePruneAdRequestAssets(recordingDb(), now);
  await new Promise((resolve) => setImmediate(resolve));

  const later = recordingDb();
  // Six hours and a minute.
  maybePruneAdRequestAssets(later, now + 6 * 60 * 60 * 1000 + 60_000);
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(later.statements.length > 0, "the sweep must resume after its interval");
});

test("a sweep that fails does not reach the caller", async () => {
  // It is hung off an upload. Retention failing must never fail somebody's
  // upload, and must never surface as an error on a path that succeeded.
  resetAssetSweepForTests();

  const brokenDb = {
    prepare() {
      throw new Error("the database is unavailable");
    },
  };

  assert.doesNotThrow(() => maybePruneAdRequestAssets(brokenDb, Date.now()));
  // And nothing is left unhandled behind it.
  await new Promise((resolve) => setImmediate(resolve));
});

test("the sweep is not awaited, so it cannot delay an upload", async () => {
  resetAssetSweepForTests();
  const db = recordingDb();

  const returned = maybePruneAdRequestAssets(db, Date.now());
  assert.equal(returned, undefined, "it must return nothing to await");
});
