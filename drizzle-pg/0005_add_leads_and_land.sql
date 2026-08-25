CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"assigned_to" uuid NOT NULL,
	"assigned_by" uuid,
	"notes" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"type" text DEFAULT 'property_inquiry' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'normal',
	"subject" text NOT NULL,
	"description" text,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"contact_whatsapp" text,
	"user_id" uuid,
	"property_id" uuid,
	"service_request_id" uuid,
	"assigned_to" uuid,
	"assigned_at" timestamp,
	"responded_at" timestamp,
	"converted_at" timestamp,
	"lost_at" timestamp,
	"lost_reason" text,
	"score" integer DEFAULT 0,
	"tags" jsonb,
	"metadata" jsonb,
	"country" text,
	"governorate" text,
	"city" text,
	"budget" numeric(15, 2),
	"preferred_date" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "land_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"file_url" text,
	"file_size" integer,
	"mime_type" text,
	"is_verified" boolean DEFAULT false,
	"uploaded_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "land_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parcel_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "land_parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_number" text,
	"block_number" text,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'residential' NOT NULL,
	"status" text DEFAULT 'available',
	"area" numeric(12, 2),
	"area_unit" text DEFAULT 'sqm',
	"price" numeric(15, 2),
	"price_per_unit" numeric(15, 2),
	"currency" text DEFAULT 'OMR',
	"country" text NOT NULL,
	"governorate" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"boundary" jsonb,
	"zoning" text,
	"frontage" numeric(8, 2),
	"road_access" text,
	"utilities" jsonb,
	"features" jsonb,
	"owner_id" uuid,
	"organization_id" uuid,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"listed_at" timestamp,
	"sold_at" timestamp,
	"expires_at" timestamp,
	"views" integer DEFAULT 0,
	"favorites" integer DEFAULT 0,
	"score" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "land_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" uuid NOT NULL,
	"valued_by" uuid,
	"methodology" text,
	"estimated_value" numeric(15, 2),
	"min_value" numeric(15, 2),
	"max_value" numeric(15, 2),
	"currency" text DEFAULT 'OMR',
	"comparables" jsonb,
	"notes" text,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_documents" ADD CONSTRAINT "land_documents_parcel_id_land_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."land_parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_documents" ADD CONSTRAINT "land_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_favorites" ADD CONSTRAINT "land_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_favorites" ADD CONSTRAINT "land_favorites_parcel_id_land_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."land_parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_valuations" ADD CONSTRAINT "land_valuations_parcel_id_land_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."land_parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_valuations" ADD CONSTRAINT "land_valuations_valued_by_users_id_fk" FOREIGN KEY ("valued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_activities_lead_idx" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_assignments_lead_idx" ON "lead_assignments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_assignments_user_idx" ON "lead_assignments" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_assigned_idx" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "leads_user_idx" ON "leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "land_documents_parcel_idx" ON "land_documents" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "land_favorites_user_idx" ON "land_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "land_favorites_parcel_idx" ON "land_favorites" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "land_parcels_type_idx" ON "land_parcels" USING btree ("type");--> statement-breakpoint
CREATE INDEX "land_parcels_status_idx" ON "land_parcels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "land_parcels_location_idx" ON "land_parcels" USING btree ("country","governorate","city");--> statement-breakpoint
CREATE INDEX "land_parcels_owner_idx" ON "land_parcels" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "land_parcels_org_idx" ON "land_parcels" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "land_parcels_created_idx" ON "land_parcels" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "land_valuations_parcel_idx" ON "land_valuations" USING btree ("parcel_id");