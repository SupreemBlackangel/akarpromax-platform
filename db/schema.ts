import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * The product's durable foundation. Domain modules will add their own tables
 * instead of overloading users or properties with unstructured JSON.
 */
export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  permissions: text("permissions").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    roleId: text("role_id").notNull().default("member"),
    status: text("status").notNull().default("pending_verification"),
    countryCode: text("country_code").notNull().default("OM"),
    city: text("city"),
    emailVerifiedAt: text("email_verified_at"),
    phoneVerifiedAt: text("phone_verified_at"),
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
    index("users_status_role_idx").on(table.status, table.roleId),
  ],
);

export const verificationChallenges = sqliteTable(
  "verification_challenges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    purpose: text("purpose").notNull(),
    channel: text("channel").notNull(),
    destination: text("destination").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("verification_user_purpose_idx").on(table.userId, table.purpose),
    index("verification_expiry_idx").on(table.expiresAt),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const policyDocuments = sqliteTable(
  "policy_documents",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull().default("OM"),
    type: text("type").notNull(),
    version: text("version").notNull(),
    titleAr: text("title_ar").notNull(),
    bodyAr: text("body_ar").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("policy_scope_type_version_unique").on(table.scope, table.type, table.version)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: text("metadata").notNull().default("{}"),
    ipAddress: text("ip_address"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("audit_entity_idx").on(table.entityType, table.entityId)],
);

export const sponsorAccess = sqliteTable(
  "sponsor_access",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("viewer"),
    countryCode: text("country_code"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsor_access_email_unique").on(table.email),
    index("sponsor_access_role_country_idx").on(table.role, table.countryCode),
  ],
);

export const sponsors = sqliteTable(
  "sponsors",
  {
    id: text("id").primaryKey(),
    countryCode: text("country_code").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    nameTr: text("name_tr").notNull(),
    tier: text("tier").notNull().default("exclusive"),
    status: text("status").notNull().default("draft"),
    websiteUrl: text("website_url"),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url").notNull().default("/sponsors/arab-blue.webp"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    placements: text("placements").notNull().default("[\"header\",\"content\",\"footer\"]"),
    startAt: text("start_at"),
    endAt: text("end_at"),
    priority: integer("priority").notNull().default(100),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsors_country_status_priority_idx").on(table.countryCode, table.status, table.priority),
    index("sponsors_campaign_dates_idx").on(table.startAt, table.endAt),
  ],
);

export const sponsorEvents = sqliteTable(
  "sponsor_events",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    countryCode: text("country_code").notNull(),
    placement: text("placement").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsor_events_sponsor_type_idx").on(table.sponsorId, table.eventType),
    index("sponsor_events_country_date_idx").on(table.countryCode, table.occurredAt),
  ],
);

export const adAssets = sqliteTable(
  "ad_assets",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    url: text("url").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    mediaType: text("media_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ad_assets_object_key_unique").on(table.objectKey),
    index("ad_assets_media_created_idx").on(table.mediaType, table.createdAt),
  ],
);

export const adCampaigns = sqliteTable(
  "ad_campaigns",
  {
    id: text("id").primaryKey(),
    internalName: text("internal_name").notNull(),
    advertiserName: text("advertiser_name").notNull(),
    campaignType: text("campaign_type").notNull().default("platform"),
    status: text("status").notNull().default("draft"),
    mediaType: text("media_type").notNull().default("image"),
    mediaUrl: text("media_url").notNull(),
    mobileMediaUrl: text("mobile_media_url"),
    posterUrl: text("poster_url"),
    eyebrowAr: text("eyebrow_ar").notNull(),
    eyebrowEn: text("eyebrow_en").notNull(),
    eyebrowTr: text("eyebrow_tr").notNull(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    titleTr: text("title_tr").notNull(),
    accentAr: text("accent_ar").notNull(),
    accentEn: text("accent_en").notNull(),
    accentTr: text("accent_tr").notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    descriptionTr: text("description_tr").notNull(),
    ctaAr: text("cta_ar").notNull(),
    ctaEn: text("cta_en").notNull(),
    ctaTr: text("cta_tr").notNull(),
    targetUrl: text("target_url").notNull(),
    countries: text("countries").notNull().default("[]"),
    cities: text("cities").notNull().default("[]"),
    languages: text("languages").notNull().default("[\"ar\",\"en\",\"tr\"]"),
    devices: text("devices").notNull().default("[\"desktop\",\"mobile\"]"),
    priority: integer("priority").notNull().default(100),
    weight: integer("weight").notNull().default(100),
    startAt: text("start_at"),
    endAt: text("end_at"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ad_campaigns_status_dates_idx").on(table.status, table.startAt, table.endAt),
    index("ad_campaigns_priority_idx").on(table.priority, table.updatedAt),
  ],
);

export const adEvents = sqliteTable(
  "ad_events",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id").notNull(),
    eventType: text("event_type").notNull(),
    countryCode: text("country_code").notNull(),
    cityId: text("city_id"),
    locale: text("locale").notNull(),
    device: text("device").notNull(),
    occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ad_events_campaign_type_idx").on(table.campaignId, table.eventType),
    index("ad_events_country_date_idx").on(table.countryCode, table.occurredAt),
  ],
);
