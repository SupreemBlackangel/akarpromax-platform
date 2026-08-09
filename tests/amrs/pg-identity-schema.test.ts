import assert from "node:assert/strict";
import { test } from "node:test";

import postgres, { type Sql } from "postgres";

import { applyPgIdentitySchema, inspectPgIdentitySchema, PG_IDENTITY_SCHEMA_VERSION, PG_IDENTITY_REQUIRED_TABLES } from "@/lib/db/pg-identity-schema";

const databaseUrl = process.env.DATABASE_URL?.trim();
const pgTest = databaseUrl ? test : test.skip;

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function tempSchema(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function withSchema(name: string, run: (sql: Sql, schema: string) => Promise<void>): Promise<void> {
  assert.ok(databaseUrl, "DATABASE_URL is required for PG schema tests");
  const sql = postgres(databaseUrl, { ssl: "require", prepare: false });
  try {
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(name)}`);
    await run(sql, name);
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS ${quoteIdent(name)} CASCADE`);
    await sql.end();
  }
}

pgTest("clean PG identity schema apply creates all required AMRS/auth tables", async () => {
  const schema = tempSchema("cert_clean_pg_identity");
  await withSchema(schema, async (sql, schemaName) => {
    const status = await applyPgIdentitySchema(sql, { schema: schemaName });
    assert.equal(status.ready, true);
    assert.equal(status.appliedVersion, PG_IDENTITY_SCHEMA_VERSION);
    assert.deepEqual(status.missingTables, []);
    assert.deepEqual(status.requiredTables, PG_IDENTITY_REQUIRED_TABLES);
  });
});

pgTest("upgrade PG identity schema adds AMRS tables onto a pre-AMRS auth schema", async () => {
  const schema = tempSchema("cert_upgrade_pg_identity");
  await withSchema(schema, async (sql, schemaName) => {
    await sql.unsafe(`SET search_path TO ${quoteIdent(schemaName)}`);
    await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await sql.unsafe(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        email varchar(255) UNIQUE,
        phone varchar(20) UNIQUE,
        password_hash varchar(255) NOT NULL,
        role varchar(30) DEFAULT 'user' NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN name varchar(190)`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN email_verified_at timestamp with time zone`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN phone_verified_at timestamp with time zone`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN status varchar(30) DEFAULT 'pending_verification' NOT NULL`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN onboarding_completed_at timestamp with time zone`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN welcome_sent_at timestamp with time zone`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN last_login_at timestamp with time zone`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN password_changed_at timestamp with time zone`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN preferred_language varchar(5) DEFAULT 'ar' NOT NULL`);
    await sql.unsafe(`ALTER TABLE users ADD COLUMN pending_email varchar(255)`);
    await sql.unsafe(`CREATE TABLE audit_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, user_id uuid, event_type varchar(50) NOT NULL, ip_address varchar(64), user_agent varchar(512), detail jsonb, created_at timestamp DEFAULT now() NOT NULL)`);
    await sql.unsafe(`CREATE TABLE verification_challenges (id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, purpose varchar(30) NOT NULL, channel varchar(20) DEFAULT 'email' NOT NULL, destination varchar(255) NOT NULL, token_hash varchar(255), code_hash varchar(255), attempts integer DEFAULT 0 NOT NULL, expires_at timestamp NOT NULL, consumed_at timestamp, revoked_at timestamp, created_at timestamp DEFAULT now() NOT NULL)`);

    const before = await inspectPgIdentitySchema(sql, { schema: schemaName });
    assert.equal(before.ready, false);
    assert.ok(before.missingTables.includes("organizations"));

    const after = await applyPgIdentitySchema(sql, { schema: schemaName });
    assert.equal(after.ready, true);
    assert.deepEqual(after.missingTables, []);
    assert.equal(after.appliedVersion, PG_IDENTITY_SCHEMA_VERSION);
  });
});
