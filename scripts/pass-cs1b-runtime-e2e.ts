import assert from "node:assert/strict";

import bcrypt from "bcryptjs";
import postgres from "postgres";

const DATABASE_URL = String(process.env.DATABASE_URL ?? "");
const BASE_URL = String(process.env.SERVICES_BASE_URL ?? "http://localhost:3014").replace(/\/$/, "");
const TEST_PASSWORD = "Pass-CS1B-Local-Only!";

if (!DATABASE_URL.includes("127.0.0.1:55433") || !/akarpromax_cs1b_[a-zA-Z0-9_]+/.test(DATABASE_URL)) {
  throw new Error("PASS C.S.1B runtime fixtures are restricted to an isolated local akarpromax_cs1b_* PostgreSQL database on 127.0.0.1:55433");
}
if (BASE_URL !== "http://localhost:3014") {
  throw new Error("PASS C.S.1B runtime certification must use http://localhost:3014");
}

// Runtime certification intentionally inspects heterogeneous API payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type Actor = { email: string; cookie: string };

const sql = postgres(DATABASE_URL, { ssl: "require", prepare: false, max: 1 });
const runId = Date.now().toString(36);
const emails = {
  customerA: `csa-${runId}@t.test`,
  customerB: `csb-${runId}@t.test`,
  providerA: `pva-${runId}@t.test`,
  providerB: `pvb-${runId}@t.test`,
  moderator: `mod-${runId}@t.test`,
  admin: `adm-${runId}@t.test`,
};

const results: Record<string, unknown> = {
  runtime: BASE_URL,
  directBooking: {},
  rfq: {},
  authorization: [],
  privacy: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonOrText(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(
  path: string,
  options: { actor?: Actor; method?: string; body?: unknown; expected?: number | number[] } = {},
) {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const headers = new Headers({ Accept: "application/json", Origin: BASE_URL });
  if (options.actor) headers.set("Cookie", options.actor.cookie);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });
  const text = await response.text();
  const data = jsonOrText(text);
  if (options.expected !== undefined) {
    const expected = Array.isArray(options.expected) ? options.expected : [options.expected];
    assert.ok(expected.includes(response.status), `${method} ${path}: expected ${expected.join("/")}, received ${response.status}: ${text.slice(0, 500)}`);
  }
  return { response, data };
}

async function login(email: string): Promise<Actor> {
  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    body: { email, password: TEST_PASSWORD },
    expected: 200,
  });
  assert.equal(data?.user?.email, email);
  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookie = setCookie.match(/(?:^|,\s*)(akar_session=[^;]+)/)?.[1];
  assert.ok(cookie, `login for ${email} did not return akar_session`);
  return { email, cookie };
}

function recordAuth(role: string, action: string, actual: number, expected: number | number[]) {
  const accepted = Array.isArray(expected) ? expected : [expected];
  assert.ok(accepted.includes(actual), `${role} ${action}: expected ${accepted.join("/")}, got ${actual}`);
  (results.authorization as unknown[]).push({ role, action, http: actual, expected: accepted });
}

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "email", "phone", "whatsapp", "user_id", "provider_user_id", "customer_user_id",
  "reviewer_user_id", "reviewee_user_id", "tax_number", "commercial_registration",
  "latitude", "longitude", "contact_phone", "contact_email", "access_notes",
]);

function auditPublicJson(value: unknown, path = "$", findings: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => auditPublicJson(entry, `${path}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_PUBLIC_KEYS.has(key.toLowerCase())) findings.push(`${path}.${key}`);
    auditPublicJson(entry, `${path}.${key}`, findings);
  }
  return findings;
}

async function seedAccounts() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const fixtures = [
    [emails.customerA, "PASS CS1B Customer A", "user"],
    [emails.customerB, "PASS CS1B Customer B", "user"],
    [emails.providerA, "PASS CS1B Provider A", "user"],
    [emails.providerB, "PASS CS1B Provider B", "user"],
    [emails.moderator, "PASS CS1B Moderator", "service_supervisor"],
    [emails.admin, "PASS CS1B Admin", "super_admin"],
  ] as const;
  for (const [email, name, role] of fixtures) {
    await sql`
      INSERT INTO users (email, password_hash, name, role, status, is_active, email_verified_at)
      VALUES (${email}, ${passwordHash}, ${name}, ${role}, 'active', true, now())
    `;
  }
}

async function createProvider(actor: Actor, suffix: "A" | "B", categoryId: string) {
  const cityId = "muscat-cs1b";
  const create = await request("/api/service-providers", {
    actor,
    method: "POST",
    body: {
      displayNameAr: `مزود الاختبار ${suffix}`,
      displayNameEn: `PASS CS1B Provider ${suffix}`,
      bioAr: "مزود محلي معزول لاختبار دورة الخدمات",
      phone: suffix === "A" ? "+96890000001" : "+96890000002",
      whatsapp: suffix === "A" ? "+96890000001" : "+96890000002",
      email: actor.email,
      countryCode: "OM",
      cityId,
      districtId: "al-khuwair-cs1b",
      governorate: "Muscat",
      latitude: suffix === "A" ? 23.5901 : 23.5911,
      longitude: suffix === "A" ? 58.4011 : 58.4021,
      serviceRadiusKm: 80,
      taxNumber: `PRIVATE-TAX-${suffix}`,
      commercialRegistration: `PRIVATE-CR-${suffix}`,
    },
    expected: 200,
  });
  const providerId = String(create.data.id);
  assert.ok(providerId);
  await request(`/api/service-providers/${providerId}/categories`, {
    actor,
    method: "POST",
    body: {
      categoryId,
      priceFrom: suffix === "A" ? 45 : 55,
      priceTo: suffix === "A" ? 45 : 55,
      instantPrice: suffix === "A" ? 45 : 55,
      currency: "OMR",
      pricingUnit: "fixed",
    },
    expected: 200,
  });
  await request(`/api/service-providers/${providerId}/apply`, { actor, method: "POST", expected: 200 });
  return providerId;
}

async function createBooking(customer: Actor, providerId: string, categoryId: string, offsetDays: number) {
  const scheduledAt = new Date(Date.now() + offsetDays * 86_400_000).toISOString();
  const created = await request("/api/service-bookings", {
    actor: customer,
    method: "POST",
    body: {
      providerId,
      categoryId,
      countryCode: "OM",
      cityId: "muscat-cs1b",
      districtId: "al-khuwair-cs1b",
      latitude: 23.592222,
      longitude: 58.403333,
      shortAddress: "PRIVATE TEST ADDRESS 17",
      scheduledAt,
      contactPreference: "whatsapp",
      contactPhone: "+96891111111",
      contactEmail: customer.email,
    },
    expected: 201,
  });
  return String(created.data.id);
}

async function transition(actor: Actor, bookingId: string, status: string, expected = 200) {
  return request(`/api/service-bookings/${bookingId}/status`, {
    actor,
    method: "PATCH",
    body: { status, note: `PASS CS1B ${status}` },
    expected,
  });
}

try {
  const root = await request("/services", { expected: 200 });
  assert.match(String(root.data), /<!DOCTYPE html|<html/i);

  await seedAccounts();
  const actors = {
    customerA: await login(emails.customerA),
    customerB: await login(emails.customerB),
    providerA: await login(emails.providerA),
    providerB: await login(emails.providerB),
    moderator: await login(emails.moderator),
    admin: await login(emails.admin),
  };

  const categories = await request("/api/service-categories?country=OM", { expected: 200 });
  recordAuth("Guest", "read public categories", categories.response.status, 200);
  const category = (categories.data.categories as JsonObject[]).find((row) => row.booking_mode === "both");
  assert.ok(category?.id, "fresh catalog must contain a booking_mode=both category");
  const categoryId = String(category.id);

  const providerAId = await createProvider(actors.providerA, "A", categoryId);
  const providerBId = await createProvider(actors.providerB, "B", categoryId);

  const hiddenBeforeApproval = await request(`/api/service-providers/${providerAId}`, { expected: 404 });
  assert.equal(hiddenBeforeApproval.response.status, 404);

  const guestAdmin = await request("/api/service-providers?admin=1", { expected: 403 });
  recordAuth("Guest", "admin provider list", guestAdmin.response.status, 403);
  const guestMutation = await request(`/api/service-providers/${providerAId}/status`, { method: "PATCH", body: { status: "approved" }, expected: 401 });
  recordAuth("Guest", "provider status mutation", guestMutation.response.status, 401);
  const providerSelfApprove = await request(`/api/service-providers/${providerAId}/status`, { actor: actors.providerA, method: "PATCH", body: { status: "approved" }, expected: 403 });
  recordAuth("Provider A", "self approval denied", providerSelfApprove.response.status, 403);
  const customerApprove = await request(`/api/service-providers/${providerAId}/status`, { actor: actors.customerA, method: "PATCH", body: { status: "approved" }, expected: 403 });
  recordAuth("Customer A", "provider approval denied", customerApprove.response.status, 403);

  for (const providerId of [providerAId, providerBId]) {
    const approved = await request(`/api/service-providers/${providerId}/status`, {
      actor: actors.moderator,
      method: "PATCH",
      body: { status: "approved", isAcceptingRequests: true },
      expected: 200,
    });
    recordAuth("Moderator", "provider approval", approved.response.status, 200);
  }

  const publicProvider = await request(`/api/service-providers/${providerAId}`, { expected: 200 });
  const search = await request(`/api/service-providers?country=OM&cityId=muscat-cs1b&categoryId=${encodeURIComponent(categoryId)}`, { expected: 200 });
  assert.ok((search.data.profiles as JsonObject[]).some((row) => String(row.id) === providerAId));
  assert.ok((search.data.profiles as JsonObject[]).some((row) => String(row.id) === providerBId));

  const listingCreate = await request("/api/services/listings", {
    actor: actors.providerA,
    method: "POST",
    body: {
      categoryId,
      countryCode: "OM",
      cityId: "muscat-cs1b",
      districtId: "al-khuwair-cs1b",
      titleKey: "PASS CS1B public listing",
      descriptionKey: "Isolated local listing",
      price: 45,
      currency: "OMR",
      unit: "fixed",
      status: "active",
      latitude: 23.590123,
      longitude: 58.401234,
    },
    expected: 201,
  });
  const listingId = String(listingCreate.data.id);

  const guestCreate = await request("/api/service-bookings", { method: "POST", body: {}, expected: 401 });
  recordAuth("Guest", "create booking", guestCreate.response.status, 401);

  const bookingId = await createBooking(actors.customerA, providerAId, categoryId, 3);
  const sourceRow = (await sql`
    SELECT source_type, request_id, offer_id, price_snapshot, currency_snapshot
    FROM service_orders WHERE id = ${bookingId}
  `)[0];
  assert.equal(sourceRow.source_type, "direct_booking");
  assert.equal(sourceRow.request_id, null);
  assert.equal(sourceRow.offer_id, null);
  assert.equal(Number(sourceRow.price_snapshot), 45);
  assert.equal(sourceRow.currency_snapshot, "OMR");

  const guestRead = await request(`/api/service-bookings/${bookingId}`, { expected: 401 });
  recordAuth("Guest", "read private booking", guestRead.response.status, 401);
  const customerBRead = await request(`/api/service-bookings/${bookingId}`, { actor: actors.customerB, expected: 403 });
  recordAuth("Customer B", "read Customer A booking", customerBRead.response.status, 403);
  const providerBRead = await request(`/api/service-bookings/${bookingId}`, { actor: actors.providerB, expected: 403 });
  recordAuth("Provider B", "read Provider A booking", providerBRead.response.status, 403);
  const providerBAccept = await transition(actors.providerB, bookingId, "confirmed", 403);
  recordAuth("Provider B", "accept Provider A booking", providerBAccept.response.status, 403);
  const customerInvalidAccept = await transition(actors.customerA, bookingId, "confirmed", 400);
  recordAuth("Customer A", "provider-only confirm denied", customerInvalidAccept.response.status, 400);

  const providerPending = await request(`/api/service-bookings/${bookingId}`, { actor: actors.providerA, expected: 200 });
  recordAuth("Provider A", "read assigned booking", providerPending.response.status, 200);
  assert.equal(providerPending.data.booking.viewer_role, "provider");
  for (const privateKey of ["latitude", "longitude", "short_address", "contact_phone", "contact_email", "contact_preference"]) {
    assert.equal(Object.hasOwn(providerPending.data.booking, privateKey), false, `pending provider must not receive ${privateKey}`);
  }
  const customerPrivate = await request(`/api/service-bookings/${bookingId}`, { actor: actors.customerA, expected: 200 });
  recordAuth("Customer A", "read own booking", customerPrivate.response.status, 200);
  assert.equal(customerPrivate.data.booking.contact_phone, "+96891111111");

  await request(`/api/service-providers/${providerAId}/categories`, {
    actor: actors.providerA,
    method: "POST",
    body: { categoryId, priceFrom: 80, priceTo: 80, instantPrice: 80, currency: "OMR", pricingUnit: "fixed" },
    expected: 200,
  });
  const snapshotAfterPriceChange = await request(`/api/service-bookings/${bookingId}`, { actor: actors.customerA, expected: 200 });
  assert.equal(Number(snapshotAfterPriceChange.data.booking.price_snapshot), 45);

  await transition(actors.providerA, bookingId, "confirmed");
  const revealed = await request(`/api/service-bookings/${bookingId}`, { actor: actors.providerA, expected: 200 });
  assert.equal(revealed.data.booking.contact_phone, "+96891111111");
  assert.equal(Number(revealed.data.booking.latitude), 23.592222);
  await transition(actors.providerA, bookingId, "scheduled");
  await transition(actors.providerA, bookingId, "in_progress");
  await transition(actors.providerA, bookingId, "completed");
  const directReview = await request(`/api/service-bookings/${bookingId}/review`, {
    actor: actors.customerA,
    method: "POST",
    body: { rating: 5, comment: "PASS CS1B direct booking review", recommend: true },
    expected: 201,
  });
  assert.ok(directReview.data.id);

  const declinedId = await createBooking(actors.customerA, providerAId, categoryId, 4);
  await transition(actors.providerA, declinedId, "declined");
  await transition(actors.providerA, declinedId, "confirmed", 400);
  const cancelledId = await createBooking(actors.customerA, providerAId, categoryId, 5);
  await transition(actors.customerA, cancelledId, "cancelled");
  await transition(actors.providerA, cancelledId, "confirmed", 400);

  const moderatorBookingId = await createBooking(actors.customerA, providerAId, categoryId, 6);
  const moderatorRead = await request(`/api/service-bookings/${moderatorBookingId}`, { actor: actors.moderator, expected: 200 });
  recordAuth("Moderator", "read any booking", moderatorRead.response.status, 200);
  const moderatorCancel = await transition(actors.moderator, moderatorBookingId, "cancelled", 200);
  recordAuth("Moderator", "cancel pending booking", moderatorCancel.response.status, 200);
  const adminRead = await request(`/api/service-bookings/${moderatorBookingId}`, { actor: actors.admin, expected: 200 });
  recordAuth("Admin", "read any booking", adminRead.response.status, 200);
  const customerBBookingId = await createBooking(actors.customerB, providerAId, categoryId, 7);
  const customerBOwnRead = await request(`/api/service-bookings/${customerBBookingId}`, { actor: actors.customerB, expected: 200 });
  recordAuth("Customer B", "read own booking", customerBOwnRead.response.status, 200);
  const customerBCancel = await transition(actors.customerB, customerBBookingId, "cancelled", 200);
  recordAuth("Customer B", "cancel own booking", customerBCancel.response.status, 200);
  const adminBookingId = await createBooking(actors.customerA, providerAId, categoryId, 8);
  const adminCancel = await transition(actors.admin, adminBookingId, "cancelled", 200);
  recordAuth("Admin", "cancel pending booking", adminCancel.response.status, 200);

  Object.assign(results.directBooking as JsonObject, {
    bookingId,
    sourceType: sourceRow.source_type,
    requestId: sourceRow.request_id,
    offerId: sourceRow.offer_id,
    priceSnapshot: Number(sourceRow.price_snapshot),
    priceAfterProviderUpdate: Number(snapshotAfterPriceChange.data.booking.price_snapshot),
    lifecycle: ["pending_provider", "confirmed", "scheduled", "in_progress", "completed", "reviewed"],
    decline: "PASS",
    cancellation: "PASS",
    stagedPrivacy: "PASS",
  });

  const requestCreate = await request("/api/service-requests", {
    actor: actors.customerA,
    method: "POST",
    body: {
      categoryId,
      countryCode: "OM",
      cityId: "muscat-cs1b",
      districtId: "al-khuwair-cs1b",
      latitude: 23.592,
      longitude: 58.403,
      title: "PASS CS1B RFQ request",
      description: "Verify RFQ remains independent and operational",
      budgetMin: 40,
      budgetMax: 120,
      currency: "OMR",
      urgency: "normal",
      shortAddress: "PRIVATE RFQ ADDRESS",
      contactPreference: "platform",
    },
    expected: 201,
  });
  const requestId = String(requestCreate.data.id);
  await request(`/api/service-requests/${requestId}/publish`, { actor: actors.customerA, method: "POST", expected: 200 });
  const matching = await request(`/api/service-requests/${requestId}/matching`, { actor: actors.customerA, method: "POST", expected: 200 });
  assert.ok(Number(matching.data.matched) >= 2, `expected both approved providers to match, got ${matching.data.matched}`);
  const offerCreate = await request("/api/service-offers", {
    actor: actors.providerA,
    method: "POST",
    body: {
      requestId,
      price: 70,
      totalPrice: 70,
      currency: "OMR",
      durationDays: 2,
      durationText: "2 days",
      offerNotes: "PASS CS1B RFQ offer",
      materialsIncluded: true,
    },
    expected: 201,
  });
  const offerId = String(offerCreate.data.id);
  const moderatorAccept = await request(`/api/service-offers/${offerId}/accept`, { actor: actors.moderator, method: "POST", expected: 403 });
  recordAuth("Moderator", "accept customer-owned RFQ offer denied", moderatorAccept.response.status, 403);
  const adminAccept = await request(`/api/service-offers/${offerId}/accept`, { actor: actors.admin, method: "POST", expected: 403 });
  recordAuth("Admin", "accept customer-owned RFQ offer denied", adminAccept.response.status, 403);
  const otherCustomerAccept = await request(`/api/service-offers/${offerId}/accept`, { actor: actors.customerB, method: "POST", expected: 403 });
  recordAuth("Customer B", "accept Customer A RFQ offer", otherCustomerAccept.response.status, 403);
  const accepted = await request(`/api/service-offers/${offerId}/accept`, { actor: actors.customerA, method: "POST", expected: 201 });
  const rfqOrderId = String(accepted.data.orderId);
  for (const status of ["scheduled", "in_progress", "delivered"]) {
    await request(`/api/service-jobs/${rfqOrderId}/status`, { actor: actors.providerA, method: "PATCH", body: { status }, expected: 200 });
  }
  await request(`/api/service-jobs/${rfqOrderId}/status`, { actor: actors.customerA, method: "PATCH", body: { status: "completed" }, expected: 200 });
  await request(`/api/service-jobs/${rfqOrderId}/review`, {
    actor: actors.customerA,
    method: "POST",
    body: { rating: 4, comment: "PASS CS1B RFQ review", recommend: true },
    expected: 201,
  });
  const rfqRow = (await sql`SELECT source_type, request_id, offer_id, status FROM service_orders WHERE id = ${rfqOrderId}`)[0];
  assert.equal(rfqRow.source_type, "rfq");
  assert.equal(String(rfqRow.request_id), requestId);
  assert.equal(String(rfqRow.offer_id), offerId);
  assert.equal(rfqRow.status, "completed");
  Object.assign(results.rfq as JsonObject, {
    requestId,
    matched: Number(matching.data.matched),
    offerId,
    orderId: rfqOrderId,
    sourceType: rfqRow.source_type,
    lifecycle: ["draft", "published", "matching", "offer", "accepted", "scheduled", "in_progress", "delivered", "completed", "reviewed"],
  });

  const ratedProvider = await request(`/api/service-providers/${providerAId}`, { expected: 200 });
  assert.equal(Number(ratedProvider.data.rating.ratingCount), 2);
  assert.equal(Number(ratedProvider.data.rating.ratingAvg), 4.5);

  const providerNotifications = await request("/api/service-notifications?limit=100", { actor: actors.providerA, expected: 200 });
  const customerNotifications = await request("/api/service-notifications?limit=100", { actor: actors.customerA, expected: 200 });
  assert.ok((providerNotifications.data.notifications as JsonObject[]).some((entry) => entry.type === "DIRECT_BOOKING_CREATED"));
  assert.ok((providerNotifications.data.notifications as JsonObject[]).some((entry) => entry.type === "SERVICE_REQUEST_MATCHED"));
  assert.ok((customerNotifications.data.notifications as JsonObject[]).some((entry) => String(entry.type).startsWith("DIRECT_BOOKING_")));

  const publicAudits = [
    ["provider-detail", publicProvider.data],
    ["provider-detail-rated", ratedProvider.data],
    ["provider-search", search.data],
    ["professional-compat", (await request(`/api/professionals/${providerAId}`, { expected: 200 })).data],
    ["listings", (await request(`/api/services/listings?categoryId=${encodeURIComponent(categoryId)}&cityId=muscat-cs1b`, { expected: 200 })).data],
    ["listing-detail", (await request(`/api/services/listings/${listingId}`, { expected: 200 })).data],
    ["reviews", (await request(`/api/service-reviews?revieweeUserId=${encodeURIComponent(emails.providerA)}`, { expected: 200 })).data],
  ] as const;
  for (const [name, payload] of publicAudits) {
    const findings = auditPublicJson(payload);
    assert.deepEqual(findings, [], `${name} leaked private keys: ${findings.join(", ")}`);
    (results.privacy as JsonObject)[name] = "PASS";
  }

  const verifiedDirectRow = (await sql`
    SELECT source_type, request_id, offer_id, price_snapshot, currency_snapshot, status
    FROM service_orders WHERE id = ${bookingId}
  `)[0];
  const currentPrice = (await sql`
    SELECT instant_price, currency FROM service_provider_categories
    WHERE provider_id = ${providerAId} AND category_id = ${categoryId}
  `)[0];
  assert.equal(Number(verifiedDirectRow.price_snapshot), 45);
  assert.equal(Number(currentPrice.instant_price), 80);
  assert.equal(verifiedDirectRow.status, "completed");

  Object.assign(results, {
    providerRegistrationApproval: "PASS",
    providerPublicVisibility: "PASS",
    professionLocationSearch: "PASS",
    ratingUpdate: "PASS",
    notifications: "PASS",
    privacyApiAudit: "PASS",
    authorizationMatrix: "PASS",
    productionDataModified: "NO",
    final: "PASS",
  });

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await sql.end();
}
