import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

/**
 * One in-flight request per geo level.
 *
 * Measured on the live home page before this existed: 13 API calls, two of them
 * exact duplicates. GeoContext fetched the governorate list to normalise a
 * detected location name, and LocationCluster fetched the same list to fill its
 * dropdown, in the same load, neither aware of the other.
 */

const modulePath = "../src/lib/geo-registry-cache.ts";

let calls;
beforeEach(async () => {
  calls = [];
  const { clearGeoRegistryCache } = await import(modulePath);
  clearGeoRegistryCache();
});

function stubFetch(handler) {
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(String(url));
  };
}

const ok = (rows) => ({ ok: true, json: async () => ({ data: rows }) });

test("two callers asking at the same moment share one request", async () => {
  const { fetchGeoLevel } = await import(modulePath);
  let resolve;
  const gate = new Promise((r) => { resolve = r; });
  stubFetch(async () => { await gate; return ok([{ id: "1", code: "MAKKAH" }]); });

  const both = Promise.all([
    fetchGeoLevel("governorates", "sa"),
    fetchGeoLevel("governorates", "sa"),
  ]);
  resolve();
  const [a, b] = await both;

  assert.equal(calls.length, 1, "the second caller must join the first request");
  assert.deepEqual(a, b);
});

test("a second ask after the first resolves is served from cache", async () => {
  const { fetchGeoLevel } = await import(modulePath);
  stubFetch(async () => ok([{ id: "1", code: "MAKKAH" }]));

  await fetchGeoLevel("cities", "makkah");
  await fetchGeoLevel("cities", "makkah");
  assert.equal(calls.length, 1);
});

test("different parents are different requests", async () => {
  const { fetchGeoLevel } = await import(modulePath);
  stubFetch(async () => ok([{ id: "1", code: "X" }]));

  await fetchGeoLevel("cities", "makkah");
  await fetchGeoLevel("cities", "riyadh");
  assert.equal(calls.length, 2);
});

test("an empty answer is not cached", async () => {
  // This is the case that matters while the catalogue is being filled in: a
  // country with no governorates yet must not be remembered as empty for the
  // rest of the session.
  const { fetchGeoLevel } = await import(modulePath);
  let rows = [];
  stubFetch(async () => ok(rows));

  assert.deepEqual(await fetchGeoLevel("governorates", "eg"), []);
  rows = [{ id: "1", code: "EG-C" }];
  assert.equal((await fetchGeoLevel("governorates", "eg")).length, 1);
  assert.equal(calls.length, 2);
});

test("a failure answers with an empty list and never rejects", async () => {
  // Every caller sits inside a React effect and answered failure with []. An
  // unhandled rejection there would be a worse bug than the duplicate request
  // this module removes.
  const { fetchGeoLevel } = await import(modulePath);

  stubFetch(async () => { throw new Error("network down"); });
  assert.deepEqual(await fetchGeoLevel("governorates", "sa"), []);

  stubFetch(async () => ({ ok: false, json: async () => ({}) }));
  assert.deepEqual(await fetchGeoLevel("governorates", "jo"), []);
});

test("a failure is not remembered", async () => {
  const { fetchGeoLevel } = await import(modulePath);
  let fail = true;
  stubFetch(async () => {
    if (fail) throw new Error("down");
    return ok([{ id: "1", code: "OK" }]);
  });

  assert.deepEqual(await fetchGeoLevel("districts", "jeddah"), []);
  fail = false;
  assert.equal((await fetchGeoLevel("districts", "jeddah")).length, 1);
});
