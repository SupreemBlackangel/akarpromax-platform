// The platform must be able to answer a customer's service request.
//
// It could not. The marketplace was built as a customer-driven RFQ — publishing
// runs the matching engine and that is the whole lifecycle — so there was no
// way to accept a request, refuse one, ask the customer for something missing,
// put a member of staff on it, or close it. A supervisor holding
// SERVICE_REQUESTS_MANAGE_ALL could not even cancel an abusive request: the
// cancel path refused everyone who was not the customer.
//
// These drive the real route handler against the in-memory adapter.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { mapSessionRole, permissionsForSessionRole } from "../lib/auth/identity-map.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";
import { createRequestFull, getRequestFull, listRequestHistory } from "../lib/services/marketplace.ts";
import { REQUEST_REVIEW_STATUS, REQUEST_STATUS } from "../lib/services/constants.ts";

import { POST as review } from "../app/api/admin/service-requests/[id]/review/route.ts";
import { POST as cancelRequest } from "../app/api/service-requests/[id]/cancel/route.ts";

const CUSTOMER = "customer@example.com";
const SUPERVISOR = "supervisor@example.com";

function signIn(email, sessionRole) {
  setSessionIdentityResolverForTests(async () => ({
    authenticated: true,
    email,
    displayName: email,
    role: mapSessionRole(sessionRole),
    countryCode: null,
    permissions: permissionsForSessionRole(sessionRole),
  }));
}

const post = (url, body) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const params = (id) => ({ params: Promise.resolve({ id }) });

/** The adapter bound for the current test, so a helper can reach it directly. */
let db;

/**
 * "No verdict has been recorded yet."
 *
 * In Postgres that is the column's DEFAULT 'pending' (migration 0016); the
 * in-memory adapter models no defaults, so the field is simply absent there.
 * Both mean the same thing, and `reviewRequest` reads them the same way — so
 * the assertion is written about the meaning rather than about which of the two
 * shapes a given driver produces.
 */
const reviewStatusOf = (row) => String(row.review_status ?? REQUEST_REVIEW_STATUS.PENDING);

async function seedRequest(status = REQUEST_STATUS.PUBLISHED) {
  const id = await createRequestFull({
    customerUserId: CUSTOMER,
    categoryId: "cat-1",
    countryCode: "SA",
    cityId: "JEDDAH",
    title: "تسليك مجاري",
    description: "المجرى مسدود",
    currency: "SAR",
  });
  if (status !== REQUEST_STATUS.DRAFT) {
    // Put it in the state under test directly: going through publish would also
    // run the matching engine, which is a different subject.
    await db.prepare("UPDATE service_requests SET status = ?1 WHERE id = ?2").bind(status, id).run();
  }
  return id;
}

test.beforeEach(() => {
  db = setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
  setSessionIdentityResolverForTests(null);
});

test("a supervisor accepts a request, and the verdict is recorded apart from its status", async () => {
  const id = await seedRequest();
  signIn(SUPERVISOR, "service_supervisor");

  const response = await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "accept" }), params(id));
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));

  const row = await getRequestFull(id);
  assert.equal(row.review_status, REQUEST_REVIEW_STATUS.ACCEPTED);
  assert.equal(row.reviewed_by, SUPERVISOR);
  // The customer's own lifecycle is untouched by the platform's verdict.
  assert.equal(row.status, REQUEST_STATUS.PUBLISHED);
});

test("a refusal needs a reason, and carries it", async () => {
  const id = await seedRequest();
  signIn(SUPERVISOR, "service_supervisor");

  const bare = await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "reject" }), params(id));
  assert.equal(bare.status, 400, "a refusal the customer cannot act on is not a decision");
  assert.equal(reviewStatusOf(await getRequestFull(id)), REQUEST_REVIEW_STATUS.PENDING);

  const withReason = await review(
    post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "reject", reason: "الطلب مكرر" }),
    params(id),
  );
  assert.equal(withReason.status, 200);

  const row = await getRequestFull(id);
  assert.equal(row.review_status, REQUEST_REVIEW_STATUS.REJECTED);
  assert.equal(row.review_note, "الطلب مكرر");
});

test("a refused request stops reaching craftsmen", async () => {
  const id = await seedRequest();
  signIn(SUPERVISOR, "service_supervisor");

  await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "reject", reason: "مخالف" }), params(id));

  const row = await getRequestFull(id);
  assert.equal(row.status, REQUEST_STATUS.CANCELLED, "refusing must take it out of the marketplace");
  const history = await listRequestHistory(id);
  const last = history.at(-1);
  assert.equal(last.to_status, REQUEST_STATUS.CANCELLED);
  assert.equal(last.note, "مخالف", "the reason belongs in the history a later reader sees");
});

test("a late refusal does not undo a finished job", async () => {
  // REQUEST_FLOW has no way out of `completed`, and a review verdict must not
  // invent one. The verdict is still recorded; the lifecycle is not rewritten.
  const id = await seedRequest(REQUEST_STATUS.COMPLETED);
  signIn(SUPERVISOR, "service_supervisor");

  await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "reject", reason: "شكوى لاحقة" }), params(id));

  const row = await getRequestFull(id);
  assert.equal(row.review_status, REQUEST_REVIEW_STATUS.REJECTED);
  assert.equal(row.status, REQUEST_STATUS.COMPLETED);
});

test("asking the customer for more, assigning a follow-up, and closing", async () => {
  const id = await seedRequest();
  signIn(SUPERVISOR, "service_supervisor");

  const noReason = await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "request-info" }), params(id));
  assert.equal(noReason.status, 400, "asking for something without saying what is not a request");

  await review(
    post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "request-info", reason: "أرفق صورة للموقع" }),
    params(id),
  );
  assert.equal((await getRequestFull(id)).review_status, REQUEST_REVIEW_STATUS.INFO_REQUESTED);

  const noAssignee = await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "assign" }), params(id));
  assert.equal(noAssignee.status, 400);

  await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "assign", assignee: "staff@example.com" }), params(id));
  const assigned = await getRequestFull(id);
  assert.equal(assigned.assigned_to, "staff@example.com");
  // Assigning is not a verdict: it must not overwrite the one already reached.
  assert.equal(assigned.review_status, REQUEST_REVIEW_STATUS.INFO_REQUESTED);

  await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "close" }), params(id));
  const closed = await getRequestFull(id);
  assert.equal(closed.review_status, REQUEST_REVIEW_STATUS.CLOSED);
  assert.ok(closed.closed_at, "closing records when");
});

test("a customer cannot review their own request", async () => {
  const id = await seedRequest();
  signIn(CUSTOMER, "user");

  const response = await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action: "accept" }), params(id));
  assert.equal(response.status, 403);
  assert.equal(reviewStatusOf(await getRequestFull(id)), REQUEST_REVIEW_STATUS.PENDING);
});

test("an unknown action is refused rather than guessed at", async () => {
  const id = await seedRequest();
  signIn(SUPERVISOR, "service_supervisor");

  for (const action of ["approve", "delete", "", null, 42]) {
    const response = await review(post(`http://localhost/api/admin/service-requests/${id}/review`, { action }), params(id));
    assert.equal(response.status, 400, `action ${JSON.stringify(action)} must be refused`);
  }
});

test("a supervisor can cancel an abusive request; a stranger still cannot", async () => {
  const id = await seedRequest();

  signIn("stranger@example.com", "user");
  const refused = await cancelRequest(post(`http://localhost/api/service-requests/${id}/cancel`, {}), params(id));
  assert.equal(refused.status, 403, "cancelling someone else's request is still forbidden");
  assert.equal((await getRequestFull(id)).status, REQUEST_STATUS.PUBLISHED);

  signIn(SUPERVISOR, "service_supervisor");
  const allowed = await cancelRequest(post(`http://localhost/api/service-requests/${id}/cancel`, { reason: "إساءة" }), params(id));
  assert.equal(allowed.status, 200);
  assert.equal((await getRequestFull(id)).status, REQUEST_STATUS.CANCELLED);
});

test("the supervisor role actually carries the permission this route is gated on", async () => {
  // If it did not, every test above would be asserting a gate that is closed to
  // everyone, which is not the same as a working one.
  assert.ok(permissionsForSessionRole("service_supervisor").includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL));
  assert.ok(!permissionsForSessionRole("user").includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL));
});
