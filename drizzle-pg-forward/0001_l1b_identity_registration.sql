-- AKARPROMAX FORWARD MIGRATION 0001 — L1B IDENTITY & REGISTRATION CORE
--
-- Second migration of the canonical forward stream (akarpromax.forward_migrations).
-- It does not touch the legacy drizzle ledger and does not rewrite 0000.
--
-- Scope: the canonical human `users` table only. Additive and idempotent.
-- The identity tables themselves are still bootstrapped by
-- ensurePgIdentitySchema() (declared transitional debt — see
-- lib/db/pg-identity-schema.ts); this migration is the authority for the L1B
-- delta on EXISTING databases, so every statement tolerates a database where
-- the table is present, and no-ops gracefully where it is not.

-- 1. Lifecycle + preference columns.
--    updated_at        — required canonical concept, absent from the live table.
--    preferred_market  — the ACCOUNT PREFERENCE slot in the approved L1A
--                        resolution chain (manual > account > browser > gps >
--                        ip > GLOBAL). Nullable, NO DEFAULT: no country and no
--                        market is ever a global identity default. It stores an
--                        ISO alpha-2 code or the literal 'GLOBAL' sentinel —
--                        which is an application state, never a countries row.
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS preferred_market varchar(8);
--> statement-breakpoint

-- 2. Canonical case-insensitive email identity, enforced at the database.
--    User@Example.com and user@example.com must never become two humans, and
--    the guarantee must be race-safe — the application-level lowercase is a
--    convenience, this index is the truth.
--
--    Installed only when no case-insensitive duplicates already exist; a
--    violating pair is REPORTED by verifyIdentitySchemaTruth(), never deleted.
--    The existence check is scoped to public.users by relation and namespace.
--    NOTE the nested IF: PL/pgSQL plans a boolean expression as one query, so
--    the users-table probe must only be reached when the table exists.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (
         SELECT 1
         FROM pg_class idx
         JOIN pg_namespace nsp ON nsp.oid = idx.relnamespace
         WHERE idx.relname = 'users_email_lower_unique'
           AND idx.relkind = 'i'
           AND nsp.nspname = 'public'
       )
       AND NOT EXISTS (
         SELECT lower(email)
         FROM public.users
         WHERE email IS NOT NULL
         GROUP BY lower(email)
         HAVING count(*) > 1
       )
    THEN
      CREATE UNIQUE INDEX users_email_lower_unique ON public.users (lower(email));
    END IF;
  END IF;
END
$$;
