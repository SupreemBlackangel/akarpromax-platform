import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AD_PLACEMENTS } from "../src/constants/advertising.ts";
import { AD_PLACEMENT_REGISTRY, PUBLIC_TOP_AD, PUBLIC_BOTTOM_AD } from "../src/config/ad-placements.ts";
import { STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS, STANDARD_PUBLIC_AD_SLOT_DEFINITIONS } from "../src/config/standard-public-ad-registry.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * Ad placements, and the several places they are written down.
 *
 * These are not four competing registries, as they first look. They are layers:
 *
 *   src/constants/advertising.ts     AD_PLACEMENTS -- the vocabulary the engine
 *                                    validates against. The only source of truth
 *                                    for "is this a real placement".
 *   standard-public-ad-registry.ts   families x slots, which GENERATE part of
 *                                    that vocabulary
 *   standard-public-ad-layout.ts     which slots appear on which page
 *   src/config/ad-placements.ts      shell slot configs, each naming a
 *                                    placement from the vocabulary
 *
 * The layering is defensible. What was missing is anything checking that the
 * layers agree, which is how AD_PLACEMENT_REGISTRY.HOME_HERO came to name the
 * empty string, and how the legacy components came to pass identifiers that
 * only resolve through an undocumented shim.
 */

// ---- the shell registry names real placements -------------------------------

test("every shell slot names a placement the engine will accept", async () => {
  // A slot whose placement is not in the vocabulary renders, calls the API, is
  // refused with 400, and shows nothing -- with no error anywhere saying why.
  for (const [key, config] of Object.entries(AD_PLACEMENT_REGISTRY)) {
    assert.ok(config.placement, `${key} has an empty placement`);
    assert.ok(
      Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, config.placement),
      `${key} names "${config.placement}", which is not in AD_PLACEMENTS`,
    );
  }
});

test("the two slots the shell actually renders are valid", async () => {
  for (const config of [PUBLIC_TOP_AD, PUBLIC_BOTTOM_AD]) {
    assert.ok(config.used, `${config.key} is rendered by the shell and must stay used`);
    assert.ok(Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, config.placement));
  }
});

test("HOME_HERO no longer names the empty string", async () => {
  // It did. Flipping `used` to true would have produced a dead slot.
  assert.equal(AD_PLACEMENT_REGISTRY.HOME_HERO.placement, "web_home_hero");
  assert.ok(Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, "web_home_hero"));
});

// ---- the legacy components resolve through the shim -------------------------

/**
 * Rebuild what canonicalLegacyPlacement does, from the same definitions it
 * uses. If the shim changes shape this stops matching and the test is wrong in
 * an obvious way, rather than passing while the site shows nothing.
 */
function resolveLegacy(page, placement) {
  const suffixes = new Map(
    Object.values(STANDARD_PUBLIC_AD_SLOT_DEFINITIONS).map((slot) => [
      slot.placementSuffix.replace(/^side_/, ""),
      slot.placementSuffix,
    ]),
  );
  const suffix = suffixes.get(placement.toLowerCase());
  const family = STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS[page];
  return suffix && family ? `${family.prefix}_${suffix}` : placement;
}

test("every legacy placement literal in the tree resolves to a real placement", async () => {
  // The literals are lowercase and are NOT keys of AD_PLACEMENTS on their own:
  //
  //   left_01   right_01   bottom_01   -- none are valid placements
  //
  // They only work because /api/advertising/match translates them using the
  // page name. That mapping was implicit and unchecked, so a new page whose
  // name is not a known family would render an ad slot that can never fill,
  // silently. This is what makes that visible.
  const pages = [];

  async function sweep(dir) {
    let entries;
    try {
      entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await sweep(rel);
      else if (entry.name.endsWith(".tsx")) pages.push(rel);
    }
  }
  await sweep("app");

  const uses = [];
  for (const file of pages) {
    const source = await read(file);
    if (!/<Ad(Sidebar|Bottom|Hero)\b/.test(source)) continue;

    for (const match of source.matchAll(/<Ad(?:Sidebar|Bottom|Hero)[^>]*?page="([^"]+)"[^>]*?placement="([^"]+)"/g)) {
      uses.push({ file, page: match[1], placement: match[2] });
    }
  }

  assert.ok(uses.length > 0, "the sweep must find the legacy ad slots");

  const unresolved = uses.filter(
    (use) => !Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, resolveLegacy(use.page, use.placement)),
  );

  assert.deepEqual(
    unresolved.map((u) => `${u.file}: page="${u.page}" placement="${u.placement}" -> ${resolveLegacy(u.page, u.placement)}`),
    [],
    "these ad slots can never fill: their page/placement pair resolves to no known placement",
  );
});

test("the shim is still the thing doing that translation", async () => {
  // If canonicalLegacyPlacement is removed or renamed, the test above starts
  // asserting against a mapping nothing performs.
  const route = await read("app/api/advertising/match/route.ts");
  assert.match(route, /function canonicalLegacyPlacement\(/);
  assert.match(route, /STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS/);
});

// ---- the generated vocabulary is internally consistent ----------------------

test("every family and slot pair is a registered placement", async () => {
  // AD_PLACEMENTS is built from this cross-product. If a family or slot is
  // added and the generation is not rerun, the layout offers slots the engine
  // rejects.
  const missing = [];
  for (const family of Object.values(STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS)) {
    for (const slot of Object.values(STANDARD_PUBLIC_AD_SLOT_DEFINITIONS)) {
      const placement = `${family.prefix}_${slot.placementSuffix}`;
      if (!Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, placement)) missing.push(placement);
    }
  }
  assert.deepEqual(missing, []);
});

test("the vocabulary is not empty and has no empty keys", async () => {
  const keys = Object.keys(AD_PLACEMENTS);
  assert.ok(keys.length > 50, `expected a full vocabulary, found ${keys.length}`);
  assert.ok(!keys.includes(""), "the empty string must never be a valid placement");
});
