import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { insertRow, getServicesDb } from "@services/db";
import { writeAudit } from "@services/audit";
import { runMatching } from "@services/matching";
import { computeMatchScore, distanceKm } from "@services/match-score";
import { requireCurrencyCode } from "@services/currency-policy";
import {
  MESSAGE_CONTEXT,
  isMessageContext,
  contextLinkFor,
  entityTypeFor,
} from "@services/message-contexts";
import {
  REQUEST_STATUS,
  OFFER_STATUS,
  ORDER_STATUS,
  isOrderStatus,
  canTransition,
  canTransitionProvider,
  type OrderStatus,
} from "@services/constants";

export type ActorContext = { userId?: string | null; ip?: string | null };

const row = <T>(value: T | null | undefined): T | null => value ?? null;
const num = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const str = (value: unknown): string | null => (value == null ? null : String(value));

/* ============================================================
 * Provider profiles
 * ============================================================ */

export const PROVIDER_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
} as const;

export type ProviderStatus = (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS];

export async function getProviderProfileByUserId(userId: string): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  return row(
    await db
      .prepare("SELECT * FROM service_provider_profiles WHERE user_id = ?1")
      .bind(userId)
      .first<Record<string, unknown>>(),
  );
}

export async function getProviderProfileById(providerId: string): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  return row(
    await db
      .prepare("SELECT * FROM service_provider_profiles WHERE id = ?1")
      .bind(providerId)
      .first<Record<string, unknown>>(),
  );
}

/* ---------- Provider bookmarks (favorites) ---------- */

/** Providers the user has bookmarked, newest first, as full provider rows. */
export async function listBookmarkedProviders(userId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const rows = await db
    .prepare(
      `SELECT p.* FROM service_bookmarks b
       JOIN service_provider_profiles p ON p.id = b.listing_id
       WHERE b.user_id = ?1
       ORDER BY b.created_at DESC`,
    )
    .bind(userId)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function addProviderBookmark(userId: string, providerId: string): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare(
      "INSERT OR IGNORE INTO service_bookmarks (id, user_id, listing_id, created_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
    )
    .bind(crypto.randomUUID(), userId, providerId)
    .run();
}

export async function removeProviderBookmark(userId: string, providerId: string): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare("DELETE FROM service_bookmarks WHERE user_id = ?1 AND (listing_id = ?2 OR id = ?2)")
    .bind(userId, providerId)
    .run();
}

export type ProviderProfileInput = {
  user_id: string;
  displayNameAr?: string | null;
  displayNameEn?: string | null;
  bioAr?: string | null;
  bioEn?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  countryCode?: string | null;
  cityId?: string | null;
  districtId?: string | null;
  governorate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm?: number | null;
  licensesText?: string | null;
  insuranceText?: string | null;
  foundedYear?: number | null;
  teamSize?: number | null;
  isBusiness?: boolean;
  businessName?: string | null;
  taxNumber?: string | null;
  commercialRegistration?: string | null;
};

export async function upsertProviderProfile(input: ProviderProfileInput, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const existing = await getProviderProfileByUserId(input.user_id);
  const now = nowMySqlDateTime();
  if (existing) {
    await db
      .prepare(
        `UPDATE service_provider_profiles SET
           display_name_ar = ?1, display_name_en = ?2, bio_ar = ?3, bio_en = ?4,
           logo_url = ?5, cover_url = ?6, phone = ?7, whatsapp = ?8, email = ?9, website = ?10,
           country_code = ?11, city_id = ?12, district_id = ?13, governorate = ?14,
           latitude = ?15, longitude = ?16, service_radius_km = ?17,
           licenses_text = ?18, insurance_text = ?19, founded_year = ?20, team_size = ?21,
           is_business = ?22, business_name = ?23, tax_number = ?24, commercial_registration = ?25,
           updated_at = ?26
         WHERE id = ?27`,
      )
      .bind(
        input.displayNameAr ?? null, input.displayNameEn ?? null, input.bioAr ?? null, input.bioEn ?? null,
        input.logoUrl ?? null, input.coverUrl ?? null, input.phone ?? null, input.whatsapp ?? null, input.email ?? null, input.website ?? null,
        input.countryCode ?? "OM", input.cityId ?? null, input.districtId ?? null, input.governorate ?? null,
        input.latitude ?? null, input.longitude ?? null, input.serviceRadiusKm ?? 50,
        input.licensesText ?? null, input.insuranceText ?? null, input.foundedYear ?? null, input.teamSize ?? null,
        input.isBusiness ? 1 : 0, input.businessName ?? null, input.taxNumber ?? null, input.commercialRegistration ?? null,
        now, String(existing.id),
      )
      .run();
    await writeAudit({ action: "service_provider.update", entityType: "service_provider_profiles", entityId: String(existing.id), actorUserId: actor?.userId, ipAddress: actor?.ip });
    return String(existing.id);
  }
  const id = await insertRow(
    db,
    `INSERT INTO service_provider_profiles
      (id, user_id, display_name_ar, display_name_en, bio_ar, bio_en, logo_url, cover_url,
       phone, whatsapp, email, website, country_code, city_id, district_id, governorate,
       latitude, longitude, service_radius_km, status, licenses_text, insurance_text,
       founded_year, team_size, is_business, business_name, tax_number, commercial_registration,
       created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
       ?17, ?18, ?19, 'draft', ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?28)`,
    [
      crypto.randomUUID(), input.user_id,
      input.displayNameAr ?? null, input.displayNameEn ?? null, input.bioAr ?? null, input.bioEn ?? null,
      input.logoUrl ?? null, input.coverUrl ?? null, input.phone ?? null, input.whatsapp ?? null, input.email ?? null, input.website ?? null,
      input.countryCode ?? "OM", input.cityId ?? null, input.districtId ?? null, input.governorate ?? null,
      input.latitude ?? null, input.longitude ?? null, input.serviceRadiusKm ?? 50,
      input.licensesText ?? null, input.insuranceText ?? null, input.foundedYear ?? null, input.teamSize ?? null,
      input.isBusiness ? 1 : 0, input.businessName ?? null, input.taxNumber ?? null, input.commercialRegistration ?? null,
      now,
    ],
  );
  await writeAudit({ action: "service_provider.create", entityType: "service_provider_profiles", entityId: id, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function submitProviderApplication(providerId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const provider = await getProviderProfileById(providerId);
  if (!provider) throw new Error("PROVIDER_NOT_FOUND");
  if (provider.status !== PROVIDER_STATUS.DRAFT && provider.status !== PROVIDER_STATUS.REJECTED) {
    throw new Error("PROVIDER_STATUS_INVALID");
  }
  const categories = await listProviderCategories(providerId);
  if (!categories.length) throw new Error("PROVIDER_NO_CATEGORIES");
  await db
    .prepare("UPDATE service_provider_profiles SET status = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(PROVIDER_STATUS.SUBMITTED, nowMySqlDateTime(), providerId)
    .run();
  await writeAudit({ action: "service_provider.submit", entityType: "service_provider_profiles", entityId: providerId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function setProviderStatus(providerId: string, status: ProviderStatus, note?: string | null, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const provider = await getProviderProfileById(providerId);
  if (!provider) throw new Error("PROVIDER_NOT_FOUND");
  // The route validated that `status` is one of the six values; nothing checked
  // that the move was legal from where the provider actually is. A suspended
  // provider could be returned straight to approved, and a rejected one
  // approved, without the review the Verified badge is supposed to stand on.
  const from = String(provider.status);
  if (from !== status && !canTransitionProvider(from, status)) {
    throw new Error("PROVIDER_STATUS_INVALID");
  }
  const now = nowMySqlDateTime();
  const stamp = status === PROVIDER_STATUS.APPROVED ? "approved_at" : status === PROVIDER_STATUS.SUSPENDED ? "suspended_at" : null;
  await db
    .prepare(
      `UPDATE service_provider_profiles SET status = ?1${stamp ? `, ${stamp} = ?2` : ""}, rejection_reason = ?3, updated_at = ?4 WHERE id = ?5`,
    )
    .bind(status, now, note ?? null, now, providerId)
    .run();
  if (status === PROVIDER_STATUS.APPROVED) {
    await notify(String(provider.user_id), {
      type: "PROVIDER_APPROVED",
      title: "تم اعتماد ملفك كمزود خدمة",
      body: "يمكنك الآن استقبال الطلبات المطابقة وتقديم العروض.",
      link: "/dashboard/services/provider-profile",
      entityType: "service_provider_profiles",
      entityId: providerId,
    });
  }
  if (status === PROVIDER_STATUS.REJECTED || status === PROVIDER_STATUS.SUSPENDED) {
    await notify(String(provider.user_id), {
      type: status === PROVIDER_STATUS.REJECTED ? "PROVIDER_REJECTED" : "PROVIDER_SUSPENDED",
      title: status === PROVIDER_STATUS.REJECTED ? "لم يتم اعتماد ملفك" : "تم تعليق حسابك",
      body: note ?? "",
      link: "/dashboard/services/provider-profile",
      entityType: "service_provider_profiles",
      entityId: providerId,
    });
  }
  await writeAudit({ action: `service_provider.status.${status}`, entityType: "service_provider_profiles", entityId: providerId, metadata: { note }, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function updateProviderAdminSettings(
  providerId: string,
  patch: { isFeatured?: boolean; featuredRank?: number; isAcceptingRequests?: boolean },
  actor?: ActorContext,
): Promise<void> {
  const db = await getServicesDb();
  const provider = await getProviderProfileById(providerId);
  if (!provider) throw new Error("PROVIDER_NOT_FOUND");
  await db.prepare(
    `UPDATE service_provider_profiles SET is_featured = ?1, featured_rank = ?2,
       is_accepting_requests = ?3, updated_at = ?4 WHERE id = ?5`,
  ).bind(
    patch.isFeatured === undefined ? provider.is_featured ?? 0 : patch.isFeatured ? 1 : 0,
    patch.featuredRank === undefined ? provider.featured_rank ?? 0 : Math.max(0, Math.min(9999, Math.round(patch.featuredRank))),
    patch.isAcceptingRequests === undefined ? provider.is_accepting_requests ?? 1 : patch.isAcceptingRequests ? 1 : 0,
    nowMySqlDateTime(), providerId,
  ).run();
  await writeAudit({ action: "service_provider.admin_settings.update", entityType: "service_provider_profiles", entityId: providerId, metadata: patch, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function listProviderProfiles(query: {
  countryCode?: string;
  countryAliases?: string[];
  status?: string;
  cityId?: string;
  cityAliases?: string[];
  governorate?: string;
  governorateAliases?: string[];
  districtId?: string;
  districtAliases?: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  categoryId?: string;
  search?: string;
  limit?: number;
} = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  const addAliasClause = (column: string, aliases: string[] | undefined, fallback?: string) => {
    const normalized = [...new Set((aliases?.length ? aliases : fallback ? [fallback] : [])
      .flatMap((value) => {
        const token = String(value).trim();
        return token ? [token, token.toLocaleLowerCase("en"), token.toLocaleUpperCase("en")] : [];
      }))];
    if (!normalized.length) return;
    const placeholders = normalized.map((value) => {
      params.push(value);
      return `?${params.length}`;
    });
    clauses.push(`${column} IN (${placeholders.join(",")})`);
  };
  if (query.countryCode || query.countryAliases?.length) {
    addAliasClause("p.country_code", query.countryAliases, query.countryCode);
  }
  if (query.status) {
    params.push(query.status);
    clauses.push(`p.status = ?${params.length}`);
  }
  addAliasClause("p.governorate", query.governorateAliases, query.governorate);
  addAliasClause("p.city_id", query.cityAliases, query.cityId);
  addAliasClause("p.district_id", query.districtAliases, query.districtId);
  if (query.search) {
    params.push(`%${query.search}%`);
    clauses.push(`(p.display_name_ar LIKE ?${params.length} OR p.display_name_en LIKE ?${params.length} OR p.business_name LIKE ?${params.length})`);
  }
  if (query.categoryId) {
    params.push(query.categoryId);
  }
  let sql =
    "SELECT DISTINCT p.* FROM service_provider_profiles p" +
    (query.categoryId ? ` JOIN service_provider_categories pc ON pc.provider_id = p.id AND pc.category_id = ?${params.length} AND pc.is_active = 1` : "") +
    (clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "") +
    " ORDER BY p.is_featured DESC, p.featured_rank ASC, p.rating_avg DESC, p.rating_count DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  const rows = result.results ?? [];
  if (query.latitude == null || query.longitude == null || query.radiusKm == null) return rows;
  const searchPoint = { latitude: query.latitude, longitude: query.longitude };
  const requestedRadius = query.radiusKm;
  return rows.filter((provider) => {
    const providerLatitude = num(provider.latitude);
    const providerLongitude = num(provider.longitude);
    const distance = distanceKm(
      searchPoint,
      { latitude: providerLatitude, longitude: providerLongitude },
    );
    if (distance == null) return false;
    const providerRadius = num(provider.service_radius_km);
    const effectiveRadius = providerRadius == null
      ? requestedRadius
      : Math.min(requestedRadius, providerRadius);
    return distance <= effectiveRadius;
  });
}

/* ---------- Provider categories ---------- */

export async function listProviderCategories(providerId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare(
      `SELECT pc.*, c.code AS category_code, c.name_ar AS category_name_ar, c.name_en AS category_name_en,
              c.icon AS category_icon, c.booking_mode AS booking_mode
       FROM service_provider_categories pc
       LEFT JOIN service_categories c ON c.id = pc.category_id
       WHERE pc.provider_id = ?1 AND pc.is_active = 1
       ORDER BY c.sort_order ASC`,
    )
    .bind(providerId)
    .all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function addProviderCategory(providerId: string, categoryId: string, input: { priceFrom?: number | null; priceTo?: number | null; instantPrice?: number | null; currency?: string | null; pricingUnit?: string | null; minDurationMin?: number | null; notes?: string | null }, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const currency = input.currency ? requireCurrencyCode(input.currency) : null;
  const existing = await db
    .prepare("SELECT id FROM service_provider_categories WHERE provider_id = ?1 AND category_id = ?2")
    .bind(providerId, categoryId)
    .first<{ id: string }>();
  if (existing) {
    await db
      .prepare(
        `UPDATE service_provider_categories SET price_from = ?1, price_to = ?2, instant_price = ?3, currency = ?4,
          pricing_unit = ?5, min_duration_min = ?6, notes = ?7, is_active = 1 WHERE id = ?8`,
      )
      .bind(input.priceFrom ?? null, input.priceTo ?? null, input.instantPrice ?? null, currency, input.pricingUnit ?? null, input.minDurationMin ?? null, input.notes ?? null, existing.id)
      .run();
    return;
  }
  await insertRow(
    db,
    `INSERT INTO service_provider_categories
      (id, provider_id, category_id, price_from, price_to, instant_price, currency, pricing_unit, min_duration_min, notes, is_active, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11)`,
    [crypto.randomUUID(), providerId, categoryId, input.priceFrom ?? null, input.priceTo ?? null, input.instantPrice ?? null, currency, input.pricingUnit ?? null, input.minDurationMin ?? null, input.notes ?? null, nowMySqlDateTime()],
  );
  await writeAudit({ action: "service_provider.category.add", entityType: "service_provider_categories", entityId: providerId, metadata: { categoryId }, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function removeProviderCategory(providerId: string, categoryId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare("UPDATE service_provider_categories SET is_active = 0 WHERE provider_id = ?1 AND category_id = ?2")
    .bind(providerId, categoryId)
    .run();
  await writeAudit({ action: "service_provider.category.remove", entityType: "service_provider_categories", entityId: providerId, metadata: { categoryId }, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

/* ---------- Provider documents ---------- */

export async function addProviderDocument(input: {
  providerId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string | null;
  notes?: string | null;
  uploadedBy?: string | null;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const id = await insertRow(
    db,
    `INSERT INTO service_provider_documents (id, provider_id, type, file_name, file_url, file_size, mime_type, notes, uploaded_by, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    [crypto.randomUUID(), input.providerId, input.type, input.fileName, input.fileUrl, input.fileSize ?? 0, input.mimeType ?? null, input.notes ?? null, input.uploadedBy ?? null, nowMySqlDateTime()],
  );
  await writeAudit({ action: "service_provider.document.add", entityType: "service_provider_documents", entityId: id, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function listProviderDocuments(providerId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_provider_documents WHERE provider_id = ?1 ORDER BY created_at DESC").bind(providerId).all<Record<string, unknown>>();
  return result.results ?? [];
}

/**
 * One document with its owning provider, for the file endpoint's authorization
 * check. Listing documents is already gated to the owner or a reviewer; serving
 * the bytes needs the same gate, and that needs the owner's id from the row
 * itself rather than from the caller.
 */
export async function getProviderDocument(documentId: string): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  return db
    .prepare("SELECT * FROM service_provider_documents WHERE id = ?1 LIMIT 1")
    .bind(documentId)
    .first<Record<string, unknown>>();
}

export async function verifyProviderDocument(documentId: string, verified: boolean, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare("UPDATE service_provider_documents SET verified = ?1, verified_by = ?2, verified_at = ?3 WHERE id = ?4")
    .bind(verified ? 1 : 0, actor?.userId ?? null, verified ? nowMySqlDateTime() : null, documentId)
    .run();
}

/* ---------- Provider portfolio ---------- */

export async function addPortfolioItem(input: {
  providerId: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  cityId?: string | null;
  year?: number | null;
  tags?: string[];
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const id = await insertRow(
    db,
    `INSERT INTO service_provider_portfolio (id, provider_id, title, description, image_url, category_id, city_id, year, tags, is_featured, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 'active', ?10)`,
    [crypto.randomUUID(), input.providerId, input.title ?? null, input.description ?? null, input.imageUrl ?? null, input.categoryId ?? null, input.cityId ?? null, input.year ?? null, input.tags?.length ? JSON.stringify(input.tags) : null, nowMySqlDateTime()],
  );
  await writeAudit({ action: "service_provider.portfolio.add", entityType: "service_provider_portfolio", entityId: id, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function listPortfolioItems(providerId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_provider_portfolio WHERE provider_id = ?1 AND status = 'active' ORDER BY is_featured DESC, created_at DESC").bind(providerId).all<Record<string, unknown>>();
  return result.results ?? [];
}

/* ============================================================
 * Categories
 * ============================================================ */

export async function createServiceCategory(input: {
  countryCode: string;
  code: string;
  parentId?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameTr?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  descriptionTr?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  requiresLicense?: boolean;
  requiresVisit?: boolean;
  priceMin?: number | null;
  priceMax?: number | null;
  dynamicFields?: Array<Record<string, unknown>>;
  sortOrder?: number;
  isFeatured?: boolean;
  bookingMode?: "instant" | "quotes" | "both";
  badgeAr?: string | null;
  badgeEn?: string | null;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const country = String(input.countryCode).toUpperCase();
  const code = input.code.trim().toLowerCase();
  const exists = await db
    .prepare("SELECT id FROM service_categories WHERE country_code = ?1 AND code = ?2")
    .bind(country, code)
    .first<{ id: string }>();
  if (exists) throw new Error("CATEGORY_CONFLICT");
  const id = await insertRow(
    db,
    `INSERT INTO service_categories
      (id, parent_id, country_code, code, name_ar, name_en, name_tr, description_ar, description_en, description_tr,
       icon, image_url, requires_license, requires_visit, price_min, price_max, dynamic_fields, sort_order,
       is_active, is_featured, booking_mode, badge_ar, badge_en, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18,
             1, ?19, ?20, ?21, ?22, ?23, ?23)`,
    [
      crypto.randomUUID(), input.parentId ?? null, country, code,
      input.nameAr ?? null, input.nameEn ?? null, input.nameTr ?? null,
      input.descriptionAr ?? null, input.descriptionEn ?? null, input.descriptionTr ?? null,
      input.icon ?? null, input.imageUrl ?? null,
      input.requiresLicense ? 1 : 0, input.requiresVisit ? 1 : 0,
      input.priceMin ?? null, input.priceMax ?? null,
      input.dynamicFields ? JSON.stringify(input.dynamicFields) : null,
      input.sortOrder ?? 0,
      input.isFeatured ? 1 : 0, input.bookingMode ?? "quotes", input.badgeAr ?? null, input.badgeEn ?? null,
      nowMySqlDateTime(),
    ],
  );
  await writeAudit({ action: "service_category.create", entityType: "service_categories", entityId: id, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function updateServiceCategory(categoryId: string, patch: {
  parentId?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameTr?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  descriptionTr?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  requiresLicense?: boolean | null;
  requiresVisit?: boolean | null;
  priceMin?: number | null;
  priceMax?: number | null;
  dynamicFields?: Array<Record<string, unknown>> | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  bookingMode?: "instant" | "quotes" | "both" | null;
  badgeAr?: string | null;
  badgeEn?: string | null;
}, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const current = await getCategoryById(categoryId);
  if (!current) throw new Error("CATEGORY_NOT_FOUND");
  const pick = (key: string, value: unknown) => value === undefined ? current[key] ?? null : value;
  await db
    .prepare(
      `UPDATE service_categories SET
         parent_id = ?1, name_ar = ?2, name_en = ?3, name_tr = ?4,
         description_ar = ?5, description_en = ?6, description_tr = ?7,
         icon = ?8, image_url = ?9, requires_license = ?10, requires_visit = ?11,
         price_min = ?12, price_max = ?13, dynamic_fields = ?14, sort_order = ?15, is_active = ?16,
         is_featured = ?17, booking_mode = ?18, badge_ar = ?19, badge_en = ?20, updated_at = ?21
       WHERE id = ?22`,
    )
    .bind(
      pick("parent_id", patch.parentId),
      pick("name_ar", patch.nameAr), pick("name_en", patch.nameEn), pick("name_tr", patch.nameTr),
      pick("description_ar", patch.descriptionAr), pick("description_en", patch.descriptionEn), pick("description_tr", patch.descriptionTr),
      pick("icon", patch.icon), pick("image_url", patch.imageUrl),
      patch.requiresLicense === undefined ? current.requires_license ?? 0 : patch.requiresLicense ? 1 : 0,
      patch.requiresVisit === undefined ? current.requires_visit ?? 0 : patch.requiresVisit ? 1 : 0,
      pick("price_min", patch.priceMin), pick("price_max", patch.priceMax),
      patch.dynamicFields === undefined ? current.dynamic_fields ?? null : patch.dynamicFields == null ? null : JSON.stringify(patch.dynamicFields),
      pick("sort_order", patch.sortOrder),
      patch.isActive === undefined ? current.is_active ?? 1 : patch.isActive ? 1 : 0,
      patch.isFeatured === undefined ? current.is_featured ?? 0 : patch.isFeatured ? 1 : 0,
      pick("booking_mode", patch.bookingMode), pick("badge_ar", patch.badgeAr), pick("badge_en", patch.badgeEn),
      nowMySqlDateTime(), categoryId,
    )
    .run();
  await writeAudit({ action: "service_category.update", entityType: "service_categories", entityId: categoryId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function deleteServiceCategory(categoryId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const category = row(await db.prepare("SELECT * FROM service_categories WHERE id = ?1").bind(categoryId).first<Record<string, unknown>>());
  if (!category) throw new Error("CATEGORY_NOT_FOUND");
  const children = await db.prepare("SELECT id FROM service_categories WHERE parent_id = ?1 LIMIT 1").bind(categoryId).first<{ id: string }>();
  if (children) throw new Error("CATEGORY_HAS_CHILDREN");
  const inUse = await db
    .prepare(
      "SELECT id FROM (SELECT id, category_id FROM service_listings UNION ALL SELECT id, category_id FROM service_requests UNION ALL SELECT provider_id AS id, category_id FROM service_provider_categories) WHERE category_id = ?1 LIMIT 1",
    )
    .bind(categoryId)
    .first<{ id: string }>();
  if (inUse) throw new Error("CATEGORY_IN_USE");
  await db.prepare("DELETE FROM service_categories WHERE id = ?1").bind(categoryId).run();
  await writeAudit({ action: "service_category.delete", entityType: "service_categories", entityId: categoryId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function listCategoriesFull(
  countryCode?: string,
  options: { includeInactive?: boolean } = {},
): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  let sql = `SELECT c.*, COALESCE(pc.provider_count, 0) AS provider_count,
      COALESCE(rc.open_request_count, 0) AS open_request_count
    FROM service_categories c
    LEFT JOIN (
      SELECT pc.category_id, COUNT(*) AS provider_count
      FROM service_provider_categories pc
      JOIN service_provider_profiles p ON p.id = pc.provider_id
      WHERE pc.is_active = 1 AND p.status = 'approved'
      GROUP BY pc.category_id
    ) pc ON pc.category_id = c.id
    LEFT JOIN (
      SELECT r.category_id, COUNT(*) AS open_request_count
      FROM service_requests r
      WHERE r.status IN ('published','receiving_offers')
      GROUP BY r.category_id
    ) rc ON rc.category_id = c.id`;
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (countryCode) {
    params.push(String(countryCode).toUpperCase());
    clauses.push(`c.country_code = ?${params.length}`);
  }
  if (!options.includeInactive) clauses.push("c.is_active = 1");
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY c.parent_id ASC, c.is_featured DESC, c.sort_order ASC, c.code ASC";
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  const categories = result.results ?? [];
  for (const category of categories) {
    if (category.dynamic_fields && typeof category.dynamic_fields === "string") {
      try {
        category.dynamic_fields_parsed = JSON.parse(category.dynamic_fields as string);
      } catch {
        category.dynamic_fields_parsed = [];
      }
    } else {
      category.dynamic_fields_parsed = [];
    }
  }
  return categories;
}

export async function getCategoryById(categoryId: string): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  const category = row(await db.prepare("SELECT * FROM service_categories WHERE id = ?1").bind(categoryId).first<Record<string, unknown>>());
  if (category && category.dynamic_fields && typeof category.dynamic_fields === "string") {
    try {
      category.dynamic_fields_parsed = JSON.parse(category.dynamic_fields as string);
    } catch {
      category.dynamic_fields_parsed = [];
    }
  }
  return category;
}

/* ============================================================
 * Public marketplace page settings
 * ============================================================ */

export type ServiceMarketplaceSettings = {
  countryCode: string;
  heroKickerAr: string;
  heroKickerEn: string;
  heroTitleAr: string;
  heroTitleEn: string;
  heroDescriptionAr: string;
  heroDescriptionEn: string;
  primaryCtaAr: string;
  primaryCtaEn: string;
  primaryCtaHref: string;
  secondaryCtaAr: string;
  secondaryCtaEn: string;
  secondaryCtaHref: string;
  announcementAr: string;
  announcementEn: string;
  showCategories: boolean;
  showFeaturedProviders: boolean;
  showLatestRequests: boolean;
  showHowItWorks: boolean;
  showTrustBar: boolean;
  featuredCategoryLimit: number;
  featuredProviderLimit: number;
  latestRequestLimit: number;
  allowPublicRequests: boolean;
  allowProviderRegistration: boolean;
};

export const DEFAULT_SERVICE_MARKETPLACE_SETTINGS: ServiceMarketplaceSettings = {
  countryCode: "OM",
  heroKickerAr: "سوق خدمات عقار بروماكس",
  heroKickerEn: "AkarProMax Services Marketplace",
  heroTitleAr: "كل خدمات عقارك، من محترفين موثوقين",
  heroTitleEn: "Every property service, delivered by trusted professionals",
  heroDescriptionAr: "اختر الخدمة، حدّد موقعك، ثم احجز مباشرة أو استقبل عروضًا واضحة وقارن بينها بثقة.",
  heroDescriptionEn: "Choose a service, set your location, then book instantly or compare clear quotes from trusted professionals.",
  primaryCtaAr: "اطلب خدمة الآن",
  primaryCtaEn: "Request a service",
  primaryCtaHref: "/service-requests/new",
  secondaryCtaAr: "انضم كمحترف",
  secondaryCtaEn: "Join as a professional",
  secondaryCtaHref: "/providers/apply",
  announcementAr: "خدمات سريعة بالحجز المباشر، ومشاريع متخصصة بنظام طلب العروض",
  announcementEn: "Instant booking for quick services and competitive quotes for specialist projects",
  showCategories: true,
  showFeaturedProviders: true,
  showLatestRequests: true,
  showHowItWorks: true,
  showTrustBar: true,
  featuredCategoryLimit: 12,
  featuredProviderLimit: 6,
  latestRequestLimit: 6,
  allowPublicRequests: true,
  allowProviderRegistration: true,
};

function marketplaceSettingsFromRow(rowValue: Record<string, unknown> | null, countryCode: string): ServiceMarketplaceSettings {
  const source = rowValue ?? {};
  const fallback = { ...DEFAULT_SERVICE_MARKETPLACE_SETTINGS, countryCode };
  const stringValue = (key: string, defaultValue: string) => source[key] == null ? defaultValue : String(source[key]);
  const boolValue = (key: string, defaultValue: boolean) => source[key] == null ? defaultValue : Number(source[key]) === 1 || source[key] === true;
  const intValue = (key: string, defaultValue: number) => {
    const value = Number(source[key]);
    return Number.isFinite(value) ? value : defaultValue;
  };
  return {
    countryCode,
    heroKickerAr: stringValue("hero_kicker_ar", fallback.heroKickerAr),
    heroKickerEn: stringValue("hero_kicker_en", fallback.heroKickerEn),
    heroTitleAr: stringValue("hero_title_ar", fallback.heroTitleAr),
    heroTitleEn: stringValue("hero_title_en", fallback.heroTitleEn),
    heroDescriptionAr: stringValue("hero_description_ar", fallback.heroDescriptionAr),
    heroDescriptionEn: stringValue("hero_description_en", fallback.heroDescriptionEn),
    primaryCtaAr: stringValue("primary_cta_ar", fallback.primaryCtaAr),
    primaryCtaEn: stringValue("primary_cta_en", fallback.primaryCtaEn),
    primaryCtaHref: stringValue("primary_cta_href", fallback.primaryCtaHref),
    secondaryCtaAr: stringValue("secondary_cta_ar", fallback.secondaryCtaAr),
    secondaryCtaEn: stringValue("secondary_cta_en", fallback.secondaryCtaEn),
    secondaryCtaHref: stringValue("secondary_cta_href", fallback.secondaryCtaHref),
    announcementAr: stringValue("announcement_ar", fallback.announcementAr),
    announcementEn: stringValue("announcement_en", fallback.announcementEn),
    showCategories: boolValue("show_categories", fallback.showCategories),
    showFeaturedProviders: boolValue("show_featured_providers", fallback.showFeaturedProviders),
    showLatestRequests: boolValue("show_latest_requests", fallback.showLatestRequests),
    showHowItWorks: boolValue("show_how_it_works", fallback.showHowItWorks),
    showTrustBar: boolValue("show_trust_bar", fallback.showTrustBar),
    featuredCategoryLimit: intValue("featured_category_limit", fallback.featuredCategoryLimit),
    featuredProviderLimit: intValue("featured_provider_limit", fallback.featuredProviderLimit),
    latestRequestLimit: intValue("latest_request_limit", fallback.latestRequestLimit),
    allowPublicRequests: boolValue("allow_public_requests", fallback.allowPublicRequests),
    allowProviderRegistration: boolValue("allow_provider_registration", fallback.allowProviderRegistration),
  };
}

export async function getServiceMarketplaceSettings(countryCode = "OM"): Promise<ServiceMarketplaceSettings> {
  const db = await getServicesDb();
  const country = countryCode.toUpperCase();
  const existing = row(await db.prepare("SELECT * FROM service_marketplace_settings WHERE country_code = ?1 LIMIT 1").bind(country).first<Record<string, unknown>>());
  if (existing) return marketplaceSettingsFromRow(existing, country);
  const defaults = { ...DEFAULT_SERVICE_MARKETPLACE_SETTINGS, countryCode: country };
  await insertRow(
    db,
    `INSERT OR IGNORE INTO service_marketplace_settings
      (id, country_code, hero_kicker_ar, hero_kicker_en, hero_title_ar, hero_title_en,
       hero_description_ar, hero_description_en, primary_cta_ar, primary_cta_en, primary_cta_href,
       secondary_cta_ar, secondary_cta_en, secondary_cta_href, announcement_ar, announcement_en,
       show_categories, show_featured_providers, show_latest_requests, show_how_it_works, show_trust_bar,
       featured_category_limit, featured_provider_limit, latest_request_limit,
       allow_public_requests, allow_provider_registration, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
             ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?27)`,
    [
      crypto.randomUUID(), country, defaults.heroKickerAr, defaults.heroKickerEn, defaults.heroTitleAr, defaults.heroTitleEn,
      defaults.heroDescriptionAr, defaults.heroDescriptionEn, defaults.primaryCtaAr, defaults.primaryCtaEn, defaults.primaryCtaHref,
      defaults.secondaryCtaAr, defaults.secondaryCtaEn, defaults.secondaryCtaHref, defaults.announcementAr, defaults.announcementEn,
      1, 1, 1, 1, 1, defaults.featuredCategoryLimit, defaults.featuredProviderLimit, defaults.latestRequestLimit, 1, 1, nowMySqlDateTime(),
    ],
  );
  return defaults;
}

export async function updateServiceMarketplaceSettings(
  countryCode: string,
  patch: Partial<Omit<ServiceMarketplaceSettings, "countryCode">>,
  actor?: ActorContext,
): Promise<ServiceMarketplaceSettings> {
  const current = await getServiceMarketplaceSettings(countryCode);
  const next = { ...current, ...patch, countryCode: countryCode.toUpperCase() };
  const db = await getServicesDb();
  await db.prepare(
    `UPDATE service_marketplace_settings SET
       hero_kicker_ar = ?1, hero_kicker_en = ?2, hero_title_ar = ?3, hero_title_en = ?4,
       hero_description_ar = ?5, hero_description_en = ?6,
       primary_cta_ar = ?7, primary_cta_en = ?8, primary_cta_href = ?9,
       secondary_cta_ar = ?10, secondary_cta_en = ?11, secondary_cta_href = ?12,
       announcement_ar = ?13, announcement_en = ?14,
       show_categories = ?15, show_featured_providers = ?16, show_latest_requests = ?17,
       show_how_it_works = ?18, show_trust_bar = ?19,
       featured_category_limit = ?20, featured_provider_limit = ?21, latest_request_limit = ?22,
       allow_public_requests = ?23, allow_provider_registration = ?24,
       updated_by = ?25, updated_at = ?26 WHERE country_code = ?27`,
  ).bind(
    next.heroKickerAr, next.heroKickerEn, next.heroTitleAr, next.heroTitleEn,
    next.heroDescriptionAr, next.heroDescriptionEn,
    next.primaryCtaAr, next.primaryCtaEn, next.primaryCtaHref,
    next.secondaryCtaAr, next.secondaryCtaEn, next.secondaryCtaHref,
    next.announcementAr, next.announcementEn,
    next.showCategories ? 1 : 0, next.showFeaturedProviders ? 1 : 0, next.showLatestRequests ? 1 : 0,
    next.showHowItWorks ? 1 : 0, next.showTrustBar ? 1 : 0,
    Math.max(1, Math.min(48, next.featuredCategoryLimit)), Math.max(1, Math.min(24, next.featuredProviderLimit)), Math.max(1, Math.min(24, next.latestRequestLimit)),
    next.allowPublicRequests ? 1 : 0, next.allowProviderRegistration ? 1 : 0,
    actor?.userId ?? null, nowMySqlDateTime(), next.countryCode,
  ).run();
  await writeAudit({ action: "service_marketplace.settings.update", entityType: "service_marketplace_settings", entityId: next.countryCode, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return next;
}

/* ============================================================
 * Requests (full lifecycle)
 * ============================================================ */

export type NewRequestFull = {
  customerUserId: string;
  categoryId: string;
  countryCode: string;
  cityId: string;
  districtId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  title?: string | null;
  description?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  urgency?: string | null;
  preferredPeriod?: string | null;
  needsVisit?: boolean;
  accessNotes?: string | null;
  shortAddress?: string | null;
  pricingType?: string | null;
  preferredDate?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactPreference?: "platform" | "phone" | "whatsapp" | "email" | null;
  answers?: Array<{ key: string; label?: string | null; type?: string | null; value?: string | null }>;
  attachments?: Array<{ fileName: string; fileUrl: string; fileSize?: number; mimeType?: string | null }>;
};

export async function createRequestFull(input: NewRequestFull, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const now = nowMySqlDateTime();
  const year = new Date().getFullYear();
  const seqRow = await db.prepare("SELECT COUNT(*) AS count FROM service_requests WHERE reference_number LIKE ?1").bind(`SR-${year}-%`).first<{ count: number }>();
  const seq = 1001 + Number(seqRow?.count ?? 0);
  const referenceNumber = `SR-${year}-${seq}`;

  const id = await insertRow(
    db,
    `INSERT INTO service_requests
      (id, customer_user_id, category_id, country_code, city_id, district_id, latitude, longitude,
       title, description, title_key, description_key, budget_min, budget_max, currency, preferred_date,
       status, urgency, preferred_period, needs_visit, access_notes, short_address, pricing_type,
       reference_number, answers, contact_phone, contact_email, contact_preference, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, NULL, ?11, ?12, ?13, ?14,
       'draft', ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?26)`,
    [
      crypto.randomUUID(), input.customerUserId, input.categoryId,
      String(input.countryCode).toUpperCase(), input.cityId, input.districtId ?? null,
      input.latitude ?? null, input.longitude ?? null,
      input.title ?? null, input.description ?? null,
      input.budgetMin ?? null, input.budgetMax ?? null, requireCurrencyCode(input.currency), input.preferredDate ?? null,
      input.urgency ?? null, input.preferredPeriod ?? null, input.needsVisit ? 1 : 0,
      input.accessNotes ?? null, input.shortAddress ?? null, input.pricingType ?? "fixed",
      referenceNumber, input.answers ? JSON.stringify(input.answers) : null,
      input.contactPhone ?? null, input.contactEmail ?? null, input.contactPreference ?? "platform", now,
    ],
  );

  await recordRequestHistory(id, null, REQUEST_STATUS.DRAFT, "تم إنشاء الطلب كمسودة", input.customerUserId);
  await addRequestAttachments(id, input.customerUserId, input.attachments ?? []);
  await writeAudit({ action: "service_request.create", entityType: "service_requests", entityId: id, metadata: { categoryId: input.categoryId, referenceNumber }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function publishRequest(requestId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const request = await getRequestFull(requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== REQUEST_STATUS.DRAFT) throw new Error("REQUEST_STATUS_INVALID");
  const now = nowMySqlDateTime();
  await db
    .prepare("UPDATE service_requests SET status = 'published', published_at = ?1, updated_at = ?1 WHERE id = ?2")
    .bind(now, requestId)
    .run();
  await recordRequestHistory(requestId, REQUEST_STATUS.DRAFT, REQUEST_STATUS.PUBLISHED, "تم نشر الطلب وبدء المطابقة", actor?.userId ?? null);
  const matched = await runMatching(requestId);
  if (matched > 0) {
    await db.prepare("UPDATE service_requests SET matched_at = ?1 WHERE id = ?2").bind(now, requestId).run();
  }
  await writeAudit({ action: "service_request.publish", entityType: "service_requests", entityId: requestId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function getRequestFull(requestId: string): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  const request = row(await db.prepare("SELECT * FROM service_requests WHERE id = ?1").bind(requestId).first<Record<string, unknown>>());
  return request;
}

export async function getRequestDetail(requestId: string): Promise<Record<string, unknown> | null> {
  const request = await getRequestFull(requestId);
  if (!request) return null;
  if (request.answers && typeof request.answers === "string") {
    try {
      request.answers_parsed = JSON.parse(request.answers as string);
    } catch {
      request.answers_parsed = [];
    }
  }
  request.category = await getCategoryById(String(request.category_id));
  request.attachments = await listRequestAttachments(requestId);
  request.history = await listRequestHistory(requestId);
  request.offers = await listOffersForRequest(requestId);
  request.matches = await listRequestMatches(requestId);
  return request;
}

export async function updateRequest(requestId: string, patch: {
  title?: string | null;
  description?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  urgency?: string | null;
  preferredPeriod?: string | null;
  needsVisit?: boolean | null;
  accessNotes?: string | null;
  shortAddress?: string | null;
  preferredDate?: string | null;
  answers?: Array<{ key: string; label?: string | null; type?: string | null; value?: string | null }> | null;
}, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const request = await getRequestFull(requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== REQUEST_STATUS.DRAFT && request.status !== REQUEST_STATUS.PUBLISHED) throw new Error("REQUEST_NOT_EDITABLE");

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = ?${values.length}`);
  };

  if (patch.title !== undefined) add("title", patch.title);
  if (patch.description !== undefined) add("description", patch.description);
  if (patch.budgetMin !== undefined) add("budget_min", patch.budgetMin);
  if (patch.budgetMax !== undefined) add("budget_max", patch.budgetMax);
  if (patch.urgency !== undefined) add("urgency", patch.urgency);
  if (patch.preferredPeriod !== undefined) add("preferred_period", patch.preferredPeriod);
  if (patch.needsVisit !== undefined) add("needs_visit", patch.needsVisit ? 1 : 0);
  if (patch.accessNotes !== undefined) add("access_notes", patch.accessNotes);
  if (patch.shortAddress !== undefined) add("short_address", patch.shortAddress);
  if (patch.preferredDate !== undefined) add("preferred_date", patch.preferredDate);
  if (patch.answers !== undefined) add("answers", patch.answers ? JSON.stringify(patch.answers) : null);

  if (!sets.length) return;

  add("updated_at", nowMySqlDateTime());
  values.push(requestId);

  await db
    .prepare(`UPDATE service_requests SET ${sets.join(", ")} WHERE id = ?${values.length}`)
    .bind(...values)
    .run();

  await writeAudit({ action: "service_request.update", entityType: "service_requests", entityId: requestId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function cancelRequestFull(requestId: string, byUserId: string, reason?: string | null, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const request = await getRequestFull(requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (String(request.customer_user_id) !== byUserId) throw new Error("ONLY_CUSTOMER");
  const from = String(request.status);
  const cancellable: string[] = [REQUEST_STATUS.DRAFT, REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.RECEIVING_OFFERS, REQUEST_STATUS.OFFER_SELECTED];
  if (!cancellable.includes(from)) throw new Error("REQUEST_STATUS_INVALID");
  await db
    .prepare("UPDATE service_requests SET status = 'cancelled', updated_at = ?1 WHERE id = ?2")
    .bind(nowMySqlDateTime(), requestId)
    .run();
  await recordRequestHistory(requestId, from, REQUEST_STATUS.CANCELLED, reason ?? "أُلغي الطلب من قبل العميل", byUserId);
  await writeAudit({ action: "service_request.cancel", entityType: "service_requests", entityId: requestId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function expireStaleRequests(days = 14): Promise<number> {
  const db = await getServicesDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const result = await db
    .prepare("SELECT id, status FROM service_requests WHERE status IN ('published','receiving_offers') AND created_at < ?1")
    .bind(cutoff)
    .all<{ id: string; status: string }>();
  const rows = result.results ?? [];
  for (const request of rows) {
    await db
      .prepare("UPDATE service_requests SET status = 'expired', updated_at = ?1 WHERE id = ?2")
      .bind(nowMySqlDateTime(), request.id)
      .run();
    await recordRequestHistory(request.id, request.status, REQUEST_STATUS.EXPIRED, "انتهت صلاحية الطلب تلقائياً", null);
  }
  return rows.length;
}

export type RequestFilter = {
  countryCode?: string;
  countryAliases?: string[];
  cityId?: string;
  cityAliases?: string[];
  districtId?: string;
  districtAliases?: string[];
  categoryId?: string;
  status?: string;
  /** Matches any of these statuses; ignored when `status` is set. */
  statuses?: readonly string[];
  customerUserId?: string;
  urgency?: string;
  /** Case-insensitive LIKE match against `service_requests.title`. */
  search?: string;
};

function buildRequestFilter(query: RequestFilter): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const push = (value: unknown) => {
    params.push(value);
    return params.length;
  };
  const aliases = (values: string[] | undefined, fallback?: string): string[] => [...new Set(
    (values?.length ? values : fallback ? [fallback] : [])
      .flatMap((value) => {
        const token = String(value).trim();
        return token ? [token, token.toLocaleLowerCase("en"), token.toLocaleUpperCase("en")] : [];
      }),
  )];
  const addAliases = (column: string, values: string[] | undefined, fallback?: string) => {
    const tokens = aliases(values, fallback);
    if (!tokens.length) return;
    clauses.push(`${column} IN (${tokens.map((token) => `?${push(token)}`).join(", ")})`);
  };
  addAliases("country_code", query.countryAliases, query.countryCode);
  addAliases("city_id", query.cityAliases, query.cityId);
  addAliases("district_id", query.districtAliases, query.districtId);
  if (query.categoryId) clauses.push(`category_id = ?${push(query.categoryId)}`);
  if (query.status) clauses.push(`status = ?${push(query.status)}`);
  else if (query.statuses?.length) clauses.push(`status IN (${query.statuses.map((status) => `?${push(status)}`).join(", ")})`);
  if (query.customerUserId) clauses.push(`customer_user_id = ?${push(query.customerUserId)}`);
  if (query.urgency) clauses.push(`urgency = ?${push(query.urgency)}`);
  if (query.search) clauses.push(`title LIKE ?${push(`%${query.search}%`)}`);
  return { where: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function listRequestsFull(query: RequestFilter & { limit?: number; offset?: number } = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const { where, params } = buildRequestFilter(query);
  let sql = `SELECT * FROM service_requests${where} ORDER BY created_at DESC`;
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
    if (query.offset) {
      params.push(query.offset);
      sql += ` OFFSET ?${params.length}`;
    }
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function countRequestsFull(query: RequestFilter = {}): Promise<number> {
  const db = await getServicesDb();
  const { where, params } = buildRequestFilter(query);
  const counted = await db
    .prepare(`SELECT COUNT(*) AS count FROM service_requests${where}`)
    .bind(...params)
    .first<{ count: number }>();
  return Number(counted?.count ?? 0);
}

export async function listMatchedRequestsForProvider(providerUserId: string, query: { status?: string; limit?: number } = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const provider = await getProviderProfileByUserId(providerUserId);
  if (!provider) return [];
  const clauses: string[] = ["m.provider_id = ?1"];
  const params: unknown[] = [provider.id];
  if (query.status) {
    params.push(query.status);
    clauses.push(`r.status = ?${params.length}`);
  } else {
    clauses.push("r.status IN ('published','receiving_offers')");
  }
  let sql = `SELECT r.*, m.score AS match_score, m.distance_km AS match_distance_km, m.is_contacted AS match_contacted, m.provider_ignored
             FROM service_request_matches m
             JOIN service_requests r ON r.id = m.request_id
             WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY m.score DESC, r.created_at DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function listRequestMatches(requestId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare(
      `SELECT m.*, p.display_name_ar, p.display_name_en, p.rating_avg, p.rating_count, p.jobs_completed, p.completion_rate, p.response_rate, p.logo_url, p.city_id
       FROM service_request_matches m
       LEFT JOIN service_provider_profiles p ON p.id = m.provider_id
       WHERE m.request_id = ?1 AND m.provider_ignored = 0
       ORDER BY m.score DESC`,
    )
    .bind(requestId)
    .all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function markMatchContacted(requestId: string, providerUserId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const provider = await getProviderProfileByUserId(providerUserId);
  if (!provider) return;
  await db
    .prepare("UPDATE service_request_matches SET is_contacted = 1, contacted_at = ?1 WHERE request_id = ?2 AND provider_id = ?3")
    .bind(nowMySqlDateTime(), requestId, provider.id)
    .run();
  await writeAudit({ action: "service_match.contacted", entityType: "service_request_matches", entityId: requestId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function providerIgnoreMatch(requestId: string, providerUserId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const provider = await getProviderProfileByUserId(providerUserId);
  if (!provider) return;
  await db
    .prepare("UPDATE service_request_matches SET provider_ignored = 1 WHERE request_id = ?1 AND provider_id = ?2")
    .bind(requestId, provider.id)
    .run();
  await writeAudit({ action: "service_match.ignored", entityType: "service_request_matches", entityId: requestId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

/* ---------- Request answers / attachments / history ---------- */

export async function addRequestAttachments(requestId: string, uploadedBy: string | null, attachments: Array<{ fileName: string; fileUrl: string; fileSize?: number; mimeType?: string | null }>): Promise<void> {
  if (!attachments.length) return;
  const db = await getServicesDb();
  const statements = attachments.map((attachment) =>
    db.prepare(
      `INSERT INTO service_request_attachments (id, request_id, file_name, file_url, file_size, mime_type, uploaded_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(crypto.randomUUID(), requestId, attachment.fileName, attachment.fileUrl, attachment.fileSize ?? 0, attachment.mimeType ?? null, uploadedBy, nowMySqlDateTime()),
  );
  await db.batch(statements);
}

export async function listRequestAttachments(requestId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_request_attachments WHERE request_id = ?1 ORDER BY created_at DESC").bind(requestId).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function recordRequestHistory(requestId: string, from: string | null, to: string, note: string | null, changedBy: string | null): Promise<void> {
  const db = await getServicesDb();
  await insertRow(
    db,
    `INSERT INTO service_request_status_history (id, request_id, from_status, to_status, note, changed_by, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    [crypto.randomUUID(), requestId, from, to, note, changedBy ?? null, nowMySqlDateTime()],
  );
}

export async function listRequestHistory(requestId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_request_status_history WHERE request_id = ?1 ORDER BY created_at ASC").bind(requestId).all<Record<string, unknown>>();
  return result.results ?? [];
}

/* ============================================================
 * Offers
 * ============================================================ */

export type NewOfferFull = {
  requestId: string;
  providerUserId: string;
  price?: number | null;
  currency?: string;
  durationDays?: number | null;
  materialsIncluded?: boolean;
  materialCost?: number | null;
  laborCost?: number | null;
  visitFee?: number | null;
  taxAmount?: number | null;
  totalPrice?: number | null;
  durationText?: string | null;
  nearestDate?: string | null;
  offerNotes?: string | null;
  terms?: string | null;
  validUntil?: string | null;
  needsVisit?: boolean;
  messageKey?: string | null;
  reason?: string | null;
};

function computeTotal(input: NewOfferFull): { total: number; price: number } {
  const price = num(input.price) ?? 0;
  const total = num(input.totalPrice) ?? price + (num(input.materialCost) ?? 0) + (num(input.visitFee) ?? 0) + (num(input.taxAmount) ?? 0);
  return { total: Math.round(total), price: Math.round(price) };
}

export async function createOfferFull(input: NewOfferFull, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const request = await getRequestFull(input.requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  const requestStatus = String(request.status);
  if (requestStatus !== REQUEST_STATUS.PUBLISHED && requestStatus !== REQUEST_STATUS.RECEIVING_OFFERS) throw new Error("REQUEST_NOT_OPEN");

  if (String(request.customer_user_id) === input.providerUserId) throw new Error("SELF_OFFER_NOT_ALLOWED");

  const provider = await getProviderProfileByUserId(input.providerUserId);
  if (!provider) throw new Error("PROVIDER_PROFILE_REQUIRED");
  if (provider.status !== PROVIDER_STATUS.APPROVED) throw new Error("PROVIDER_NOT_APPROVED");

  const providerCategories = await db
    .prepare("SELECT category_id, price_from, price_to FROM service_provider_categories WHERE provider_id = ?1 AND is_active = 1")
    .bind(String(provider.id))
    .all<{ category_id: string; price_from: number | null; price_to: number | null }>();

  const categoryRows = providerCategories.results ?? [];
  const eligibility = computeMatchScore(
    {
      id: input.requestId,
      category_id: String(request.category_id),
      country_code: String(request.country_code),
      city_id: request.city_id ? String(request.city_id) : null,
      latitude: request.latitude == null ? null : Number(request.latitude),
      longitude: request.longitude == null ? null : Number(request.longitude),
      urgency: request.urgency ? String(request.urgency) : null,
      budget_min: request.budget_min == null ? null : Number(request.budget_min),
      budget_max: request.budget_max == null ? null : Number(request.budget_max),
    },
    {
      id: String(provider.id),
      user_id: input.providerUserId,
      country_code: String(provider.country_code ?? ""),
      city_id: provider.city_id ? String(provider.city_id) : null,
      latitude: provider.latitude == null ? null : Number(provider.latitude),
      longitude: provider.longitude == null ? null : Number(provider.longitude),
      service_radius_km: provider.service_radius_km == null ? null : Number(provider.service_radius_km),
      rating_avg: provider.rating_avg == null ? null : Number(provider.rating_avg),
      rating_count: provider.rating_count == null ? null : Number(provider.rating_count),
      completion_rate: provider.completion_rate == null ? null : Number(provider.completion_rate),
      response_rate: provider.response_rate == null ? null : Number(provider.response_rate),
      status: String(provider.status),
      category_ids: categoryRows.map((entry) => entry.category_id),
      price_ranges: categoryRows.map((entry) => ({
        category_id: entry.category_id,
        price_from: entry.price_from,
        price_to: entry.price_to,
      })),
    },
  );

  if (!eligibility) throw new Error("PROVIDER_NOT_ELIGIBLE");

  const existing = await db
    .prepare("SELECT id FROM service_offers WHERE request_id = ?1 AND provider_user_id = ?2 AND status != 'withdrawn'")
    .bind(input.requestId, input.providerUserId)
    .first<{ id: string }>();
  if (existing) throw new Error("OFFER_ALREADY_EXISTS");

  const { total, price } = computeTotal(input);
  const now = nowMySqlDateTime();
  const id = await insertRow(
    db,
    `INSERT INTO service_offers
      (id, request_id, provider_user_id, listing_id, price, currency, duration_days, message_key, status,
       materials_included, material_cost, labor_cost, visit_fee, tax_amount, total_price, duration_text,
       nearest_date, offer_notes, terms, valid_until, needs_visit, created_at, updated_at)
     VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, 'sent', ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?20)`,
    [
      crypto.randomUUID(), input.requestId, input.providerUserId,
      price, requireCurrencyCode(input.currency), input.durationDays ?? null, input.messageKey ?? null,
      input.materialsIncluded ? 1 : 0, num(input.materialCost) ?? null, num(input.laborCost) ?? null,
      num(input.visitFee) ?? null, num(input.taxAmount) ?? null, total,
      input.durationText ?? null, input.nearestDate ?? null, input.offerNotes ?? null,
      input.terms ?? null, input.validUntil ?? null, input.needsVisit ? 1 : 0, now,
    ],
  );
  await insertOfferRevision(id, input, 1, actor);
  if (requestStatus === REQUEST_STATUS.PUBLISHED) {
    await db
      .prepare("UPDATE service_requests SET status = 'receiving_offers', updated_at = ?1 WHERE id = ?2")
      .bind(now, input.requestId)
      .run();
    await recordRequestHistory(input.requestId, REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.RECEIVING_OFFERS, "استلم الطلب عرضاً جديداً", input.providerUserId);
  }
  await notify(String(request.customer_user_id), {
    type: "SERVICE_OFFER_RECEIVED",
    title: "وصل عرض جديد لطلبك",
    body: `وصل عرض جديد بخصوص طلب ${String(request.reference_number ?? "")}`,
    link: `/service-requests/${input.requestId}`,
    entityType: "service_requests",
    entityId: input.requestId,
  });
  await writeAudit({ action: "service_offer.create", entityType: "service_offers", entityId: id, metadata: { requestId: input.requestId }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

async function insertOfferRevision(offerId: string, input: NewOfferFull, revisionNumber: number, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const { total, price } = computeTotal(input);
  await insertRow(
    db,
    `INSERT INTO service_offer_revisions
      (id, offer_id, revision_number, request_id, provider_user_id, price, currency, total_price, duration_text,
       material_cost, labor_cost, visit_fee, tax_amount, materials_included, nearest_date, offer_notes, terms,
       needs_visit, reason, created_by, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)`,
    [
      crypto.randomUUID(), offerId, revisionNumber, input.requestId, input.providerUserId,
      price, requireCurrencyCode(input.currency), total, input.durationText ?? null,
      num(input.materialCost) ?? null, num(input.laborCost) ?? null, num(input.visitFee) ?? null, num(input.taxAmount) ?? null,
      input.materialsIncluded ? 1 : 0, input.nearestDate ?? null, input.offerNotes ?? null, input.terms ?? null,
      input.needsVisit ? 1 : 0, input.reason ?? null, actor?.userId ?? null, nowMySqlDateTime(),
    ],
  );
}

export async function listOffersForRequest(requestId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare(
      `SELECT o.*, p.display_name_ar, p.display_name_en, p.rating_avg, p.rating_count, p.logo_url, p.business_name
       FROM service_offers o
       LEFT JOIN service_provider_profiles p ON p.user_id = o.provider_user_id
       WHERE o.request_id = ?1 AND o.status != 'withdrawn'
       ORDER BY o.total_price ASC`,
    )
    .bind(requestId)
    .all<Record<string, unknown>>();
  const offers = result.results ?? [];
  for (const offer of offers) {
    const revisions = await db
      .prepare("SELECT * FROM service_offer_revisions WHERE offer_id = ?1 ORDER BY revision_number ASC")
      .bind(offer.id)
      .all<Record<string, unknown>>();
    offer.revisions = revisions.results ?? [];
  }
  return offers;
}

export async function listOffersForParticipant(userId: string, query: { mine?: boolean; limit?: number } = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const limit = Math.min(query.limit ?? 100, 100);
  const result = await db
    .prepare(
      `SELECT o.*, p.display_name_ar, p.display_name_en, p.rating_avg, p.rating_count, p.logo_url, p.business_name,
              r.reference_number, r.title AS request_title
       FROM service_offers o
       LEFT JOIN service_provider_profiles p ON p.user_id = o.provider_user_id
       LEFT JOIN service_requests r ON r.id = o.request_id
       WHERE o.provider_user_id = ?1 OR o.request_id IN (
         SELECT id FROM service_requests WHERE customer_user_id = ?1
       )
       ORDER BY o.created_at DESC
       LIMIT ?2`,
    )
    .bind(userId, limit)
    .all<Record<string, unknown>>();
  const offers = result.results ?? [];
  for (const offer of offers) {
    const revisions = await db
      .prepare("SELECT * FROM service_offer_revisions WHERE offer_id = ?1 ORDER BY revision_number ASC")
      .bind(offer.id)
      .all<Record<string, unknown>>();
    offer.revisions = revisions.results ?? [];
  }
  return offers;
}

export async function reviseOffer(offerId: string, input: NewOfferFull, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const offer = await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(offerId).first<Record<string, unknown>>();
  if (!offer) throw new Error("OFFER_NOT_FOUND");
  if (String(offer.provider_user_id) !== input.providerUserId) throw new Error("ONLY_PROVIDER");
  if (offer.status !== OFFER_STATUS.SENT) throw new Error("OFFER_NOT_SENT");

  const { total, price } = computeTotal(input);
  await db
    .prepare(
      `UPDATE service_offers SET price = ?1, total_price = ?2, duration_days = ?3, materials_included = ?4,
         material_cost = ?5, labor_cost = ?6, visit_fee = ?7, tax_amount = ?8, duration_text = ?9,
         nearest_date = ?10, offer_notes = ?11, terms = ?12, valid_until = ?13, needs_visit = ?14, updated_at = ?15
       WHERE id = ?16`,
    )
    .bind(
      price, total, input.durationDays ?? null, input.materialsIncluded ? 1 : 0,
      num(input.materialCost) ?? null, num(input.laborCost) ?? null, num(input.visitFee) ?? null, num(input.taxAmount) ?? null,
      input.durationText ?? null, input.nearestDate ?? null, input.offerNotes ?? null, input.terms ?? null,
      input.validUntil ?? null, input.needsVisit ? 1 : 0, nowMySqlDateTime(), offerId,
    )
    .run();

  const last = await db
    .prepare("SELECT MAX(revision_number) AS max FROM service_offer_revisions WHERE offer_id = ?1")
    .bind(offerId)
    .first<{ max: number }>();
  await insertOfferRevision(offerId, input, Number(last?.max ?? 1) + 1, actor);
  await writeAudit({ action: "service_offer.revise", entityType: "service_offers", entityId: offerId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function withdrawOffer(offerId: string, byUserId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const offer = await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(offerId).first<Record<string, unknown>>();
  if (!offer) throw new Error("OFFER_NOT_FOUND");
  if (String(offer.provider_user_id) !== byUserId) throw new Error("ONLY_PROVIDER");
  if (offer.status !== OFFER_STATUS.SENT) throw new Error("OFFER_NOT_SENT");
  await db.prepare("UPDATE service_offers SET status = 'withdrawn', updated_at = ?1 WHERE id = ?2").bind(nowMySqlDateTime(), offerId).run();
  await writeAudit({ action: "service_offer.withdraw", entityType: "service_offers", entityId: offerId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function declineOffer(offerId: string, byUserId: string, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const offer = await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(offerId).first<Record<string, unknown>>();
  if (!offer) throw new Error("OFFER_NOT_FOUND");
  const request = await getRequestFull(String(offer.request_id));
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (String(request.customer_user_id) !== byUserId) throw new Error("ONLY_CUSTOMER");
  if (offer.status !== OFFER_STATUS.SENT) throw new Error("OFFER_NOT_SENT");
  await db.prepare("UPDATE service_offers SET status = 'rejected', updated_at = ?1 WHERE id = ?2").bind(nowMySqlDateTime(), offerId).run();
  await writeAudit({ action: "service_offer.decline", entityType: "service_offers", entityId: offerId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

function isOfferExpired(offer: Record<string, unknown>): boolean {
  const validUntil = str(offer.valid_until);
  if (!validUntil) return false;
  const date = new Date(validUntil.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export async function acceptOfferFlow(offerId: string, byUserId: string, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  const offer = await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(offerId).first<Record<string, unknown>>();
  if (!offer) throw new Error("OFFER_NOT_FOUND");
  const request = await getRequestFull(String(offer.request_id));
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (String(request.customer_user_id) !== byUserId) throw new Error("ONLY_CUSTOMER");
  const requestStatus = String(request.status);
  if (requestStatus !== REQUEST_STATUS.PUBLISHED && requestStatus !== REQUEST_STATUS.RECEIVING_OFFERS) throw new Error("REQUEST_NOT_OPEN");
  if (offer.status !== OFFER_STATUS.SENT) throw new Error("OFFER_NOT_SENT");
  if (isOfferExpired(offer)) throw new Error("OFFER_EXPIRED");

  const existingOrder = await db
    .prepare("SELECT id FROM service_orders WHERE request_id = ?1 LIMIT 1")
    .bind(String(offer.request_id))
    .first<{ id: string }>();
  if (existingOrder) throw new Error("REQUEST_NOT_OPEN");

  const now = nowMySqlDateTime();
  let orderId: string;
  try {
    orderId = await insertRow(
    db,
    `INSERT INTO service_orders
      (id, request_id, offer_id, customer_user_id, provider_user_id, price, currency, status, accepted_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'accepted', ?8, ?8, ?8)`,
    [
      crypto.randomUUID(), offer.request_id, offer.id,
      request.customer_user_id, offer.provider_user_id, offer.price, requireCurrencyCode(offer.currency), now,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|already exists/i.test(message)) throw new Error("REQUEST_NOT_OPEN");
    throw error;
  }

  await db.prepare("UPDATE service_offers SET status = 'accepted', updated_at = ?1 WHERE id = ?2").bind(now, offerId).run();
  await db
    .prepare("UPDATE service_offers SET status = 'rejected', updated_at = ?1 WHERE request_id = ?2 AND id != ?3 AND status = 'sent'")
    .bind(now, offer.request_id, offerId)
    .run();
  await db.prepare("UPDATE service_requests SET status = 'offer_selected', updated_at = ?1 WHERE id = ?2").bind(now, offer.request_id).run();
  await recordRequestHistory(String(offer.request_id), requestStatus, REQUEST_STATUS.OFFER_SELECTED, "تم اختيار عرض وقبول الطلب", byUserId);

  await addJobTimeline(orderId, {
    event: "offer_accepted",
    actorUserId: byUserId,
    fromStatus: requestStatus,
    toStatus: REQUEST_STATUS.OFFER_SELECTED,
    note: "تم قبول العرض وإنشاء الوظيفة",
  });

  await notify(String(offer.provider_user_id), {
    type: "SERVICE_OFFER_ACCEPTED",
    title: "تم قبول عرضك",
    body: `تم قبول عرضك لطلب ${String(request.reference_number ?? "")} وبدأت الوظيفة`,
    link: `/dashboard/services/jobs/${orderId}`,
    entityType: "service_orders",
    entityId: orderId,
  });

  await enqueueOutbox("SERVICE_OFFER_ACCEPTED", {
    orderId,
    offerId,
    requestId: offer.request_id,
    providerUserId: offer.provider_user_id,
    customerUserId: request.customer_user_id,
  });

  await writeAudit({ action: "service_order.accept", entityType: "service_orders", entityId: orderId, metadata: { offerId, requestId: offer.request_id }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return orderId;
}

/* ============================================================
 * Jobs / workspace
 * ============================================================ */

export const JOB_EVENTS: Record<string, string> = {
  [ORDER_STATUS.ACCEPTED]: "order_accepted",
  [ORDER_STATUS.IN_PROGRESS]: "order_in_progress",
  [ORDER_STATUS.DELIVERED]: "order_delivered",
  [ORDER_STATUS.COMPLETED]: "order_completed",
  [ORDER_STATUS.CANCELLED]: "order_cancelled",
  [ORDER_STATUS.DISPUTED]: "order_disputed",
};

export async function updateJobStatus(orderId: string, to: OrderStatus, byUserId: string, note?: string | null, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  if (!isOrderStatus(to)) throw new Error("ORDER_STATUS_INVALID");
  const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(orderId).first<Record<string, unknown>>();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const isCustomer = order.customer_user_id === byUserId;
  const isProvider = order.provider_user_id === byUserId;
  if (!isCustomer && !isProvider) throw new Error("NOT_PARTICIPANT");
  if (!canTransition(order.status as OrderStatus, to)) throw new Error("ORDER_STATUS_INVALID");

  const from = String(order.status);
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

  await addJobTimeline(orderId, { event: JOB_EVENTS[to] ?? `order_${to}`, actorUserId: byUserId, fromStatus: from, toStatus: to, note: note ?? null });

  if (to === ORDER_STATUS.COMPLETED) {
    const otherUserId = isCustomer ? String(order.provider_user_id) : String(order.customer_user_id);
    await notify(otherUserId, {
      type: "SERVICE_JOB_COMPLETED",
      title: "اكتملت الوظيفة",
      body: `تم إكمال الوظيفة ${orderId.slice(0, 8)} — يمكنك الآن كتابة تقييم`,
      link: `/dashboard/services/jobs/${orderId}`,
      entityType: "service_orders",
      entityId: orderId,
    });
    if (isProvider) {
      await db
        .prepare("UPDATE service_provider_profiles SET jobs_completed = jobs_completed + 1, updated_at = ?1 WHERE user_id = ?2")
        .bind(nowMySqlDateTime(), String(order.provider_user_id))
        .run();
    }
    if (order.request_id != null && String(order.request_id).trim()) {
      await db
        .prepare("UPDATE service_requests SET status = 'completed', updated_at = ?1 WHERE id = ?2")
        .bind(nowMySqlDateTime(), String(order.request_id))
        .run();
      await recordRequestHistory(String(order.request_id), null, REQUEST_STATUS.COMPLETED, "اكتمل الطلب عبر الوظيفة", byUserId);
    }
  }

  await writeAudit({ action: `service_order.status.${to}`, entityType: "service_orders", entityId: orderId, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function addJobTimeline(orderId: string, input: { event: string; actorUserId?: string | null; fromStatus?: string | null; toStatus?: string | null; note?: string | null }): Promise<string> {
  const db = await getServicesDb();
  return insertRow(
    db,
    `INSERT INTO service_job_timeline (id, order_id, event, actor_user_id, from_status, to_status, note, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    [crypto.randomUUID(), orderId, input.event, input.actorUserId ?? null, input.fromStatus ?? null, input.toStatus ?? null, input.note ?? null, nowMySqlDateTime()],
  );
}

export async function listJobTimeline(orderId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db.prepare("SELECT * FROM service_job_timeline WHERE order_id = ?1 ORDER BY created_at ASC").bind(orderId).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function getJobDetail(orderId: string, viewerUserId?: string | null): Promise<Record<string, unknown> | null> {
  const db = await getServicesDb();
  const order = row(await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(orderId).first<Record<string, unknown>>());
  if (!order) return null;
  if (viewerUserId && String(order.customer_user_id) !== viewerUserId && String(order.provider_user_id) !== viewerUserId) return null;
  order.request = order.request_id == null ? null : await getRequestFull(String(order.request_id));
  order.offer = order.offer_id == null ? null : row(await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(order.offer_id).first<Record<string, unknown>>());
  order.timeline = await listJobTimeline(orderId);
  order.messages = await threadMessages("order", orderId);
  order.reviews = await listReviews({ orderId });
  return order;
}

export async function listJobs(query: { participantUserId?: string; status?: string; limit?: number; role?: "customer" | "provider" } = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.participantUserId) {
    if (query.role === "provider") clauses.push("provider_user_id = ?1");
    else if (query.role === "customer") clauses.push("customer_user_id = ?1");
    else clauses.push("(customer_user_id = ?1 OR provider_user_id = ?1)");
    params.push(query.participantUserId);
  }
  if (query.status) {
    params.push(query.status);
    clauses.push(`status = ?${params.length}`);
  }
  let sql = "SELECT * FROM service_orders";
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY updated_at DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

/* ============================================================
 * Reviews
 * ============================================================ */

export async function addReviewFull(input: {
  orderId: string;
  reviewerUserId: string;
  revieweeUserId: string;
  rating: number;
  comment?: string | null;
  qualityRating?: number | null;
  punctualityRating?: number | null;
  communicationRating?: number | null;
  valueRating?: number | null;
  recommend?: boolean | null;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("RATING_INVALID");
  const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(input.orderId).first<Record<string, unknown>>();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== ORDER_STATUS.COMPLETED) throw new Error("ORDER_NOT_COMPLETED");

  const isCustomer = String(order.customer_user_id) === input.reviewerUserId;
  const isProvider = String(order.provider_user_id) === input.reviewerUserId;
  if (!isCustomer && !isProvider) throw new Error("NOT_PARTICIPANT");

  const expectedRevieweeUserId = isCustomer
    ? String(order.provider_user_id)
    : String(order.customer_user_id);
  if (input.revieweeUserId !== expectedRevieweeUserId) throw new Error("INVALID_REVIEWEE");

  const existing = await db
    .prepare("SELECT id FROM service_reviews WHERE order_id = ?1 AND reviewer_user_id = ?2")
    .bind(input.orderId, input.reviewerUserId)
    .first<{ id: string }>();
  if (existing) throw new Error("REVIEW_ALREADY_EXISTS");

  const id = await insertRow(
    db,
    `INSERT INTO service_reviews
      (id, order_id, reviewer_user_id, reviewee_user_id, rating, comment,
       quality_rating, punctuality_rating, communication_rating, value_rating, recommend, is_hidden, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0, ?12)`,
    [
      crypto.randomUUID(), input.orderId, input.reviewerUserId, input.revieweeUserId,
      input.rating, input.comment ?? null,
      input.qualityRating ?? null, input.punctualityRating ?? null, input.communicationRating ?? null,
      input.valueRating ?? null, input.recommend == null ? null : input.recommend ? 1 : 0, nowMySqlDateTime(),
    ],
  );

  await addJobTimeline(input.orderId, { event: "review_added", actorUserId: input.reviewerUserId, note: "أُضيف تقييم جديد" });
  await recomputeProviderRating(input.revieweeUserId);
  await notify(input.revieweeUserId, {
    type: "SERVICE_REVIEW_RECEIVED",
    title: "وصل تقييم جديد",
    body: `حصلت على تقييم ${input.rating} من أصل 5`,
    link: `/dashboard/services/reviews`,
    entityType: "service_reviews",
    entityId: id,
  });
  await writeAudit({ action: "service_review.create", entityType: "service_reviews", entityId: id, metadata: { orderId: input.orderId, rating: input.rating }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function recomputeProviderRating(providerUserId: string): Promise<void> {
  const db = await getServicesDb();
  const rowData = await db
    .prepare(
      `SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count
       FROM service_reviews
       WHERE reviewee_user_id = ?1 AND is_hidden = 0`,
    )
    .bind(providerUserId)
    .first<{ avg: number; count: number }>();
  const avg = Number(rowData?.avg ?? 0);
  const count = Number(rowData?.count ?? 0);
  await db
    .prepare("UPDATE service_provider_profiles SET rating_avg = ?1, rating_count = ?2, updated_at = ?3 WHERE user_id = ?4")
    .bind(Math.round(avg * 10) / 10, count, nowMySqlDateTime(), providerUserId)
    .run();
}

export async function setReviewHidden(reviewId: string, hidden: boolean, reason?: string | null, actor?: ActorContext): Promise<void> {
  const db = await getServicesDb();
  const review = row(await db.prepare("SELECT * FROM service_reviews WHERE id = ?1").bind(reviewId).first<Record<string, unknown>>());
  if (!review) throw new Error("REVIEW_NOT_FOUND");
  await db
    .prepare("UPDATE service_reviews SET is_hidden = ?1, hidden_reason = ?2 WHERE id = ?3")
    .bind(hidden ? 1 : 0, reason ?? null, reviewId)
    .run();
  await recomputeProviderRating(String(review.reviewee_user_id));
  await writeAudit({ action: hidden ? "service_review.hide" : "service_review.show", entityType: "service_reviews", entityId: reviewId, metadata: { reason }, actorUserId: actor?.userId, ipAddress: actor?.ip });
}

export async function listReviews(query: { orderId?: string; revieweeUserId?: string; reviewerUserId?: string; includeHidden?: boolean; limit?: number } = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.orderId) {
    params.push(query.orderId);
    clauses.push(`order_id = ?${params.length}`);
  }
  if (query.revieweeUserId) {
    params.push(query.revieweeUserId);
    clauses.push(`reviewee_user_id = ?${params.length}`);
  }
  if (query.reviewerUserId) {
    params.push(query.reviewerUserId);
    clauses.push(`reviewer_user_id = ?${params.length}`);
  }
  if (!query.includeHidden) clauses.push("is_hidden = 0");
  let sql = "SELECT * FROM service_reviews";
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY created_at DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function providerReviews(providerUserId: string): Promise<{ ratingAvg: number; ratingCount: number }> {
  const db = await getServicesDb();
  const rowData = await db
    .prepare("SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count FROM service_reviews WHERE reviewee_user_id = ?1 AND is_hidden = 0")
    .bind(providerUserId)
    .first<{ avg: number; count: number }>();
  return { ratingAvg: Number(rowData?.avg ?? 0), ratingCount: Number(rowData?.count ?? 0) };
}

/* ============================================================
 * Reports + moderation
 * ============================================================ */

export const REPORT_TARGETS = ["review", "listing", "request", "offer", "provider", "order"] as const;

export async function createReport(input: {
  targetType: string;
  targetId: string;
  reporterUserId: string;
  reason: string;
  description?: string | null;
}, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  if (!REPORT_TARGETS.includes(input.targetType as (typeof REPORT_TARGETS)[number])) throw new Error("REPORT_TARGET_INVALID");
  if (!input.reason.trim()) throw new Error("INVALID_BODY");
  const existing = await db
    .prepare("SELECT id FROM service_reports WHERE target_type = ?1 AND target_id = ?2 AND reporter_user_id = ?3 AND status IN ('open','in_review')")
    .bind(input.targetType, input.targetId, input.reporterUserId)
    .first<{ id: string }>();
  if (existing) throw new Error("REPORT_ALREADY_EXISTS");
  const id = await insertRow(
    db,
    `INSERT INTO service_reports (id, target_type, target_id, reporter_user_id, reason, description, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'open', ?7, ?7)`,
    [crypto.randomUUID(), input.targetType, input.targetId, input.reporterUserId, input.reason.trim(), input.description ?? null, nowMySqlDateTime()],
  );
  await writeAudit({ action: "service_report.create", entityType: "service_reports", entityId: id, metadata: { targetType: input.targetType, targetId: input.targetId, reason: input.reason }, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function listReports(query: { status?: string; targetType?: string; limit?: number } = {}): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.status) {
    params.push(query.status);
    clauses.push(`status = ?${params.length}`);
  }
  if (query.targetType) {
    params.push(query.targetType);
    clauses.push(`target_type = ?${params.length}`);
  }
  let sql = "SELECT * FROM service_reports";
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY created_at DESC";
  if (query.limit) {
    params.push(Math.min(query.limit, 100));
    sql += ` LIMIT ?${params.length}`;
  }
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function resolveReport(reportId: string, input: { resolution: string; action?: string | null; actor?: ActorContext }, moderationActorUserId?: string | null): Promise<void> {
  const db = await getServicesDb();
  const report = row(await db.prepare("SELECT * FROM service_reports WHERE id = ?1").bind(reportId).first<Record<string, unknown>>());
  if (!report) throw new Error("REPORT_NOT_FOUND");
  if (input.action) {
    await moderateTarget(String(report.target_type), String(report.target_id), input.action, moderationActorUserId ?? input.actor?.userId ?? null);
  }
  await db
    .prepare("UPDATE service_reports SET status = 'resolved', resolution_note = ?1, resolved_by = ?2, resolved_at = ?3, updated_at = ?3 WHERE id = ?4")
    .bind(input.resolution, moderationActorUserId ?? input.actor?.userId ?? null, nowMySqlDateTime(), reportId)
    .run();
  await writeAudit({ action: "service_report.resolve", entityType: "service_reports", entityId: reportId, metadata: { action: input.action }, actorUserId: input.actor?.userId, ipAddress: input.actor?.ip });
}

export async function moderateTarget(targetType: string, targetId: string, action: string, actorUserId?: string | null): Promise<void> {
  const db = await getServicesDb();
  if (targetType === "review" && action === "hide_review") {
    await setReviewHidden(targetId, true, "إجراء إشرافي بعد بلاغ", { userId: actorUserId });
  }
  if (targetType === "review" && action === "show_review") {
    await setReviewHidden(targetId, false, null, { userId: actorUserId });
  }
  if (targetType === "provider" && action === "suspend_provider") {
    await setProviderStatus(targetId, PROVIDER_STATUS.SUSPENDED, "تعليق بعد بلاغ", { userId: actorUserId });
  }
  if (targetType === "listing" && action === "deactivate_listing") {
    await db.prepare("UPDATE service_listings SET status = 'removed', updated_at = ?1 WHERE id = ?2").bind(nowMySqlDateTime(), targetId).run();
  }
  if (targetType === "request" && action === "deactivate_request") {
    await db.prepare("UPDATE service_requests SET status = 'cancelled', updated_at = ?1 WHERE id = ?2").bind(nowMySqlDateTime(), targetId).run();
  }
}

export async function getAdminOverview(): Promise<{
  pendingProviders: number;
  approvedProviders: number;
  publishedRequests: number;
  openOffers: number;
  activeJobs: number;
  openReports: number;
  totalRequests: number;
  totalOffers: number;
  totalJobs: number;
}> {
  const db = await getServicesDb();
  const count = async (sql: string, ...params: unknown[]): Promise<number> => {
    const row = await db.prepare(sql).bind(...params).first<{ count: number }>();
    return row?.count ?? 0;
  };
  const [pendingProviders, approvedProviders, publishedRequests, openOffers, activeJobs, openReports, totalRequests, totalOffers, totalJobs] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM service_provider_profiles WHERE status IN ('submitted','under_review')"),
    count("SELECT COUNT(*) AS count FROM service_provider_profiles WHERE status = 'approved'"),
    count("SELECT COUNT(*) AS count FROM service_requests WHERE status NOT IN ('draft','cancelled','expired')"),
    count("SELECT COUNT(*) AS count FROM service_offers WHERE status = 'sent'"),
    count("SELECT COUNT(*) AS count FROM service_orders WHERE status IN ('accepted','scheduled','in_progress','waiting_customer_confirmation','delivered')"),
    count("SELECT COUNT(*) AS count FROM service_reports WHERE status IN ('open','in_review')"),
    count("SELECT COUNT(*) AS count FROM service_requests"),
    count("SELECT COUNT(*) AS count FROM service_offers"),
    count("SELECT COUNT(*) AS count FROM service_orders"),
  ]);
  return { pendingProviders, approvedProviders, publishedRequests, openOffers, activeJobs, openReports, totalRequests, totalOffers, totalJobs };
}

export async function getAdminMarketplaceSnapshot(): Promise<{
  recentProviders: Array<Record<string, unknown>>;
  recentRequests: Array<Record<string, unknown>>;
  recentOrders: Array<Record<string, unknown>>;
  recentReports: Array<Record<string, unknown>>;
}> {
  const db = await getServicesDb();
  const [providers, requests, orders, reports] = await Promise.all([
    db.prepare(
      `SELECT p.id, p.display_name_ar, p.display_name_en, p.business_name, p.status, p.phone,
              p.governorate, p.is_featured, p.created_at
       FROM service_provider_profiles p ORDER BY p.created_at DESC LIMIT 20`,
    ).all<Record<string, unknown>>(),
    db.prepare(
      `SELECT r.id, r.reference_number, r.title, r.status, r.urgency, r.budget_min, r.budget_max,
              r.currency, r.created_at, c.name_ar AS category_name_ar
       FROM service_requests r LEFT JOIN service_categories c ON c.id = r.category_id
       ORDER BY r.created_at DESC LIMIT 20`,
    ).all<Record<string, unknown>>(),
    db.prepare(
      `SELECT o.id, o.status, o.agreed_price, o.currency, o.scheduled_at, o.created_at,
              r.reference_number, r.title AS request_title
       FROM service_orders o LEFT JOIN service_requests r ON r.id = o.request_id
       ORDER BY o.created_at DESC LIMIT 20`,
    ).all<Record<string, unknown>>(),
    db.prepare(
      `SELECT id, target_type, target_id, reason, status, created_at
       FROM service_reports ORDER BY created_at DESC LIMIT 20`,
    ).all<Record<string, unknown>>(),
  ]);
  return {
    recentProviders: providers.results ?? [],
    recentRequests: requests.results ?? [],
    recentOrders: orders.results ?? [],
    recentReports: reports.results ?? [],
  };
}

/* ============================================================
 * Messages
 *
 * ONE shared messaging core for the seven contexts (GENERAL, PROPERTY,
 * PROPERTY_REQUEST, SERVICE_REQUEST, SERVICE_JOB, PROFESSIONAL, ORGANIZATION).
 * `request`/`order` are the legacy storage values and keep working unchanged.
 * ============================================================ */

export async function ensureMessageParticipant(threadType: string, threadId: string, userId: string): Promise<void> {
  const db = await getServicesDb();
  const existing = await db
    .prepare("SELECT id FROM service_message_participants WHERE thread_type = ?1 AND thread_id = ?2 AND user_id = ?3 LIMIT 1")
    .bind(threadType, threadId, userId)
    .first<{ id: string }>();
  if (existing) return;
  await insertRow(
    db,
    `INSERT OR IGNORE INTO service_message_participants (id, thread_type, thread_id, user_id, role, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
    [crypto.randomUUID(), threadType, threadId, userId, "participant", nowMySqlDateTime()],
  );
}

export async function ensureContextThread(
  threadType: string,
  threadId: string,
  title?: string | null,
  contextLink?: string | null,
): Promise<void> {
  const db = await getServicesDb();
  const existing = await db
    .prepare("SELECT title, context_link FROM service_message_threads WHERE thread_type = ?1 AND thread_id = ?2 LIMIT 1")
    .bind(threadType, threadId)
    .first<{ title: string | null; context_link: string | null }>();
  if (!existing) {
    await insertRow(
      db,
      `INSERT INTO service_message_threads (thread_type, thread_id, title, context_link, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
      [threadType, threadId, title ?? null, contextLink ?? null, nowMySqlDateTime()],
    );
    return;
  }
  const nextTitle = title ?? existing.title;
  const nextLink = contextLink ?? existing.context_link;
  if (nextTitle === existing.title && nextLink === existing.context_link) return;
  await db
    .prepare("UPDATE service_message_threads SET title = ?1, context_link = ?2, updated_at = ?3 WHERE thread_type = ?4 AND thread_id = ?5")
    .bind(nextTitle, nextLink, nowMySqlDateTime(), threadType, threadId)
    .run();
}

export type MessageThreadInput = {
  threadType: string;
  threadId: string;
  senderUserId: string;
  body: string;
  recipientUserId?: string | null;
};

export async function sendMessageFull(input: MessageThreadInput, actor?: ActorContext): Promise<string> {
  const db = await getServicesDb();
  if (!input.threadType || !input.threadId || !isMessageContext(input.threadType)) throw new Error("INVALID_THREAD_TYPE");
  if (!input.body.trim()) throw new Error("INVALID_BODY");
  await ensureMessageParticipant(input.threadType, input.threadId, input.senderUserId);
  const id = await insertRow(
    db,
    `INSERT INTO service_messages (id, thread_type, thread_id, sender_user_id, body, is_system, is_read, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6)`,
    [crypto.randomUUID(), input.threadType, input.threadId, input.senderUserId, input.body, nowMySqlDateTime()],
  );
  if (input.recipientUserId) {
    await ensureMessageParticipant(input.threadType, input.threadId, input.recipientUserId);
    const link = contextLinkFor(input.threadType, input.threadId);
    await notify(input.recipientUserId, {
      type: "SERVICE_MESSAGE",
      title: "رسالة جديدة",
      body: input.body.slice(0, 120),
      link,
      entityType: entityTypeFor(input.threadType),
      entityId: input.threadId,
    });
    await enqueueOutbox("SERVICE_MESSAGE", { threadType: input.threadType, threadId: input.threadId, senderUserId: input.senderUserId, recipientUserId: input.recipientUserId, body: input.body });
  }
  await writeAudit({ action: "service_message.send", entityType: `service_messages:${input.threadType}`, entityId: input.threadId, actorUserId: actor?.userId, ipAddress: actor?.ip });
  return id;
}

export async function threadMessages(threadType: string, threadId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare("SELECT * FROM service_messages WHERE thread_type = ?1 AND thread_id = ?2 ORDER BY created_at ASC LIMIT 200")
    .bind(threadType, threadId)
    .all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function markThreadRead(threadType: string, threadId: string, readerUserId: string): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare("UPDATE service_messages SET is_read = 1, read_at = ?1 WHERE thread_type = ?2 AND thread_id = ?3 AND sender_user_id != ?4 AND is_read = 0")
    .bind(nowMySqlDateTime(), threadType, threadId, readerUserId)
    .run();
}

/**
 * Server-side participant authorization for a conversation.
 * - Legacy `request`: customer + any non-withdrawn offer provider.
 * - Legacy `order`: customer + provider.
 * - Participant contexts: an explicit participant row (seeded by
 *   `startMessageThread`) OR an implicit owner of the context entity when the
 *   owning entity lives in the same runtime DB (`professional` →
 *   `service_provider_profiles.user_id`).
 */
export async function isThreadParticipant(threadType: string, threadId: string, userId: string): Promise<boolean> {
  const db = await getServicesDb();
  if (threadType === MESSAGE_CONTEXT.SERVICE_JOB) {
    const order = await db
      .prepare("SELECT customer_user_id, provider_user_id FROM service_orders WHERE id = ?1")
      .bind(threadId)
      .first<{ customer_user_id: string; provider_user_id: string }>();
    return !!order && (order.customer_user_id === userId || order.provider_user_id === userId);
  }
  if (threadType === MESSAGE_CONTEXT.SERVICE_REQUEST) {
    // threadId is a composite "{requestId}:{providerUserId}" key — each
    // bidding provider gets an isolated conversation with the customer.
    // Splitting on request/provider (rather than sharing one thread per
    // request) prevents competing providers from reading each other's
    // pricing and messages with the customer.
    const [requestId, providerUserId] = threadId.split(":");
    if (!requestId || !providerUserId) return false;
    const requestRow = await db.prepare("SELECT customer_user_id FROM service_requests WHERE id = ?1").bind(requestId).first<{ customer_user_id: string }>();
    if (!requestRow) return false;
    if (requestRow.customer_user_id === userId) return true;
    if (userId !== providerUserId) return false;
    const offer = await db
      .prepare("SELECT id FROM service_offers WHERE request_id = ?1 AND provider_user_id = ?2 AND status != 'withdrawn' LIMIT 1")
      .bind(requestId, providerUserId)
      .first<{ id: string }>();
    return !!offer;
  }
  const participant = await db
    .prepare("SELECT id FROM service_message_participants WHERE thread_type = ?1 AND thread_id = ?2 AND user_id = ?3 LIMIT 1")
    .bind(threadType, threadId, userId)
    .first<{ id: string }>();
  if (participant) return true;
  if (threadType === MESSAGE_CONTEXT.PROFESSIONAL) {
    const profile = await db.prepare("SELECT user_id FROM service_provider_profiles WHERE id = ?1 LIMIT 1").bind(threadId).first<{ user_id: string }>();
    return !!profile && profile.user_id === userId;
  }
  return false;
}

/**
 * Start (or attach to) a conversation for the given context. Writes thread
 * metadata (title + context reference/link) and seeds the participant list so
 * every participant sees the thread in the central inbox.
 */
/**
 * Resolve the notification recipient for a conversation.
 * - Legacy `order`: the other side of the job.
 * - Legacy `request`: the customer (request owner).
 * - Participant contexts: the first participant other than the sender.
 */
export async function resolveRecipientUserId(threadType: string, threadId: string, senderUserId: string): Promise<string | null> {
  const db = await getServicesDb();
  if (threadType === MESSAGE_CONTEXT.SERVICE_JOB) {
    const order = await db
      .prepare("SELECT customer_user_id, provider_user_id FROM service_orders WHERE id = ?1")
      .bind(threadId)
      .first<{ customer_user_id: string; provider_user_id: string }>();
    if (!order) return null;
    if (order.customer_user_id === senderUserId) return order.provider_user_id;
    return order.customer_user_id;
  }
  if (threadType === MESSAGE_CONTEXT.SERVICE_REQUEST) {
    const [requestId, providerUserId] = threadId.split(":");
    if (!requestId || !providerUserId) return null;
    if (senderUserId === providerUserId) {
      const requestRow = await db.prepare("SELECT customer_user_id FROM service_requests WHERE id = ?1").bind(requestId).first<{ customer_user_id: string }>();
      return requestRow?.customer_user_id ?? null;
    }
    return providerUserId;
  }
  const participants = await db
    .prepare("SELECT user_id FROM service_message_participants WHERE thread_type = ?1 AND thread_id = ?2")
    .bind(threadType, threadId)
    .all<{ user_id: string }>();
  const list = participants.results ?? [];
  const other = list.find((p) => p.user_id !== senderUserId);
  if (other) return other.user_id;
  if (threadType === MESSAGE_CONTEXT.PROFESSIONAL) {
    const profile = await db.prepare("SELECT user_id FROM service_provider_profiles WHERE id = ?1 LIMIT 1").bind(threadId).first<{ user_id: string }>();
    if (profile && profile.user_id !== senderUserId) return profile.user_id;
  }
  return null;
}

/**
 * Authorizes who may actually be seeded as a participant when a thread is
 * opened, keyed off verified table relationships rather than trusting the
 * client's `participantIds` list — otherwise any authenticated user could
 * self-enrol into an arbitrary thread, or add third parties to it.
 *
 * - `SERVICE_JOB` / `SERVICE_REQUEST`: only the customer and the specific
 *   counter-party verified against `service_orders`/`service_offers`.
 * - `PROFESSIONAL`: only the actor and the profile owner being contacted.
 * - Everything else (no owning-entity table available here): `undefined`
 *   when the thread is brand new (trust the caller's participantIds for
 *   this one-time creation), otherwise `[actorUserId]` only.
 * Returns an empty array when the actor has no legitimate claim at all.
 */
async function authorizedParticipantsFor(threadType: string, threadId: string, actorUserId: string): Promise<string[] | undefined> {
  const db = await getServicesDb();
  if (threadType === MESSAGE_CONTEXT.SERVICE_JOB) {
    const order = await db
      .prepare("SELECT customer_user_id, provider_user_id FROM service_orders WHERE id = ?1")
      .bind(threadId)
      .first<{ customer_user_id: string; provider_user_id: string }>();
    if (!order || (order.customer_user_id !== actorUserId && order.provider_user_id !== actorUserId)) return [];
    return [order.customer_user_id, order.provider_user_id];
  }
  if (threadType === MESSAGE_CONTEXT.SERVICE_REQUEST) {
    const [requestId, providerUserId] = threadId.split(":");
    if (!requestId || !providerUserId) return [];
    const requestRow = await db.prepare("SELECT customer_user_id FROM service_requests WHERE id = ?1").bind(requestId).first<{ customer_user_id: string }>();
    if (!requestRow) return [];
    const isCustomer = requestRow.customer_user_id === actorUserId;
    const isTheProvider = actorUserId === providerUserId;
    if (!isCustomer && !isTheProvider) return [];
    const offer = await db
      .prepare("SELECT id FROM service_offers WHERE request_id = ?1 AND provider_user_id = ?2 AND status != 'withdrawn' LIMIT 1")
      .bind(requestId, providerUserId)
      .first<{ id: string }>();
    if (!offer) return [];
    return [requestRow.customer_user_id, providerUserId];
  }
  if (threadType === MESSAGE_CONTEXT.PROFESSIONAL) {
    const profile = await db.prepare("SELECT user_id FROM service_provider_profiles WHERE id = ?1 LIMIT 1").bind(threadId).first<{ user_id: string }>();
    if (!profile) return [actorUserId];
    return [actorUserId, profile.user_id];
  }
  // GENERAL / PROPERTY / PROPERTY_REQUEST / ORGANIZATION: this module has no
  // owning-entity table to verify these against (that data lives in a
  // different runtime/database). The client-supplied participantIds are
  // trusted ONLY the first time a thread is opened (the caller's own
  // server-rendered page is what resolved that real ID, e.g. "contact this
  // organization's owner") — never on a later call against an
  // already-existing thread, which would let an unrelated third party
  // silently inject themselves or someone else into an ongoing conversation.
  const isNewThread = !(await isThreadParticipant(threadType, threadId, actorUserId))
    && (await db.prepare("SELECT id FROM service_message_participants WHERE thread_type = ?1 AND thread_id = ?2 LIMIT 1").bind(threadType, threadId).first<{ id: string }>()) == null;
  return isNewThread ? undefined : [actorUserId];
}

export async function startMessageThread(input: {
  threadType: string;
  threadId: string;
  title?: string | null;
  contextLink?: string | null;
  participantIds: string[];
  actorUserId: string;
}): Promise<{ threadType: string; threadId: string; title: string | null; contextLink: string | null; participantCount: number }> {
  if (!isMessageContext(input.threadType)) throw new Error("INVALID_THREAD_TYPE");
  if (!input.threadId.trim()) throw new Error("INVALID_THREAD_ID");
  const verified = await authorizedParticipantsFor(input.threadType, input.threadId, input.actorUserId);
  // `undefined` means: unverifiable context, but this is a brand-new thread
  // — trust the caller's participantIds for this one-time creation.
  const allowed = verified ?? [input.actorUserId, ...input.participantIds.filter(Boolean)];
  if (!allowed.includes(input.actorUserId)) throw new Error("UNAUTHORIZED");
  const participantIds = [...new Set(allowed)];
  await ensureContextThread(input.threadType, input.threadId, input.title, input.contextLink ?? contextLinkFor(input.threadType, input.threadId));
  for (const userId of participantIds) {
    await ensureMessageParticipant(input.threadType, input.threadId, userId);
  }
  return {
    threadType: input.threadType,
    threadId: input.threadId,
    title: input.title ?? null,
    contextLink: input.contextLink ?? contextLinkFor(input.threadType, input.threadId),
    participantCount: participantIds.length,
  };
}

export async function listInbox(userId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const keys = new Set<string>();

  // One thread per (request, bidding provider) pair — never one shared
  // thread per request, which would let competing providers read each
  // other's conversation with the customer.
  const customerRequestThreads = await db
    .prepare(`SELECT so.request_id AS request_id, so.provider_user_id AS provider_user_id
              FROM service_offers so
              JOIN service_requests sr ON sr.id = so.request_id
              WHERE sr.customer_user_id = ?1 AND so.status != 'withdrawn'`)
    .bind(userId)
    .all<{ request_id: string; provider_user_id: string }>();
  for (const r of customerRequestThreads.results ?? []) {
    keys.add(`${MESSAGE_CONTEXT.SERVICE_REQUEST}:${r.request_id}:${r.provider_user_id}`);
  }

  const providerRequests = await db
    .prepare("SELECT request_id FROM service_offers WHERE provider_user_id = ?1 AND status != 'withdrawn'")
    .bind(userId)
    .all<{ request_id: string }>();
  for (const r of providerRequests.results ?? []) keys.add(`${MESSAGE_CONTEXT.SERVICE_REQUEST}:${r.request_id}:${userId}`);

  const orders = await db
    .prepare("SELECT id FROM service_orders WHERE customer_user_id = ?1 OR provider_user_id = ?1")
    .bind(userId, userId)
    .all<{ id: string }>();
  for (const r of orders.results ?? []) keys.add(`${MESSAGE_CONTEXT.SERVICE_JOB}:${r.id}`);

  const participantRows = await db
    .prepare("SELECT thread_type, thread_id FROM service_message_participants WHERE user_id = ?1")
    .bind(userId)
    .all<{ thread_type: string; thread_id: string }>();
  for (const p of participantRows.results ?? []) {
    if (!p.thread_type || !p.thread_id) continue;
    keys.add(`${p.thread_type}:${p.thread_id}`);
  }

  const threads: Array<Record<string, unknown>> = [];
  for (const key of keys) {
    const sep = key.indexOf(":");
    if (sep <= 0) continue;
    const threadType = key.slice(0, sep);
    const threadId = key.slice(sep + 1);
    const messages = await db
      .prepare("SELECT sender_user_id, is_read, created_at FROM service_messages WHERE thread_type = ?1 AND thread_id = ?2 ORDER BY created_at ASC")
      .bind(threadType, threadId)
      .all<{ sender_user_id: string; is_read: number | null; created_at: string }>();
    const rows = messages.results ?? [];
    if (rows.length === 0) continue;
    let unreadCount = 0;
    let lastMessageAt: string | null = null;
    for (const m of rows) {
      if (m.sender_user_id !== userId && !Number(m.is_read)) unreadCount++;
      if (!lastMessageAt || String(m.created_at) > lastMessageAt) lastMessageAt = String(m.created_at);
    }
    const meta = await db
      .prepare("SELECT title, context_link FROM service_message_threads WHERE thread_type = ?1 AND thread_id = ?2 LIMIT 1")
      .bind(threadType, threadId)
      .first<{ title: string | null; context_link: string | null }>();
    threads.push({
      thread_type: threadType,
      thread_id: threadId,
      message_count: rows.length,
      unread_count: unreadCount,
      last_message_at: lastMessageAt,
      title: meta?.title ?? null,
      context_link: meta?.context_link ?? null,
    });
  }

  threads.sort((a, b) => String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")));
  return threads;
}

/* ============================================================
 * Notifications
 * ============================================================ */

export async function notify(userId: string, input: { type: string; title?: string | null; body?: string | null; link?: string | null; entityType?: string | null; entityId?: string | null }): Promise<void> {
  const db = await getServicesDb();
  await insertRow(
    db,
    `INSERT INTO service_notifications (id, user_id, type, title, body, link, entity_type, entity_id, is_read, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9)`,
    [crypto.randomUUID(), userId, input.type, input.title ?? null, input.body ?? null, input.link ?? null, input.entityType ?? null, input.entityId ?? null, nowMySqlDateTime()],
  );
}

export async function listNotifications(userId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare("SELECT * FROM service_notifications WHERE user_id = ?1 ORDER BY created_at DESC LIMIT ?2")
    .bind(userId, Math.min(limit, 100))
    .all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare("UPDATE service_notifications SET is_read = 1, read_at = ?1 WHERE id = ?2 AND user_id = ?3")
    .bind(nowMySqlDateTime(), notificationId, userId)
    .run();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = await getServicesDb();
  await db
    .prepare("UPDATE service_notifications SET is_read = 1, read_at = ?1 WHERE user_id = ?2 AND is_read = 0")
    .bind(nowMySqlDateTime(), userId)
    .run();
}

export async function unreadNotificationsCount(userId: string): Promise<number> {
  const db = await getServicesDb();
  const rowData = await db.prepare("SELECT COUNT(*) AS count FROM service_notifications WHERE user_id = ?1 AND is_read = 0").bind(userId).first<{ count: number }>();
  return Number(rowData?.count ?? 0);
}

/* ============================================================
 * Outbox
 * ============================================================ */

export async function enqueueOutbox(eventType: string, payload: Record<string, unknown>): Promise<string> {
  const db = await getServicesDb();
  return insertRow(
    db,
    `INSERT INTO service_outbox_events (id, event_type, payload, status, attempts, created_at)
     VALUES (?1, ?2, ?3, 'pending', 0, ?4)`,
    [crypto.randomUUID(), eventType, JSON.stringify(payload), nowMySqlDateTime()],
  );
}

export async function processOutbox(limit = 50): Promise<number> {
  const db = await getServicesDb();
  const result = await db
    .prepare("SELECT * FROM service_outbox_events WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?1")
    .bind(Math.min(limit, 100))
    .all<Record<string, unknown>>();
  const events = result.results ?? [];
  for (const event of events) {
    try {
      await db
        .prepare("UPDATE service_outbox_events SET status = 'processed', processed_at = ?1, attempts = attempts + 1 WHERE id = ?2")
        .bind(nowMySqlDateTime(), event.id)
        .run();
    } catch (error) {
      await db
        .prepare("UPDATE service_outbox_events SET status = 'failed', error = ?1, attempts = attempts + 1 WHERE id = ?2")
        .bind(error instanceof Error ? error.message.slice(0, 500) : String(error), event.id)
        .run();
    }
  }
  return events.length;
}

/* ============================================================
 * Participant analytics (canonical Services counters)
 * ============================================================ */

/**
 * Canonical replacement for the counters `/api/service-analytics` used to read
 * from the non-canonical Drizzle/PG service tables (`lib/db/schemas/services-schema.ts`).
 *
 * All five values come from the canonical marketplace store, keyed on the same
 * account identifier (`user_id` / `customer_user_id` / `provider_user_id`) the
 * rest of the marketplace uses.
 */
export async function getUserServiceAnalytics(userId: string): Promise<{
  requests: number;
  offers: number;
  jobs: number;
  completedJobs: number;
  avgRating: number;
}> {
  const db = await getServicesDb();
  const [requestsRow, offersRow, jobsRow, completedRow] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM service_requests WHERE customer_user_id = ?1").bind(userId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM service_offers WHERE provider_user_id = ?1").bind(userId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM service_orders WHERE provider_user_id = ?1").bind(userId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM service_orders WHERE provider_user_id = ?1 AND status = ?2").bind(userId, ORDER_STATUS.COMPLETED).first<{ count: number }>(),
  ]);
  const reviews = await providerReviews(userId);
  return {
    requests: Number(requestsRow?.count ?? 0),
    offers: Number(offersRow?.count ?? 0),
    jobs: Number(jobsRow?.count ?? 0),
    completedJobs: Number(completedRow?.count ?? 0),
    avgRating: reviews.ratingAvg,
  };
}
