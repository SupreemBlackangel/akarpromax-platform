-- 0015_add_user_oauth_accounts.sql
-- OAuth accounts table for Google / Facebook social login

CREATE TABLE IF NOT EXISTS "user_oauth_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "provider" VARCHAR(30) NOT NULL,
  "provider_user_id" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "name" VARCHAR(255),
  "avatar_url" VARCHAR(512),
  "access_token" TEXT,
  "refresh_token" TEXT,
  "token_expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "oauth_user_idx" ON "user_oauth_accounts" ("user_id");
CREATE INDEX IF NOT EXISTS "oauth_provider_idx" ON "user_oauth_accounts" ("provider", "provider_user_id");
