import { getIntegrationDb } from "@/lib/integration/db";

/**
 * Office → website property publishing.
 *
 * The canonical property model is `properties` (lib/db/schemas/properties-schema.ts),
 * the same table `/api/properties` reads and writes. Office publishing writes
 * there through the authenticated device contract only — never through the
 * session-authenticated public routes.
 *
 * Identity: one local Office property maps to exactly one website property via
 * `office_property_links (sponsor_id, external_id) -> property_id`. The sponsor
 * always comes from the authenticated device, never from the payload, so a
 * device can only ever reach its own sponsor's rows.
 */

/** Canonical enums, mirrored from lib/validators/property-validators.ts. */
export const OFFICE_PROPERTY_DEAL_TYPES = ["sale", "rent"] as const;
export const OFFICE_PROPERTY_CATEGORIES = ["residential", "commercial", "industrial", "land", "agricultural"] as const;
export const OFFICE_PROPERTY_TYPES = [
  "villa", "apartment", "townhouse", "duplex", "penthouse",
  "shop", "warehouse", "office", "building", "factory",
  "land", "farm", "ranch", "hotel", "resort", "restaurant",
] as const;

/** Status an Office publish lands in. Office never writes `approved`. */
export const OFFICE_PROPERTY_REVIEW_STATUS = "pending_review";
/** Status an Office delete/unpublish lands in. */
export const OFFICE_PROPERTY_ARCHIVED_STATUS = "archived";
/** Statuses a later Office edit must not overwrite. */
export const OFFICE_PROPERTY_TERMINAL_STATUSES = ["sold", "rented"] as const;

/**
 * Private desktop data that must never leave the office. Presence of any of
 * these keys is rejected outright rather than silently dropped, so a desktop
 * regression fails loudly instead of leaking quietly.
 */
export const OFFICE_PROPERTY_PRIVATE_FIELDS = [
  "ownerName", "ownerStatus", "ownerClientId", "ownerPhone", "ownerIdentity",
  "commissionerName", "commissionerIdentity", "commissionerMobile",
  "commissionerAddress", "commissionerLocationLink",
  "courtAuthorizationPath", "printedAuthorizationPath",
  "ownershipDocument", "deedNumber", "titleDeed",
  "buyerName", "buyerIdentity", "buyerMobile", "buyerAddress",
  "commissionRate", "internalNotes", "crmNotes", "clientPhone", "nationalId",
] as const;

/**
 * Fields the SERVER owns. If a device sends them they are ignored — never
 * applied, never used to derive identity or attribution.
 */
export const OFFICE_PROPERTY_SERVER_OWNED_FIELDS = [
  "id", "userId", "user_id", "officeId", "office_id", "sponsorId", "sponsor_id",
  "status", "isFeatured", "is_featured", "isVerified", "is_verified",
  "approvedAt", "approved_at", "approvedBy", "approved_by",
  "rejectedReason", "rejected_reason", "views", "inquiries", "favoritesCount",
  "createdAt", "created_at", "updatedAt", "updated_at",
] as const;

export class OfficePropertyError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "OfficePropertyError";
    this.code = code;
  }
}

export type OfficePropertyInput = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  dealType: string;
  category: string;
  propertyType: string;
  country: string;
  governorate: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  price: number;
  currency: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
};

export type OfficePropertyLink = {
  id: string;
  sponsorId: string;
  externalId: string;
  propertyId: string;
  status: string;
};

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function text(value: unknown, field: string, { required = false, max = 5000 } = {}): string {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) {
    if (required) throw new OfficePropertyError("MISSING_FIELD", `${field} is required`);
    return "";
  }
  return raw.slice(0, max);
}

function enumValue(value: unknown, allowed: readonly string[], field: string): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!allowed.includes(raw)) {
    throw new OfficePropertyError("INVALID_FIELD", `${field} must be one of ${allowed.join(", ")}`);
  }
  return raw;
}

function positiveNumber(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new OfficePropertyError("INVALID_FIELD", `${field} must be a positive number`);
  return n;
}

function countOrZero(value: unknown, field: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 50) throw new OfficePropertyError("INVALID_FIELD", `${field} must be 0..50`);
  return n;
}

function coordinate(value: unknown, field: string, limit: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new OfficePropertyError("INVALID_FIELD", `${field} must be numeric`);
  if (n === 0) return null;
  if (n < -limit || n > limit) throw new OfficePropertyError("INVALID_FIELD", `${field} out of range`);
  return n;
}

/**
 * Validates and narrows an incoming Office payload to exactly the public
 * fields the canonical model accepts. Throws OfficePropertyError otherwise.
 */
export function normalizeOfficeProperty(payload: Record<string, unknown>): OfficePropertyInput {
  const body = payload ?? {};

  for (const field of OFFICE_PROPERTY_PRIVATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new OfficePropertyError("PRIVATE_FIELD_REJECTED", `${field} must never be sent to the website`);
    }
  }

  return {
    titleAr: text(body.titleAr, "titleAr", { required: true, max: 200 }),
    titleEn: text(body.titleEn, "titleEn", { max: 200 }),
    descriptionAr: text(body.descriptionAr, "descriptionAr", { required: true }),
    descriptionEn: text(body.descriptionEn, "descriptionEn"),
    dealType: enumValue(body.dealType, OFFICE_PROPERTY_DEAL_TYPES, "dealType"),
    category: enumValue(body.category, OFFICE_PROPERTY_CATEGORIES, "category"),
    propertyType: enumValue(body.propertyType, OFFICE_PROPERTY_TYPES, "propertyType"),
    country: text(body.country, "country", { required: true, max: 100 }),
    governorate: text(body.governorate, "governorate", { required: true, max: 100 }),
    city: text(body.city, "city", { required: true, max: 100 }),
    district: text(body.district, "district", { max: 100 }),
    latitude: coordinate(body.latitude, "latitude", 90),
    longitude: coordinate(body.longitude, "longitude", 180),
    address: text(body.address, "address", { max: 500 }),
    price: positiveNumber(body.price, "price"),
    currency: text(body.currency, "currency", { max: 8 }) || "SAR",
    area: positiveNumber(body.area, "area"),
    bedrooms: countOrZero(body.bedrooms, "bedrooms"),
    bathrooms: countOrZero(body.bathrooms, "bathrooms"),
  };
}

export async function getOfficePropertyLink(sponsorId: string, externalId: string): Promise<OfficePropertyLink | null> {
  const db = await getIntegrationDb();
  const row = await db
    .prepare("SELECT * FROM office_property_links WHERE sponsor_id = ?1 AND external_id = ?2 LIMIT 1")
    .bind(String(sponsorId), String(externalId))
    .first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: String(row.id),
    sponsorId: String(row.sponsor_id),
    externalId: String(row.external_id),
    propertyId: String(row.property_id),
    status: String(row.status ?? "active"),
  };
}

/**
 * Resolves the sponsor (the admin email recorded on the device at pairing) to a
 * `users.id`, so the published property is owned by a real account and shows up
 * in that account's own property list. Null when no such user exists — the
 * authoritative ownership record is always `office_property_links`.
 */
async function resolveSponsorUserId(sponsorId: string): Promise<string | null> {
  try {
    const db = await getIntegrationDb();
    const row = await db
      .prepare("SELECT id FROM users WHERE email = ?1 LIMIT 1")
      .bind(String(sponsorId).trim().toLowerCase())
      .first<Record<string, unknown>>();
    return row?.id ? String(row.id) : null;
  } catch {
    return null;
  }
}

/** The status an Office write may land the property in. Never `approved`. */
export function resolveOfficeStatus(currentStatus: string | null): string {
  const current = String(currentStatus ?? "").trim().toLowerCase();
  if ((OFFICE_PROPERTY_TERMINAL_STATUSES as readonly string[]).includes(current)) return current;
  return OFFICE_PROPERTY_REVIEW_STATUS;
}

export type UpsertOfficePropertyInput = {
  sponsorId: string;
  deviceId?: string | null;
  externalId: string;
  payload: Record<string, unknown>;
  now?: string;
};

export type UpsertOfficePropertyResult = {
  propertyId: string;
  created: boolean;
  status: string;
};

/**
 * Creates or updates the ONE website property mapped to this office's local
 * property. Repeated publishing always lands on the same row.
 */
export async function upsertOfficeProperty(input: UpsertOfficePropertyInput): Promise<UpsertOfficePropertyResult> {
  const sponsorId = String(input.sponsorId ?? "").trim();
  const externalId = String(input.externalId ?? "").trim();
  if (!sponsorId) throw new OfficePropertyError("SPONSOR_REQUIRED");
  if (!externalId) throw new OfficePropertyError("EXTERNAL_ID_REQUIRED");

  const value = normalizeOfficeProperty(input.payload);
  const db = await getIntegrationDb();
  const now = input.now ?? nowIso();
  const link = await getOfficePropertyLink(sponsorId, externalId);

  if (link) {
    const existing = await db
      .prepare("SELECT id, status FROM properties WHERE id = ?1 LIMIT 1")
      .bind(link.propertyId)
      .first<Record<string, unknown>>();
    if (existing) {
      const status = resolveOfficeStatus(existing.status == null ? null : String(existing.status));
      await db
        .prepare(
          `UPDATE properties SET
             title_ar = ?1, title_en = ?2, description_ar = ?3, description_en = ?4,
             deal_type = ?5, category = ?6, property_type = ?7,
             country = ?8, governorate = ?9, city = ?10, district = ?11,
             latitude = ?12, longitude = ?13, address = ?14,
             price = ?15, currency = ?16, area = ?17, bedrooms = ?18, bathrooms = ?19,
             reference_number = ?20, status = ?21, updated_at = ?22
           WHERE id = ?23`,
        )
        .bind(
          value.titleAr, value.titleEn, value.descriptionAr, value.descriptionEn,
          value.dealType, value.category, value.propertyType,
          value.country, value.governorate, value.city, value.district,
          value.latitude, value.longitude, value.address,
          value.price, value.currency, value.area, value.bedrooms, value.bathrooms,
          externalId, status, now, link.propertyId,
        )
        .run();
      await db
        .prepare("UPDATE office_property_links SET status = 'active', device_id = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(input.deviceId ?? null, now, link.id)
        .run();
      return { propertyId: link.propertyId, created: false, status };
    }
    // The link points at a row that no longer exists: fall through and
    // recreate, keeping the same external identity.
  }

  const propertyId = crypto.randomUUID();
  const userId = await resolveSponsorUserId(sponsorId);
  const status = OFFICE_PROPERTY_REVIEW_STATUS;
  await db
    .prepare(
      `INSERT INTO properties
        (id, user_id, title_ar, title_en, description_ar, description_en,
         deal_type, category, property_type,
         country, governorate, city, district, latitude, longitude, address,
         price, currency, area, bedrooms, bathrooms,
         reference_number, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25)`,
    )
    .bind(
      propertyId, userId, value.titleAr, value.titleEn, value.descriptionAr, value.descriptionEn,
      value.dealType, value.category, value.propertyType,
      value.country, value.governorate, value.city, value.district, value.latitude, value.longitude, value.address,
      value.price, value.currency, value.area, value.bedrooms, value.bathrooms,
      externalId, status, now, now,
    )
    .run();

  if (link) {
    await db
      .prepare("UPDATE office_property_links SET property_id = ?1, status = 'active', device_id = ?2, updated_at = ?3 WHERE id = ?4")
      .bind(propertyId, input.deviceId ?? null, now, link.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO office_property_links
          (id, sponsor_id, device_id, external_id, property_id, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7)`,
      )
      .bind(crypto.randomUUID(), sponsorId, input.deviceId ?? null, externalId, propertyId, now, now)
      .run();
  }

  return { propertyId, created: true, status };
}

export type ArchiveOfficePropertyResult = {
  propertyId: string | null;
  changed: boolean;
  status: string | null;
};

/**
 * Unpublishes the website property mapped to this office's local property, by
 * moving it to the canonical `archived` status. Idempotent: repeating it on an
 * already-archived (or already-unlinked) property is a no-op success, never an
 * error, and it can never reach another sponsor's row.
 */
export async function archiveOfficeProperty(input: { sponsorId: string; externalId: string; now?: string }): Promise<ArchiveOfficePropertyResult> {
  const sponsorId = String(input.sponsorId ?? "").trim();
  const externalId = String(input.externalId ?? "").trim();
  if (!sponsorId) throw new OfficePropertyError("SPONSOR_REQUIRED");
  if (!externalId) throw new OfficePropertyError("EXTERNAL_ID_REQUIRED");

  const link = await getOfficePropertyLink(sponsorId, externalId);
  if (!link) return { propertyId: null, changed: false, status: null };

  const db = await getIntegrationDb();
  const now = input.now ?? nowIso();
  const existing = await db
    .prepare("SELECT id, status FROM properties WHERE id = ?1 LIMIT 1")
    .bind(link.propertyId)
    .first<Record<string, unknown>>();

  if (existing) {
    await db
      .prepare("UPDATE properties SET status = ?1, updated_at = ?2 WHERE id = ?3")
      .bind(OFFICE_PROPERTY_ARCHIVED_STATUS, now, link.propertyId)
      .run();
  }
  await db
    .prepare("UPDATE office_property_links SET status = 'deleted', updated_at = ?1 WHERE id = ?2")
    .bind(now, link.id)
    .run();

  return {
    propertyId: link.propertyId,
    changed: Boolean(existing),
    status: existing ? OFFICE_PROPERTY_ARCHIVED_STATUS : null,
  };
}
