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
  assert.match(picker, /!known\.has\(norm\(value\)\)/);
});

// ---- the catalogue itself ---------------------------------------------------

test("no two places at the same level share a code", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");

  // Uniqueness is per LEVEL, not global. `isGeoMatch` compares ad.regionIds
  // against ctx.regionId and ad.cities against ctx.cityId -- separate fields
  // that are never compared with each other, so Saudi Arabia having both a
  // MAKKAH governorate and a MAKKAH city is correct and long-standing.
  //
  // Two CITIES sharing a code is the real hazard: they would target each
  // other, and Tripoli is in both Lebanon and Libya. That is why every code
  // outside Saudi Arabia carries its country.
  const clashes = [];
  for (const level of ["governorates", "cities", "districts"]) {
    const seen = new Map();
    const claim = (code, where) => {
      const key = code.toLowerCase();
      if (seen.has(key)) clashes.push(`${level} ${code}: ${seen.get(key)} and ${where}`);
      else seen.set(key, where);
    };
    for (const [country, governorates] of Object.entries(CATALOGUE)) {
      for (const governorate of governorates) {
        if (level === "governorates") claim(governorate.code, `${country}/${governorate.en}`);
        for (const city of governorate.cities ?? []) {
          if (level === "cities") claim(city.code, `${country}/${governorate.en}/${city.en}`);
          for (const district of city.districts ?? []) {
            if (level === "districts") claim(district.code, `${country}/${city.en}/${district.en}`);
          }
        }
      }
    }
  }

  assert.deepEqual(clashes, [], `codes are reused within a level: ${clashes.join(" | ")}`);
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

test("the catalogue covers every country the platform lists", async () => {
  const { CATALOGUE, SKIP } = await import("../scripts/geo-catalogue.mjs");

  const listed = ["SA", "AE", "QA", "KW", "BH", "OM", "IQ", "JO", "LB", "PS", "SY", "YE",
                  "EG", "LY", "TN", "DZ", "MA", "MR", "SD", "SO", "DJ", "KM", "TR"];
  const missing = listed.filter((code) => !(code in CATALOGUE));
  assert.deepEqual(missing, [], `selectable but with no catalogue: ${missing.join(", ")}`);

  // Oman, and only Oman, is skipped. Its eleven governorates were seeded by
  // seed-oman-launch-data.mjs under a different code scheme (MCT, DHO, BAN...)
  // than this catalogue's (OM-MU, OM-ZU...). The seeder matches an existing row
  // by (parent, code), so it would not recognise them: it would insert a SECOND
  // set of eleven and hang cities off those, while every live listing and office
  // profile still points at the first set. Oman is already complete.
  assert.deepEqual([...SKIP], ["OM"], "only Oman is excluded, and only because its live codes differ");
});

test("Saudi Arabia keeps its bare codes, because live campaigns target them", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");

  // A campaign in production targets `jeddah`. Renaming it to `sa-jeddah`
  // would make that campaign invisible -- the exact failure this work fixed.
  const prefixed = [];
  for (const governorate of CATALOGUE.SA) {
    if (/^SA-/i.test(governorate.code)) prefixed.push(governorate.code);
    for (const city of governorate.cities ?? []) {
      if (/^SA-/i.test(city.code)) prefixed.push(city.code);
    }
  }
  assert.deepEqual(prefixed, [], "Saudi codes must stay bare");

  const makkah = CATALOGUE.SA.find((g) => g.code === "MAKKAH");
  assert.ok(makkah?.cities?.some((c) => c.code === "JEDDAH"), "JEDDAH must still be exactly that");
});

test("every country outside Saudi Arabia carries its country in the code", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");
  const bare = [];
  for (const [country, governorates] of Object.entries(CATALOGUE)) {
    if (country === "SA") continue;
    for (const governorate of governorates) {
      for (const city of governorate.cities ?? []) {
        if (!city.code.toUpperCase().startsWith(`${country}-`)) bare.push(`${country}: ${city.code}`);
      }
    }
  }
  assert.deepEqual(bare, [], `city codes must be country-prefixed outside Saudi Arabia`);
});

test("the eight empty Saudi governorates now have cities", async () => {
  const { CATALOGUE } = await import("../scripts/geo-catalogue.mjs");

  // Measured against production before this: Asir, Qassim, Tabuk, Hail, Jazan,
  // Najran, Baha, Jouf and the Northern Borders held not one city, so Abha,
  // Khamis Mushait and Buraidah could not be targeted at all.
  for (const code of ["ASIR", "QASSIM", "TABUK", "HAIL", "JAZAN", "NAJRAN", "BAHA", "JOUF", "NORTHERN"]) {
    const governorate = CATALOGUE.SA.find((g) => g.code === code);
    assert.ok(governorate, `${code} must be in the catalogue`);
    assert.ok((governorate.cities ?? []).length > 0, `${code} must no longer be empty`);
  }

  const asir = CATALOGUE.SA.find((g) => g.code === "ASIR");
  assert.ok(asir.cities.some((c) => c.code === "ABHA"));
  assert.ok(asir.cities.some((c) => c.code === "KHAMISMUSHAIT"));
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

// ---- the case in the database is not the case in the registry ---------------

test("a campaign storing JEDDAH shows Jeddah as selected, not as a stray", async () => {
  const picker = code(await read("app/admin/ads/GeoTargetPicker.tsx"));

  // The live campaign holds `["JEDDAH"]` -- entered before the registry codes
  // were settled -- and app/api/admin/ads hands it back verbatim. isGeoMatch
  // lowercases both sides, so the campaign works. A picker that compared
  // "JEDDAH" with "jeddah" would show the box UNCHECKED and list JEDDAH under
  // "not in the registry", and a moderator following that warning would strip
  // the targeting off a running campaign.
  assert.match(picker, /const norm = \(value: string\): string => value\.trim\(\)\.toLowerCase\(\)/);
  assert.match(picker, /const has = \(list: string\[\], value: string\)/);

  assert.match(picker, /checked=\{has\(selected, value\)\}/, "the checkbox must compare case-insensitively");
  assert.match(picker, /!known\.has\(norm\(value\)\)/, "and so must the stray check");
  assert.doesNotMatch(picker, /selected\.includes\(value\)/, "no case-sensitive comparison may remain");
});

test("removing a value matches it case-insensitively too", async () => {
  const picker = code(await read("app/admin/ads/GeoTargetPicker.tsx"));

  // Otherwise unticking Jeddah on a campaign that stored JEDDAH would append a
  // second entry instead of removing the first.
  assert.match(picker, /current\.filter\(\(item\) => norm\(item\) !== norm\(value\)\)/);
});
