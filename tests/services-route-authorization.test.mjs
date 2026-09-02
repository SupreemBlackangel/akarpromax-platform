import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every services route must authenticate, and every route that reaches one
 * record by id must also decide whether this caller may see it.
 *
 * `/api/service-requests/[id]/history` shipped with neither. Anyone who knew or
 * guessed a request id could read its whole status history, and `SELECT *` on
 * service_request_status_history returns `changed_by` -- the identifier of the
 * person who made each transition -- next to a free-text `note` carrying
 * whatever a customer or provider wrote. Every sibling route already gated on
 * exactly the right rule; this one was simply missed, and nothing would have
 * noticed.
 *
 * So the rule is enforced here rather than left to review.
 */

// fileURLToPath, not URL.pathname: on Windows the latter yields
// "/E:/Akarpromax%20new%202027/..." -- a leading slash and percent-encoded
// spaces -- so every readdir below silently finds nothing and every assertion
// passes vacuously. Which is exactly what happened the first time.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Route families that carry service data belonging to identifiable people. */
const FAMILIES = [
  "app/api/service-requests",
  "app/api/service-offers",
  "app/api/service-messages",
  "app/api/service-jobs",
  "app/api/service-providers",
  "app/api/service-disputes",
  "app/api/service-reviews",
  "app/api/service-notifications",
  "app/api/service-bookings",
];

/**
 * Routes that are public by design, with the reason. Anything not listed here
 * must authenticate -- adding an entry is a deliberate act that shows up in
 * review, which is the point.
 */
const INTENTIONALLY_PUBLIC = new Map([
  ["app/api/service-providers/route.ts", "the public providers directory"],
  ["app/api/service-providers/[id]/route.ts", "a public provider profile page"],
  ["app/api/service-reviews/route.ts", "reviews shown on a public profile"],
]);

async function routeFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await routeFiles(rel)));
    else if (entry.name === "route.ts") out.push(rel);
  }
  return out;
}

async function allRoutes() {
  const files = [];
  for (const family of FAMILIES) files.push(...(await routeFiles(family)));
  return files.sort();
}

const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

test("the services route families are actually found", async () => {
  // Guards the guard: a renamed folder would otherwise make every assertion
  // below pass by testing nothing.
  const routes = await allRoutes();
  assert.ok(routes.length >= 20, `expected the services routes, found ${routes.length}`);
});

test("every services route authenticates, or is listed as public with a reason", async () => {
  const offenders = [];
  for (const file of await allRoutes()) {
    if (INTENTIONALLY_PUBLIC.has(file)) continue;
    const source = await read(file);
    if (!/getSessionIdentity|getSponsorIdentity|verifySessionPayload/.test(source)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [], "these routes serve service data without identifying the caller");
});

test("every route addressing one record by id decides whether the caller may see it", async () => {
  // A route under an [id] segment reaches somebody's record. Authenticating is
  // not enough -- being signed in is not the same as being a party to it.
  const offenders = [];
  for (const file of await allRoutes()) {
    if (INTENTIONALLY_PUBLIC.has(file)) continue;
    if (!file.includes("[id]") && !file.includes("[threadId]")) continue;
    const source = await read(file);

    // Refusing somebody with a 403 IS the authorization decision, whatever
    // shape the check takes -- comparing customer_user_id, calling
    // isThreadParticipant, or asking hasSponsorPermission. Listing the known
    // spellings instead would keep flagging correct routes and, worse, would
    // teach whoever hits the failure to add their spelling to the list rather
    // than to look at whether the route is actually safe.
    const refusesSomebody = /status:\s*403|FORBIDDEN/.test(source);
    // Or it delegates to a domain function that takes the caller's identity and
    // throws -- withdrawOffer(id, identity.email) checks ONLY_PROVIDER itself,
    // and the route maps that to a 403.
    const delegates = /identity\.email/.test(source) && /ONLY_|NOT_PARTICIPANT/.test(source);
    // Or it scopes the query to the caller instead of refusing them, which is
    // the strongest of the three: getJobDetail(id, identity.email) returns null
    // for a non-party and markNotificationRead adds AND user_id = ?, so there is
    // no separate check that can be forgotten. It answers 404 rather than 403,
    // which also declines to confirm that the record exists.
    const scopedToCaller = /\(\s*id\s*,\s*identity\.email\s*\)/.test(source);

    if (!refusesSomebody && !delegates && !scopedToCaller) offenders.push(file);
  }
  assert.deepEqual(offenders, [], "these routes reach one person's record without deciding who may read it");
});

test("the history route that shipped unguarded is guarded now", async () => {
  const source = await read("app/api/service-requests/[id]/history/route.ts");
  assert.match(source, /getSessionIdentity/, "it must identify the caller");
  assert.match(source, /customer_user_id/, "the customer may read it");
  assert.match(source, /isMatchedProvider/, "so may a provider actually matched to the request");
  assert.match(source, /SERVICE_REQUESTS_MANAGE_ALL/, "and an administrator");
  assert.match(source, /status: 403/, "everyone else is refused");
});

test("scoping a query to the caller counts, and is checked to be real", async () => {
  // The two routes that authorize this way must genuinely pass the caller
  // through to the data layer -- the point is that the filter is in the query,
  // so a route that merely looks like it does would be worse than one that
  // obviously does not.
  const timeline = await read("app/api/service-jobs/[id]/timeline/route.ts");
  assert.match(timeline, /getJobDetail\(id, identity\.email\)/);
  assert.match(timeline, /if \(!job\)/, "a non-party gets nothing back and is answered 404");

  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /WHERE "?id"? = \?2 AND "?user_id"? = \?3/, "marking a notification read must be scoped to its owner");
  assert.match(
    marketplace,
    /String\(order\.customer_user_id\) !== viewerUserId && String\(order\.provider_user_id\) !== viewerUserId/,
    "a job is visible to its two parties and nobody else",
  );
});

test("being an approved provider is not by itself access to a request", async () => {
  // Otherwise every provider in the marketplace could read every request in it.
  const source = await read("app/api/service-requests/[id]/history/route.ts");
  assert.match(
    source,
    /matches\.some\(\(match\) => String\(match\.provider_id\) === String\(provider\.id\)\)/,
    "access follows from being matched to this request, not from having a provider profile",
  );
});

// ---- what the public surface publishes -------------------------------------

test("the public directory and the public profile publish the same fields", async () => {
  // They disagreed. The profile route used an allow-list; the directory used a
  // list of fields to delete, which fails open -- every column added to
  // service_provider_profiles reached the public directory until somebody
  // remembered to extend the array.
  const listing = await read("app/api/service-providers/route.ts");
  assert.match(listing, /profiles\.map\(toPublicProviderProfile\)/, "the directory must use the shared allow-list");
  assert.doesNotMatch(listing, /delete safe\[key\]/, "a deny-list here is what let suspended_at through");
});

test("the allow-list withholds the fields that identify or expose a provider", async () => {
  const dto = await read("lib/services/public-dto.ts");
  const profile = dto.slice(dto.indexOf("toPublicProviderProfile"), dto.indexOf("toPublicProviderCategory"));

  for (const field of [
    "user_id", "email", "phone", "whatsapp",       // contact details and identity
    "latitude", "longitude",                        // an exact home or office location
    "tax_number", "commercial_registration",        // registration identifiers
    "licenses_text", "insurance_text",              // documents
    "rejection_reason",                             // why an application was refused
    "suspended_at",                                 // that a provider was suspended, and when
  ]) {
    assert.doesNotMatch(profile, new RegExp(`\b${field}\b`), `${field} must not be published`);
  }
});

test("an administrator still sees the whole row", async () => {
  // The filtering is for the public, not for the people who moderate the
  // marketplace and need the contact details to do it.
  const listing = await read("app/api/service-providers/route.ts");
  assert.match(listing, /admin \? profiles : profiles\.map\(toPublicProviderProfile\)/);
});
