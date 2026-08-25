import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import {
  createDirectBooking,
  DIRECT_BOOKING_STATUS,
  getDirectBooking,
  reviewDirectBooking,
  transitionDirectBooking,
} from "../lib/services/booking.ts";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { GUEST_IDENTITY, setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { POST as createBookingRoute } from "../app/api/service-bookings/route.ts";
import { GET as bookingDetailRoute } from "../app/api/service-bookings/[id]/route.ts";
import { createInMemoryDb } from "./helpers/in-memory-db.mjs";

const CUSTOMER_A = "customer-a@example.test";
const CUSTOMER_B = "customer-b@example.test";
const PROVIDER_A = "provider-a@example.test";
const PROVIDER_B = "provider-b@example.test";
const CATEGORY = "cat-instant";
const PROVIDER_PROFILE_A = "provider-profile-a";

function seed() {
  const db = createInMemoryDb();
  db.seed("service_categories", [{
    id: CATEGORY, code: "ac-repair", name_ar: "صيانة تكييف", name_en: "AC repair",
    booking_mode: "both", is_active: 1,
  }]);
  db.seed("service_provider_profiles", [
    { id: PROVIDER_PROFILE_A, user_id: PROVIDER_A, status: "approved", is_accepting_requests: 1, jobs_completed: 0, rating_avg: 0, rating_count: 0 },
    { id: "provider-profile-b", user_id: PROVIDER_B, status: "approved", is_accepting_requests: 1, jobs_completed: 0, rating_avg: 0, rating_count: 0 },
  ]);
  db.seed("service_provider_categories", [{
    id: "provider-category-a", provider_id: PROVIDER_PROFILE_A, category_id: CATEGORY,
    instant_price: 45, currency: "OMR", pricing_unit: "visit", is_active: 1,
  }]);
  setServicesDbForTesting(db);
  return db;
}

function input(overrides = {}) {
  return {
    providerId: PROVIDER_PROFILE_A,
    categoryId: CATEGORY,
    countryCode: "OM",
    cityId: "Muscat",
    districtId: "Bawshar",
    latitude: 23.588001,
    longitude: 58.382901,
    shortAddress: "Building 12, private access note",
    scheduledAt: "2099-09-18T10:30:00.000Z",
    contactPreference: "whatsapp",
    contactPhone: "+96890000001",
    contactEmail: "customer.private@example.test",
    ...overrides,
  };
}

test.afterEach(() => {
  setServicesDbForTesting(null);
  setSessionIdentityResolverForTests(null);
});

test("direct booking creates no RFQ or offer and snapshots the configured price", async () => {
  const db = seed();
  const id = await createDirectBooking(input(), CUSTOMER_A, { userId: CUSTOMER_A });
  assert.equal(db.dump("service_requests").length, 0);
  assert.equal(db.dump("service_offers").length, 0);
  const order = db.dump("service_orders").find((row) => row.id === id);
  assert.ok(order);
  assert.equal(order.source_type, "direct_booking");
  assert.equal(order.request_id, null);
  assert.equal(order.offer_id, null);
  assert.equal(order.status, "pending_provider");
  assert.equal(order.price_snapshot, 45);
  assert.equal(order.currency_snapshot, "OMR");
  assert.equal(order.price, 45);

  await db.prepare("UPDATE service_provider_categories SET instant_price = ?1 WHERE id = ?2").bind(80, "provider-category-a").run();
  const unchanged = await getDirectBooking(id, { userId: CUSTOMER_A });
  assert.equal(unchanged.price_snapshot, 45, "a later provider price change must not mutate an existing booking");
});

test("pending provider receives the booking without exact location or customer contact", async () => {
  seed();
  const id = await createDirectBooking(input(), CUSTOMER_A);
  const providerView = await getDirectBooking(id, { userId: PROVIDER_A });
  for (const key of ["latitude", "longitude", "short_address", "contact_phone", "contact_email", "contact_preference"]) {
    assert.equal(Object.hasOwn(providerView, key), false, `${key} must remain hidden before provider confirmation`);
  }
  assert.equal(providerView.city_id, "Muscat");
  assert.equal(providerView.district_id, "Bawshar");

  const customerView = await getDirectBooking(id, { userId: CUSTOMER_A });
  assert.equal(customerView.latitude, 23.588001);
  assert.equal(customerView.contact_phone, "+96890000001");
  for (const forbidden of ["customer_user_id", "provider_user_id", "reviewer_user_id", "reviewee_user_id"]) {
    assert.equal(Object.hasOwn(customerView, forbidden), false);
  }
});

test("direct booking ownership blocks Customer B and Provider B while moderator read is permission-scoped", async () => {
  seed();
  const id = await createDirectBooking(input(), CUSTOMER_A);
  await assert.rejects(() => getDirectBooking(id, { userId: CUSTOMER_B }), /BOOKING_FORBIDDEN/);
  await assert.rejects(() => getDirectBooking(id, { userId: PROVIDER_B }), /BOOKING_FORBIDDEN/);
  await assert.rejects(() => transitionDirectBooking(id, DIRECT_BOOKING_STATUS.CONFIRMED, { userId: PROVIDER_B }), /BOOKING_FORBIDDEN/);
  const moderatorView = await getDirectBooking(id, { userId: "moderator@example.test", canManageAll: true });
  assert.equal(moderatorView.id, id);
  assert.deepEqual(moderatorView.allowed_transitions, ["cancelled"]);
});

test("provider confirmation reveals contact, then scheduled → in progress → completed → customer review", async () => {
  const db = seed();
  const id = await createDirectBooking(input(), CUSTOMER_A);
  await assert.rejects(() => transitionDirectBooking(id, DIRECT_BOOKING_STATUS.CONFIRMED, { userId: CUSTOMER_A }), /BOOKING_STATUS_INVALID/);
  await transitionDirectBooking(id, DIRECT_BOOKING_STATUS.CONFIRMED, { userId: PROVIDER_A }, "موعد مناسب");
  const confirmed = await getDirectBooking(id, { userId: PROVIDER_A });
  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.contact_phone, "+96890000001");
  assert.equal(confirmed.short_address, "Building 12, private access note");

  await transitionDirectBooking(id, DIRECT_BOOKING_STATUS.SCHEDULED, { userId: PROVIDER_A });
  await transitionDirectBooking(id, DIRECT_BOOKING_STATUS.IN_PROGRESS, { userId: PROVIDER_A });
  await assert.rejects(() => transitionDirectBooking(id, DIRECT_BOOKING_STATUS.COMPLETED, { userId: CUSTOMER_A }), /BOOKING_STATUS_INVALID/);
  await transitionDirectBooking(id, DIRECT_BOOKING_STATUS.COMPLETED, { userId: PROVIDER_A });
  const reviewId = await reviewDirectBooking(id, { userId: CUSTOMER_A }, { rating: 5, comment: "ممتاز", recommend: true });
  assert.ok(reviewId);
  await assert.rejects(() => reviewDirectBooking(id, { userId: PROVIDER_A }, { rating: 5 }), /BOOKING_FORBIDDEN/);
  assert.equal(db.dump("service_reviews").length, 1);
  const profile = db.dump("service_provider_profiles").find((row) => row.id === PROVIDER_PROFILE_A);
  assert.equal(profile.jobs_completed, 1);
  assert.equal(profile.rating_avg, 5);
  assert.equal(profile.rating_count, 1);
  assert.ok(db.dump("service_notifications").length >= 5, "booking lifecycle should use the existing notifications infrastructure");
});

test("decline and cancellation are terminal and invalid transitions are rejected", async () => {
  seed();
  const declinedId = await createDirectBooking(input({ scheduledAt: "2099-09-19T10:30:00.000Z" }), CUSTOMER_A);
  await transitionDirectBooking(declinedId, DIRECT_BOOKING_STATUS.DECLINED, { userId: PROVIDER_A }, "غير متاح");
  await assert.rejects(() => transitionDirectBooking(declinedId, DIRECT_BOOKING_STATUS.CONFIRMED, { userId: PROVIDER_A }), /BOOKING_STATUS_INVALID/);

  const cancelledId = await createDirectBooking(input({ scheduledAt: "2099-09-20T10:30:00.000Z" }), CUSTOMER_A);
  await transitionDirectBooking(cancelledId, DIRECT_BOOKING_STATUS.CANCELLED, { userId: CUSTOMER_A });
  await assert.rejects(() => transitionDirectBooking(cancelledId, DIRECT_BOOKING_STATUS.CONFIRMED, { userId: PROVIDER_A }), /BOOKING_STATUS_INVALID/);
});

test("quote-only categories cannot enter direct booking", async () => {
  const db = seed();
  await db.prepare("UPDATE service_categories SET booking_mode = ?1 WHERE id = ?2").bind("quotes", CATEGORY).run();
  await assert.rejects(() => createDirectBooking(input(), CUSTOMER_A), /BOOKING_MODE_NOT_DIRECT/);
});

test("guest booking API is 401 and another customer receives 403 from private detail API", async () => {
  seed();
  setSessionIdentityResolverForTests(async () => GUEST_IDENTITY);
  const guest = await createBookingRoute(new NextRequest("http://localhost:3014/api/service-bookings", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input()),
  }));
  assert.equal(guest.status, 401);

  const id = await createDirectBooking(input(), CUSTOMER_A);
  setSessionIdentityResolverForTests(async () => ({
    authenticated: true, email: CUSTOMER_B, displayName: "Customer B", role: "viewer", countryCode: "OM", permissions: ["service_requests.manage_own"],
  }));
  const forbidden = await bookingDetailRoute(new NextRequest(`http://localhost:3014/api/service-bookings/${id}`), { params: Promise.resolve({ id }) });
  assert.equal(forbidden.status, 403);
});
