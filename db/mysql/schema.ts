import { boolean, index, int, longtext, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const roles = mysqlTable("roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  permissions: text("permissions").notNull().default("[]"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 190 }).notNull(),
    roleId: varchar("role_id", { length: 36 }).notNull().default("member"),
    status: varchar("status", { length: 32 }).notNull().default("pending_verification"),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("OM"),
    city: varchar("city", { length: 190 }),
    emailVerifiedAt: timestamp("email_verified_at", { mode: "string" }),
    phoneVerifiedAt: timestamp("phone_verified_at", { mode: "string" }),
    lastLoginAt: timestamp("last_login_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
    index("users_status_role_idx").on(table.status, table.roleId),
  ],
);

export const verificationChallenges = mysqlTable(
  "verification_challenges",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    channel: varchar("channel", { length: 16 }).notNull(),
    destination: varchar("destination", { length: 255 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    consumedAt: timestamp("consumed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("verification_user_purpose_idx").on(table.userId, table.purpose),
    index("verification_expiry_idx").on(table.expiresAt),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    revokedAt: timestamp("revoked_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const policyDocuments = mysqlTable(
  "policy_documents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    scope: varchar("scope", { length: 8 }).notNull().default("OM"),
    type: varchar("type", { length: 64 }).notNull(),
    version: varchar("version", { length: 32 }).notNull(),
    titleAr: varchar("title_ar", { length: 190 }).notNull(),
    bodyAr: longtext("body_ar").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    publishedAt: timestamp("published_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("policy_scope_type_version_unique").on(table.scope, table.type, table.version)],
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    metadata: text("metadata").notNull().default("{}"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("audit_entity_idx").on(table.entityType, table.entityId)],
);

export const sponsorAccess = mysqlTable(
  "sponsor_access",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 190 }),
    role: varchar("role", { length: 32 }).notNull().default("viewer"),
    countryCode: varchar("country_code", { length: 8 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("sponsor_access_email_unique").on(table.email),
    index("sponsor_access_role_country_idx").on(table.role, table.countryCode),
  ],
);

export const sponsors = mysqlTable(
  "sponsors",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    nameAr: varchar("name_ar", { length: 190 }).notNull(),
    nameEn: varchar("name_en", { length: 190 }).notNull(),
    nameTr: varchar("name_tr", { length: 190 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull().default("exclusive"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    websiteUrl: varchar("website_url", { length: 255 }),
    logoUrl: varchar("logo_url", { length: 512 }),
    bannerUrl: varchar("banner_url", { length: 512 }).notNull().default("/sponsors/arab-blue.webp"),
    contactName: varchar("contact_name", { length: 190 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 32 }),
    placements: text("placements").notNull().default('["header","content","footer"]'),
    startAt: timestamp("start_at", { mode: "string" }),
    endAt: timestamp("end_at", { mode: "string" }),
    priority: int("priority").notNull().default(100),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("sponsors_country_status_priority_idx").on(table.countryCode, table.status, table.priority),
    index("sponsors_campaign_dates_idx").on(table.startAt, table.endAt),
  ],
);

export const sponsorEvents = mysqlTable(
  "sponsor_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    placement: varchar("placement", { length: 32 }).notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("sponsor_events_sponsor_type_idx").on(table.sponsorId, table.eventType),
    index("sponsor_events_country_date_idx").on(table.countryCode, table.occurredAt),
  ],
);

export const adAssets = mysqlTable(
  "ad_assets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    objectKey: varchar("object_key", { length: 512 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 128 }).notNull(),
    mediaType: varchar("media_type", { length: 32 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    uploadedBy: varchar("uploaded_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ad_assets_object_key_unique").on(table.objectKey),
    index("ad_assets_media_created_idx").on(table.mediaType, table.createdAt),
  ],
);

export const adCampaigns = mysqlTable(
  "ad_campaigns",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    internalName: varchar("internal_name", { length: 190 }).notNull(),
    advertiserName: varchar("advertiser_name", { length: 190 }).notNull(),
    campaignType: varchar("campaign_type", { length: 32 }).notNull().default("platform"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    mediaType: varchar("media_type", { length: 32 }).notNull().default("image"),
    mediaUrl: varchar("media_url", { length: 1024 }).notNull(),
    mobileMediaUrl: varchar("mobile_media_url", { length: 1024 }),
    posterUrl: varchar("poster_url", { length: 1024 }),
    eyebrowAr: varchar("eyebrow_ar", { length: 190 }).notNull(),
    eyebrowEn: varchar("eyebrow_en", { length: 190 }).notNull(),
    eyebrowTr: varchar("eyebrow_tr", { length: 190 }).notNull(),
    titleAr: varchar("title_ar", { length: 255 }).notNull(),
    titleEn: varchar("title_en", { length: 255 }).notNull(),
    titleTr: varchar("title_tr", { length: 255 }).notNull(),
    accentAr: varchar("accent_ar", { length: 190 }).notNull(),
    accentEn: varchar("accent_en", { length: 190 }).notNull(),
    accentTr: varchar("accent_tr", { length: 190 }).notNull(),
    descriptionAr: longtext("description_ar").notNull(),
    descriptionEn: longtext("description_en").notNull(),
    descriptionTr: longtext("description_tr").notNull(),
    ctaAr: varchar("cta_ar", { length: 190 }).notNull(),
    ctaEn: varchar("cta_en", { length: 190 }).notNull(),
    ctaTr: varchar("cta_tr", { length: 190 }).notNull(),
    targetUrl: varchar("target_url", { length: 1024 }).notNull(),
    countries: text("countries").notNull().default("[]"),
    cities: text("cities").notNull().default("[]"),
    languages: text("languages").notNull().default('["ar","en","tr"]'),
    devices: text("devices").notNull().default('["desktop","mobile"]'),
    priority: int("priority").notNull().default(100),
    weight: int("weight").notNull().default(100),
    startAt: timestamp("start_at", { mode: "string" }),
    endAt: timestamp("end_at", { mode: "string" }),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("ad_campaigns_status_dates_idx").on(table.status, table.startAt, table.endAt),
    index("ad_campaigns_priority_idx").on(table.priority, table.updatedAt),
  ],
);

export const adCreatives = mysqlTable(
  "ad_creatives",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 36 }).notNull(),
    mediaType: varchar("media_type", { length: 32 }).notNull(),
    mediaUrl: varchar("media_url", { length: 1024 }).notNull(),
    mobileMediaUrl: varchar("mobile_media_url", { length: 1024 }),
    posterUrl: varchar("poster_url", { length: 1024 }),
    position: int("position").notNull().default(1),
    durationSeconds: int("duration_seconds").notNull().default(6),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("ad_creatives_campaign_position_idx").on(table.campaignId, table.position)],
);

export const adEvents = mysqlTable(
  "ad_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 36 }).notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    cityId: varchar("city_id", { length: 36 }),
    locale: varchar("locale", { length: 16 }).notNull(),
    device: varchar("device", { length: 32 }).notNull(),
    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("ad_events_campaign_type_idx").on(table.campaignId, table.eventType),
    index("ad_events_country_date_idx").on(table.countryCode, table.occurredAt),
  ],
);

export const sponsorProfiles = mysqlTable(
  "sponsor_profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorCode: varchar("sponsor_code", { length: 64 }).notNull(),
    companyNameAr: varchar("company_name_ar", { length: 190 }).notNull(),
    companyNameEn: varchar("company_name_en", { length: 190 }).notNull(),
    logoUrl: varchar("logo_url", { length: 512 }),
    coverUrl: varchar("cover_url", { length: 512 }),
    commercialRegistration: varchar("commercial_registration", { length: 64 }),
    taxNumber: varchar("tax_number", { length: 64 }),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("OM"),
    cityId: varchar("city_id", { length: 36 }),
    districtId: varchar("district_id", { length: 36 }),
    governorate: varchar("governorate", { length: 190 }),
    village: varchar("village", { length: 190 }),
    street: varchar("street", { length: 255 }),
    addressAr: varchar("address_ar", { length: 512 }),
    addressEn: varchar("address_en", { length: 512 }),
    contactName: varchar("contact_name", { length: 190 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    website: varchar("website", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    verifiedAt: timestamp("verified_at", { mode: "string" }),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    suspendedAt: timestamp("suspended_at", { mode: "string" }),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("sponsor_profiles_code_unique").on(table.sponsorCode),
    index("sponsor_profiles_country_status_idx").on(table.countryCode, table.status),
  ],
);

export const sponsorUsers = mysqlTable(
  "sponsor_users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 190 }),
    role: varchar("role", { length: 32 }).notNull().default("viewer"),
    phone: varchar("phone", { length: 32 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("sponsor_users_email_unique").on(table.sponsorId, table.email),
    index("sponsor_users_sponsor_idx").on(table.sponsorId),
  ],
);

export const sponsorBranches = mysqlTable(
  "sponsor_branches",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    nameAr: varchar("name_ar", { length: 190 }).notNull(),
    nameEn: varchar("name_en", { length: 190 }).notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    cityId: varchar("city_id", { length: 36 }).notNull(),
    districtId: varchar("district_id", { length: 36 }),
    governorate: varchar("governorate", { length: 190 }),
    village: varchar("village", { length: 190 }),
    street: varchar("street", { length: 255 }),
    addressAr: varchar("address_ar", { length: 512 }),
    addressEn: varchar("address_en", { length: 512 }),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 255 }),
    lat: varchar("lat", { length: 32 }),
    lng: varchar("lng", { length: 32 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("sponsor_branches_sponsor_idx").on(table.sponsorId),
    index("sponsor_branches_location_idx").on(table.countryCode, table.cityId),
  ],
);

export const sponsorPlans = mysqlTable(
  "sponsor_plans",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    nameAr: varchar("name_ar", { length: 190 }).notNull(),
    nameEn: varchar("name_en", { length: 190 }).notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    priceMonthly: int("price_monthly").notNull().default(0),
    priceYearly: int("price_yearly").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    maxBranches: int("max_branches").notNull().default(0),
    maxUsers: int("max_users").notNull().default(0),
    maxProperties: int("max_properties").notNull().default(0),
    maxAds: int("max_ads").notNull().default(0),
    features: text("features").notNull().default("[]"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("sponsor_plans_code_unique").on(table.code)],
);

export const sponsorSubscriptions = mysqlTable(
  "sponsor_subscriptions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    planId: varchar("plan_id", { length: 36 }).notNull(),
    startDate: timestamp("start_date", { mode: "string" }).notNull(),
    endDate: timestamp("end_date", { mode: "string" }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("trial"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    paymentMethod: varchar("payment_method", { length: 32 }),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("sponsor_subscriptions_sponsor_idx").on(table.sponsorId),
    index("sponsor_subscriptions_dates_idx").on(table.startDate, table.endDate),
  ],
);

export const sponsorContracts = mysqlTable(
  "sponsor_contracts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    contractNumber: varchar("contract_number", { length: 64 }).notNull(),
    titleAr: varchar("title_ar", { length: 190 }).notNull(),
    titleEn: varchar("title_en", { length: 190 }).notNull(),
    fileUrl: varchar("file_url", { length: 1024 }),
    signedAt: timestamp("signed_at", { mode: "string" }),
    startDate: timestamp("start_date", { mode: "string" }).notNull(),
    endDate: timestamp("end_date", { mode: "string" }).notNull(),
    value: int("value").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("sponsor_contracts_number_unique").on(table.contractNumber),
    index("sponsor_contracts_sponsor_idx").on(table.sponsorId),
  ],
);

export const sponsorDocuments = mysqlTable(
  "sponsor_documents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 1024 }).notNull(),
    fileSize: int("file_size").notNull().default(0),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    notes: text("notes"),
    uploadedBy: varchar("uploaded_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("sponsor_documents_sponsor_idx").on(table.sponsorId),
    index("sponsor_documents_type_idx").on(table.sponsorId, table.type),
  ],
);

export const sponsorPayments = mysqlTable(
  "sponsor_payments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    subscriptionId: varchar("subscription_id", { length: 36 }),
    invoiceId: varchar("invoice_id", { length: 36 }),
    amount: int("amount").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    method: varchar("method", { length: 32 }).notNull(),
    referenceNumber: varchar("reference_number", { length: 128 }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    paidAt: timestamp("paid_at", { mode: "string" }),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("sponsor_payments_sponsor_idx").on(table.sponsorId),
    index("sponsor_payments_status_idx").on(table.status, table.paidAt),
  ],
);

export const sponsorInvoices = mysqlTable(
  "sponsor_invoices",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
    subscriptionId: varchar("subscription_id", { length: 36 }),
    contractId: varchar("contract_id", { length: 36 }),
    amount: int("amount").notNull().default(0),
    taxAmount: int("tax_amount").notNull().default(0),
    totalAmount: int("total_amount").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    dueDate: timestamp("due_date", { mode: "string" }).notNull(),
    paidAt: timestamp("paid_at", { mode: "string" }),
    fileUrl: varchar("file_url", { length: 1024 }),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("sponsor_invoices_number_unique").on(table.invoiceNumber),
    index("sponsor_invoices_sponsor_idx").on(table.sponsorId),
  ],
);

export const sponsorActivityLogs = mysqlTable(
  "sponsor_activity_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    oldValues: text("old_values"),
    newValues: text("new_values"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("sponsor_activity_sponsor_idx").on(table.sponsorId),
    index("sponsor_activity_action_idx").on(table.action, table.createdAt),
  ],
);

export const officeLinks = mysqlTable(
  "office_links",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sponsorId: varchar("sponsor_id", { length: 36 }).notNull(),
    officeId: varchar("office_id", { length: 36 }),
    deviceId: varchar("device_id", { length: 128 }),
    licenseKey: varchar("license_key", { length: 128 }).notNull(),
    applicationVersion: varchar("application_version", { length: 32 }),
    lastSyncAt: timestamp("last_sync_at", { mode: "string" }),
    lastIp: varchar("last_ip", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    activatedAt: timestamp("activated_at", { mode: "string" }),
    revokedAt: timestamp("revoked_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("office_links_license_key_unique").on(table.licenseKey),
    index("office_links_sponsor_idx").on(table.sponsorId),
  ],
);
