import { getServicesDb } from "@/lib/services/db";
import { ROLE_CATALOG } from "@/src/constants/roles";

export type ServiceIdentityRekeyResult = {
  oldUserKey: string;
  newUserKey: string;
  updates: Record<string, number>;
};

export type ServiceProviderCapability = {
  providerId: string;
  status: string;
};

async function countChanges(db: D1Database, sql: string, values: unknown[]): Promise<number> {
  const result = await db.prepare(sql).bind(...values).run();
  return Number(result.meta?.changes ?? 0);
}

export function serviceProviderCapabilityPermissions(status: string | null | undefined): string[] {
  return status === "approved" ? [...ROLE_CATALOG.service_provider.permissions] : [];
}

export async function getServiceProviderCapabilityByUserKey(userKey: string | null | undefined): Promise<ServiceProviderCapability | null> {
  if (!userKey) return null;
  const db = await getServicesDb();
  const row = await db
    .prepare("SELECT id, status FROM service_provider_profiles WHERE user_id = ?1 LIMIT 1")
    .bind(userKey)
    .first<{ id: string; status: string | null }>();
  if (!row) return null;
  return {
    providerId: row.id,
    status: row.status ?? "draft",
  };
}

export async function augmentPermissionsForServiceProviderCapability(userKey: string | null | undefined, permissions: readonly string[]): Promise<string[]> {
  const capability = await getServiceProviderCapabilityByUserKey(userKey);
  if (!capability) return [...permissions];
  return [...new Set([...permissions, ...serviceProviderCapabilityPermissions(capability.status)])];
}

export async function rekeyServiceUserReferences(oldUserKey: string, newUserKey: string): Promise<ServiceIdentityRekeyResult> {
  if (!oldUserKey || !newUserKey || oldUserKey === newUserKey) {
    return { oldUserKey, newUserKey, updates: {} };
  }

  const db = await getServicesDb();
  const updates: Record<string, number> = {};

  updates.service_provider_profiles_user_id = await countChanges(db, "UPDATE service_provider_profiles SET user_id = ?1 WHERE user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_provider_profiles_email = await countChanges(db, "UPDATE service_provider_profiles SET email = ?1 WHERE email = ?2", [newUserKey, oldUserKey]);
  updates.service_requests_customer = await countChanges(db, "UPDATE service_requests SET customer_user_id = ?1 WHERE customer_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_offers_provider = await countChanges(db, "UPDATE service_offers SET provider_user_id = ?1 WHERE provider_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_orders_customer = await countChanges(db, "UPDATE service_orders SET customer_user_id = ?1 WHERE customer_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_orders_provider = await countChanges(db, "UPDATE service_orders SET provider_user_id = ?1 WHERE provider_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_messages_sender = await countChanges(db, "UPDATE service_messages SET sender_user_id = ?1 WHERE sender_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_message_participants_user = await countChanges(db, "UPDATE service_message_participants SET user_id = ?1 WHERE user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_reviews_reviewer = await countChanges(db, "UPDATE service_reviews SET reviewer_user_id = ?1 WHERE reviewer_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_reviews_reviewee = await countChanges(db, "UPDATE service_reviews SET reviewee_user_id = ?1 WHERE reviewee_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_disputes_opened_by = await countChanges(db, "UPDATE service_disputes SET opened_by_user_id = ?1 WHERE opened_by_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_bookmarks_user = await countChanges(db, "UPDATE service_bookmarks SET user_id = ?1 WHERE user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_request_attachments_uploaded_by = await countChanges(db, "UPDATE service_request_attachments SET uploaded_by = ?1 WHERE uploaded_by = ?2", [newUserKey, oldUserKey]);
  updates.service_request_history_changed_by = await countChanges(db, "UPDATE service_request_status_history SET changed_by = ?1 WHERE changed_by = ?2", [newUserKey, oldUserKey]);
  updates.service_offer_revisions_provider = await countChanges(db, "UPDATE service_offer_revisions SET provider_user_id = ?1 WHERE provider_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_offer_revisions_created_by = await countChanges(db, "UPDATE service_offer_revisions SET created_by = ?1 WHERE created_by = ?2", [newUserKey, oldUserKey]);
  updates.service_job_timeline_actor = await countChanges(db, "UPDATE service_job_timeline SET actor_user_id = ?1 WHERE actor_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_reports_reporter = await countChanges(db, "UPDATE service_reports SET reporter_user_id = ?1 WHERE reporter_user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_reports_resolved_by = await countChanges(db, "UPDATE service_reports SET resolved_by = ?1 WHERE resolved_by = ?2", [newUserKey, oldUserKey]);
  updates.service_notifications_user = await countChanges(db, "UPDATE service_notifications SET user_id = ?1 WHERE user_id = ?2", [newUserKey, oldUserKey]);
  updates.service_provider_documents_verified_by = await countChanges(db, "UPDATE service_provider_documents SET verified_by = ?1 WHERE verified_by = ?2", [newUserKey, oldUserKey]);
  updates.service_provider_documents_uploaded_by = await countChanges(db, "UPDATE service_provider_documents SET uploaded_by = ?1 WHERE uploaded_by = ?2", [newUserKey, oldUserKey]);

  return { oldUserKey, newUserKey, updates };
}
