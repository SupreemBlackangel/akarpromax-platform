-- LIMITED AUCTION ORGANIZERS (admin-granted trusted offices/lawyers)

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "limited_auction_organizers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "granted_by" uuid NOT NULL,
  "reason" text,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_by" uuid,
  "revoke_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "limited_auction_organizers"
  ADD CONSTRAINT "limited_auction_organizers_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;

--> statement-breakpoint
ALTER TABLE "limited_auction_organizers"
  ADD CONSTRAINT "limited_auction_organizers_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;

--> statement-breakpoint
ALTER TABLE "limited_auction_organizers"
  ADD CONSTRAINT "limited_auction_organizers_granted_by_users_id_fk"
  FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE restrict;

--> statement-breakpoint
ALTER TABLE "limited_auction_organizers"
  ADD CONSTRAINT "limited_auction_organizers_revoked_by_users_id_fk"
  FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE set null;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "limited_auction_organizers_org_user_uidx"
  ON "limited_auction_organizers" ("organization_id", "user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "limited_auction_organizers_org_active_idx"
  ON "limited_auction_organizers" ("organization_id", "revoked_at");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "limited_auction_organizers_user_idx"
  ON "limited_auction_organizers" ("user_id");
