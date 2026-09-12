import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db";
import { getListing, listListings, updateListingStatus } from "../lib/services/core";

type MemDb = { seed(name: string, rows: unknown[]): void };

function newDb(): MemDb {
  const db = createInMemoryDb() as never as MemDb;
  setServicesDbForTesting(db as never);
  return db;
}

beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb() as never);
});

afterEach(() => {
  setServicesDbForTesting(null);
});

test("services listings routes are implemented directly and do not proxy to a removed endpoint", async () => {
  const collection = await readFile(new URL("../app/api/services/listings/route.ts", import.meta.url), "utf8");
  const detail = await readFile(new URL("../app/api/services/listings/[id]/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(collection, /proxyToCanonical/);
  assert.doesNotMatch(collection, /\/api\/service-listings/);
  assert.doesNotMatch(detail, /proxyToCanonical/);
  assert.doesNotMatch(detail, /\/api\/service-listings/);
});

test("services listings filters and pagination work against the canonical data layer", async () => {
  const db = newDb();
  db.seed("service_listings", [
    {
      id: "l1", provider_user_id: "p1", category_id: "cat-1", country_code: "OM", city_id: "om-muscat",
      district_id: null, latitude: null, longitude: null, title_key: "one", description_key: "one-desc",
      price: 10, currency: "OMR", unit: "project", status: "active", is_featured: 0, tags: "[]",
      created_at: "2026-08-08 10:00:00", updated_at: "2026-08-08 10:00:00",
    },
    {
      id: "l2", provider_user_id: "p1", category_id: "cat-1", country_code: "OM", city_id: "om-muscat",
      district_id: null, latitude: null, longitude: null, title_key: "two", description_key: "two-desc",
      price: 20, currency: "OMR", unit: "project", status: "active", is_featured: 0, tags: "[]",
      created_at: "2026-08-08 11:00:00", updated_at: "2026-08-08 11:00:00",
    },
    {
      id: "l3", provider_user_id: "p2", category_id: "cat-2", country_code: "SA", city_id: "riyadh",
      district_id: null, latitude: null, longitude: null, title_key: "three", description_key: "three-desc",
      price: 30, currency: "SAR", unit: "project", status: "paused", is_featured: 0, tags: "[]",
      created_at: "2026-08-08 12:00:00", updated_at: "2026-08-08 12:00:00",
    },
  ]);

  const filtered = await listListings({ countryCode: "OM", cityId: "om-muscat", limit: 10 });
  assert.deepEqual(filtered.map((row) => row.id), ["l2", "l1"]);

  const paged = await listListings({ status: "active", limit: 1, offset: 1 });
  assert.equal(paged.length, 1);
  assert.equal(paged[0].id, "l1");
});

test("services listing detail and status updates persist", async () => {
  const db = newDb();
  db.seed("service_listings", [{
    id: "listing-1", provider_user_id: "provider@example.com", category_id: "cat-1", country_code: "OM", city_id: "om-muscat",
    district_id: null, latitude: null, longitude: null, title_key: "title", description_key: "desc",
    price: 15, currency: "OMR", unit: "project", status: "active", is_featured: 0, tags: "[]",
    created_at: "2026-08-08 10:00:00", updated_at: "2026-08-08 10:00:00",
  }]);

  // Taking a live listing down is a move both its owner and a reviewer can
  // make; the audit row is what records which of them did it.
  await updateListingStatus("listing-1", "paused", { userId: "admin@example.com", ip: "127.0.0.1", isReviewer: true });
  const listing = await getListing("listing-1");
  assert.ok(listing);
  assert.equal(listing?.status, "paused");
});

test("a listing status change needs somebody entitled to make it", async () => {
  // The defect this replaces: the route called through with no notion of who
  // was asking, and `SERVICES_UPDATE` — which every service_provider holds so
  // they can edit their own work — was read as a supervisory permission. Any
  // approved provider could publish, pause or bury anyone else's listing.
  const db = newDb();
  db.seed("service_listings", [{
    id: "listing-2", provider_user_id: "owner@example.com", category_id: "cat-1", country_code: "OM", city_id: "om-muscat",
    district_id: null, latitude: null, longitude: null, title_key: "title", description_key: "desc",
    price: 15, currency: "OMR", unit: "project", status: "active", is_featured: 0, tags: "[]",
    created_at: "2026-08-08 10:00:00", updated_at: "2026-08-08 10:00:00",
  }]);

  await assert.rejects(
    () => updateListingStatus("listing-2", "paused", { userId: "stranger@example.com", ip: null }),
    /LISTING_FORBIDDEN/,
    "a stranger must not move another provider's listing",
  );
  assert.equal((await getListing("listing-2"))?.status, "active");

  await updateListingStatus("listing-2", "paused", { userId: "owner@example.com", ip: null, isOwner: true });
  assert.equal((await getListing("listing-2"))?.status, "paused");
});

test("an owner cannot approve their own listing, and a reviewer must give a reason to refuse", async () => {
  const db = newDb();
  db.seed("service_listings", [{
    id: "listing-3", provider_user_id: "owner@example.com", category_id: "cat-1", country_code: "OM", city_id: "om-muscat",
    district_id: null, latitude: null, longitude: null, title_key: "title", description_key: "desc",
    price: 15, currency: "OMR", unit: "project", status: "pending_approval", is_featured: 0, tags: "[]",
    created_at: "2026-08-08 10:00:00", updated_at: "2026-08-08 10:00:00",
  }]);

  await assert.rejects(
    () => updateListingStatus("listing-3", "approved", { userId: "owner@example.com", ip: null, isOwner: true }),
    /LISTING_REVIEW_FORBIDDEN/,
    "approving is a reviewer's verdict, not the owner's",
  );

  await updateListingStatus("listing-3", "rejected", { userId: "reviewer@example.com", ip: null, isReviewer: true, note: "الترخيص منتهٍ" });
  const refused = await getListing("listing-3");
  assert.equal(refused?.status, "rejected");
  assert.equal(refused?.review_note, "الترخيص منتهٍ", "the reason must travel with the verdict");
  assert.equal(refused?.reviewed_by, "reviewer@example.com");
});

test("a refused listing goes back through review, never straight to the public", async () => {
  const db = newDb();
  db.seed("service_listings", [{
    id: "listing-4", provider_user_id: "owner@example.com", category_id: "cat-1", country_code: "OM", city_id: "om-muscat",
    district_id: null, latitude: null, longitude: null, title_key: "title", description_key: "desc",
    price: 15, currency: "OMR", unit: "project", status: "rejected", is_featured: 0, tags: "[]",
    created_at: "2026-08-08 10:00:00", updated_at: "2026-08-08 10:00:00",
  }]);

  await assert.rejects(
    () => updateListingStatus("listing-4", "active", { userId: "reviewer@example.com", ip: null, isReviewer: true }),
    /LISTING_STATUS_INVALID/,
  );
  await updateListingStatus("listing-4", "pending_approval", { userId: "owner@example.com", ip: null, isOwner: true });
  assert.equal((await getListing("listing-4"))?.status, "pending_approval");
});

test("a new listing is not born public", async () => {
  // It used to be created 'active' — into the marketplace, unread — and the
  // caller could name its status in the request body.
  const core = await readFile(new URL("../lib/services/core.ts", import.meta.url), "utf8");
  assert.match(core, /LISTING_STATUS\.PENDING_APPROVAL,/);
  assert.doesNotMatch(core, /input\.status \?\? "active"/);

  const route = await readFile(new URL("../app/api/services/listings/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /status: clean\(body\.status/, "the caller must not choose the starting state");
});
