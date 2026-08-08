CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" varchar(512),
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name_ar" varchar(255),
	"name_en" varchar(255),
	"country_code" varchar(8) NOT NULL,
	"city_id" varchar(100),
	"district_id" varchar(100),
	"governorate" varchar(255),
	"village" varchar(255),
	"street" varchar(255),
	"address_ar" text,
	"address_en" text,
	"phone" varchar(32),
	"email" varchar(255),
	"latitude" double precision,
	"longitude" double precision,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"working_hours" jsonb,
	"service_areas" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_by" uuid
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ar" varchar(255),
	"name_en" varchar(255),
	"name_tr" varchar(255),
	"slug" varchar(255) NOT NULL,
	"type" varchar(30) NOT NULL,
	"classification" varchar(30) NOT NULL,
	"country_code" varchar(8) NOT NULL,
	"city_id" varchar(100),
	"district_id" varchar(100),
	"latitude" double precision,
	"longitude" double precision,
	"logo_url" varchar(512),
	"cover_url" varchar(512),
	"description_ar" text,
	"description_en" text,
	"description_tr" text,
	"website_url" varchar(512),
	"contact_email" varchar(255),
	"contact_phone" varchar(32),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"verified_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reputation_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reputation_id" uuid NOT NULL,
	"policy_version" integer NOT NULL,
	"old_level" varchar(20) NOT NULL,
	"new_level" varchar(20) NOT NULL,
	"signals" jsonb NOT NULL,
	"reason" text,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_override" boolean DEFAULT false NOT NULL,
	"admin_id" uuid
);
--> statement-breakpoint
CREATE TABLE "reputation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_level" varchar(20) NOT NULL,
	"new_level" varchar(20) NOT NULL,
	"reason" text,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"policy_version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reputation_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"level" varchar(20) DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"last_evaluated_at" timestamp with time zone,
	"policy_version" integer DEFAULT 1 NOT NULL,
	"grace_period_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"destination" varchar(255) NOT NULL,
	"token_hash" varchar(255),
	"code_hash" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"verified_by" uuid,
	"source" varchar(20) DEFAULT 'system' NOT NULL,
	"country_code" varchar(8),
	"document_url" varchar(512),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(30) DEFAULT 'pending_verification' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_language" varchar(5) DEFAULT 'ar' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_email" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_branches" ADD CONSTRAINT "organization_branches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_evaluations" ADD CONSTRAINT "reputation_evaluations_reputation_id_reputation_profiles_id_fk" FOREIGN KEY ("reputation_id") REFERENCES "public"."reputation_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_evaluations" ADD CONSTRAINT "reputation_evaluations_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_challenges" ADD CONSTRAINT "verification_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_records" ADD CONSTRAINT "verification_records_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_id_idx" ON "audit_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_event_type_idx" ON "audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "org_branch_org_idx" ON "organization_branches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_member_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_member_org_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_member_status_idx" ON "organization_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_type_idx" ON "organizations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "org_status_idx" ON "organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_country_idx" ON "organizations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "org_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "eval_reputation_idx" ON "reputation_evaluations" USING btree ("reputation_id");--> statement-breakpoint
CREATE INDEX "eval_evaluated_idx" ON "reputation_evaluations" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "hist_entity_idx" ON "reputation_history" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "hist_evaluated_idx" ON "reputation_history" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "rep_entity_idx" ON "reputation_profiles" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "rep_level_idx" ON "reputation_profiles" USING btree ("level");--> statement-breakpoint
CREATE INDEX "vc_user_id_idx" ON "verification_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vc_purpose_idx" ON "verification_challenges" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "vc_token_hash_idx" ON "verification_challenges" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "vc_code_hash_idx" ON "verification_challenges" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "verif_entity_idx" ON "verification_records" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "verif_status_idx" ON "verification_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verif_expires_idx" ON "verification_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verif_type_idx" ON "verification_records" USING btree ("type");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pending_email_unique" UNIQUE("pending_email");