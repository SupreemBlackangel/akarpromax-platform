import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import {
  getAdminOverview,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  listCategoriesFull,
  getCategoryById,
  setProviderStatus,
  getProviderProfileById,
  createReport,
  listReports,
  resolveReport,
  notify,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadNotificationsCount,
} from "../lib/services/marketplace.ts";
import {
  rekeyServiceUserReferences,
  augmentPermissionsForServiceProviderCapability,
  serviceProviderCapabilityPermissions,
} from "../lib/services/identity.ts";

const ADMIN = { userId: "admin@example.com", ip: "127.0.0.1" };

test.beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
});

test("getAdminOverview counts providers, requests, offers, orders and reports", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [
    { id: "p1", status: "submitted" },
    { id: "p2", status: "under_review" },
    { id: "p3", status: "approved" },
    { id: "p4", status: "rejected" },
  ]);
  db.seed("service_requests", [
    { id: "r1", status: "published" },
    { id: "r2", status: "draft" },
    { id: "r3", status: "cancelled" },
    { id: "r4", status: "receiving_offers" },
  ]);
  db.seed("service_offers", [
    { id: "o1", status: "sent" },
    { id: "o2", status: "withdrawn" },
  ]);
  db.seed("service_orders", [
    { id: "j1", status: "in_progress" },
    { id: "j2", status: "delivered" },
    { id: "j3", status: "cancelled" },
  ]);
  db.seed("service_reports", [
    { id: "rep1", status: "open" },
    { id: "rep2", status: "in_review" },
    { id: "rep3", status: "resolved" },
  ]);

  const overview = await getAdminOverview();
  assert.equal(overview.pendingProviders, 2);
  assert.equal(overview.approvedProviders, 1);
  assert.equal(overview.publishedRequests, 2);
  assert.equal(overview.openOffers, 1);
  assert.equal(overview.activeJobs, 2);
  assert.equal(overview.openReports, 2);
  assert.equal(overview.totalRequests, 4);
  assert.equal(overview.totalOffers, 2);
  assert.equal(overview.totalJobs, 3);
});

test("approving a provider updates the profile, notifies the owner and writes an audit entry", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [{ id: "p1", user_id: "provider@example.com", status: "under_review", rejection_reason: null, approved_at: null }]);

  await setProviderStatus("p1", "approved", null, ADMIN);

  const profile = await getProviderProfileById("p1");
  assert.equal(profile.status, "approved");
  assert.ok(profile.approved_at, "approved_at should be stamped");

  const notifications = await listNotifications("provider@example.com");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "PROVIDER_APPROVED");

  const audit = db.dump("audit_logs");
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, "service_provider.status.approved");
  assert.equal(audit[0].entity_type, "service_provider_profiles");
  assert.equal(audit[0].entity_id, "p1");
  assert.equal(audit[0].actor_user_id, ADMIN.userId);
});

test("rejecting a provider records the reason and a PROVIDER_REJECTED notification", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [{ id: "p1", user_id: "provider@example.com", status: "under_review", rejection_reason: null }]);

  await setProviderStatus("p1", "rejected", "وثائق غير مكتملة", ADMIN);

  const profile = await getProviderProfileById("p1");
  assert.equal(profile.status, "rejected");
  assert.equal(profile.rejection_reason, "وثائق غير مكتملة");

  const notifications = await listNotifications("provider@example.com");
  assert.equal(notifications[0].type, "PROVIDER_REJECTED");

  const audit = db.dump("audit_logs");
  assert.equal(audit[0].action, "service_provider.status.rejected");
});

test("setProviderStatus throws PROVIDER_NOT_FOUND for unknown ids", async () => {
  setServicesDbForTesting(createInMemoryDb());
  await assert.rejects(() => setProviderStatus("missing", "approved", null, ADMIN), /PROVIDER_NOT_FOUND/);
});

test("service categories support the full CRUD lifecycle with conflict and guard errors", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());

  const id = await createServiceCategory(
    { countryCode: "OM", code: "ac-repair", nameAr: "إصلاح مكيفات", nameEn: "AC Repair", requiresLicense: true, sortOrder: 3 },
    ADMIN,
  );
  assert.ok(id);

  assert.equal((await listCategoriesFull("OM")).length, 1);
  const byId = await getCategoryById(id);
  assert.equal(byId.code, "ac-repair");
  assert.equal(byId.requires_license, 1);

  await updateServiceCategory(id, { nameEn: "AC Repair & Maintenance", priceMin: 10 }, ADMIN);
  assert.equal((await getCategoryById(id)).name_en, "AC Repair & Maintenance");
  assert.equal((await getCategoryById(id)).price_min, 10);

  await assert.rejects(
    () => createServiceCategory({ countryCode: "OM", code: "AC-REPAIR", nameEn: "Duplicate" }, ADMIN),
    /CATEGORY_CONFLICT/,
  );

  const childId = await createServiceCategory({ countryCode: "OM", code: "ac-repair-maintenance", parentId: id, nameEn: "Child" }, ADMIN);
  await assert.rejects(() => deleteServiceCategory(id, ADMIN), /CATEGORY_HAS_CHILDREN/);

  db.seed("service_listings", [{ id: "l1", category_id: childId, status: "active" }]);
  await assert.rejects(() => deleteServiceCategory(childId, ADMIN), /CATEGORY_IN_USE/);
  db.clear("service_listings");

  await deleteServiceCategory(childId, ADMIN);
  assert.equal(await getCategoryById(childId), null);

  await assert.rejects(() => deleteServiceCategory(childId, ADMIN), /CATEGORY_NOT_FOUND/);

  const audit = db.dump("audit_logs");
  const actions = audit.map((entry) => entry.action);
  assert.ok(actions.includes("service_category.create"));
  assert.ok(actions.includes("service_category.update"));
  assert.ok(actions.includes("service_category.delete"));
});

test("reports can be listed, created once and resolved with an audit trail", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_reports", [
    { id: "rep1", target_type: "review", target_id: "rv1", reporter_user_id: "u1", reason: "spam", status: "open", resolution_note: null },
    { id: "rep2", target_type: "provider", target_id: "p9", reporter_user_id: "u2", reason: "fake", status: "in_review" },
  ]);

  const open = await listReports({ status: "open" });
  assert.equal(open.length, 1);
  assert.equal(open[0].id, "rep1");

  const limited = await listReports({ limit: 1 });
  assert.equal(limited.length, 1);

  await assert.rejects(
    () => createReport({ targetType: "review", targetId: "rv1", reporterUserId: "u1", reason: "duplicate" }),
    /REPORT_ALREADY_EXISTS/,
  );

  const reportId = await createReport({ targetType: "review", targetId: "rv2", reporterUserId: "u3", reason: "offensive" }, ADMIN);
  assert.ok(reportId);

  await resolveReport("rep1", { resolution: "تمت المعالجة", action: null, actor: ADMIN }, "moderator@example.com");
  const resolved = db.dump("service_reports").find((r) => r.id === "rep1");
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolved_by, "moderator@example.com");
  assert.equal(resolved.resolution_note, "تمت المعالجة");

  const audit = db.dump("audit_logs");
  const actions = audit.map((entry) => entry.action);
  assert.ok(actions.includes("service_report.create"));
  assert.ok(actions.includes("service_report.resolve"));

  await assert.rejects(() => resolveReport("missing", { resolution: "x", actor: ADMIN }), /REPORT_NOT_FOUND/);
});

test("notifications are created, listed newest-first, read individually and in bulk", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());

  await notify("u1", { type: "A", title: "first" });
  await notify("u1", { type: "B", title: "second" });
  await notify("u2", { type: "C", title: "other user" });

  assert.equal(await unreadNotificationsCount("u1"), 2);

  const list = await listNotifications("u1");
  assert.equal(list.length, 2);

  const ids = list.map((n) => n.id);
  await markNotificationRead(ids[0], "u1");
  assert.equal(await unreadNotificationsCount("u1"), 1);

  await markNotificationRead(ids[0], "u2");
  assert.equal(await unreadNotificationsCount("u1"), 1, "read flag must be scoped to the owner");

  await markAllNotificationsRead("u1");
  assert.equal(await unreadNotificationsCount("u1"), 0);
  assert.equal(await unreadNotificationsCount("u2"), 1);

  const notifications = db.dump("service_notifications");
  assert.equal(notifications.filter((n) => n.user_id === "u1" && n.is_read === 1).length, 2);
});

test("service identity rekey updates all ownership and participant references", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [{ id: "p1", user_id: "old@example.com", email: "old@example.com" }]);
  db.seed("service_requests", [{ id: "r1", customer_user_id: "old@example.com" }]);
  db.seed("service_offers", [{ id: "o1", request_id: "r1", provider_user_id: "old@example.com" }]);
  db.seed("service_orders", [{ id: "j1", request_id: "r1", offer_id: "o1", customer_user_id: "old@example.com", provider_user_id: "old@example.com" }]);
  db.seed("service_messages", [{ id: "m1", sender_user_id: "old@example.com" }]);
  db.seed("service_reviews", [{ id: "rv1", reviewer_user_id: "old@example.com", reviewee_user_id: "old@example.com" }]);
  db.seed("service_disputes", [{ id: "d1", opened_by_user_id: "old@example.com" }]);
  db.seed("service_bookmarks", [{ id: "b1", user_id: "old@example.com" }]);
  db.seed("service_request_attachments", [{ id: "a1", uploaded_by: "old@example.com" }]);
  db.seed("service_request_status_history", [{ id: "h1", changed_by: "old@example.com" }]);
  db.seed("service_offer_revisions", [{ id: "or1", provider_user_id: "old@example.com", created_by: "old@example.com" }]);
  db.seed("service_job_timeline", [{ id: "t1", actor_user_id: "old@example.com" }]);
  db.seed("service_reports", [{ id: "rp1", reporter_user_id: "old@example.com", resolved_by: "old@example.com" }]);
  db.seed("service_notifications", [{ id: "n1", user_id: "old@example.com" }]);
  db.seed("service_provider_documents", [{ id: "pd1", verified_by: "old@example.com", uploaded_by: "old@example.com" }]);

  const result = await rekeyServiceUserReferences("old@example.com", "new@example.com");
  assert.equal(result.oldUserKey, "old@example.com");
  assert.equal(result.newUserKey, "new@example.com");

  assert.equal(db.dump("service_provider_profiles")[0].user_id, "new@example.com");
  assert.equal(db.dump("service_provider_profiles")[0].email, "new@example.com");
  assert.equal(db.dump("service_requests")[0].customer_user_id, "new@example.com");
  assert.equal(db.dump("service_offers")[0].provider_user_id, "new@example.com");
  assert.equal(db.dump("service_orders")[0].customer_user_id, "new@example.com");
  assert.equal(db.dump("service_orders")[0].provider_user_id, "new@example.com");
  assert.equal(db.dump("service_messages")[0].sender_user_id, "new@example.com");
  assert.equal(db.dump("service_reviews")[0].reviewer_user_id, "new@example.com");
  assert.equal(db.dump("service_reviews")[0].reviewee_user_id, "new@example.com");
  assert.equal(db.dump("service_disputes")[0].opened_by_user_id, "new@example.com");
  assert.equal(db.dump("service_bookmarks")[0].user_id, "new@example.com");
  assert.equal(db.dump("service_request_attachments")[0].uploaded_by, "new@example.com");
  assert.equal(db.dump("service_request_status_history")[0].changed_by, "new@example.com");
  assert.equal(db.dump("service_offer_revisions")[0].provider_user_id, "new@example.com");
  assert.equal(db.dump("service_offer_revisions")[0].created_by, "new@example.com");
  assert.equal(db.dump("service_job_timeline")[0].actor_user_id, "new@example.com");
  assert.equal(db.dump("service_reports")[0].reporter_user_id, "new@example.com");
  assert.equal(db.dump("service_reports")[0].resolved_by, "new@example.com");
  assert.equal(db.dump("service_notifications")[0].user_id, "new@example.com");
  assert.equal(db.dump("service_provider_documents")[0].verified_by, "new@example.com");
  assert.equal(db.dump("service_provider_documents")[0].uploaded_by, "new@example.com");
});

test("approved provider capability augments viewer permissions without changing the base auth role", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [{ id: "p1", user_id: "viewer@example.com", status: "approved" }]);
  const permissions = await augmentPermissionsForServiceProviderCapability("viewer@example.com", ["tools.use"]);
  assert.ok(permissions.includes("service_offers.manage_own"));
  assert.ok(permissions.includes("service_jobs.manage_own"));
  assert.ok(permissions.includes("tools.use"));
});

test("only approved provider capability grants provider action permissions", async () => {
  const draftPermissions = serviceProviderCapabilityPermissions("draft");
  const approvedPermissions = serviceProviderCapabilityPermissions("approved");
  assert.equal(draftPermissions.includes("service_offers.manage_own"), false);
  assert.equal(approvedPermissions.includes("service_offers.manage_own"), true);
});
