import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { writeAudit } from "@services/audit";
import { requireCurrencyCode } from "@services/currency-policy";
import { getServicesDb, insertRow } from "@services/db";
import {
  addJobTimeline,
  addReviewFull,
  enqueueOutbox,
  listJobTimeline,
  listReviews,
  notify,
  type ActorContext,
} from "@services/marketplace";
import { toPublicServiceReview } from "@services/public-dto";

type DataRow = Record<string, unknown>;

export const DIRECT_BOOKING_STATUS = {
  PENDING_PROVIDER: "pending_provider",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type DirectBookingStatus = (typeof DIRECT_BOOKING_STATUS)[keyof typeof DIRECT_BOOKING_STATUS];
export type DirectBookingViewerRole = "customer" | "provider" | "moderator";
export type DirectBookingActor = { userId: string; canManageAll?: boolean };

const TERMINAL = new Set<DirectBookingStatus>([
  DIRECT_BOOKING_STATUS.DECLINED,
  DIRECT_BOOKING_STATUS.CANCELLED,
  DIRECT_BOOKING_STATUS.COMPLETED,
]);

const FLOW: Record<DirectBookingStatus, DirectBookingStatus[]> = {
  [DIRECT_BOOKING_STATUS.PENDING_PROVIDER]: [DIRECT_BOOKING_STATUS.CONFIRMED, DIRECT_BOOKING_STATUS.DECLINED, DIRECT_BOOKING_STATUS.CANCELLED],
  [DIRECT_BOOKING_STATUS.CONFIRMED]: [DIRECT_BOOKING_STATUS.SCHEDULED, DIRECT_BOOKING_STATUS.CANCELLED],
  [DIRECT_BOOKING_STATUS.SCHEDULED]: [DIRECT_BOOKING_STATUS.IN_PROGRESS, DIRECT_BOOKING_STATUS.CANCELLED],
  [DIRECT_BOOKING_STATUS.IN_PROGRESS]: [DIRECT_BOOKING_STATUS.COMPLETED, DIRECT_BOOKING_STATUS.CANCELLED],
  [DIRECT_BOOKING_STATUS.DECLINED]: [],
  [DIRECT_BOOKING_STATUS.CANCELLED]: [],
  [DIRECT_BOOKING_STATUS.COMPLETED]: [],
};

export type NewDirectBooking = {
  providerId: string;
  categoryId: string;
  countryCode: string;
  cityId: string;
  districtId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  shortAddress?: string | null;
  scheduledAt: string;
  contactPreference: "platform" | "phone" | "whatsapp" | "email";
  contactPhone?: string | null;
  contactEmail?: string | null;
};

function dateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("BOOKING_DATE_INVALID");
  if (date.getTime() <= Date.now()) throw new Error("BOOKING_DATE_INVALID");
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function assertCoordinates(latitude?: number | null, longitude?: number | null): void {
  if ((latitude == null) !== (longitude == null)) throw new Error("BOOKING_LOCATION_INVALID");
  if (latitude == null || longitude == null) return;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("BOOKING_LOCATION_INVALID");
  }
}

function roleFor(row: DataRow, actor: DirectBookingActor): DirectBookingViewerRole | null {
  if (actor.canManageAll) return "moderator";
  if (String(row.customer_user_id) === actor.userId) return "customer";
  if (String(row.provider_user_id) === actor.userId) return "provider";
  return null;
}

export function directBookingAllowedTransitions(row: DataRow, actor: DirectBookingActor): DirectBookingStatus[] {
  const role = roleFor(row, actor);
  const status = String(row.status) as DirectBookingStatus;
  if (!role || !Object.values(DIRECT_BOOKING_STATUS).includes(status)) return [];
  if (role === "moderator") return TERMINAL.has(status) ? [] : [DIRECT_BOOKING_STATUS.CANCELLED];
  if (role === "customer") {
    const customerCancellable: DirectBookingStatus[] = [DIRECT_BOOKING_STATUS.PENDING_PROVIDER, DIRECT_BOOKING_STATUS.CONFIRMED, DIRECT_BOOKING_STATUS.SCHEDULED];
    return customerCancellable
      .includes(status) ? [DIRECT_BOOKING_STATUS.CANCELLED] : [];
  }
  const providerFlow: Partial<Record<DirectBookingStatus, DirectBookingStatus[]>> = {
    [DIRECT_BOOKING_STATUS.PENDING_PROVIDER]: [DIRECT_BOOKING_STATUS.CONFIRMED, DIRECT_BOOKING_STATUS.DECLINED],
    [DIRECT_BOOKING_STATUS.CONFIRMED]: [DIRECT_BOOKING_STATUS.SCHEDULED, DIRECT_BOOKING_STATUS.CANCELLED],
    [DIRECT_BOOKING_STATUS.SCHEDULED]: [DIRECT_BOOKING_STATUS.IN_PROGRESS, DIRECT_BOOKING_STATUS.CANCELLED],
    [DIRECT_BOOKING_STATUS.IN_PROGRESS]: [DIRECT_BOOKING_STATUS.COMPLETED, DIRECT_BOOKING_STATUS.CANCELLED],
  };
  return providerFlow[status] ?? [];
}

export function toPrivateDirectBooking(row: DataRow, actor: DirectBookingActor) {
  const viewerRole = roleFor(row, actor);
  if (!viewerRole) throw new Error("BOOKING_FORBIDDEN");
  const privateDetailsVisible = viewerRole === "customer" || viewerRole === "moderator" || Boolean(row.contact_revealed_at);
  return {
    id: row.id,
    source_type: "direct_booking",
    provider_profile_id: row.provider_profile_id,
    category_id: row.category_id,
    service_title_snapshot: row.service_title_snapshot,
    price_snapshot: row.price_snapshot,
    currency_snapshot: row.currency_snapshot,
    pricing_unit_snapshot: row.pricing_unit_snapshot,
    price: row.price_snapshot ?? row.price,
    currency: row.currency_snapshot ?? row.currency,
    status: row.status,
    country_code: row.country_code,
    city_id: row.city_id,
    district_id: row.district_id,
    scheduled_at: row.scheduled_at,
    provider_response_note: row.provider_response_note,
    accepted_at: row.accepted_at,
    declined_at: row.declined_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    viewer_role: viewerRole,
    allowed_transitions: directBookingAllowedTransitions(row, actor),
    ...(privateDetailsVisible ? {
      latitude: row.latitude,
      longitude: row.longitude,
      short_address: row.short_address,
      contact_preference: row.contact_preference,
      contact_phone: row.contact_phone,
      contact_email: row.contact_email,
    } : {}),
  };
}

export async function createDirectBooking(input: NewDirectBooking, customerUserId: string, actor?: ActorContext): Promise<string> {
  assertCoordinates(input.latitude, input.longitude);
  const scheduledAt = dateTime(input.scheduledAt);
  const db = await getServicesDb();
  const profile = await db.prepare("SELECT * FROM service_provider_profiles WHERE id = ?1 LIMIT 1").bind(input.providerId).first<DataRow>();
  if (!profile || profile.status !== "approved" || Number(profile.is_accepting_requests ?? 1) !== 1) throw new Error("BOOKING_PROVIDER_UNAVAILABLE");
  if (String(profile.user_id) === customerUserId) throw new Error("BOOKING_SELF_NOT_ALLOWED");

  const category = await db.prepare("SELECT * FROM service_categories WHERE id = ?1 AND is_active = 1 LIMIT 1").bind(input.categoryId).first<DataRow>();
  if (!category) throw new Error("BOOKING_CATEGORY_NOT_FOUND");
  if (!["instant", "both"].includes(String(category.booking_mode))) throw new Error("BOOKING_MODE_NOT_DIRECT");

  const providerCategory = await db
    .prepare("SELECT * FROM service_provider_categories WHERE provider_id = ?1 AND category_id = ?2 AND is_active = 1 LIMIT 1")
    .bind(input.providerId, input.categoryId)
    .first<DataRow>();
  if (!providerCategory) throw new Error("BOOKING_PROVIDER_UNAVAILABLE");
  const priceSnapshot = Number(providerCategory.instant_price);
  if (!Number.isInteger(priceSnapshot) || priceSnapshot <= 0 || !providerCategory.currency) throw new Error("BOOKING_PRICE_UNAVAILABLE");
  const currencySnapshot = requireCurrencyCode(providerCategory.currency);
  const titleSnapshot = String(category.name_ar || category.name_en || category.code || "Service").slice(0, 300);
  const now = nowMySqlDateTime();
  const id = await insertRow(
    db,
    `INSERT INTO service_orders
      (id, request_id, offer_id, customer_user_id, provider_user_id, price, currency, status,
       source_type, provider_profile_id, category_id, service_title_snapshot, price_snapshot,
       currency_snapshot, pricing_unit_snapshot, country_code, city_id, district_id, latitude,
       longitude, short_address, scheduled_at, contact_preference, contact_phone, contact_email,
       created_at, updated_at)
     VALUES (?1, NULL, NULL, ?2, ?3, ?4, ?5, 'pending_provider', 'direct_booking', ?6, ?7, ?8, ?4, ?5, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?20)`,
    [
      crypto.randomUUID(), customerUserId, profile.user_id, priceSnapshot, currencySnapshot,
      input.providerId, input.categoryId, titleSnapshot, providerCategory.pricing_unit ?? "fixed",
      input.countryCode.toUpperCase(), input.cityId, input.districtId ?? null, input.latitude ?? null,
      input.longitude ?? null, input.shortAddress ?? null, scheduledAt, input.contactPreference,
      input.contactPhone ?? null, input.contactEmail ?? null, now,
    ],
  );

  await addJobTimeline(id, { event: "direct_booking_created", actorUserId: customerUserId, toStatus: DIRECT_BOOKING_STATUS.PENDING_PROVIDER, note: "تم إنشاء حجز مباشر بسعر مثبت" });
  await notify(String(profile.user_id), {
    type: "DIRECT_BOOKING_CREATED",
    title: "حجز مباشر جديد",
    body: `${titleSnapshot} في ${input.cityId}`,
    link: `/dashboard/services/jobs/${id}`,
    entityType: "service_orders",
    entityId: id,
  });
  await enqueueOutbox("DIRECT_BOOKING_CREATED", { bookingId: id, providerProfileId: input.providerId, categoryId: input.categoryId });
  await writeAudit({ action: "service_booking.create", entityType: "service_orders", entityId: id, metadata: { providerId: input.providerId, categoryId: input.categoryId, priceSnapshot, currencySnapshot }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function getDirectBookingRow(bookingId: string): Promise<DataRow | null> {
  const db = await getServicesDb();
  return await db.prepare("SELECT * FROM service_orders WHERE id = ?1 AND source_type = 'direct_booking' LIMIT 1").bind(bookingId).first<DataRow>() ?? null;
}

export async function getDirectBooking(bookingId: string, actor: DirectBookingActor) {
  const row = await getDirectBookingRow(bookingId);
  if (!row) throw new Error("BOOKING_NOT_FOUND");
  if (!roleFor(row, actor)) throw new Error("BOOKING_FORBIDDEN");
  const [timeline, reviews] = await Promise.all([listJobTimeline(bookingId), listReviews({ orderId: bookingId })]);
  return {
    ...toPrivateDirectBooking(row, actor),
    timeline: timeline.map((event) => ({
      id: event.id,
      event: event.event,
      from_status: event.from_status,
      to_status: event.to_status,
      note: event.note,
      created_at: event.created_at,
    })),
    reviews: reviews.map(toPublicServiceReview),
    reviewed_by_viewer: reviews.some((review) => String(review.reviewer_user_id) === actor.userId),
  };
}

export async function listDirectBookings(actor: DirectBookingActor, role?: "customer" | "provider") {
  const db = await getServicesDb();
  const params: unknown[] = [];
  let sql = "SELECT * FROM service_orders WHERE source_type = 'direct_booking'";
  if (!actor.canManageAll) {
    params.push(actor.userId);
    if (role === "customer") sql += " AND customer_user_id = ?1";
    else if (role === "provider") sql += " AND provider_user_id = ?1";
    else sql += " AND (customer_user_id = ?1 OR provider_user_id = ?1)";
  }
  sql += " ORDER BY updated_at DESC";
  const result = await db.prepare(sql).bind(...params).all<DataRow>();
  return (result.results ?? []).map((row) => toPrivateDirectBooking(row, actor));
}

export async function transitionDirectBooking(bookingId: string, to: DirectBookingStatus, actor: DirectBookingActor, note?: string | null, audit?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const row = await getDirectBookingRow(bookingId);
  if (!row) throw new Error("BOOKING_NOT_FOUND");
  const viewerRole = roleFor(row, actor);
  if (!viewerRole) throw new Error("BOOKING_FORBIDDEN");
  const from = String(row.status) as DirectBookingStatus;
  if (!Object.values(DIRECT_BOOKING_STATUS).includes(to) || !FLOW[from]?.includes(to) || !directBookingAllowedTransitions(row, actor).includes(to)) {
    throw new Error("BOOKING_STATUS_INVALID");
  }

  const now = nowMySqlDateTime();
  const stampColumns: Partial<Record<DirectBookingStatus, string[]>> = {
    [DIRECT_BOOKING_STATUS.CONFIRMED]: ["accepted_at", "contact_revealed_at"],
    [DIRECT_BOOKING_STATUS.DECLINED]: ["declined_at"],
    [DIRECT_BOOKING_STATUS.IN_PROGRESS]: ["started_at"],
    [DIRECT_BOOKING_STATUS.COMPLETED]: ["completed_at"],
    [DIRECT_BOOKING_STATUS.CANCELLED]: ["cancelled_at"],
  };
  const assignments = ["status = ?1"];
  const values: unknown[] = [to];
  for (const column of stampColumns[to] ?? []) {
    values.push(now);
    assignments.push(`${column} = ?${values.length}`);
  }
  if (to === DIRECT_BOOKING_STATUS.CONFIRMED || to === DIRECT_BOOKING_STATUS.DECLINED) {
    values.push(note ?? null);
    assignments.push(`provider_response_note = ?${values.length}`);
  }
  values.push(now);
  assignments.push(`updated_at = ?${values.length}`);
  values.push(bookingId, from);
  const result = await db
    .prepare(`UPDATE service_orders SET ${assignments.join(", ")} WHERE id = ?${values.length - 1} AND status = ?${values.length} RETURNING id`)
    .bind(...values)
    .run();
  if (Number(result.meta?.changes ?? 0) !== 1) throw new Error("BOOKING_STATUS_INVALID");

  await addJobTimeline(bookingId, { event: `direct_booking_${to}`, actorUserId: actor.userId, fromStatus: from, toStatus: to, note: note ?? null });
  const recipient = viewerRole === "customer" ? String(row.provider_user_id) : String(row.customer_user_id);
  await notify(recipient, {
    type: `DIRECT_BOOKING_${to.toUpperCase()}`,
    title: "تحديث الحجز المباشر",
    body: `${String(row.service_title_snapshot ?? "الخدمة")}: ${to}`,
    link: `/dashboard/services/jobs/${bookingId}`,
    entityType: "service_orders",
    entityId: bookingId,
  });
  if (to === DIRECT_BOOKING_STATUS.COMPLETED) {
    await db.prepare("UPDATE service_provider_profiles SET jobs_completed = jobs_completed + 1, updated_at = ?1 WHERE user_id = ?2").bind(now, row.provider_user_id).run();
  }
  await enqueueOutbox(`DIRECT_BOOKING_${to.toUpperCase()}`, { bookingId, from, to });
  await writeAudit({ action: `service_booking.status.${to}`, entityType: "service_orders", entityId: bookingId, metadata: { from, to }, actorUserId: audit?.userId, ipAddress: audit?.ip });
}

export async function reviewDirectBooking(bookingId: string, actor: DirectBookingActor, input: { rating: number; comment?: string | null; recommend?: boolean | null }, audit?: ActorContext): Promise<string> {
  const row = await getDirectBookingRow(bookingId);
  if (!row) throw new Error("BOOKING_NOT_FOUND");
  const viewerRole = roleFor(row, actor);
  if (viewerRole !== "customer") throw new Error("BOOKING_FORBIDDEN");
  return addReviewFull({
    orderId: bookingId,
    reviewerUserId: actor.userId,
    revieweeUserId: String(row.provider_user_id),
    rating: input.rating,
    comment: input.comment ?? null,
    recommend: input.recommend ?? null,
  }, audit);
}
