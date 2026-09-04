import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * Ads in the desktop office app.
 *
 * Five `office_*` placements have been selectable and targetable in the admin
 * since the ad engine was built, and no installed office has ever received
 * one. Three separate reasons, all measured:
 *
 *   1. The C# DesktopAdService asks for
 *      /api/desktop/ads/placement/desktop_portal_bottom_banner. That route
 *      family does not exist -- 404 against production -- and neither does
 *      that placement, anywhere in the registry.
 *   2. It types its ad id as an int. Campaign ids are UUIDs. It was written
 *      against an API that predates this platform, so there is no route that
 *      could be added to satisfy it without inventing a second id space.
 *   3. The shipped SPA renders no ads at all.
 *
 * The banner lives in bootstrap.js because the desktop app fetches that file
 * from the platform on every launch. It reaches every installed office with
 * the next deploy -- no reinstall, no new Setup.exe, which matters because
 * building one is a manual step.
 */

/**
 * Comment lines are stripped before matching. Four sweeps in this repository
 * have now failed by reading their own explanation as the offence they were
 * looking for -- this file documents the dead /api/desktop/ route in order to
 * explain why it must never be called.
 */
const stripComments = (source) =>
  source
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");

const bootstrap = stripComments(await read("public/office-app/bootstrap.js"));
const config = await read("next.config.js");

// ---- it exists, and it is wired ---------------------------------------------

test("the office banner is started once the office is signed in", () => {
  assert.match(bootstrap, /function startOfficeAds\(\)/);
  assert.match(bootstrap, /startOfficeAds\(\);/, "declaring it is not enough; it must be called");

  // Not before login: an ad served to a machine with no office identity has no
  // geography, so it could only ever match an untargeted campaign.
  const boot = bootstrap.slice(bootstrap.indexOf("function boot()"));
  const signedIn = boot.slice(boot.indexOf("if (isLoggedIn())"), boot.indexOf("} else {"));
  assert.match(signedIn, /startOfficeAds\(\)/, "it belongs inside the signed-in branch");
});

test("it uses a placement the registry actually has", async () => {
  const registry = await read("src/constants/advertising.ts");
  const used = /var AD_PLACEMENT = "([a-z_0-9]+)"/.exec(bootstrap);
  assert.ok(used, "the placement must be a named constant, not scattered");

  assert.ok(
    registry.includes(`${used[1]}:`),
    `${used[1]} is not in the placement registry -- which is exactly how ` +
      `desktop_portal_bottom_banner came to be requested for years`,
  );
  assert.match(registry, new RegExp(`${used[1]}[\\s\\S]{0,400}?channel: "office"`));
});

// ---- billing is not a second, weaker path -----------------------------------

test("impressions and clicks go through the signed token, like the website", () => {
  // /api/ad-events once accepted unauthenticated writes into the counters that
  // decide budget exhaustion. Anyone on the internet could drain any campaign.
  // A desktop client that reported by campaign id alone would reopen that.
  assert.match(bootstrap, /body\.token = ad\.trackingToken/);
  assert.match(bootstrap, /body\.campaignId = ad\.campaignId/);
  assert.match(bootstrap, /"\/api\/ads\/" \+ kind/);

  assert.ok(!bootstrap.includes("/api/ad-events"), "the deprecated endpoint must not come back");
  assert.ok(!bootstrap.includes("/api/desktop/"), "nor the route family that never existed");
});

test("one impression per minted token", () => {
  assert.match(bootstrap, /if \(_adState\.reported\[ad\.trackingToken\]\) return;/);
});

test("advertiser copy is written as text, never as markup", () => {
  // Title and description are attacker-controllable in the sense that matters:
  // an advertiser types them. They land in a WebView that has a C# bridge.
  assert.match(bootstrap, /\.textContent = ad\.title/);
  assert.match(bootstrap, /\.textContent = ad\.description/);
});

// ---- targeting comes from the office's own profile --------------------------

test("geography is the office's declared location, not an IP lookup", () => {
  // The website resolves a visitor's city through ipinfo.io from the browser,
  // which ad blockers and a free-tier quota both break. The office already
  // told us where it is, in registry codes, when it filled in its profile.
  assert.match(bootstrap, /countryCode: profile\.country/);
  assert.match(bootstrap, /regionId: profile\.governorate/);
  assert.match(bootstrap, /cityId: profile\.city/);
  assert.ok(!/ipinfo/.test(bootstrap), "no third party on the serving path here");
});

test("the context declares the office channel", () => {
  const context = bootstrap.slice(bootstrap.indexOf("function adContext("));
  assert.match(context, /channel: "office"/);
});

// ---- the fetches can actually leave the WebView -----------------------------

test("the ad routes are reachable cross-origin from the app's virtual host", () => {
  // bootstrap.js runs on https://akarapp.local. /api/geo already carries these
  // headers for the same reason; the ad routes carried none, so every one of
  // these fetches would have been blocked by the browser.
  const rule = config.slice(config.indexOf('source: "/api/ads/'));
  assert.match(rule, /match\|impression\|click/);
  assert.match(rule, /"Access-Control-Allow-Origin", value: "\*"/);
  assert.match(rule, /"Access-Control-Allow-Methods", value: "POST, OPTIONS"/);
  assert.match(rule, /"Access-Control-Allow-Headers", value: "Content-Type"/);
});

test("the wildcard origin is justified in place", () => {
  const rule = config.slice(config.indexOf("Ad serving and its tracking"), config.indexOf('source: "/api/ads/'));
  assert.match(rule, /cookie|session/, "say why a wildcard is safe on these three routes");
});

// ---- the banner cannot trap the user ----------------------------------------

test("the close control is big enough to press and only hides for the session", () => {
  // A 3-pixel close button on a bar pinned across the bottom of the window is
  // how an ad becomes something the user cannot get rid of. 32px, the same
  // minimum the website's ticker controls were raised to.
  assert.match(bootstrap, /\.akar-ad-x\{[^}]*min-inline-size:32px/);
  assert.match(bootstrap, /\.akar-ad-x\{[^}]*min-block-size:32px/);

  // sessionStorage, not localStorage: a permanent dismissal would quietly end
  // the office channel for that installation forever.
  assert.match(bootstrap, /sessionStorage\.setItem\(AD_DISMISS_KEY/);
  assert.ok(
    !/localStorage[^\n]*AD_DISMISS_KEY/.test(bootstrap),
    "dismissal must not outlive the session",
  );
});

test("no ad means no bar, rather than an empty one", () => {
  assert.match(bootstrap, /if \(!ads\.length\)/);
  assert.match(bootstrap, /if \(host\) host\.remove\(\);/);
});

// ---- the mandatory update gate must not become a permanent lockout ----------

/**
 * The gate is a modal with no escape, and it is shown whenever the manifest's
 * version is above `window.__AKAR_APP_VERSION__`.
 *
 * Those two numbers come from different artefacts. The manifest is
 * public/office-app/version.json; the installed version is declared by the
 * webui's index.html, which the installer packages. Measured today:
 *
 *   version.json                            2.0.6, mandatory
 *   published installer ProductVersion      2.0.6
 *   AkarApp_INSTALLER/app/webui/index.html  2.0.1
 *   AkarApp_PUBLISH_2.0.7/webui/index.html  2.0.1
 *
 * If an installer is ever built from one of those staging folders, the office
 * installs it, relaunches, still reports 2.0.1, and is gated again -- the same
 * modal, every launch, forever, with nothing suggesting the fault is not
 * theirs.
 *
 * Whether the published 2.0.6 installer has that problem could not be
 * determined: its payload is compressed and no extractor is available here,
 * and office_devices holds zero rows so no installation has reported its
 * version. This does not fix that. It makes the failure legible.
 */

test("the gate remembers an update this installation already downloaded", () => {
  assert.match(bootstrap, /var UPDATE_ATTEMPT_KEY = "akar_update_attempted"/);
  assert.match(bootstrap, /writeUpdateAttempt\(info\.version\)/, "recorded when the download starts");
  assert.match(bootstrap, /readUpdateAttempt\(\)/, "read when the gate is built");

  // localStorage, not sessionStorage: the loop is only visible across launches.
  const write = bootstrap.slice(bootstrap.indexOf("function writeUpdateAttempt"));
  assert.match(write.slice(0, 300), /ls\("set", UPDATE_ATTEMPT_KEY/);
});

test("a repeat of the same version says so instead of implying the user did nothing", () => {
  // Bounded to showUpdateGate itself. Slicing to the end of the file swept in
  // showUpdateBar, which is the OPTIONAL update and is meant to be dismissible.
  const start = bootstrap.indexOf("function showUpdateGate");
  const gate = bootstrap.slice(start, bootstrap.indexOf("function readUpdateAttempt", start));
  assert.match(gate, /attempted\.version === info\.version/);
  assert.match(gate, /akar-update-stuck/);

  // It must still be a gate. A mandatory update that can be clicked past is
  // not a mandatory update, and that is not the problem being solved.
  assert.match(gate, /akar-update-now/, "the download button stays");
  assert.ok(!/akar-update-skip|dismissGate|closeGate/.test(gate), "no escape hatch is added");
});

test("a successful update clears the record", () => {
  // Otherwise the next unrelated update would be branded as stuck the first
  // time it is ever offered.
  const check = bootstrap.slice(bootstrap.indexOf("function checkForUpdate"));
  assert.match(check.slice(0, 900), /ls\("del", UPDATE_ATTEMPT_KEY\)/);
});
