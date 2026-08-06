import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { insertRow, getServicesDb } from "@services/db";
import { writeAudit } from "@services/audit";
import {
  isListingStatus,
  isOrderStatus,
  canTransition,
  REQUEST_STATUS,
  ORDER_STATUS,
  OFFER_STATUS,
  type OrderStatus,
} from "@services/constants";

export type ActorContext = { userId?: string | null; ip?: string | null };

export type GeoPoint = { latitude?: number | null; longitude?: number | null };

export function distanceKm(a: GeoPoint, b: GeoPoint): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* ---------- Categories ---------- */

export type NewCategory = {
  countryCode: string;
  code: string;
  parentId?: string | null;
  sortOrder?: number;
};

export async function createCategory(input: NewCategory, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const exists = await db
    .prepare("SELECT id FROM service_categories WHERE country_code = ?1 AND code = ?2")
    .bind(input.countryCode.toUpperCase(), input.code.trim().toLowerCase())
    .first<{ id: string }>();
  if (exists) throw new Error("CATEGORY_CONFLICT");
  const id = await insertRow(
    db,
    `INSERT INTO service_categories (id, parent_id, country_code, code, sort_order, is_active, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6)`,
    [
      crypto.randomUUID(),
      input.parentId ?? null,
      input.countryCode.toUpperCase(),
      input.code.trim().toLowerCase(),
      input.sortOrder ?? 0,
      nowMySqlDateTime(),
    ],
  );
  await writeAudit({ action: "service_category.create", entityType: "service_categories", entityId: id, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function listCategories(countryCode?: string, includeInactive = false): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  let sql = "SELECT * FROM service_categories";
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (!includeInactive) clauses.push("is_active = 1");
  if (countryCode) {
    clauses.push("country_code = ?1");
    params.push(countryCode.toUpperCase());
  }
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY sort_order ASC, code ASC";
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

/* ---------- Listings ---------- */

export type NewListing = {
  providerUserId: string;
  categoryId: string;
  countryCode: string;
  cityId: string;
  districtId?: string | null;
  titleKey?: string | null;
  descriptionKey?: string | null;
  price?: number;
  currency?: string;
  unit?: string;
  status?: string;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

export async function createListing(input: NewListing, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const id = await insertRow(
    db,
    `INSERT INTO service_listings
      (id, provider_user_id, category_id, country_code, city_id, district_id, latitude, longitude,
       title_key, description_key, price, currency, unit, status, is_featured, tags, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 0, ?15, ?16, ?16)`,
    [
      crypto.randomUUID(),
      input.providerUserId,
      input.categoryId,
      input.countryCode.toUpperCase(),
      input.cityId,
      input.districtId ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.titleKey ?? null,
      input.descriptionKey ?? null,
      input.price ?? 0,
      input.currency ?? "OMR",
      input.unit ?? "project",
      input.status ?? "active",
      input.tags ? JSON.stringify(input.tags) : null,
      nowMySqlDateTime(),
    ],
  );
  await writeAudit({ action: "service_listing.create", entityType: "service_listings", entityId: id, metadata: { categoryId: input.categoryId, countryCode: input.countryCode }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function updateListingStatus(listingId: string, status: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  if (!isListingStatus(status)) throw new Error("ORDER_STATUS_INVALID");
  const res = await db
    .prepare("UPDATE service_listings SET status = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(status, nowMySqlDateTime(), listingId)
    .run();
  if (Number(res.meta?.changes ?? 0) === 0) throw new Error("LISTING_NOT_FOUND");
  await writeAudit({ action: `service_listing.status.${status}`, entityType: "service_listings", entityId: listingId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function listListings(query: {
  categoryId?: string;
  countryCode?: string;
  cityId?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.categoryId) {
    params.push(query.categoryId);
    clauses.push(`category_id = ?${params.length}`);
  }
  if (query.countryCode) {
    params.push(query.countryCode.toUpperCase());
    clauses.push(`country_code = ?${params.length}`);
  }
  if (query.cityId) {
    params.push(query.cityId);
    clauses.push(`city_id = ?${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    clauses.push(`status = ?${params.length}`);
  } else {
    clauses.push("status = 'active'");
  }
  let sql = "SELECT * FROM service_listings";
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY is_featured DESC, updated_at DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  const rows = result.results ?? [];
  if (query.latitude != null && query.longitude != null && query.radiusKm) {
    return rows.filter((row) => {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
      const d = distanceKm({ latitude: lat, longitude: lng }, { latitude: query.latitude, longitude: query.longitude });
      return d === null || d <= (query.radiusKm ?? 50);
    });
  }
  return rows;
}

/* ---------- Requests ---------- */

export type NewRequest = {
  customerUserId: string;
  categoryId: string;
  countryCode: string;
  cityId: string;
  districtId?: string | null;
  titleKey?: string | null;
  descriptionKey?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function createRequest(input: NewRequest, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const id = await insertRow(
    db,
    `INSERT INTO service_requests
      (id, customer_user_id, category_id, country_code, city_id, district_id, latitude, longitude,
       title_key, description_key, budget_min, budget_max, currency, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'open', ?14, ?14)`,
    [
      crypto.randomUUID(),
      input.customerUserId,
      input.categoryId,
      input.countryCode.toUpperCase(),
      input.cityId,
      input.districtId ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.titleKey ?? null,
      input.descriptionKey ?? null,
      input.budgetMin ?? null,
      input.budgetMax ?? null,
      input.currency ?? "OMR",
      nowMySqlDateTime(),
    ],
  );
  await writeAudit({ action: "service_request.create", entityType: "service_requests", entityId: id, metadata: { categoryId: input.categoryId }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function getRequest(requestId: string): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  const row = await db.prepare("SELECT * FROM service_requests WHERE id = ?1").bind(requestId).first<Record<string, unknown>>();
  return row ?? null;
}

export async function cancelRequest(requestId: string, byUserId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const request = await getRequest(requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.customer_user_id !== byUserId) throw new Error("ONLY_CUSTOMER");
  if (request.status !== REQUEST_STATUS.OPEN) throw new Error("REQUEST_NOT_OPEN");
  await db
    .prepare("UPDATE service_requests SET status = 'cancelled', updated_at = ?1 WHERE id = ?2")
    .bind(nowMySqlDateTime(), requestId)
    .run();
  await writeAudit({ action: "service_request.cancel", entityType: "service_requests", entityId: requestId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function listRequests(query: {
  countryCode?: string;
  cityId?: string;
  categoryId?: string;
  status?: string;
  customerUserId?: string;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.countryCode) {
    params.push(query.countryCode.toUpperCase());
    clauses.push(`country_code = ?${params.length}`);
  }
  if (query.cityId) {
    params.push(query.cityId);
    clauses.push(`city_id = ?${params.length}`);
  }
  if (query.categoryId) {
    params.push(query.categoryId);
    clauses.push(`category_id = ?${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    clauses.push(`status = ?${params.length}`);
  } else {
    clauses.push(`status = '${REQUEST_STATUS.OPEN}'`);
  }
  if (query.customerUserId) {
    params.push(query.customerUserId);
    clauses.push(`customer_user_id = ?${params.length}`);
  }
  let sql = "SELECT * FROM service_requests";
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY created_at DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

/* ---------- Offers ---------- */

export type NewOffer = {
  requestId: string;
  providerUserId: string;
  listingId?: string | null;
  price: number;
  currency?: string;
  durationDays?: number | null;
  messageKey?: string | null;
};

export async function createOffer(input: NewOffer, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const request = await getRequest(input.requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== REQUEST_STATUS.OPEN) throw new Error("REQUEST_NOT_OPEN");
  const existing = await db
    .prepare("SELECT id FROM service_offers WHERE request_id = ?1 AND provider_user_id = ?2")
    .bind(input.requestId, input.providerUserId)
    .first<{ id: string }>();
  if (existing) throw new Error("OFFER_ALREADY_EXISTS");
  const id = await insertRow(
    db,
    `INSERT INTO service_offers
      (id, request_id, provider_user_id, listing_id, price, currency, duration_days, message_key, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'sent', ?9, ?9)`,
    [
      crypto.randomUUID(),
      input.requestId,
      input.providerUserId,
      input.listingId ?? null,
      input.price,
      input.currency ?? "OMR",
      input.durationDays ?? null,
      input.messageKey ?? null,
      nowMySqlDateTime(),
    ],
  );
  await db
    .prepare("UPDATE service_requests SET status = 'offered', updated_at = ?1 WHERE id = ?2")
    .bind(nowMySqlDateTime(), input.requestId)
    .run();
  await writeAudit({ action: "service_offer.create", entityType: "service_offers", entityId: id, metadata: { requestId: input.requestId }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function listOffers(requestId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_offers WHERE request_id = ?1 AND status != 'withdrawn' ORDER BY price ASC").bind(requestId).all<Record<string, unknown>>();
  return result.results ?? [];
}

/* ---------- Orders ---------- */

export async function acceptOffer(offerId: string, byUserId: string, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const offer = await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(offerId).first<Record<string, unknown>>();
  if (!offer) throw new Error("OFFER_NOT_FOUND");
  const request = await getRequest(String(offer.request_id));
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (String(request.customer_user_id) !== byUserId) throw new Error("ONLY_CUSTOMER");
  if (request.status !== REQUEST_STATUS.OPEN && request.status !== REQUEST_STATUS.OFFERED) throw new Error("REQUEST_NOT_OPEN");
  if (offer.status !== OFFER_STATUS.SENT) throw new Error("OFFER_NOT_SENT");

  const orderId = await insertRow(
    db,
    `INSERT INTO service_orders
      (id, request_id, offer_id, customer_user_id, provider_user_id, price, currency, status, accepted_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'accepted', ?8, ?8, ?8)`,
    [
      crypto.randomUUID(),
      offer.request_id,
      offer.id,
      request.customer_user_id,
      offer.provider_user_id,
      offer.price,
      offer.currency ?? "OMR",
      nowMySqlDateTime(),
    ],
  );
  await db
    .prepare("UPDATE service_offers SET status = 'accepted', updated_at = ?1 WHERE id = ?2")
    .bind(nowMySqlDateTime(), offerId)
    .run();
  await db
    .prepare("UPDATE service_requests SET status = 'ordered', updated_at = ?1 WHERE id = ?2")
    .bind(nowMySqlDateTime(), offer.request_id)
    .run();
  await db
    .prepare("UPDATE service_offers SET status = 'rejected', updated_at = ?1 WHERE request_id = ?2 AND id != ?3 AND status = 'sent'")
    .bind(nowMySqlDateTime(), offer.request_id, offerId)
    .run();
  await writeAudit({ action: "service_order.accept", entityType: "service_orders", entityId: orderId, metadata: { offerId, requestId: offer.request_id }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return orderId;
}

export async function updateOrderStatus(orderId: string, to: OrderStatus, byUserId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  if (!isOrderStatus(to)) throw new Error("ORDER_STATUS_INVALID");
  const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(orderId).first<Record<string, unknown>>();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const isCustomer = order.customer_user_id === byUserId;
  const isProvider = order.provider_user_id === byUserId;
  if (!isCustomer && !isProvider) throw new Error("NOT_PARTICIPANT");
  if (!canTransition(order.status as OrderStatus, to)) throw new Error("ORDER_STATUS_INVALID");

  const stampColumn: Record<string, string> = {
    [ORDER_STATUS.IN_PROGRESS]: "started_at",
    [ORDER_STATUS.COMPLETED]: "completed_at",
    [ORDER_STATUS.CANCELLED]: "cancelled_at",
  };
  const set = `status = ?1, ${stampColumn[to] ? `${stampColumn[to]} = ?2,` : ""} updated_at = ?${stampColumn[to] ? 3 : 2}`;
  const values: unknown[] = [to];
  if (stampColumn[to]) values.push(nowMySqlDateTime());
  values.push(nowMySqlDateTime());
  values.push(orderId);
  await db.prepare(`UPDATE service_orders SET ${set} WHERE id = ?${values.length}`).bind(...values).run();
  await writeAudit({ action: `service_order.status.${to}`, entityType: "service_orders", entityId: orderId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

/* ---------- Reviews ---------- */

export async function addReview(input: {
  orderId: string;
  reviewerUserId: string;
  revieweeUserId: string;
  rating: number;
  comment?: string | null;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("RATING_INVALID");
  const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(input.orderId).first<Record<string, unknown>>();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const existing = await db
    .prepare("SELECT id FROM service_reviews WHERE order_id = ?1 AND reviewer_user_id = ?2")
    .bind(input.orderId, input.reviewerUserId)
    .first<{ id: string }>();
  if (existing) throw new Error("REVIEW_ALREADY_EXISTS");
  const id = await insertRow(
    db,
    `INSERT INTO service_reviews (id, order_id, reviewer_user_id, reviewee_user_id, rating, comment, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    [crypto.randomUUID(), input.orderId, input.reviewerUserId, input.revieweeUserId, input.rating, input.comment ?? null, nowMySqlDateTime()],
  );
  await writeAudit({ action: "service_review.create", entityType: "service_reviews", entityId: id, metadata: { orderId: input.orderId, rating: input.rating }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function reviewsForReviewee(revieweeUserId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_reviews WHERE reviewee_user_id = ?1 ORDER BY created_at DESC").bind(revieweeUserId).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function providerAverageRating(providerUserId: string): Promise<{ avg: number; count: number }> {
  const db = await getServicesDb();
  const row = await db
    .prepare("SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count FROM service_reviews WHERE reviewee_user_id = ?1")
    .bind(providerUserId)
    .first<{ avg: number; count: number }>();
  return { avg: Number(row?.avg ?? 0), count: Number(row?.count ?? 0) };
}

/* ---------- Disputes ---------- */

export async function openDispute(input: {
  orderId: string;
  openedByUserId: string;
  reason: string;
  description?: string | null;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(input.orderId).first<Record<string, unknown>>();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.customer_user_id !== input.openedByUserId && order.provider_user_id !== input.openedByUserId) {
    throw new Error("NOT_PARTICIPANT");
  }
  const existing = await db.prepare("SELECT id FROM service_disputes WHERE order_id = ?1 AND status IN ('open','in_review')").bind(input.orderId).first<{ id: string }>();
  if (existing) throw new Error("DISPUTE_ALREADY_EXISTS");
  const id = await insertRow(
    db,
    `INSERT INTO service_disputes (id, order_id, opened_by_user_id, reason, description, status, opened_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'open', ?6, ?6, ?6)`,
    [crypto.randomUUID(), input.orderId, input.openedByUserId, input.reason, input.description ?? null, nowMySqlDateTime()],
  );
  await db.prepare("UPDATE service_orders SET status = 'disputed', updated_at = ?1 WHERE id = ?2").bind(nowMySqlDateTime(), input.orderId).run();
  await writeAudit({ action: "service_dispute.open", entityType: "service_disputes", entityId: id, metadata: { orderId: input.orderId, reason: input.reason }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function resolveDispute(disputeId: string, resolutionNote: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const dispute = await db.prepare("SELECT * FROM service_disputes WHERE id = ?1").bind(disputeId).first<Record<string, unknown>>();
  if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
  await db
    .prepare("UPDATE service_disputes SET status = 'resolved', resolution_note = ?1, resolved_at = ?2, updated_at = ?2 WHERE id = ?3")
    .bind(resolutionNote, nowMySqlDateTime(), disputeId)
    .run();
  await writeAudit({ action: "service_dispute.resolve", entityType: "service_disputes", entityId: disputeId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

/* ---------- Messages ---------- */

export async function sendMessage(input: {
  threadType: "request" | "order";
  threadId: string;
  senderUserId: string;
  body: string;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  if (!input.body.trim()) throw new Error("INVALID_BODY");
  const id = await insertRow(
    db,
    `INSERT INTO service_messages (id, thread_type, thread_id, sender_user_id, body, is_system, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)`,
    [crypto.randomUUID(), input.threadType, input.threadId, input.senderUserId, input.body, nowMySqlDateTime()],
  );
  await writeAudit({ action: "service_message.send", entityType: `service_messages:${input.threadType}`, entityId: input.threadId, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function threadMessages(threadType: "request" | "order", threadId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare("SELECT * FROM service_messages WHERE thread_type = ?1 AND thread_id = ?2 ORDER BY created_at ASC LIMIT 200")
    .bind(threadType, threadId)
    .all<Record<string, unknown>>();
  return result.results ?? [];
}
