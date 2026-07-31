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

export const adCreatives = sqliteTable(
  "ad_creatives",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id").notNull(),
    mediaType: text("media_type").notNull(),
    mediaUrl: text("media_url").notNull(),
    mobileMediaUrl: text("mobile_media_url"),
    posterUrl: text("poster_url"),
    position: integer("position").notNull().default(1),
    durationSeconds: integer("duration_seconds").notNull().default(6),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("ad_creatives_campaign_position_idx").on(table.campaignId, table.position)],
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

export const sponsorProfiles = sqliteTable(
  "sponsor_profiles",
  {
    id: text("id").primaryKey(),
    sponsorCode: text("sponsor_code").notNull(),
    companyNameAr: text("company_name_ar").notNull(),
    companyNameEn: text("company_name_en").notNull(),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    commercialRegistration: text("commercial_registration"),
    taxNumber: text("tax_number"),
    countryCode: text("country_code").notNull().default("OM"),
    cityId: text("city_id"),
    districtId: text("district_id"),
    governorate: text("governorate"),
    village: text("village"),
    street: text("street"),
    addressAr: text("address_ar"),
    addressEn: text("address_en"),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    status: text("status").notNull().default("draft"),
    verifiedAt: text("verified_at"),
    approvedAt: text("approved_at"),
    suspendedAt: text("suspended_at"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsor_profiles_code_unique").on(table.sponsorCode),
    index("sponsor_profiles_country_status_idx").on(table.countryCode, table.status),
  ],
);

export const sponsorUsers = sqliteTable(
  "sponsor_users",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    userId: text("user_id"),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("viewer"),
    phone: text("phone"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsor_users_email_unique").on(table.sponsorId, table.email),
    index("sponsor_users_sponsor_idx").on(table.sponsorId),
  ],
);

export const sponsorBranches = sqliteTable(
  "sponsor_branches",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    countryCode: text("country_code").notNull(),
    cityId: text("city_id").notNull(),
    districtId: text("district_id"),
    governorate: text("governorate"),
    village: text("village"),
    street: text("street"),
    addressAr: text("address_ar"),
    addressEn: text("address_en"),
    phone: text("phone"),
    email: text("email"),
    lat: text("lat"),
    lng: text("lng"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsor_branches_sponsor_idx").on(table.sponsorId),
    index("sponsor_branches_location_idx").on(table.countryCode, table.cityId),
  ],
);

export const sponsorPlans = sqliteTable(
  "sponsor_plans",
  {
    id: text("id").primaryKey(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    code: text("code").notNull(),
    priceMonthly: integer("price_monthly").notNull().default(0),
    priceYearly: integer("price_yearly").notNull().default(0),
    currency: text("currency").notNull().default("OMR"),
    maxBranches: integer("max_branches").notNull().default(0),
    maxUsers: integer("max_users").notNull().default(0),
    maxProperties: integer("max_properties").notNull().default(0),
    maxAds: integer("max_ads").notNull().default(0),
    features: text("features").notNull().default("[]"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsor_plans_code_unique").on(table.code),
  ],
);

export const sponsorSubscriptions = sqliteTable(
  "sponsor_subscriptions",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    planId: text("plan_id").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status").notNull().default("trial"),
    autoRenew: integer("auto_renew", { mode: "boolean" }).notNull().default(true),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsor_subscriptions_sponsor_idx").on(table.sponsorId),
    index("sponsor_subscriptions_dates_idx").on(table.startDate, table.endDate),
  ],
);

export const sponsorContracts = sqliteTable(
  "sponsor_contracts",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    contractNumber: text("contract_number").notNull(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    fileUrl: text("file_url"),
    signedAt: text("signed_at"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    value: integer("value").notNull().default(0),
    currency: text("currency").notNull().default("OMR"),
    status: text("status").notNull().default("draft"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsor_contracts_number_unique").on(table.contractNumber),
    index("sponsor_contracts_sponsor_idx").on(table.sponsorId),
  ],
);

export const sponsorDocuments = sqliteTable(
  "sponsor_documents",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    type: text("type").notNull(),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull().default(0),
    mimeType: text("mime_type").notNull(),
    notes: text("notes"),
    uploadedBy: text("uploaded_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsor_documents_sponsor_idx").on(table.sponsorId),
    index("sponsor_documents_type_idx").on(table.sponsorId, table.type),
  ],
);

export const sponsorPayments = sqliteTable(
  "sponsor_payments",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    subscriptionId: text("subscription_id"),
    invoiceId: text("invoice_id"),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("OMR"),
    method: text("method").notNull(),
    referenceNumber: text("reference_number"),
    status: text("status").notNull().default("pending"),
    paidAt: text("paid_at"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsor_payments_sponsor_idx").on(table.sponsorId),
    index("sponsor_payments_status_idx").on(table.status, table.paidAt),
  ],
);

export const sponsorInvoices = sqliteTable(
  "sponsor_invoices",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    subscriptionId: text("subscription_id"),
    contractId: text("contract_id"),
    amount: integer("amount").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    totalAmount: integer("total_amount").notNull().default(0),
    currency: text("currency").notNull().default("OMR"),
    status: text("status").notNull().default("draft"),
    dueDate: text("due_date").notNull(),
    paidAt: text("paid_at"),
    fileUrl: text("file_url"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("sponsor_invoices_number_unique").on(table.invoiceNumber),
    index("sponsor_invoices_sponsor_idx").on(table.sponsorId),
  ],
);

export const sponsorActivityLogs = sqliteTable(
  "sponsor_activity_logs",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    oldValues: text("old_values"),
    newValues: text("new_values"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sponsor_activity_sponsor_idx").on(table.sponsorId),
    index("sponsor_activity_action_idx").on(table.action, table.createdAt),
  ],
);

export const officeLinks = sqliteTable(
  "office_links",
  {
    id: text("id").primaryKey(),
    sponsorId: text("sponsor_id").notNull(),
    officeId: text("office_id"),
    deviceId: text("device_id"),
    licenseKey: text("license_key").notNull(),
    applicationVersion: text("application_version"),
    lastSyncAt: text("last_sync_at"),
    lastIp: text("last_ip"),
    status: text("status").notNull().default("active"),
    activatedAt: text("activated_at"),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("office_links_license_key_unique").on(table.licenseKey),
    index("office_links_sponsor_idx").on(table.sponsorId),
  ],
);
