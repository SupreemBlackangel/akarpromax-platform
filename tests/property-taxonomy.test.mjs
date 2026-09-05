// One taxonomy, two applications.
//
// The office app used to fold its 27 property subtypes into the platform's 12
// when publishing — a palace, a rest house and a traditional house all arrived
// as "apartment". The lists are one list now, and these are the two properties
// that have to hold for that to stay true: everything the office can record is
// accepted here, and everything the database already holds still validates.
import assert from "node:assert/strict";
import test from "node:test";

import {
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES,
  PROPERTY_DIRECTIONS,
  FURNISHING_OPTIONS,
  LEGACY_TYPE_ALIASES,
  ACCEPTED_PROPERTY_TYPES,
  ACCEPTED_PROPERTY_CATEGORIES,
  canonicalPropertyType,
  isAcceptedPropertyType,
  categoryForPropertyType,
  propertyTypeLabel,
  propertyTypesForCategory,
  selectableCategories,
  taxonomyPayload,
} from "../lib/taxonomy/property-taxonomy.ts";

/**
 * The office application's own subtype list
 * (AkarApp_SOURCE/webui-src/src/lib/defaults.ts, "property_subtypes"). It
 * lives in a separate repository, so it is restated here as the contract: if
 * an office adds a subtype there, this test is where the platform finds out.
 */
const OFFICE_SUBTYPES = [
  "villa", "apartment", "residential_building", "independent_floor", "townhouse",
  "traditional_house", "palace", "studio", "residential_land", "rest_area",
  "showroom", "shop", "commercial_office", "commercial_building", "shopping_center",
  "hotel_resort", "commercial_land", "warehouse", "factory", "workshop",
  "industrial_land", "farm", "agricultural_land", "orchard", "mixed_use_building",
  "office_apartment", "worker_housing", "duplex", "penthouse", "restaurant",
];

/** Codes the platform's validator accepted before the taxonomy existed. Rows carry them. */
const LEGACY_PLATFORM_TYPES = [
  "villa", "apartment", "townhouse", "duplex", "penthouse",
  "shop", "warehouse", "office", "building", "factory",
  "land", "farm", "ranch", "hotel", "resort", "restaurant",
];

test("the two lists hold exactly the same types", () => {
  assert.deepEqual(
    [...OFFICE_SUBTYPES].sort(),
    PROPERTY_TYPES.map((type) => type.id).sort(),
    "the office application and the platform must offer the same types",
  );
});

test("every subtype the office application offers is accepted, unchanged", () => {
  for (const subtype of OFFICE_SUBTYPES) {
    assert.ok(isAcceptedPropertyType(subtype), `${subtype} must be accepted`);
    assert.equal(canonicalPropertyType(subtype), subtype, `${subtype} must not be folded into another type`);
  }
});

test("every code the platform accepted before still validates", () => {
  for (const code of LEGACY_PLATFORM_TYPES) {
    assert.ok(isAcceptedPropertyType(code), `${code} is in the database and must stay valid`);
    assert.ok(categoryForPropertyType(code), `${code} must resolve to a category`);
  }
});

test("a legacy code resolves to a canonical type, and that type is real", () => {
  const ids = new Set(PROPERTY_TYPES.map((type) => type.id));
  for (const [legacy, canonical] of Object.entries(LEGACY_TYPE_ALIASES)) {
    assert.ok(ids.has(canonical), `${legacy} points at ${canonical}, which is not a type`);
    assert.equal(canonicalPropertyType(legacy), canonical);
    assert.ok(!ids.has(legacy), `${legacy} is both an alias and a canonical id`);
  }
});

test("an unknown code is rejected rather than guessed at", () => {
  for (const junk of ["castle", "", "   ", null, undefined, "APARTMENT ", "spaceship"]) {
    const accepted = junk === "APARTMENT " || junk === "apartment";
    assert.equal(isAcceptedPropertyType(junk), accepted, String(junk));
  }
  // Case and surrounding space are normalised, not rejected.
  assert.equal(canonicalPropertyType("  Villa "), "villa");
});

test("the lists are internally consistent", () => {
  const categoryIds = new Set(PROPERTY_CATEGORIES.map((category) => category.id));
  const seen = new Set();
  for (const type of PROPERTY_TYPES) {
    assert.ok(categoryIds.has(type.categoryId), `${type.id} belongs to unknown category ${type.categoryId}`);
    assert.ok(!seen.has(type.id), `${type.id} is listed twice`);
    seen.add(type.id);
    for (const locale of ["ar", "en", "tr"]) {
      assert.ok(type.label[locale]?.trim(), `${type.id} has no ${locale} label`);
    }
  }
  for (const list of [PROPERTY_CATEGORIES, PROPERTY_DIRECTIONS, FURNISHING_OPTIONS]) {
    for (const option of list) {
      for (const locale of ["ar", "en", "tr"]) {
        assert.ok(option.label[locale]?.trim(), `${option.id} has no ${locale} label`);
      }
    }
  }
  assert.equal(ACCEPTED_PROPERTY_TYPES.length, PROPERTY_TYPES.length + Object.keys(LEGACY_TYPE_ALIASES).length);
  assert.deepEqual(ACCEPTED_PROPERTY_CATEGORIES, PROPERTY_CATEGORIES.map((c) => c.id));
});

test("every category a form offers has types, and the legacy one is not offered", () => {
  for (const category of selectableCategories()) {
    assert.ok(propertyTypesForCategory(category.id).length > 0, `${category.id} offers no types`);
  }
  const offered = selectableCategories().map((category) => category.id);
  assert.ok(!offered.includes("land"), "land became a facet of the other categories");
  // It still validates, because rows are filed under it.
  assert.ok(ACCEPTED_PROPERTY_CATEGORIES.includes("land"));
});

test("labels answer in the asked language, and pass an unknown code through", () => {
  assert.equal(propertyTypeLabel("palace"), "قصر");
  assert.equal(propertyTypeLabel("palace", "en"), "Palace");
  // A legacy code is labelled as what it now is.
  assert.equal(propertyTypeLabel("office", "en"), "Office");
  assert.equal(propertyTypeLabel("spaceship"), "spaceship");
});

test("the payload the office application pulls carries every list", () => {
  const payload = taxonomyPayload();
  assert.equal(payload.version, 1);
  assert.equal(payload.types.length, PROPERTY_TYPES.length);
  assert.equal(payload.categories.length, PROPERTY_CATEGORIES.length);
  assert.equal(payload.directions.length, 8);
  assert.equal(payload.furnishing.length, 3);
  assert.ok(payload.legacyTypeAliases.office);
});
