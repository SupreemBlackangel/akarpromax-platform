// The review queue must show the applications that are waiting in it.
//
// It did not. `submitProviderApplication` writes `submitted`, and nothing moves
// a profile to `under_review` on its own — that only happens when a reviewer
// acts. Every supervisor screen asked for `under_review` alone, so a new
// application was invisible from the moment it arrived.
//
// Worse than empty: those screens called /api/service-providers WITHOUT
// `admin=1`, and the route answers the public directory in that case — it
// ignores the requested status and returns `approved`. So the queue headed
// "awaiting review" was listing approved providers.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { listProviderProfiles } from "../lib/services/marketplace.ts";
import { PROVIDER_STATUS_VALUES } from "../lib/services/constants.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/** One profile per status, so a filter that over-reaches is visible. */
async function seedOnePerStatus(db) {
  for (const status of Object.values(PROVIDER_STATUS_VALUES)) {
    await db
      .prepare(
        `INSERT INTO service_provider_profiles
           (id, user_id, status, display_name_ar, business_name, country_code, is_featured, featured_rank, rating_avg, rating_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, 0, 0, ?7, ?7)`,
      )
      .bind(`p-${status}`, `${status}@example.com`, status, status, status, "SA", "2026-09-12 00:00:00")
      .run();
  }
}

const idsOf = (rows) => rows.map((row) => String(row.id)).sort();

test.beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
});

test("the queue asks for both waiting statuses and gets exactly those", async () => {
  const db = await setServicesDbForTesting(createInMemoryDb());
  await seedOnePerStatus(db);

  const rows = await listProviderProfiles({ status: "submitted,under_review" });
  assert.deepEqual(idsOf(rows), ["p-submitted", "p-under_review"]);
});

test("a freshly submitted application is in the queue — the case that was invisible", async () => {
  const db = await setServicesDbForTesting(createInMemoryDb());
  await seedOnePerStatus(db);

  const underReviewOnly = await listProviderProfiles({ status: "under_review" });
  assert.deepEqual(idsOf(underReviewOnly), ["p-under_review"], "the old single-status query is what hid it");

  const queue = await listProviderProfiles({ status: "submitted,under_review" });
  assert.ok(idsOf(queue).includes("p-submitted"), "the submitted application must now be visible");
});

test("a single status still means that status alone", async () => {
  const db = await setServicesDbForTesting(createInMemoryDb());
  await seedOnePerStatus(db);

  assert.deepEqual(idsOf(await listProviderProfiles({ status: "approved" })), ["p-approved"]);
  assert.deepEqual(idsOf(await listProviderProfiles({ status: "suspended" })), ["p-suspended"]);
});

test("no status means no status filter, not an empty result", async () => {
  const db = await setServicesDbForTesting(createInMemoryDb());
  await seedOnePerStatus(db);

  const rows = await listProviderProfiles({});
  assert.equal(rows.length, Object.values(PROVIDER_STATUS_VALUES).length);
});

test("stray commas and spaces do not become a status nobody has", async () => {
  const db = await setServicesDbForTesting(createInMemoryDb());
  await seedOnePerStatus(db);

  const rows = await listProviderProfiles({ status: " submitted , , under_review ," });
  assert.deepEqual(idsOf(rows), ["p-submitted", "p-under_review"]);
});

test("the public directory is approved providers whatever the query string asks for", async () => {
  // The privacy gate this bug was hiding behind: it is the reason the screens
  // appeared to work at all, and it must not move while the admin path is fixed.
  const route = await read("app/api/service-providers/route.ts");
  assert.match(route, /let status: string \| undefined = "approved";/);
  assert.match(route, /if \(admin\) \{/);
  assert.match(route, /hasSponsorPermission\(identity, PERMISSIONS\.SERVICE_PROVIDERS_REVIEW\)/);
});

test("an admin may only ask for statuses that exist", async () => {
  const route = await read("app/api/service-providers/route.ts");
  assert.match(route, /PROVIDER_STATUS_LIST/);
  assert.match(route, /unknownStatuses: unknown/);
});

test("every review screen asks the admin path, or it is served the public directory", async () => {
  for (const file of [
    "app/dashboard/services/supervisor/providers/page.tsx",
    "app/dashboard/services/supervisor/page.tsx",
  ]) {
    const source = await read(file);
    const calls = source.match(/\/api\/service-providers\?[^`"']*/g) ?? [];
    assert.ok(calls.length, `${file} must still fetch providers`);
    for (const call of calls) {
      assert.ok(call.includes("admin=1"), `${file} asks without admin=1: ${call}`);
    }
  }
});

test("the verification link opens the queue, not one half of it", async () => {
  const source = await read("app/dashboard/services/supervisor/verification/page.tsx");
  assert.match(source, /status=submitted,under_review/);
});
