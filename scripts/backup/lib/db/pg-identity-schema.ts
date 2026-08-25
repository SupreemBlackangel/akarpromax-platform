import postgres, { type Sql } from "postgres";

export const PG_IDENTITY_SCHEMA_VERSION = 1;

export const PG_IDENTITY_REQUIRED_TABLES = [
  "users",
  "audit_events",
  "verification_challenges",
  "organizations",
  "organization_members",
  "organization_branches",
  "verification_records",
  "reputation_profiles",
  "reputation_evaluations",
  "reputation_history",
] as const;

export type PgIdentityRequiredTable = (typeof PG_IDENTITY_REQUIRED_TABLES)[number];

export type PgIdentitySchemaStatus = {
  version: number;
  schema: string;
  ready: boolean;
  requiredTables: readonly PgIdentityRequiredTable[];
  missingTables: PgIdentityRequiredTable[];
  appliedVersion: number | null;
};

const META_TABLE = "ak_identity_schema_meta";

const INITIAL_STATUS: PgIdentitySchemaStatus = {
  version: PG_IDENTITY_SCHEMA_VERSION,
  schema: "public",
  ready: false,
  requiredTables: PG_IDENTITY_REQUIRED_TABLES,
  missingTables: [...PG_IDENTITY_REQUIRED_TABLES],
  appliedVersion: null,
};

let cachedStatus: PgIdentitySchemaStatus = INITIAL_STATUS;
let ensurePromise: Promise<PgIdentitySchemaStatus> | null = null;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required for the PG identity schema");
  return url;
}

function normalizeSchemaName(schema = "public"): string {
  const trimmed = schema.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    throw new Error(`Invalid schema name: ${schema}`);
  }
  return trimmed;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const PG_IDENTITY_SCHEMA_SQL = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      email varchar(255) UNIQUE,
      email_verified_at timestamp with time zone,
      phone varchar(20) UNIQUE,
      phone_verified_at timestamp with time zone,
      name varchar(190),
      password_hash varchar(255) NOT NULL,
      role varchar(30) NOT NULL DEFAULT 'user',
      status varchar(30) NOT NULL DEFAULT 'pending_verification',
      is_active boolean NOT NULL DEFAULT true,
      onboarding_completed_at timestamp with time zone,
      welcome_sent_at timestamp with time zone,
      last_login_at timestamp with time zone,
      password_changed_at timestamp with time zone,
      preferred_language varchar(5) NOT NULL DEFAULT 'ar',
      pending_email varchar(255),
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `.trim(),
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp with time zone`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS name varchar(190)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'pending_verification'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_sent_at timestamp with time zone`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language varchar(5) NOT NULL DEFAULT 'ar'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email varchar(255)`,
  `ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now()`,
  `CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)`,
  `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_pending_email_unique'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_pending_email_unique UNIQUE (pending_email);
      END IF;
    END $$;
  `.trim(),
  `
    CREATE TABLE IF NOT EXISTS audit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid,
      event_type varchar(50) NOT NULL,
      ip_address varchar(64),
      user_agent varchar(512),
      detail jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT audit_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS audit_user_id_idx ON audit_events (user_id)`,
  `CREATE INDEX IF NOT EXISTS audit_event_type_idx ON audit_events (event_type)`,
  `
    CREATE TABLE IF NOT EXISTS verification_challenges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid NOT NULL,
      purpose varchar(30) NOT NULL,
      channel varchar(20) DEFAULT 'email' NOT NULL,
      destination varchar(255) NOT NULL,
      token_hash varchar(255),
      code_hash varchar(255),
      attempts integer DEFAULT 0 NOT NULL,
      expires_at timestamp with time zone NOT NULL,
      consumed_at timestamp with time zone,
      revoked_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT verification_challenges_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS vc_user_id_idx ON verification_challenges (user_id)`,
  `CREATE INDEX IF NOT EXISTS vc_purpose_idx ON verification_challenges (purpose)`,
  `CREATE INDEX IF NOT EXISTS vc_token_hash_idx ON verification_challenges (token_hash)`,
  `CREATE INDEX IF NOT EXISTS vc_code_hash_idx ON verification_challenges (code_hash)`,
  `
    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      name_ar varchar(255),
      name_en varchar(255),
      name_tr varchar(255),
      slug varchar(255) NOT NULL,
      type varchar(30) NOT NULL,
      classification varchar(30) NOT NULL,
      country_code varchar(8) NOT NULL,
      city_id varchar(100),
      district_id varchar(100),
      latitude double precision,
      longitude double precision,
      logo_url varchar(512),
      cover_url varchar(512),
      description_ar text,
      description_en text,
      description_tr text,
      website_url varchar(512),
      contact_email varchar(255),
      contact_phone varchar(32),
      status varchar(30) DEFAULT 'draft' NOT NULL,
      verified_at timestamp with time zone,
      approved_at timestamp with time zone,
      suspended_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT organizations_slug_unique UNIQUE (slug)
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS org_type_idx ON organizations (type)`,
  `CREATE INDEX IF NOT EXISTS org_status_idx ON organizations (status)`,
  `CREATE INDEX IF NOT EXISTS org_country_idx ON organizations (country_code)`,
  `CREATE INDEX IF NOT EXISTS org_slug_idx ON organizations (slug)`,
  `
    CREATE TABLE IF NOT EXISTS organization_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      organization_id uuid NOT NULL,
      user_id uuid NOT NULL,
      role varchar(20) NOT NULL,
      status varchar(20) DEFAULT 'active' NOT NULL,
      joined_at timestamp with time zone DEFAULT now() NOT NULL,
      invited_by uuid,
      CONSTRAINT organization_members_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      CONSTRAINT organization_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT organization_members_invited_by_users_id_fk FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE SET NULL
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS org_member_user_idx ON organization_members (user_id)`,
  `CREATE INDEX IF NOT EXISTS org_member_org_idx ON organization_members (organization_id)`,
  `CREATE INDEX IF NOT EXISTS org_member_status_idx ON organization_members (status)`,
  `
    CREATE TABLE IF NOT EXISTS organization_branches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      organization_id uuid NOT NULL,
      name_ar varchar(255),
      name_en varchar(255),
      country_code varchar(8) NOT NULL,
      city_id varchar(100),
      district_id varchar(100),
      governorate varchar(255),
      village varchar(255),
      street varchar(255),
      address_ar text,
      address_en text,
      phone varchar(32),
      email varchar(255),
      latitude double precision,
      longitude double precision,
      status varchar(20) DEFAULT 'active' NOT NULL,
      working_hours jsonb,
      service_areas jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT organization_branches_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS org_branch_org_idx ON organization_branches (organization_id)`,
  `
    CREATE TABLE IF NOT EXISTS verification_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      entity_type varchar(20) NOT NULL,
      entity_id uuid NOT NULL,
      type varchar(20) NOT NULL,
      status varchar(20) DEFAULT 'pending' NOT NULL,
      verified_at timestamp with time zone,
      expires_at timestamp with time zone,
      verified_by uuid,
      source varchar(20) DEFAULT 'system' NOT NULL,
      country_code varchar(8),
      document_url varchar(512),
      metadata jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT verification_records_verified_by_users_id_fk FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS verif_entity_idx ON verification_records (entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS verif_status_idx ON verification_records (status)`,
  `CREATE INDEX IF NOT EXISTS verif_expires_idx ON verification_records (expires_at)`,
  `CREATE INDEX IF NOT EXISTS verif_type_idx ON verification_records (type)`,
  `
    CREATE TABLE IF NOT EXISTS reputation_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      entity_type varchar(20) NOT NULL,
      entity_id uuid NOT NULL,
      level varchar(20) DEFAULT 'new' NOT NULL,
      score integer DEFAULT 0 NOT NULL,
      last_evaluated_at timestamp with time zone,
      policy_version integer DEFAULT 1 NOT NULL,
      grace_period_ends_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS rep_entity_idx ON reputation_profiles (entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS rep_level_idx ON reputation_profiles (level)`,
  `
    CREATE TABLE IF NOT EXISTS reputation_evaluations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      reputation_id uuid NOT NULL,
      policy_version integer NOT NULL,
      old_level varchar(20) NOT NULL,
      new_level varchar(20) NOT NULL,
      signals jsonb NOT NULL,
      reason text,
      evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
      admin_override boolean DEFAULT false NOT NULL,
      admin_id uuid,
      CONSTRAINT reputation_evaluations_reputation_id_reputation_profiles_id_fk FOREIGN KEY (reputation_id) REFERENCES reputation_profiles (id) ON DELETE CASCADE,
      CONSTRAINT reputation_evaluations_admin_id_users_id_fk FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS eval_reputation_idx ON reputation_evaluations (reputation_id)`,
  `CREATE INDEX IF NOT EXISTS eval_evaluated_idx ON reputation_evaluations (evaluated_at)`,
  `
    CREATE TABLE IF NOT EXISTS reputation_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      entity_type varchar(20) NOT NULL,
      entity_id uuid NOT NULL,
      old_level varchar(20) NOT NULL,
      new_level varchar(20) NOT NULL,
      reason text,
      evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
      policy_version integer NOT NULL
    )
  `.trim(),
  `CREATE INDEX IF NOT EXISTS hist_entity_idx ON reputation_history (entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS hist_evaluated_idx ON reputation_history (evaluated_at)`,
  `
    CREATE TABLE IF NOT EXISTS ${META_TABLE} (
      version integer PRIMARY KEY NOT NULL,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `.trim(),
  `
    INSERT INTO ${META_TABLE} (version, applied_at)
    VALUES (${PG_IDENTITY_SCHEMA_VERSION}, now())
    ON CONFLICT (version) DO UPDATE SET applied_at = EXCLUDED.applied_at
  `.trim(),
] as const;

async function configureSchema(client: Sql, schema: string): Promise<void> {
  if (schema !== "public") {
    await client.unsafe(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)}`);
  }
  await client.unsafe(`SET search_path TO ${quoteIdent(schema)}`);
}

async function readAppliedVersion(client: Sql): Promise<number | null> {
  const exists = await client`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = current_schema()
        and table_name = ${META_TABLE}
    ) as exists
  `;
  if (!exists[0]?.exists) return null;
  const rows = await client.unsafe(`SELECT max(version)::int AS version FROM ${META_TABLE}`);
  return rows[0]?.version ?? null;
}

export async function listMissingPgIdentityTables(client: Sql, options?: { schema?: string }): Promise<PgIdentityRequiredTable[]> {
  const schema = normalizeSchemaName(options?.schema ?? "public");
  const rows = await client`
    select table_name
    from information_schema.tables
    where table_schema = ${schema}
      and table_name = any(${client.array([...PG_IDENTITY_REQUIRED_TABLES])})
  `;
  const existing = new Set(rows.map((row) => String(row.table_name)));
  return PG_IDENTITY_REQUIRED_TABLES.filter((table) => !existing.has(table));
}

export async function inspectPgIdentitySchema(client: Sql, options?: { schema?: string }): Promise<PgIdentitySchemaStatus> {
  const schema = normalizeSchemaName(options?.schema ?? "public");
  await configureSchema(client, schema);
  const missingTables = await listMissingPgIdentityTables(client, { schema });
  const appliedVersion = await readAppliedVersion(client);
  return {
    version: PG_IDENTITY_SCHEMA_VERSION,
    schema,
    ready: missingTables.length === 0 && appliedVersion === PG_IDENTITY_SCHEMA_VERSION,
    requiredTables: PG_IDENTITY_REQUIRED_TABLES,
    missingTables,
    appliedVersion,
  };
}

export async function applyPgIdentitySchema(client: Sql, options?: { schema?: string }): Promise<PgIdentitySchemaStatus> {
  const schema = normalizeSchemaName(options?.schema ?? "public");
  await configureSchema(client, schema);
  for (const statement of PG_IDENTITY_SCHEMA_SQL) {
    await client.unsafe(statement);
  }
  return inspectPgIdentitySchema(client, { schema });
}

function openClient(): Sql {
  return postgres(databaseUrl(), { ssl: "require", prepare: false });
}

export async function probePublicPgIdentitySchema(): Promise<PgIdentitySchemaStatus> {
  const client = openClient();
  try {
    return await inspectPgIdentitySchema(client, { schema: "public" });
  } finally {
    await client.end();
  }
}

export async function ensurePgIdentitySchema(): Promise<PgIdentitySchemaStatus> {
  if (cachedStatus.ready) return cachedStatus;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const client = openClient();
      try {
        cachedStatus = await applyPgIdentitySchema(client, { schema: "public" });
        if (!cachedStatus.ready) {
          throw new Error(`PG identity schema incomplete: missing ${cachedStatus.missingTables.join(", ") || "unknown tables"}`);
        }
        return cachedStatus;
      } finally {
        await client.end();
      }
    })().catch((error) => {
      ensurePromise = null;
      cachedStatus = { ...INITIAL_STATUS };
      throw error;
    });
  }
  return ensurePromise;
}

export function getPgIdentitySchemaStatus(): PgIdentitySchemaStatus {
  return cachedStatus;
}

export function resetPgIdentitySchemaStatusForTests(): void {
  cachedStatus = { ...INITIAL_STATUS };
  ensurePromise = null;
}
