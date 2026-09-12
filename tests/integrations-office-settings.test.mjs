// Phase A3 — an office's settings, shared between its machines.
//
// A firm with a desk in reception and one in the back office configured each
// separately, and whichever happened to publish decided what the website
// showed. What is asserted here is not that settings round-trip but the three
// rules that make sharing them safe: a stale save is refused rather than
// silently winning, a device cannot grant itself a licence, and a partial save
// does not blank what it did not mention.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import {
  OFFICE_SETTINGS_MAX_SECTION_BYTES,
  OFFICE_SETTINGS_SECTIONS,
  OFFICE_SETTINGS_WRITABLE_SECTIONS,
  brandingProfilePatch,
  getOfficeSettings,
} from "../lib/integration/office-settings.ts";
import { INTEGRATION_TABLES_SQL } from "../lib/integration/schema.ts";
import { GET as settingsGet, PUT as settingsPut } from "../app/api/office/v1/settings/route.ts";

const SPONSOR = "office-a@akarpromax.com";
const URL_SETTINGS = "https://akarpromax.com/api/office/v1/settings";

async function pair(sponsorId = SPONSOR, installationId = "inst-a") {
  const pairing = await startPairing({ sponsorId, officeId: "main" });
  return completePairing({
    code: pairing.code,
    installationId,
    deviceName: "Office PC",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
}

function req(token, { method = "GET", body, headers = {} } = {}) {
  const request = new Request(URL_SETTINGS, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "x-protocol-version": "1",
      "x-app-version": "1.2.0",
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  request.nextUrl = new URL(URL_SETTINGS);
  return request;
}

const get = (token, headers) => settingsGet(req(token, { headers }));
const put = (token, body) => settingsPut(req(token, { method: "PUT", body }));

test.afterEach(() => setIntegrationDbForTesting(null));

// ---- shape ------------------------------------------------------------------

test("the table is created, not altered into existence", () => {
  const sql = INTEGRATION_TABLES_SQL.join("\n");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS office_settings/);
  assert.match(sql, /sponsor_id VARCHAR\(80\) PRIMARY KEY/);
  assert.match(sql, /version INTEGER NOT NULL DEFAULT 0/);
});

test("license is the one section a device may not write", () => {
  assert.ok(OFFICE_SETTINGS_SECTIONS.includes("license"));
  assert.ok(!OFFICE_SETTINGS_WRITABLE_SECTIONS.includes("license"));
  assert.equal(OFFICE_SETTINGS_WRITABLE_SECTIONS.length, OFFICE_SETTINGS_SECTIONS.length - 1);
});

// ---- authentication ---------------------------------------------------------

test("both verbs need a paired device", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  assert.equal((await get(null)).status, 401);
  assert.equal((await put(null, { version: 0, sections: {} })).status, 401);
  assert.equal((await get("apd_nope")).status, 401);
});

// ---- reading ----------------------------------------------------------------

test("an office that has never saved gets defaults at version 0, not a 404", async () => {
  // The desktop's first run has nothing to send yet, and a 404 would have it
  // treat "never configured" as an error.
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const response = await get(device.token);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.version, 0);
  assert.equal(body.updatedAt, null);
  assert.ok(body.sections, "a well-formed body, not an empty one");
  assert.equal(response.headers.get("etag"), '"v0"');
});

test("an unchanged version answers 304", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  const first = await get(device.token);
  const etag = first.headers.get("etag");

  const second = await get(device.token, { "if-none-match": etag });
  assert.equal(second.status, 304);
  assert.equal(await second.text(), "");
});

// ---- writing ----------------------------------------------------------------

test("a save bumps the version and records which device did it", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const response = await put(device.token, {
    version: 0,
    sections: { system: { language: "ar", theme: "light" } },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.version, 1);
  assert.equal(body.updatedByDeviceId, device.deviceId);
  assert.deepEqual(body.sections.system, { language: "ar", theme: "light" });

  const stored = await getOfficeSettings(SPONSOR);
  assert.equal(stored.version, 1);
  assert.deepEqual(stored.sections.system, { language: "ar", theme: "light" });
});

test("a partial save keeps the sections it did not mention", async () => {
  // A desktop saving only its branding must not blank the office's branch list.
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  await put(device.token, { version: 0, sections: { lists: { clientSources: ["واتساب", "إحالة"] } } });
  const second = await put(device.token, { version: 1, sections: { system: { language: "en" } } });
  const body = await second.json();

  assert.deepEqual(body.sections.lists, { clientSources: ["واتساب", "إحالة"] }, "the list survived");
  assert.deepEqual(body.sections.system, { language: "en" });
  assert.equal(body.version, 2);
});

test("a stale version is refused, and the refusal carries the current state", async () => {
  // Two desks in one office. Last-write-wins means the receptionist loses the
  // branch the manager added thirty seconds ago with no sign it happened.
  setIntegrationDbForTesting(createInMemoryDb());
  const deskA = await pair(SPONSOR, "inst-a");
  const deskB = await pair(SPONSOR, "inst-b");

  await put(deskA.token, { version: 0, sections: { lists: { branches: ["نزوى"] } } });

  const stale = await put(deskB.token, { version: 0, sections: { lists: { branches: ["مسقط"] } } });
  assert.equal(stale.status, 409);
  const conflict = await stale.json();
  assert.equal(conflict.error, "VERSION_CONFLICT");
  assert.equal(conflict.current.version, 1);
  assert.deepEqual(conflict.current.sections.lists, { branches: ["نزوى"] }, "so the desk can show both");

  // And desk B succeeds once it works from what it was handed.
  const retry = await put(deskB.token, { version: 1, sections: { lists: { branches: ["نزوى", "مسقط"] } } });
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).version, 2);
});

// ---- what a device may not do ----------------------------------------------

test("a device cannot grant itself a licence", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const response = await put(device.token, {
    version: 0,
    sections: { license: { status: "active", endDate: "2099-01-01" } },
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "READ_ONLY_SECTION");
  assert.equal((await getOfficeSettings(SPONSOR)).version, 0, "nothing was written");
});

test("license is served from the subscription, not from what was stored", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  await put(device.token, { version: 0, sections: { system: { language: "ar" } } });

  const body = await (await get(device.token)).json();
  assert.ok(body.sections.license, "the platform's answer is always present");
  assert.ok("statusMessage" in body.sections.license, "it is the subscription snapshot");
  assert.equal(body.sections.license.statusMessage, "NO_SUBSCRIPTION", "no subscription is an answer, not a gap");
});

test("an unknown section is refused rather than stored", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  const response = await put(device.token, { version: 0, sections: { passwords: { root: "x" } } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_SECTION");
});

test("a section larger than the cap is refused, measured in bytes", async () => {
  // Bytes, not characters: one Arabic office name is two bytes a character, and
  // a character limit would be twice as loose for the offices this serves.
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  const response = await put(device.token, {
    version: 0,
    sections: { lists: { blob: "ع".repeat(OFFICE_SETTINGS_MAX_SECTION_BYTES) } },
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "SECTION_TOO_LARGE");
});

test("a malformed version is refused before anything is written", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  for (const version of ["one", -1, 1.5, null]) {
    const response = await put(device.token, { version, sections: { system: {} } });
    assert.equal(response.status, 400, `version ${version}`);
  }
});

// ---- branding reaches the public profile -----------------------------------

test("branding is projected onto the office's organisation row", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("users", [{ id: "user-1", email: SPONSOR }]);
  db.seed("organizations", [{ id: "org-1", type: "real_estate", created_at: "2026-01-01", name_ar: "قديم" }]);
  db.seed("organization_members", [{ organization_id: "org-1", user_id: "user-1" }]);

  const response = await put(device.token, {
    version: 0,
    sections: {
      branding: {
        nameAr: "مكتب النخبة العقاري",
        contactPhone: "+96890000000",
        printColor: "#0b214c",
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).profileUpdated, true);

  const org = db.dump("organizations")[0];
  assert.equal(org.name_ar, "مكتب النخبة العقاري");
  assert.equal(org.contact_phone, "+96890000000");
  // `printColor` is the desktop's own affair and has no column on the public
  // organisation — it stays in the settings section and goes no further.
  assert.equal(org.print_color, undefined);
});

test("only the profile's own fields travel, and only the ones sent", () => {
  const patch = brandingProfilePatch({
    nameAr: "مكتب",
    descriptionEn: "An office",
    logoUrl: "https://cdn/x.png",
    printColor: "#000",
    countryCode: "OM",
    nameEn: "   ",
  });
  assert.deepEqual(patch, { nameAr: "مكتب", descriptionEn: "An office", logoUrl: "https://cdn/x.png" });
  assert.ok(!("countryCode" in patch), "an office's country is set where its address is, not in a preferences pane");
  assert.ok(!("nameEn" in patch), "whitespace is not a name");
});

test("an office with no organisation yet still saves its settings", async () => {
  // The settings are the office's own record; the public profile is a
  // projection of part of them and must not be able to fail the save.
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const response = await put(device.token, { version: 0, sections: { branding: { nameAr: "مكتب" } } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.profileUpdated, false);
  assert.equal(body.version, 1);
});
