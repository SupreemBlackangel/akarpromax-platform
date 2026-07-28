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
