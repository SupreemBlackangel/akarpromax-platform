-- AKARPROMAX FORWARD MIGRATION 0011
-- USER_OAUTH_ACCOUNTS — the table both social logins write to.
--
-- Observed: signing in with Facebook lands on
--   /login?error=facebook_failed
--
-- That redirect is the catch-all in app/api/auth/facebook/callback/route.ts.
-- The provider side is fine: /api/auth/facebook redirects to
-- facebook.com/v18.0/dialog/oauth with a real client_id, so the code comes
-- back. What throws is further in — findOrCreateOAuthUser() in
-- lib/auth/oauth.ts, whose FIRST statement selects from user_oauth_accounts,
-- and whose last inserts into it. Every social sign-in, Google and Facebook
-- alike, ends in that catch.
--
-- The table is declared in lib/db/schema.ts and created by
-- drizzle-pg/0015_add_user_oauth_accounts.sql — the abandoned lineage. The
-- only thing that has ever applied it is scripts/apply-oauth-schema.ts, run by
-- hand. A table that exists only when somebody remembers to run a script is a
-- table that is missing.
--
-- Note it is declared in lib/db/schema.ts, NOT lib/db/schemas/. The guard in
-- tests/schema-lineage.test.mjs only walks lib/db/schemas/, so this table was
-- invisible to the test written to prevent exactly this. That gap is closed in
-- the same commit.
--
-- Columns mirror lib/db/schema.ts exactly, including `with time zone` on the
-- timestamps, which is what that file declares.
--
-- CREATE only. Nothing here alters or removes an existing row, column or table.

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(30) NOT NULL,
  provider_user_id varchar(255) NOT NULL,
  email varchar(255),
  name varchar(255),
  avatar_url varchar(512),
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS oauth_user_idx ON user_oauth_accounts (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS oauth_provider_idx ON user_oauth_accounts (provider, provider_user_id);
