import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_DISPLAY_SETTINGS, MOBILE_BREAKPOINT_PX } from "../src/config/display-settings.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * The admin-controlled presentation, and the four places it is written down.
 *
 * There is no single file to read here, because the decision deliberately
 * travels as data rather than as props:
 *
 *   src/config/display-settings.ts   the shape and the shipped defaults
 *   app/layout.tsx                   a pre-paint script that picks the set for
 *                                    this viewport and stamps it on <html>
 *   app/globals.css                  the rules that read those attributes
 *   app/admin/settings-admin-client  the surface that edits them
 *
 * That is defensible — it is what keeps 40-odd pages from having to be told
 * which device they are on — but it means a switch can exist in three of the
 * four layers and quietly do nothing in the fourth. These tests check the
 * layers agree, and pin the mobile ad regression that started all of it.
 */

// ---- the phone does not get the side rails ----------------------------------

test("the shipped mobile default hides the side ad rails", () => {
  assert.equal(
    DEFAULT_DISPLAY_SETTINGS.mobile.ads.side,
    false,
    "a phone has no rail to put them in; stacking them under the content is what put seven ad frames at the end of the page",
  );
  // The bands that DO belong on a phone stay on, or the default is a blackout
  // rather than a fix.
  assert.equal(DEFAULT_DISPLAY_SETTINGS.mobile.ads.hero, true);
  assert.equal(DEFAULT_DISPLAY_SETTINGS.mobile.ads.bottom, true);
  assert.equal(DEFAULT_DISPLAY_SETTINGS.desktop.ads.side, true, "the rails are the desktop layout's whole point");
});

test("the standard ad layout never repeats the side slots below the content", async () => {
  const source = await read("src/components/ads/standard-public-ad-layout.tsx");
  assert.ok(
    !source.includes("standard-public-ad-inline"),
    "the xl:hidden band that re-rendered sideLeft01/02 + sideRight01/02 under the content is what produced 4 + 3 = 7 frames on a phone",
  );
  // Each side slot is rendered in exactly one place: the rail.
  for (const slot of ["sideLeft01", "sideLeft02", "sideRight01", "sideRight02"]) {
    const rendered = source.split(`config={${slot}}`).length - 1;
    assert.equal(rendered, 1, `${slot} is rendered ${rendered} times; the rail is the only place it belongs`);
  }
});

test("the legacy AdSidebar pages hide their rails below the desktop breakpoint", async () => {
  const pages = [
    "app/offices/[id]/page.tsx",
    "app/companies/[id]/page.tsx",
    "app/tools/[id]/page.tsx",
    "app/tools/pdf2word/page.tsx",
  ];
  for (const page of pages) {
    const source = await read(page);
    const wrappers = source.match(/className="[^"]*lg:col-span-2[^"]*"/g) ?? [];
    assert.ok(wrappers.length > 0, `${page}: expected the two-column rail wrappers`);
    for (const wrapper of wrappers) {
      assert.ok(
        wrapper.includes("hidden lg:block"),
        `${page}: the grid collapses to one column on a phone, so an un-hidden rail wrapper drops its ad above or below the content — ${wrapper}`,
      );
    }
  }
});

// ---- the layers agree -------------------------------------------------------

/**
 * Every attribute the boot script stamps, paired with the CSS token that has to
 * exist for it to mean anything. `null` marks the two that are read from
 * JavaScript (the device label, and the theme the pre-existing boot already
 * owned) rather than by a stylesheet.
 */
const STAMPED_ATTRIBUTES = [
  ["displayDevice", null],
  ["adsHero", "data-ads-hero"],
  ["adsSide", "data-ads-side"],
  ["adsBottom", "data-ads-bottom"],
  ["uiDensity", "data-ui-density"],
  ["listingLayout", "data-listing-layout"],
  ["listingColumns", "data-listing-columns"],
  ["showSidebar", "data-show-sidebar"],
  ["showNewsTicker", "data-show-news-ticker"],
  ["showOfficePromo", "data-show-office-promo"],
  ["allowThemeChange", "data-allow-theme-change"],
  ["theme", null],
  ["themeMode", null],
];

test("every switch the boot script writes is a switch the stylesheet reads", async () => {
  const layout = await read("app/layout.tsx");
  const css = await read("app/globals.css");

  for (const [dataset, attribute] of STAMPED_ATTRIBUTES) {
    assert.ok(layout.includes(`d.${dataset}=`), `app/layout.tsx no longer stamps ${dataset}`);
    if (attribute) {
      assert.ok(
        css.includes(attribute),
        `${attribute} is stamped on <html> but no rule in globals.css reads it — the admin toggle would save and do nothing`,
      );
    }
  }
});

/** Settings field -> the dataset key the boot script stamps it as. */
const FIELD_TO_DATASET = {
  ads: null, // stamped per band, as adsHero / adsSide / adsBottom
  themeMode: "themeMode",
  allowThemeChange: "allowThemeChange",
  listingLayout: "listingLayout",
  listingColumns: "listingColumns",
  density: "uiDensity",
  showSidebar: "showSidebar",
  showNewsTicker: "showNewsTicker",
  showOfficePromo: "showOfficePromo",
};

test("every display field the admin can edit is stamped", async () => {
  const layout = await read("app/layout.tsx");
  const stamped = new Set(STAMPED_ATTRIBUTES.map(([dataset]) => dataset));
  for (const field of Object.keys(DEFAULT_DISPLAY_SETTINGS.mobile)) {
    assert.ok(field in FIELD_TO_DATASET, `${field} was added to the settings shape without saying how it reaches the page`);
    const dataset = FIELD_TO_DATASET[field];
    if (dataset === null) continue;
    assert.ok(
      stamped.has(dataset),
      `${field} is part of the settings shape but nothing carries it to the page`,
    );
  }
  // The script must interpolate the shared constant, not a copy of the number:
  // globals.css and the provider both key off the same documented breakpoint.
  assert.ok(
    layout.includes("BP=${MOBILE_BREAKPOINT_PX}"),
    "the boot script must switch sets at MOBILE_BREAKPOINT_PX rather than a hardcoded width",
  );
  assert.equal(MOBILE_BREAKPOINT_PX, 1024, "the breakpoint is documented in globals.css and the admin copy; moving it is a deliberate change");
});

test("the CSS hooks the rules target still exist in the components", async () => {
  const targets = [
    ["standard-public-ad-band-hero", "src/components/ads/standard-public-ad-layout.tsx"],
    ["standard-public-ad-band-main", "src/components/ads/standard-public-ad-layout.tsx"],
    ["standard-public-ad-band-bottom", "src/components/ads/standard-public-ad-layout.tsx"],
    ["public-news-ticker-slot", "src/components/public/public-shell-layout.tsx"],
    ["public-office-promo-slot", "src/components/public/public-shell-layout.tsx"],
    ["theme-switcher", "src/components/public/ThemeSwitcher.tsx"],
  ];
  const css = await read("app/globals.css");
  for (const [hook, component] of targets) {
    assert.ok(css.includes(`.${hook}`), `globals.css no longer targets .${hook}`);
    assert.ok((await read(component)).includes(hook), `${component} no longer renders .${hook}`);
  }
});

// ---- the server half stays on the server ------------------------------------

test("client components read the display config, never the settings store", async () => {
  // lib/platform-settings.ts reaches the runtime database driver. A "use client"
  // file importing it — even for a value as small as the breakpoint — pulls
  // postgres into the browser bundle and the dev server fails to resolve `fs`.
  const clients = [
    "src/components/public/display-settings.tsx",
    "src/components/public/ThemeSwitcher.tsx",
    "src/components/public/mobile-navigation.tsx",
  ];
  for (const file of clients) {
    const source = await read(file);
    assert.ok(source.includes('"use client"'), `${file} is expected to be a client component`);
    const runtimeImport = /^import\s+(?!type\b)[^;]*from\s+"@\/lib\/platform-settings"/m;
    assert.ok(
      !runtimeImport.test(source),
      `${file} imports values from @/lib/platform-settings; import them from @/src/config/display-settings instead`,
    );
  }
});

// ---- the phone can still choose its own appearance --------------------------

test("the mobile menu carries the appearance control the header cannot show", async () => {
  const source = await read("src/components/public/mobile-navigation.tsx");
  assert.ok(source.includes("selectThemeMode"), "the mobile menu must be able to set the theme");
  assert.ok(source.includes("useThemeMode"), "and must reflect the one in force");
  assert.ok(
    source.includes("display.allowThemeChange"),
    "and must disappear when the admin has pinned the appearance for phones",
  );
});
