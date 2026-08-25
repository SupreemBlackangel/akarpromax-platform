import { pgTable, uuid, varchar, timestamp, boolean, integer, jsonb, doublePrecision, text, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).unique(),
    emailVerifiedAt: timestamp("email_verified_at", { mode: "date", withTimezone: true }),
    phone: varchar("phone", { length: 20 }).unique(),
    phoneVerifiedAt: timestamp("phone_verified_at", { mode: "date", withTimezone: true }),
    name: varchar("name", { length: 190 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 30 }).notNull().default("user"),
    status: varchar("status", { length: 30 }).notNull().default("pending_verification"),
    isActive: boolean("is_active").notNull().default(true),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { mode: "date", withTimezone: true }),
    welcomeSentAt: timestamp("welcome_sent_at", { mode: "date", withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { mode: "date", withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { mode: "date", withTimezone: true }),
    preferredLanguage: varchar("preferred_language", { length: 5 }).notNull().default("ar"),
    pendingEmail: varchar("pending_email", { length: 255 }).unique(),
    // ACCOUNT market preference — the "account" slot in the L1A resolution
    // chain (manual > account > browser > gps > ip > GLOBAL). Nullable, no
    // default: neither OM, SA, nor any market is a global identity default.
    // Stores an ISO alpha-2 code or the literal 'GLOBAL' application state.
    preferredMarket: varchar("preferred_market", { length: 8 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_email_idx").on(table.email)],
);

export const verificationChallangePurposes = [
  "email_verification",
  "otp",
  "password_reset",
  "email_change",
] as const;
export type VerificationPurpose = (typeof verificationChallangePurposes)[number];

export const verificationChallenges = pgTable(
  "verification_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 30 }).notNull(),
    channel: varchar("channel", { length: 20 }).notNull().default("email"),
    destination: varchar("destination", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }),
    codeHash: varchar("code_hash", { length: 255 }),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { mode: "date", withTimezone: true }),
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vc_user_id_idx").on(table.userId),
    index("vc_purpose_idx").on(table.purpose),
    index("vc_token_hash_idx").on(table.tokenHash),
    index("vc_code_hash_idx").on(table.codeHash),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_user_id_idx").on(table.userId), index("audit_event_type_idx").on(table.eventType)],
);

export const sessionRevocations = pgTable(
  "session_revocations",
  {
    jti: varchar("jti", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [index("sr_user_id_idx").on(table.userId), index("sr_expires_at_idx").on(table.expiresAt)],
);

// ─── AMRS: Organization Domain ────────────────────────────────────────────
// Owner: Organization domain (AMRS-2)
// Reuses: users (FK references)
// Forbids: companies, offices, business_profiles duplication

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameAr: varchar("name_ar", { length: 255 }),
    nameEn: varchar("name_en", { length: 255 }),
    nameTr: varchar("name_tr", { length: 255 }),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    type: varchar("type", { length: 30 }).notNull(), // real_estate | law_office | business | other
    classification: varchar("classification", { length: 30 }).notNull(), // startup | sme | established | enterprise
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    cityId: varchar("city_id", { length: 100 }),
    districtId: varchar("district_id", { length: 100 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    logoUrl: varchar("logo_url", { length: 512 }),
    coverUrl: varchar("cover_url", { length: 512 }),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    descriptionTr: text("description_tr"),
    websiteUrl: varchar("website_url", { length: 512 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 32 }),
    status: varchar("status", { length: 30 }).notNull().default("draft"), // draft | pending_review | active | rejected | suspended | deleted
    verifiedAt: timestamp("verified_at", { mode: "date", withTimezone: true }),
    approvedAt: timestamp("approved_at", { mode: "date", withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("org_type_idx").on(table.type),
    index("org_status_idx").on(table.status),
    index("org_country_idx").on(table.countryCode),
    index("org_slug_idx").on(table.slug),
  ],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // owner | admin | manager | agent | member
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | inactive | pending
    joinedAt: timestamp("joined_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("org_member_user_idx").on(table.userId),
    index("org_member_org_idx").on(table.organizationId),
    index("org_member_status_idx").on(table.status),
    uniqueIndex("org_member_org_user_unique").on(table.organizationId, table.userId),
  ],
);

export const organizationBranches = pgTable(
  "organization_branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    nameAr: varchar("name_ar", { length: 255 }),
    nameEn: varchar("name_en", { length: 255 }),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    cityId: varchar("city_id", { length: 100 }),
    districtId: varchar("district_id", { length: 100 }),
    governorate: varchar("governorate", { length: 255 }),
    village: varchar("village", { length: 255 }),
    street: varchar("street", { length: 255 }),
    addressAr: text("address_ar"),
    addressEn: text("address_en"),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 255 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | inactive
    workingHours: jsonb("working_hours"),
    serviceAreas: jsonb("service_areas"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("org_branch_org_idx").on(table.organizationId)],
);

// ─── AMRS: Verification Domain ────────────────────────────────────────────
// Owner: Verification domain (AMRS-2)
// Generic subject-based persistence (entity_type + entity_id)
// Sensitive evidence: NOT stored in public-facing fields

export const verificationRecords = pgTable(
  "verification_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 20 }).notNull(), // user | professional | organization
    entityId: uuid("entity_id").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // email | phone | identity | professional | organization | license | address
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | verified | failed | expired | revoked
    verifiedAt: timestamp("verified_at", { mode: "date", withTimezone: true }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    source: varchar("source", { length: 20 }).notNull().default("system"), // system | manual | third_party
    countryCode: varchar("country_code", { length: 8 }),
    documentUrl: varchar("document_url", { length: 512 }), // encrypted at rest
    metadata: jsonb("metadata"), // minimal, no PII
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verif_entity_idx").on(table.entityType, table.entityId),
    index("verif_status_idx").on(table.status),
    index("verif_expires_idx").on(table.expiresAt),
    index("verif_type_idx").on(table.type),
  ],
);

// ─── AMRS: Reputation Domain ──────────────────────────────────────────────
// Owner: Reputation domain (AMRS-2)
// Subjects: PROFESSIONAL + ORGANIZATION only (no public normal-user reputation)
// Normal users: internal trust scoring only, no public reputation profile

export const reputationProfiles = pgTable(
  "reputation_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 20 }).notNull(), // professional | organization (NOT user)
    entityId: uuid("entity_id").notNull(),
    level: varchar("level", { length: 20 }).notNull().default("new"), // new | rising | distinguished | gold | promax
    score: integer("score").notNull().default(0), // 0-1000 internal
    lastEvaluatedAt: timestamp("last_evaluated_at", { mode: "date", withTimezone: true }),
    policyVersion: integer("policy_version").notNull().default(1),
    gracePeriodEndsAt: timestamp("grace_period_ends_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rep_entity_idx").on(table.entityType, table.entityId),
    index("rep_level_idx").on(table.level),
  ],
);

export const reputationEvaluations = pgTable(
  "reputation_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reputationId: uuid("reputation_id")
      .notNull()
      .references(() => reputationProfiles.id, { onDelete: "cascade" }),
    policyVersion: integer("policy_version").notNull(),
    oldLevel: varchar("old_level", { length: 20 }).notNull(),
    newLevel: varchar("new_level", { length: 20 }).notNull(),
    signals: jsonb("signals").notNull(), // { verification, profileCompleteness, responseRate, ... }
    reason: text("reason"),
    evaluatedAt: timestamp("evaluated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    adminOverride: boolean("admin_override").notNull().default(false),
    adminId: uuid("admin_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("eval_reputation_idx").on(table.reputationId),
    index("eval_evaluated_idx").on(table.evaluatedAt),
  ],
);

export const reputationHistory = pgTable(
  "reputation_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 20 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    oldLevel: varchar("old_level", { length: 20 }).notNull(),
    newLevel: varchar("new_level", { length: 20 }).notNull(),
    reason: text("reason"),
    evaluatedAt: timestamp("evaluated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    policyVersion: integer("policy_version").notNull(),
  },
  (table) => [
    index("hist_entity_idx").on(table.entityType, table.entityId),
    index("hist_evaluated_idx").on(table.evaluatedAt),
  ],
);

// ─── OAuth Accounts ─────────────────────────────────────────────────────────

export const userOauthAccounts = pgTable(
  "user_oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 30 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("oauth_user_idx").on(table.userId),
    index("oauth_provider_idx").on(table.provider, table.providerUserId),
  ],
);
