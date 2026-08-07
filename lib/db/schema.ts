import { pgTable, uuid, varchar, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
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
