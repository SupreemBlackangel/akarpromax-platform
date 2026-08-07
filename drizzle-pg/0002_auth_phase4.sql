ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp;
ALTER TABLE "users" ADD COLUMN "status" varchar(30) DEFAULT 'pending_verification' NOT NULL;
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp;
ALTER TABLE "users" ADD COLUMN "welcome_sent_at" timestamp;
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp;
ALTER TABLE "users" ADD COLUMN "preferred_language" varchar(5) DEFAULT 'ar' NOT NULL;
ALTER TABLE "users" ADD COLUMN "pending_email" varchar(255);
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "verification_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"destination" varchar(255) NOT NULL,
	"token_hash" varchar(255),
	"code_hash" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "vc_user_id_idx" ON "verification_challenges" ("user_id");
CREATE INDEX "vc_purpose_idx" ON "verification_challenges" ("purpose");
CREATE INDEX "vc_token_hash_idx" ON "verification_challenges" ("token_hash");
CREATE INDEX "vc_code_hash_idx" ON "verification_challenges" ("code_hash");

CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" varchar(512),
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX "audit_user_id_idx" ON "audit_events" ("user_id");
CREATE INDEX "audit_event_type_idx" ON "audit_events" ("event_type");
