import { index, int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const i18nNamespaces = mysqlTable(
  "i18n_namespaces",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    code: varchar("code", { length: 128 }).notNull(),
    description: text("description"),
    isActive: int("is_active").notNull().default(1),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex("i18n_namespaces_code_unique").on(table.code)],
);

export const i18nKeys = mysqlTable(
  "i18n_keys",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    namespaceId: varchar("namespace_id", { length: 36 }).notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    description: text("description"),
    defaultValue: text("default_value"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex("i18n_keys_namespace_key_unique").on(table.namespaceId, table.key)],
);

export const i18nTranslations = mysqlTable(
  "i18n_translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    keyId: varchar("key_id", { length: 36 }).notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    value: text("value").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("published"),
    isMachine: int("is_machine").notNull().default(0),
    updatedBy: varchar("updated_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("i18n_translations_key_locale_unique").on(table.keyId, table.locale),
    index("i18n_translations_locale_status_idx").on(table.locale, table.status),
  ],
);

export const i18nVersions = mysqlTable(
  "i18n_versions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    version: int("version").notNull(),
    label: varchar("label", { length: 190 }),
    snapshot: text("snapshot").notNull(),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("i18n_versions_version_unique").on(table.version)],
);

export const i18nChangeLog = mysqlTable(
  "i18n_change_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    keyId: varchar("key_id", { length: 36 }),
    locale: varchar("locale", { length: 8 }),
    action: varchar("action", { length: 32 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("i18n_change_log_key_idx").on(table.keyId, table.createdAt),
    index("i18n_change_log_actor_idx").on(table.actorUserId, table.createdAt),
  ],
);
