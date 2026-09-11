/**
 * The registry now grows from what publishers type, with no approval step in
 * front of it. `geoMatchKey` is the only thing keeping one place from entering
 * the catalogue under several spellings, so its behaviour is pinned here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { geoMatchKey } from "../lib/geo/platform-location.ts";

const SAME = [
  ["حي النسيم", "النسيم"],
  ["النسيم", "نسيم"],
  ["حيّ النسيم", "حي النسيم"],
  ["الـنسيم", "النسيم"],
  ["قرية العالية", "العالية"],
  ["مدينة جدة", "جدة"],
  ["جده", "جدة"],
  ["الصفا  ", " الصفا"],
  ["محافظة صور", "صور"],
  ["هجرة الخالدية", "الخالدية"],
  ["مكه المكرمه", "مكة المكرمة"],
  ["Al-Nasim", "al nasim"],
];

for (const [left, right] of SAME) {
  test(`"${left}" and "${right}" are the same place`, () => {
    assert.equal(geoMatchKey(left), geoMatchKey(right));
    assert.notEqual(geoMatchKey(left), "");
  });
}

const DIFFERENT = [
  ["النسيم", "النسيم الغربي"],
  ["الصفا", "المروة"],
  ["جدة", "جيزان"],
  ["الخالدية", "الخالدة"],
];

for (const [left, right] of DIFFERENT) {
  test(`"${left}" and "${right}" stay different places`, () => {
    assert.notEqual(geoMatchKey(left), geoMatchKey(right));
  });
}

test("a name that is only a prefix keeps its own identity", () => {
  // "حي" alone is not a neighbourhood called nothing; stripping must not empty it.
  assert.equal(geoMatchKey("حي"), "حي");
  assert.equal(geoMatchKey("ال"), "ال");
});

test("empty and non-string input produce no key", () => {
  assert.equal(geoMatchKey(""), "");
  assert.equal(geoMatchKey("   "), "");
  assert.equal(geoMatchKey(null), "");
  assert.equal(geoMatchKey(42), "");
});
