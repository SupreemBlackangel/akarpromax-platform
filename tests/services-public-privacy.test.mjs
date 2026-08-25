import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { GET as getProvider } from "../app/api/service-providers/[id]/route.ts";
import { GET as listListings } from "../app/api/services/listings/route.ts";
import { GET as getListing } from "../app/api/services/listings/[id]/route.ts";
import { GET as listReviews } from "../app/api/service-reviews/route.ts";

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "email",
  "phone",
  "whatsapp",
  "user_id",
  "provider_user_id",
  "reviewer_user_id",
  "reviewee_user_id",
  "customer_user_id",
  "customer_email",
  "customer_phone",
  "customer_name",
  "tax_number",
  "latitude",
  "longitude",
]);

function forbiddenKeys(value, path = "$", found = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => forbiddenKeys(entry, `${path}[${index}]`, found));
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_KEYS.has(key)) found.push(`${path}.${key}`);
    forbiddenKeys(entry, `${path}.${key}`, found);
  }
  return found;
}

function assertPublic(payload) {
  assert.deepEqual(forbiddenKeys(payload), [], `private fields escaped into public JSON: ${JSON.stringify(payload)}`);
}

const params = (id) => ({ params: Promise.resolve({ id }) });

test.beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
});

test("public provider detail is allowlisted and only approved providers are visible", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [
    {
      id: "provider-approved",
      user_id: "provider-private@example.com",
      status: "approved",
      display_name_ar: "مزود معتمد",
      business_name: "شركة عامة",
      email: "private@example.com",
      phone: "+96800000000",
      whatsapp: "+96811111111",
      tax_number: "TAX-SECRET",
      latitude: 23.588,
      longitude: 58.382,
      rating_avg: 4.8,
      rating_count: 9,
      future_secret: "must-never-be-public",
    },
    {
      id: "provider-pending",
      user_id: "pending@example.com",
      status: "under_review",
      display_name_ar: "قيد المراجعة",
    },
  ]);

  const approvedResponse = await getProvider(
    new NextRequest("http://localhost/api/service-providers/provider-approved"),
    params("provider-approved"),
  );
  const approvedPayload = await approvedResponse.json();
  assert.equal(approvedResponse.status, 200);
  assert.equal(approvedPayload.profile.id, "provider-approved");
  assert.equal(approvedPayload.profile.future_secret, undefined);
  assertPublic(approvedPayload);

  const pendingResponse = await getProvider(
    new NextRequest("http://localhost/api/service-providers/provider-pending"),
    params("provider-pending"),
  );
  assert.equal(pendingResponse.status, 404);
});

test("public listings collection exposes active allowlisted DTOs without identity or precise coordinates", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_listings", [
    {
      id: "listing-active",
      provider_user_id: "provider-private@example.com",
      category_id: "cat-1",
      country_code: "OM",
      city_id: "muscat",
      district_id: "bawshar",
      latitude: 23.588,
      longitude: 58.382,
      title_ar: "خدمة عامة",
      price: 25,
      currency: "OMR",
      unit: "project",
      status: "active",
      is_featured: 0,
      future_secret: "must-never-be-public",
      created_at: "2026-08-22 10:00:00",
      updated_at: "2026-08-22 10:00:00",
    },
    {
      id: "listing-draft",
      provider_user_id: "provider-private@example.com",
      category_id: "cat-1",
      country_code: "OM",
      city_id: "muscat",
      latitude: 23.5,
      longitude: 58.3,
      title_ar: "مسودة خاصة",
      price: 10,
      currency: "OMR",
      unit: "project",
      status: "draft",
      is_featured: 0,
      created_at: "2026-08-22 09:00:00",
      updated_at: "2026-08-22 09:00:00",
    },
  ]);

  const response = await listListings(
    new NextRequest("http://localhost/api/services/listings?status=draft&country=OM"),
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.listings.map((listing) => listing.id), ["listing-active"]);
  assert.equal(payload.listings[0].future_secret, undefined);
  assertPublic(payload);
});

test("public listing detail redacts private fields and hides non-active rows", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  const base = {
    provider_user_id: "provider-private@example.com",
    category_id: "cat-1",
    country_code: "OM",
    city_id: "muscat",
    latitude: 23.588,
    longitude: 58.382,
    price: 25,
    currency: "OMR",
    unit: "project",
    is_featured: 0,
  };
  db.seed("service_listings", [
    { ...base, id: "listing-active", status: "active", future_secret: "hidden" },
    { ...base, id: "listing-paused", status: "paused" },
  ]);

  const activeResponse = await getListing(
    new NextRequest("http://localhost/api/services/listings/listing-active"),
    params("listing-active"),
  );
  const activePayload = await activeResponse.json();
  assert.equal(activeResponse.status, 200);
  assert.equal(activePayload.listing.future_secret, undefined);
  assertPublic(activePayload);

  const pausedResponse = await getListing(
    new NextRequest("http://localhost/api/services/listings/listing-paused"),
    params("listing-paused"),
  );
  assert.equal(pausedResponse.status, 404);
});

test("public reviews omit reviewer, reviewee, order and moderation identities", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_reviews", [
    {
      id: "review-1",
      order_id: "order-private",
      reviewer_user_id: "customer-private@example.com",
      reviewee_user_id: "provider-private@example.com",
      rating: 5,
      comment: "عمل ممتاز",
      quality_rating: 5,
      punctuality_rating: 4,
      communication_rating: 5,
      value_rating: 5,
      recommend: 1,
      is_hidden: 0,
      hidden_reason: null,
      future_secret: "must-never-be-public",
      created_at: "2026-08-22 10:00:00",
    },
  ]);

  const response = await listReviews(
    new NextRequest("http://localhost/api/service-reviews?revieweeUserId=provider-private%40example.com"),
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.reviews.length, 1);
  assert.equal(payload.reviews[0].order_id, undefined);
  assert.equal(payload.reviews[0].hidden_reason, undefined);
  assert.equal(payload.reviews[0].future_secret, undefined);
  assertPublic(payload);
});
