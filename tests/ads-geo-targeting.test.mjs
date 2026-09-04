import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/** Comment lines are stripped before matching: three earlier sweeps in this
 *  repository failed on their own explanatory prose. */
const code = (source) =>
  source
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");

/**
 * Geographic ad targeting: what is stored must be what is compared.
 *
 * The campaign field and the visitor context meet in `isGeoMatch`, which
 * lowercases both sides and tests equality. There is no normalisation, no
 * prefix stripping and no alias table on that path, so the two must already
 * agree on the identifier's shape.
 *
 * They did not. `AdSlot` sends `cityId: geo.city`, and `geo.city` is a bare
 * registry code -- `JEDDAH`. The admin form's own placeholder read
 * `om-muscat, sa-riyadh`. A campaign filled in as instructed was approved,
 * activated, and could never be served to anyone. Measured against production:
 *
 *   cityId=jeddah     -> the ad is served
 *   cityId=JEDDAH     -> the ad is served   (the engine lowercases)
 *   cityId=sa-jeddah  -> nothing
 *   cityId=(empty)    -> nothing            (a city-targeted campaign needs one)
 */

// ---- the two sides agree on the identifier ----------------------------------

test("the picker stores the same identifier the visitor context sends", async () => {
  const picker = code(await read("app/admin/ads/GeoTargetPicker.tsx"));
  const cluster = code(await read("src/components/public/LocationCluster.tsx"));

  // LocationCluster decides what geo.city becomes; GeoTargetPicker decides what
  // the campaign stores. One rule, written twice, so it is asserted twice.
  assert.match(cluster, /code\?\.trim\(\)\s*\|\|\s*option\.id/, "the context value is code-or-id");
  assert.match(picker, /code\?\.trim\(\)\s*\|\|\s*row\.id/, "the stored value must be code-or-id too");
});

test("the ads form no longer teaches a country-prefixed identifier", async () => {
  const form = code(await read("app/admin/ads/ads-admin-client.tsx"));

  // These placeholders are the defect itself, not a cosmetic detail: they are
  // the only instruction a moderator ever received about the format.
  for (const taught of ["sa-riyadh", "om-muscat", "om-muscat-governorate"]) {
    assert.ok(!form.includes(taught), `the form still suggests "${taught}", which cannot match`);
  }
});

test("city, region and district are chosen from the registry, not typed", async () => {
  const form = code(await read("app/admin/ads/ads-admin-client.tsx"));
  assert.match(form, /<GeoTargetPicker/, "the picker must be mounted in the targeting step");

  // The free-text boxes are gone. A text input on these fields is what let an
  // unmatched value be saved in the first place.
  assert.doesNotMatch(
    form,
    /setField\("(cities|regionIds|districtIds)",\s*event\.target\.value\.split/,
    "these fields must not be free text",
  );
});

// ---- the matcher's contract -------------------------------------------------

test("the geo gate compares lowercased equality and nothing else", async () => {
  const engine = code(await read("lib/ads/engine.ts"));

  // If this ever gains prefix handling or an alias table, the picker's job
  // changes and this file should be revisited rather than quietly passing.
  assert.match(engine, /ad\.cities\.some\(\(item\) => item\.toLowerCase\(\) === city\)/);
  assert.match(engine, /ad\.regionIds\.some\(\(item\) => item\.toLowerCase\(\) === region\)/);
  assert.match(engine, /ad\.districtIds\.some\(\(item\) => item\.toLowerCase\(\) === district\)/);
});

test("a city-targeted campaign is refused when the visitor's city is unknown", async () => {
  const engine = code(await read("lib/ads/engine.ts"));

  // This is deliberate and worth pinning: no city means no match, so a
  // city-targeted campaign disappears entirely for visitors whose location did
  // not resolve. It is the reason city targeting must be chosen knowingly.
  assert.match(engine, /if \(!city \|\| !ad\.cities\.some/);
  assert.match(engine, /if \(!region \|\| !ad\.regionIds\.some/);
});

test("targeting a level is opt-in: an empty list means everywhere", async () => {
  const engine = code(await read("lib/ads/engine.ts"));
  for (const [list, flag] of [
    ["ad.countries", "ad.targetAllCountries"],
    ["ad.regionIds", "ad.targetAllRegions"],
    ["ad.cities", "ad.targetAllCities"],
    ["ad.districtIds", "ad.targetAllDistricts"],
  ]) {
    const pattern = new RegExp(
      `${list.replace(".", "\\.")}\\.length > 0 && !${flag.replace(".", "\\.")}`,
    );
    assert.match(engine, pattern, `${list} must only gate when it is non-empty`);
  }
});

// ---- values the registry cannot supply are surfaced, not hidden -------------

test("a saved value absent from the registry is shown as removable", async () => {
  const picker = code(await read("app/admin/ads/GeoTargetPicker.tsx"));

  // Opening an old campaign must neither silently drop its stored targeting nor
  // silently keep a value that can never match. It is displayed and removable.
  assert.match(picker, /strays/, "unknown saved values must be surfaced");
  assert.match(picker, /!known\.has\(value\)/);
});

// ---- the catalogue itself ---------------------------------------------------

test("no two places in the catalogue share a code", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");

  // isGeoMatch compares a bare lowercased string with no country in scope. Two
  // places sharing a code would target each other, and Tripoli is in both
  // Lebanon and Libya -- which is precisely why these codes carry the country.
  const seen = new Map();
  const clashes = [];
  const claim = (code, where) => {
    const key = code.toLowerCase();
    if (seen.has(key)) clashes.push(`${code}: ${seen.get(key)} and ${where}`);
    else seen.set(key, where);
  };

  for (const [country, governorates] of Object.entries(CATALOGUE)) {
    for (const governorate of governorates) {
      claim(governorate.code, `${country}/${governorate.en}`);
      for (const city of governorate.cities ?? []) {
        claim(city.code, `${country}/${governorate.en}/${city.en}`);
        for (const district of city.districts ?? []) {
          claim(district.code, `${country}/${governorate.en}/${city.en}/${district.en}`);
        }
      }
    }
  }

  assert.deepEqual(clashes, [], `codes are reused:\n  ${clashes.join("\n  ")}`);
});

test("every catalogue entry carries a code and both names", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");
  const bad = [];
  for (const [country, governorates] of Object.entries(CATALOGUE)) {
    const walk = (row, path) => {
      if (!row.code || !row.code.trim()) bad.push(`${path}: no code`);
      if (!row.ar || !row.ar.trim()) bad.push(`${path}: no Arabic name`);
      if (!row.en || !row.en.trim()) bad.push(`${path}: no English name`);
    };
    for (const governorate of governorates) {
      walk(governorate, `${country}/${governorate.code}`);
      for (const city of governorate.cities ?? []) {
        walk(city, `${country}/${city.code}`);
        for (const district of city.districts ?? []) walk(district, `${country}/${district.code}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("the catalogue covers the countries the platform lists, and leaves Saudi Arabia alone", async () => {
  const { CATALOGUE, SKIP } = await import("../scripts/geo-catalogue.mjs");

  // Saudi Arabia's codes are bare (`JEDDAH`) and live campaigns already target
  // them. Rewriting them would break exactly what this work protects.
  assert.ok(SKIP.has("SA"), "Saudi Arabia must be excluded from seeding");
  assert.ok(!("SA" in CATALOGUE), "and must not appear in the catalogue at all");

  const listed = ["AE", "QA", "KW", "BH", "OM", "IQ", "JO", "LB", "PS", "SY", "YE", "EG",
                  "LY", "TN", "DZ", "MA", "MR", "SD", "SO", "DJ", "KM", "TR"];
  const missing = listed.filter((code) => !(code in CATALOGUE));
  assert.deepEqual(missing, [], `these countries are selectable but have no catalogue: ${missing.join(", ")}`);
});

test("Manbij and Cairo are reachable, since they are the ones that were asked for", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");

  const aleppo = CATALOGUE.SY.find((g) => g.en === "Aleppo");
  assert.ok(aleppo, "Aleppo governorate must exist");
  assert.ok(aleppo.cities?.some((c) => c.code === "SY-MANBIJ" && c.ar === "منبج"), "Manbij must be selectable");

  const cairo = CATALOGUE.EG.find((g) => g.en === "Cairo");
  assert.ok(cairo?.cities?.some((c) => c.code === "EG-CAIRO"), "Cairo must be selectable");
});

test("the seeder never deletes or updates", async () => {
  const seeder = code(await read("scripts/seed-geo-catalogue.mjs"));

  // The catalogue is production data. This script may add a missing row; it may
  // not touch one that exists.
  assert.doesNotMatch(seeder, /\bDELETE\b/i);
  assert.doesNotMatch(seeder, /\bUPDATE\b/i);
  assert.doesNotMatch(seeder, /\bTRUNCATE\b/i);
  assert.doesNotMatch(seeder, /\bDROP\b/i);
  assert.match(seeder, /SELECT id FROM/, "it must look a row up before inserting it");
  assert.match(seeder, /ROLLBACK/, "a failure must leave nothing behind");
});
