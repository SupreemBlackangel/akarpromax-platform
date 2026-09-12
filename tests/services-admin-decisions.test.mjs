// A decision on this platform is a confirmed act with a reason attached.
//
// It was not. Approving, rejecting and suspending a provider were single
// clicks; deleting a category was `window.confirm("...نهائيًا؟")`; resolving a
// report asked for the administrative decision in a `window.prompt`. None of
// those can show what is about to change, and a rejection reached the provider
// with no reason at all.
//
// Worse, the buttons were derived from `status !== "approved"` and
// `status !== "rejected"` rather than from PROVIDER_FLOW, so the screen offered
// moves the server refuses — a suspended provider straight back to approved —
// and that refusal arrived in the browser as an unhandled 500.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { mapSessionRole, permissionsForSessionRole } from "../lib/auth/identity-map.ts";
import { getProviderProfileById } from "../lib/services/marketplace.ts";
import { PROVIDER_STATUS_VALUES, canTransitionProvider } from "../lib/services/constants.ts";

import { PATCH as setStatus } from "../app/api/service-providers/[id]/status/route.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
const SUPERVISOR = "supervisor@example.com";

let db;

function signIn(email = SUPERVISOR, sessionRole = "service_supervisor") {
  setSessionIdentityResolverForTests(async () => ({
    authenticated: true,
    email,
    displayName: email,
    role: mapSessionRole(sessionRole),
    countryCode: null,
    permissions: permissionsForSessionRole(sessionRole),
  }));
}

const patch = (id, body) =>
  new Request(`http://localhost/api/service-providers/${id}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id) => ({ params: Promise.resolve({ id }) });

async function seedProvider(status) {
  await db
    .prepare(
      `INSERT INTO service_provider_profiles
         (id, user_id, status, display_name_ar, business_name, country_code, is_featured, featured_rank, rating_avg, rating_count, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, 0, 0, ?7, ?7)`,
    )
    .bind(`p-${status}`, `${status}@example.com`, status, "مزوّد", "مؤسسة", "SA", "2026-09-12 00:00:00")
    .run();
  return `p-${status}`;
}

test.beforeEach(() => {
  db = setServicesDbForTesting(createInMemoryDb());
  signIn();
});

test.afterEach(() => {
  setServicesDbForTesting(null);
  setSessionIdentityResolverForTests(null);
});

test("refusing a provider without a reason is refused", async () => {
  const id = await seedProvider(PROVIDER_STATUS_VALUES.SUBMITTED);

  const bare = await setStatus(patch(id, { status: "rejected" }), params(id));
  assert.equal(bare.status, 400);
  assert.equal((await getProviderProfileById(id)).status, PROVIDER_STATUS_VALUES.SUBMITTED);

  const withReason = await setStatus(patch(id, { status: "rejected", note: "الترخيص منتهٍ" }), params(id));
  assert.equal(withReason.status, 200);
  const row = await getProviderProfileById(id);
  assert.equal(row.status, PROVIDER_STATUS_VALUES.REJECTED);
  assert.equal(row.rejection_reason, "الترخيص منتهٍ", "the reason must reach the row the provider is shown");
});

test("suspending needs a reason too; approving does not", async () => {
  const approved = await seedProvider(PROVIDER_STATUS_VALUES.APPROVED);
  assert.equal((await setStatus(patch(approved, { status: "suspended" }), params(approved))).status, 400);
  assert.equal((await setStatus(patch(approved, { status: "suspended", note: "شكاوى متكررة" }), params(approved))).status, 200);

  const submitted = await seedProvider(PROVIDER_STATUS_VALUES.SUBMITTED);
  assert.equal(
    (await setStatus(patch(submitted, { status: "approved" }), params(submitted))).status,
    200,
    "an approval carries no bad news, so it needs no words",
  );
});

test("a move the flow forbids is a rule, not a server error", async () => {
  // This is the 500 the screen used to produce: it offered "اعتماد" on a
  // suspended provider because the button was derived from `!== approved`.
  const id = await seedProvider(PROVIDER_STATUS_VALUES.SUSPENDED);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.APPROVED), false);

  const response = await setStatus(patch(id, { status: "approved" }), params(id));
  assert.equal(response.status, 409, "a refused transition must not surface as an unhandled 500");
  assert.equal((await getProviderProfileById(id)).status, PROVIDER_STATUS_VALUES.SUSPENDED);
});

test("the screen offers only the moves the flow allows", async () => {
  const source = await read("app/admin/services/admin-client.tsx");
  assert.match(source, /PROVIDER_DECISIONS\.filter\(\(move\) => canTransitionProvider\(provider\.status, move\.to\)\)/);
  // The shapes that produced impossible buttons must not come back.
  assert.doesNotMatch(source, /provider\.status !== "approved" &&/);
  assert.doesNotMatch(source, /provider\.status !== "rejected" &&/);
  // And a provider with no legal move says so rather than showing an empty cell.
  assert.match(source, /لا إجراء متاح/);
});

test("every decision on the page goes through a dialog, not a browser prompt", async () => {
  const source = await read("app/admin/services/admin-client.tsx");
  const code = source
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join("\n");
  assert.doesNotMatch(code, /window\.confirm\(/, "a deletion must show what it is deleting");
  assert.doesNotMatch(code, /window\.prompt\(/, "an administrative decision is not collected in a browser prompt");
  assert.match(source, /<Dialog open onClose=\{onClose\}/);
  // The confirm button cannot be pressed until a required reason exists.
  assert.match(source, /const missing = Boolean\(input\?\.required\) && !text\.trim\(\)/);
  assert.match(source, /disabled=\{busy \|\| missing\}/);
});

test("the requests panel can actually decide, and shows both tracks", async () => {
  const source = await read("app/admin/services/admin-client.tsx");
  assert.match(source, /REQUEST_DECISIONS\.map\(\(move\) => <button/, "the panel was read-only");
  assert.match(source, /\/api\/admin\/service-requests\/\$\{encodeURIComponent\(String\(request\.id\)\)\}\/review/);
  // The platform's verdict and the customer's own lifecycle are different
  // facts and are shown as two.
  assert.match(source, /row\.review_status \|\| REQUEST_REVIEW_STATUS\.PENDING/);
  assert.match(source, /دورة الطلب:/);
  // Refusing and asking for more both collect words; assigning collects a person.
  for (const action of ["reject", "request-info", "assign"]) {
    const entry = new RegExp(`action: "${action}"[^}]*input: \\{[^}]*required: true`);
    assert.match(source, entry, `${action} must collect what the server requires`);
  }
});

test("the admin snapshot carries the fields the panel decides from", async () => {
  // Deriving buttons from a field the query does not select is how a screen
  // offers an action the server then refuses.
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /r\.review_status, r\.assigned_to,/);
  assert.match(marketplace, /r\.review_note,/);
});
