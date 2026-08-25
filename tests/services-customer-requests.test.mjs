// AkarProMax L1C-0.5A — a normal registered customer owns the request lifecycle.
//
// Binding rule: a normal User must be able to create, read, edit, publish and
// cancel their OWN service request WITHOUT becoming a service provider, and
// must gain no provider, supervisor or *_ALL capability by doing so.
//
// These drive the real route handlers against the deterministic in-memory D1
// adapter and the real session-identity seam.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { mapSessionRole, permissionsForSessionRole } from "../lib/auth/identity-map.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";
import { getRequestFull } from "../lib/services/marketplace.ts";

import { POST as createRequest } from "../app/api/service-requests/route.ts";
import { GET as readRequest, PATCH as patchRequest } from "../app/api/service-requests/[id]/route.ts";
import { POST as publishRequest } from "../app/api/service-requests/[id]/publish/route.ts";
import { POST as cancelRequest } from "../app/api/service-requests/[id]/cancel/route.ts";
import { POST as createOffer } from "../app/api/service-offers/route.ts";

const CUSTOMER = "customer@example.com";
const OTHER = "other@example.com";

/** The session role a normal registered account carries. */
const NORMAL_SESSION_ROLE = "user";

function identityFor(email, sessionRole = NORMAL_SESSION_ROLE) {
  return {
    authenticated: true,
    email,
    displayName: email,
    role: mapSessionRole(sessionRole),
    countryCode: null,
    permissions: permissionsForSessionRole(sessionRole),
  };
}

function signIn(email, sessionRole = NORMAL_SESSION_ROLE) {
  const identity = identityFor(email, sessionRole);
  setSessionIdentityResolverForTests(async () => identity);
  return identity;
}

function post(url, body) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch(url, body) {
  return new Request(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = (id) => ({ params: Promise.resolve({ id }) });

const REQUEST_BODY = {
  categoryId: "cat-1",
  countryCode: "OM",
  cityId: "muscat",
  title: "تصليح مكيف",
  description: "المكيف لا يبرد",
  currency: "SAR",
  budgetMax: 300,
};

test.beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
  setSessionIdentityResolverForTests(null);
});

/* 1. THE HEADLINE REGRESSION */
test("a normal registered customer can create their own service request", async () => {
  signIn(CUSTOMER);

  const response = await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY));
  const payload = await response.json();

  assert.equal(response.status, 201, `expected 201, got ${response.status}: ${JSON.stringify(payload)}`);
  assert.equal(payload.ok, true);
  assert.ok(payload.id);

  const row = await getRequestFull(payload.id);
  assert.equal(row.customer_user_id, CUSTOMER, "the request must be owned by the customer");
  assert.equal(row.currency, "SAR");
});

/* 2. OWN READ / EDIT / PUBLISH */
test("a normal registered customer can read, edit and publish their own request", async () => {
  signIn(CUSTOMER);
  const created = await (await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY))).json();

  const read = await readRequest(new Request(`http://localhost/api/service-requests/${created.id}`), params(created.id));
  assert.equal(read.status, 200);
  const detail = await read.json();
  assert.equal(detail.request.id, created.id);

  const edited = await patchRequest(
    patch(`http://localhost/api/service-requests/${created.id}`, { title: "عنوان محدث" }),
    params(created.id),
  );
  assert.equal(edited.status, 200);
  assert.equal((await getRequestFull(created.id)).title, "عنوان محدث");

  const published = await publishRequest(
    post(`http://localhost/api/service-requests/${created.id}/publish`, {}),
    params(created.id),
  );
  assert.equal(published.status, 200);
  assert.equal((await getRequestFull(created.id)).status, "published");
});

/* 3. OTHER-USER ISOLATION */
test("a normal registered customer cannot read or edit another user's request", async () => {
  signIn(CUSTOMER);
  const created = await (await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY))).json();

  signIn(OTHER);
  const read = await readRequest(new Request(`http://localhost/api/service-requests/${created.id}`), params(created.id));
  assert.equal(read.status, 403, "another customer must not read the request");

  const edited = await patchRequest(
    patch(`http://localhost/api/service-requests/${created.id}`, { title: "اختطاف" }),
    params(created.id),
  );
  assert.equal(edited.status, 403, "another customer must not edit the request");
  assert.equal((await getRequestFull(created.id)).title, "تصليح مكيف", "the row must be untouched");
});

/* 4. PROVIDER ISOLATION */
test("a normal registered customer gains no provider offer capability", async () => {
  const identity = signIn(CUSTOMER);

  assert.equal(identity.permissions.includes(PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN), false);
  assert.equal(identity.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_MANAGE), false);
  assert.equal(identity.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_APPLY), false);
  assert.equal(identity.permissions.includes(PERMISSIONS.SERVICE_JOBS_MANAGE_OWN), false);

  const response = await createOffer(
    post("http://localhost/api/service-offers", { requestId: "r1", price: 10, currency: "SAR" }),
  );
  assert.equal(response.status, 403, "a customer must not be able to submit an offer as a provider");
});

/* 5. SUPERVISOR / ADMIN ISOLATION */
test("a normal registered customer gains no supervisor, admin or *_ALL capability", async () => {
  const identity = signIn(CUSTOMER);
  const forbidden = [
    PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL,
    PERMISSIONS.SERVICE_OFFERS_MANAGE_ALL,
    PERMISSIONS.SERVICE_PROVIDERS_REVIEW,
    PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
    PERMISSIONS.SERVICE_REPORTS_MANAGE,
    PERMISSIONS.SERVICES_APPROVE,
    PERMISSIONS.SERVICES_DISPUTE_RESOLVE,
    PERMISSIONS.SERVICES_REVIEW_MODERATE,
  ];
  for (const permission of forbidden) {
    assert.equal(identity.permissions.includes(permission), false, `must not hold ${permission}`);
  }
  assert.equal(identity.permissions.includes("*"), false);
});

/* 6. THE GRANT IS EXACTLY ONE PERMISSION, AND PROVIDERS ARE UNCHANGED */
test("the normal-user capability gained exactly SERVICE_REQUESTS_MANAGE_OWN, and provider/supervisor sets are unchanged", () => {
  const normal = permissionsForSessionRole(NORMAL_SESSION_ROLE);
  assert.deepEqual(
    [...normal].sort(),
    [PERMISSIONS.TOOLS_USE, PERMISSIONS.SERVICE_REQUESTS_MANAGE_OWN].sort(),
    "the normal user capability must be TOOLS_USE + SERVICE_REQUESTS_MANAGE_OWN and nothing else",
  );

  const provider = permissionsForSessionRole("service_provider");
  for (const permission of [
    PERMISSIONS.SERVICE_PROVIDERS_APPLY,
    PERMISSIONS.SERVICE_PROVIDERS_MANAGE,
    PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN,
    PERMISSIONS.SERVICE_JOBS_MANAGE_OWN,
    PERMISSIONS.SERVICE_REQUESTS_MANAGE_OWN,
  ]) {
    assert.ok(provider.includes(permission), `provider must still hold ${permission}`);
  }
  assert.equal(provider.includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL), false);

  const supervisor = permissionsForSessionRole("service_supervisor");
  assert.ok(supervisor.includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL));
  assert.ok(supervisor.includes(PERMISSIONS.SERVICE_PROVIDERS_REVIEW));

  // The grant lives on the AUTHENTICATED capability only: the guest role keeps
  // an empty permission set, and an unauthenticated caller never reaches it at
  // all (identityFromSession returns GUEST_IDENTITY with no permissions).
  assert.deepEqual(permissionsForSessionRole("guest"), []);
});

/* 7. OWN CANCEL — allowed while the lifecycle permits, and actually persisted */
test("a normal registered customer can cancel their own request, and the cancellation is persisted", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  signIn(CUSTOMER);

  // draft -> cancelled
  const draft = await (await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY))).json();
  const cancelledDraft = await cancelRequest(
    post(`http://localhost/api/service-requests/${draft.id}/cancel`, { reason: "لم أعد بحاجة للخدمة" }),
    params(draft.id),
  );
  assert.equal(cancelledDraft.status, 200);
  assert.equal((await cancelledDraft.json()).ok, true);

  // published -> cancelled (still within the cancellable set)
  const live = await (await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY))).json();
  await publishRequest(post(`http://localhost/api/service-requests/${live.id}/publish`, {}), params(live.id));
  assert.equal((await getRequestFull(live.id)).status, "published");

  const cancelledLive = await cancelRequest(
    post(`http://localhost/api/service-requests/${live.id}/cancel`, {}),
    params(live.id),
  );
  assert.equal(cancelledLive.status, 200);

  // D. the cancelled state is real storage, not just a 200
  const draftRow = await getRequestFull(draft.id);
  const liveRow = await getRequestFull(live.id);
  assert.equal(draftRow.status, "cancelled");
  assert.equal(liveRow.status, "cancelled");
  assert.equal(
    db.dump("service_requests").filter((row) => row.status === "cancelled").length,
    2,
    "both rows must be cancelled in the canonical store",
  );

  // the canonical lifecycle recorded the transition with the customer as actor
  const history = db.dump("service_request_status_history").filter((row) => row.request_id === draft.id);
  const cancelEntry = history.find((row) => row.to_status === "cancelled");
  assert.ok(cancelEntry, "a cancellation history entry must exist");
  assert.equal(cancelEntry.from_status, "draft");
  assert.equal(cancelEntry.changed_by, CUSTOMER);
  assert.equal(cancelEntry.note, "لم أعد بحاجة للخدمة");

  // a cancelled request cannot be cancelled again
  const again = await cancelRequest(post(`http://localhost/api/service-requests/${draft.id}/cancel`, {}), params(draft.id));
  assert.equal(again.status, 400, "cancelling a cancelled request must be a deterministic 400");
  assert.equal((await again.json()).error, "request_status_invalid");
});

/* 8. ANOTHER USER CANNOT PUBLISH THE OWNER'S REQUEST */
test("another registered user cannot publish someone else's request", async () => {
  signIn(CUSTOMER);
  const created = await (await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY))).json();

  signIn(OTHER);
  const response = await publishRequest(
    post(`http://localhost/api/service-requests/${created.id}/publish`, {}),
    params(created.id),
  );
  assert.equal(response.status, 403, "publishing another user's request must be forbidden");
  assert.equal((await getRequestFull(created.id)).status, "draft", "the request must stay a draft");
});

/* 9. ANOTHER USER CANNOT CANCEL THE OWNER'S REQUEST */
test("another registered user cannot cancel someone else's request", async () => {
  signIn(CUSTOMER);
  const created = await (await createRequest(post("http://localhost/api/service-requests", REQUEST_BODY))).json();
  await publishRequest(post(`http://localhost/api/service-requests/${created.id}/publish`, {}), params(created.id));

  signIn(OTHER);
  const response = await cancelRequest(
    post(`http://localhost/api/service-requests/${created.id}/cancel`, { reason: "اختطاف" }),
    params(created.id),
  );
  assert.equal(response.status, 403, "cancelling another user's request must be forbidden");
  assert.equal((await response.json()).error, "services.forbidden");
  assert.equal((await getRequestFull(created.id)).status, "published", "the request must remain published");
});
