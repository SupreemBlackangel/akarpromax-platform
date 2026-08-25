import crypto from "node:crypto";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
const BASE = process.env.ORGANIZATIONS_E2E_BASE || "http://127.0.0.1:3015";

if (!DATABASE_URL) {
  console.error("ORGANIZATIONS F2 E2E: FAIL - DATABASE_URL missing");
  process.exit(2);
}

const sql = postgres(DATABASE_URL, { max: 6, prepare: false });
const stamp = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const password = `Akar!${crypto.randomBytes(9).toString("hex")}`;
const checks = [];

const ids = {
  users: [],
  organizations: [],
};

function ok(condition, name, detail = "") {
  if (!condition) throw new Error(`${name}${detail ? ` :: ${detail}` : ""}`);
  checks.push(name);
  console.log(`PASS  ${name}`);
}

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    Origin: BASE,
    ...(options.headers || {}),
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.cookie) headers.Cookie = options.cookie;

  const response = await fetch(`${BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });

  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: response.status, response, text, json };
}

function sessionCookie(response) {
  const list = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const hit = list.find((value) => value.startsWith("akar_session="));
  return hit ? hit.split(";", 1)[0] : null;
}

async function createUser(label, role = "user") {
  const email = `org.${label}.${stamp}@example.invalid`;
  const hash = await bcrypt.hash(password, 12);
  const [row] = await sql`
    insert into users
      (email, email_verified_at, name, password_hash, role, status, is_active, preferred_language, created_at)
    values
      (${email}, now(), ${`Organizations E2E ${label}`}, ${hash}, ${role}, 'active', true, 'ar', now())
    returning id, email
  `;
  ids.users.push(row.id);
  return row;
}

async function login(user) {
  const r = await api("/api/auth/login", {
    method: "POST",
    body: { email: user.email, password },
  });
  ok(r.status === 200, `LOGIN ${user.email}`);
  const cookie = sessionCookie(r.response);
  ok(Boolean(cookie), `SESSION COOKIE ${user.email}`);
  return cookie;
}

async function createOrg(cookie, type, label) {
  const r = await api("/api/amrs/organizations", {
    method: "POST",
    cookie,
    body: {
      nameAr: `منظمة اختبار ${label} ${stamp}`,
      type,
      classification: "startup",
      countryCode: "SA",
    },
  });
  ok(r.status === 201, `CREATE ${type} ORGANIZATION`, `${r.status} ${r.text}`);
  const org = r.json?.organization;
  ok(Boolean(org?.id), `ORGANIZATION UUID ${label}`);
  ids.organizations.push(org.id);
  ok(org.status === "draft", `ORGANIZATION STARTS DRAFT ${label}`);
  return org;
}

async function cleanup() {
  console.log("");
  console.log("CLEANUP...");
  try {
    if (ids.organizations.length) {
      await sql`delete from audit_events where detail->>'organizationId' = any(${ids.organizations})`;
      await sql`delete from verification_records where entity_type = 'organization' and entity_id = any(${ids.organizations}::uuid[])`;
      await sql`delete from organizations where id = any(${ids.organizations}::uuid[])`;
    }
    if (ids.users.length) {
      await sql`delete from session_revocations where user_id = any(${ids.users}::uuid[])`;
      await sql`delete from audit_events where user_id = any(${ids.users}::uuid[])`;
      await sql`delete from users where id = any(${ids.users}::uuid[])`;
    }
    console.log("CLEANUP: DONE");
  } catch (error) {
    console.error("CLEANUP: FAIL", error);
  }
}

try {
  const owner = await createUser("owner");
  const outsider = await createUser("outsider");
  const reviewer1 = await createUser("reviewer1", "super_admin");
  const reviewer2 = await createUser("reviewer2", "super_admin");
  const employee = await createUser("employee");

  const ownerCookie = await login(owner);
  const outsiderCookie = await login(outsider);
  const reviewer1Cookie = await login(reviewer1);
  const reviewer2Cookie = await login(reviewer2);
  const employeeCookie = await login(employee);

  // ------------------------------------------------------------
  // Organization lifecycle.
  // ------------------------------------------------------------
  const office = await createOrg(ownerCookie, "real_estate", "office");

  let r = await api(`/api/amrs/organizations/${office.id}/submit`, {
    method: "POST",
    cookie: outsiderCookie,
  });
  ok(r.status === 403, "OUTSIDER CANNOT SUBMIT ORGANIZATION");

  r = await api(`/api/amrs/organizations/${office.id}/submit`, {
    method: "POST",
    cookie: ownerCookie,
  });
  ok(r.status === 200 && r.json?.organization?.status === "pending_review", "OWNER SUBMITS ORGANIZATION");

  r = await api(`/api/amrs/organizations/${office.id}/submit`, {
    method: "POST",
    cookie: ownerCookie,
  });
  ok(r.status === 409, "DOUBLE ORGANIZATION SUBMIT BLOCKED");

  r = await api(`/api/admin/organizations/${office.id}/review`, {
    method: "PATCH",
    cookie: outsiderCookie,
    body: { action: "approve" },
  });
  ok(r.status === 403, "NON-ADMIN ORGANIZATION REVIEW BLOCKED");

  r = await api(`/api/admin/organizations/${office.id}/review`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "approve" },
  });
  ok(r.status === 200 && r.json?.organization?.status === "active", "INDEPENDENT ADMIN APPROVES ORGANIZATION");

  const [approvedOffice] = await sql`select status, approved_at from organizations where id = ${office.id}`;
  ok(approvedOffice.status === "active" && Boolean(approvedOffice.approved_at), "ORGANIZATION APPROVAL PERSISTED");

  // Self review protection.
  const reviewerOwned = await createOrg(reviewer1Cookie, "business", "reviewer-owned");
  r = await api(`/api/amrs/organizations/${reviewerOwned.id}/submit`, {
    method: "POST",
    cookie: reviewer1Cookie,
  });
  ok(r.status === 200, "REVIEWER-OWNED ORG SUBMITTED");

  r = await api(`/api/admin/organizations/${reviewerOwned.id}/review`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "approve" },
  });
  ok(r.status === 403, "ADMIN CANNOT APPROVE OWN ORGANIZATION");

  r = await api(`/api/admin/organizations/${reviewerOwned.id}/review`, {
    method: "PATCH",
    cookie: reviewer2Cookie,
    body: { action: "reject" },
  });
  ok(r.status === 400, "ORGANIZATION REJECTION REQUIRES REASON");

  r = await api(`/api/admin/organizations/${reviewerOwned.id}/review`, {
    method: "PATCH",
    cookie: reviewer2Cookie,
    body: { action: "reject", reason: "E2E incomplete evidence" },
  });
  ok(r.status === 200 && r.json?.organization?.status === "rejected", "ORGANIZATION REJECTION WITH REASON");

  // ------------------------------------------------------------
  // Membership authorization.
  // ------------------------------------------------------------
  r = await api(`/api/amrs/organizations/${office.id}/members`, {
    method: "POST",
    cookie: ownerCookie,
    body: { userId: employee.id, role: "manager" },
  });
  ok(r.status === 201, "OWNER ADDS MANAGER");
  const employeeMembership = r.json?.membership;
  ok(Boolean(employeeMembership?.id), "MANAGER MEMBERSHIP PERSISTED");

  r = await api(`/api/amrs/organizations/${office.id}/members`, {
    method: "POST",
    cookie: outsiderCookie,
    body: { userId: outsider.id, role: "member" },
  });
  ok(r.status === 403, "OUTSIDER CANNOT ADD ORGANIZATION MEMBER");

  r = await api(`/api/amrs/organizations/${office.id}/members`, {
    method: "POST",
    cookie: ownerCookie,
    body: { userId: employee.id, role: "manager" },
  });
  ok(r.status === 409, "DUPLICATE ACTIVE MEMBERSHIP BLOCKED");

  const mine = await api("/api/amrs/organizations?mine=1", { cookie: employeeCookie });
  ok(mine.status === 200, "MY ORGANIZATIONS API");
  ok((mine.json?.organizations || []).some((x) => x.id === office.id), "MY ORGANIZATIONS MEMBERSHIP FILTER");

  // ------------------------------------------------------------
  // Verification subject authorization.
  // ------------------------------------------------------------
  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: outsiderCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "organization",
      countryCode: "SA",
    },
  });
  ok(r.status === 403, "OUTSIDER CANNOT SUBMIT ORGANIZATION VERIFICATION");

  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: employeeCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "organization",
      countryCode: "SA",
    },
  });
  ok(r.status === 403, "MANAGER CANNOT IMPERSONATE VERIFICATION OWNER/ADMIN");

  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "email",
      countryCode: "SA",
    },
  });
  ok(r.status === 400, "INVALID ORGANIZATION VERIFICATION TYPE BLOCKED");

  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "organization",
      countryCode: "SA",
    },
  });
  ok(r.status === 201, "OWNER SUBMITS ORGANIZATION VERIFICATION");
  const verification1 = r.json?.record;
  ok(Boolean(verification1?.id), "VERIFICATION UUID");

  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "organization",
      countryCode: "SA",
    },
  });
  ok(r.status === 409, "DUPLICATE PENDING VERIFICATION BLOCKED");

  r = await api(`/api/amrs/verification?entityType=organization&entityId=${office.id}`, {
    cookie: outsiderCookie,
  });
  ok(r.status === 403, "OUTSIDER CANNOT READ PRIVATE VERIFICATION RECORDS");

  r = await api(`/api/amrs/verification?entityType=organization&entityId=${office.id}`, {
    cookie: ownerCookie,
  });
  ok(r.status === 200 && (r.json?.records || []).some((x) => x.id === verification1.id), "OWNER READS OWN ORGANIZATION VERIFICATION");

  // ------------------------------------------------------------
  // Verification admin lifecycle + race safety.
  // ------------------------------------------------------------
  r = await api("/api/admin/verifications?status=pending", { cookie: outsiderCookie });
  ok(r.status === 403, "NON-ADMIN CANNOT LIST VERIFICATION QUEUE");

  r = await api("/api/admin/verifications?status=pending", { cookie: reviewer1Cookie });
  ok(r.status === 200, "ADMIN VERIFICATION QUEUE");
  ok((r.json?.records || []).some((x) => x.id === verification1.id), "PENDING VERIFICATION IN ADMIN QUEUE");

  const concurrent = await Promise.all([
    api(`/api/admin/verifications/${verification1.id}`, {
      method: "PATCH",
      cookie: reviewer1Cookie,
      body: { action: "approve", expiresInDays: 365 },
    }),
    api(`/api/admin/verifications/${verification1.id}`, {
      method: "PATCH",
      cookie: reviewer2Cookie,
      body: { action: "approve", expiresInDays: 365 },
    }),
  ]);

  const statuses = concurrent.map((x) => x.status).sort((a, b) => a - b);
  ok(statuses[0] === 200 && statuses[1] === 409, "CONCURRENT DOUBLE APPROVAL RESOLVES ONCE");

  const [verifiedRow] = await sql`
    select status, verified_at, verified_by, expires_at
    from verification_records
    where id = ${verification1.id}
  `;
  ok(verifiedRow.status === "verified", "VERIFICATION APPROVAL PERSISTED");
  ok(Boolean(verifiedRow.verified_at) && Boolean(verifiedRow.verified_by), "VERIFICATION REVIEWER + TIMESTAMP PERSISTED");
  ok(Boolean(verifiedRow.expires_at), "VERIFICATION EXPIRY PERSISTED");

  const [officeAfterVerify] = await sql`select verified_at from organizations where id = ${office.id}`;
  ok(Boolean(officeAfterVerify.verified_at), "ORGANIZATION VERIFIED_AT SYNCHRONIZED");

  const organizers = await api("/api/auctions/organizers", { cookie: ownerCookie });
  ok(organizers.status === 200, "CLOSED AUCTION ORGANIZERS API");
  ok((organizers.json?.data || []).some((x) => x.id === office.id), "VERIFIED OFFICE ELIGIBLE AS CLOSED AUCTION ORGANIZER");

  // Reviewer who becomes organization admin must not review that subject.
  r = await api(`/api/amrs/organizations/${office.id}/members`, {
    method: "POST",
    cookie: ownerCookie,
    body: { userId: reviewer2.id, role: "admin" },
  });
  ok(r.status === 201, "OWNER ADDS SECOND REVIEWER AS ORG ADMIN");

  r = await api(`/api/admin/verifications/${verification1.id}`, {
    method: "PATCH",
    cookie: reviewer2Cookie,
    body: { action: "revoke", reason: "E2E self-review guard" },
  });
  ok(r.status === 403, "ORG MEMBER ADMIN CANNOT REVIEW OWN SUBJECT");

  r = await api(`/api/admin/verifications/${verification1.id}`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "revoke" },
  });
  ok(r.status === 400, "REVOCATION REQUIRES REASON");

  r = await api(`/api/admin/verifications/${verification1.id}`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "revoke", reason: "E2E revoke verified organization" },
  });
  ok(r.status === 200 && r.json?.record?.status === "revoked", "INDEPENDENT ADMIN REVOKES VERIFICATION");

  const [officeAfterRevoke] = await sql`select verified_at from organizations where id = ${office.id}`;
  ok(officeAfterRevoke.verified_at === null, "REVOKE CLEARS ORGANIZATION VERIFIED_AT");

  const organizersAfterRevoke = await api("/api/auctions/organizers", { cookie: ownerCookie });
  ok(!(organizersAfterRevoke.json?.data || []).some((x) => x.id === office.id), "REVOKED OFFICE REMOVED FROM CLOSED AUCTION ORGANIZERS");

  // ------------------------------------------------------------
  // Re-submit, reject with reason, resubmit, approve, expire.
  // ------------------------------------------------------------
  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "organization",
      countryCode: "SA",
    },
  });
  ok(r.status === 201, "RESUBMIT AFTER REVOCATION");
  const verification2 = r.json?.record;

  r = await api(`/api/admin/verifications/${verification2.id}`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "reject" },
  });
  ok(r.status === 400, "VERIFICATION REJECTION REQUIRES REASON");

  r = await api(`/api/admin/verifications/${verification2.id}`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "reject", reason: "E2E evidence rejected" },
  });
  ok(r.status === 200 && r.json?.record?.status === "failed", "VERIFICATION REJECTED WITH REASON");

  r = await api("/api/amrs/verification", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      entityType: "organization",
      entityId: office.id,
      type: "organization",
      countryCode: "SA",
    },
  });
  ok(r.status === 201, "RESUBMIT AFTER REJECTION");
  const verification3 = r.json?.record;

  r = await api(`/api/admin/verifications/${verification3.id}`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "approve", expiresInDays: 30 },
  });
  ok(r.status === 200 && r.json?.record?.status === "verified", "VERIFICATION REAPPROVED");

  await sql`update verification_records set expires_at = now() - interval '1 minute' where id = ${verification3.id}`;

  r = await api("/api/admin/verifications/expire", {
    method: "POST",
    cookie: outsiderCookie,
  });
  ok(r.status === 403, "NON-ADMIN CANNOT EXPIRE VERIFICATIONS");

  r = await api("/api/admin/verifications/expire", {
    method: "POST",
    cookie: reviewer1Cookie,
  });
  ok(r.status === 200 && Number(r.json?.expired) >= 1, "ADMIN EXPIRES DUE VERIFICATIONS");

  const [expiredRow] = await sql`select status from verification_records where id = ${verification3.id}`;
  ok(expiredRow.status === "expired", "EXPIRED STATUS PERSISTED");

  const [officeAfterExpire] = await sql`select verified_at from organizations where id = ${office.id}`;
  ok(officeAfterExpire.verified_at === null, "EXPIRY CLEARS ORGANIZATION VERIFIED_AT");

  const organizersAfterExpire = await api("/api/auctions/organizers", { cookie: ownerCookie });
  ok(!(organizersAfterExpire.json?.data || []).some((x) => x.id === office.id), "EXPIRED OFFICE NOT CLOSED AUCTION ORGANIZER");

  // ------------------------------------------------------------
  // Suspension and public privacy.
  // ------------------------------------------------------------
  r = await api(`/api/admin/organizations/${office.id}/review`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "suspend" },
  });
  ok(r.status === 400, "SUSPENSION REQUIRES REASON");

  r = await api(`/api/admin/organizations/${office.id}/review`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "suspend", reason: "E2E compliance hold" },
  });
  ok(r.status === 200 && r.json?.organization?.status === "suspended", "ADMIN SUSPENDS ORGANIZATION");

  r = await api(`/api/offices/${office.id}`);
  ok(r.status === 404, "SUSPENDED OFFICE HIDDEN FROM PUBLIC DETAIL");

  r = await api(`/api/admin/organizations/${office.id}/review`, {
    method: "PATCH",
    cookie: reviewer1Cookie,
    body: { action: "reactivate" },
  });
  ok(r.status === 200 && r.json?.organization?.status === "active", "ADMIN REACTIVATES ORGANIZATION");

  // ------------------------------------------------------------
  // Durable audit trail.
  // ------------------------------------------------------------
  const audits = await sql`
    select event_type, detail
    from audit_events
    where
      (detail->>'organizationId' = ${office.id})
      or (detail->>'entityId' = ${office.id})
  `;
  const eventTypes = new Set(audits.map((x) => x.event_type));
  for (const event of [
    "ORGANIZATION_SUBMITTED",
    "ORGANIZATION_APPROVE",
    "ORGANIZATION_SUSPEND",
    "ORGANIZATION_REACTIVATE",
    "VERIFICATION_SUBMITTED",
    "VERIFICATION_APPROVE",
    "VERIFICATION_REVOKE",
    "VERIFICATION_REJECT",
  ]) {
    ok(eventTypes.has(event), `AUDIT EVENT ${event}`);
  }

  const [expireAudit] = await sql`
    select event_type, detail
    from audit_events
    where event_type = 'VERIFICATION_EXPIRE_BATCH'
      and user_id = ${reviewer1.id}
    order by created_at desc
    limit 1
  `;
  ok(Boolean(expireAudit), "AUDIT EVENT VERIFICATION_EXPIRE_BATCH");
  ok(
    Array.isArray(expireAudit.detail?.recordIds) &&
      expireAudit.detail.recordIds.includes(verification3.id),
    "AUDIT EXPIRY RECORD LINK",
  );

  const rejectionAudit = audits.find((x) => x.event_type === "VERIFICATION_REJECT");
  ok(Boolean(rejectionAudit?.detail?.reason), "VERIFICATION REJECTION REASON AUDITED");

  console.log("");
  console.log("======================================");
  console.log("ORGANIZATIONS F2 VERIFICATION E2E: PASS");
  console.log(`CHECKS: ${checks.length}/${checks.length}`);
  console.log("ORGANIZATION LIFECYCLE: PASS");
  console.log("MEMBERSHIP AUTHORIZATION: PASS");
  console.log("VERIFICATION LIFECYCLE: PASS");
  console.log("SELF-REVIEW PROTECTION: PASS");
  console.log("CONCURRENCY: PASS");
  console.log("AUCTION ORGANIZER INTEGRATION: PASS");
  console.log("AUDIT TRAIL: PASS");
  console.log("SAFE FOR ORGANIZATIONS F3 WORKSPACE/PUBLIC CLOSURE: YES");
  console.log("======================================");
} catch (error) {
  console.error("");
  console.error("======================================");
  console.error("ORGANIZATIONS F2 VERIFICATION E2E: FAIL");
  console.error(error?.stack || error);
  console.error("SAFE FOR ORGANIZATIONS LOCK: NO");
  console.error("======================================");
  process.exitCode = 1;
} finally {
  await cleanup();
  await sql.end({ timeout: 5 });
}
