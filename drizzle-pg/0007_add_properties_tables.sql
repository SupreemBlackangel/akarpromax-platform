CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"office_id" uuid,
	"title_ar" text NOT NULL,
	"title_en" text,
	"description_ar" text NOT NULL,
	"description_en" text,
	"deal_type" text NOT NULL,
	"category" text NOT NULL,
	"property_type" text NOT NULL,
	"country" text NOT NULL,
	"governorate" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"address" text,
	"price" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'SAR',
	"area" numeric(10, 2) NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"floor" integer,
	"total_floors" integer,
	"year_built" integer,
	"facade" text,
	"direction" text,
	"reference_number" text,
	"advertising_license" text,
	"status" text DEFAULT 'draft',
	"is_featured" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"rejected_reason" text,
	"approved_at" timestamp,
	"approved_by" uuid,
	"views" integer DEFAULT 0,
	"inquiries" integer DEFAULT 0,
	"favorites_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"property_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"type" text DEFAULT 'general',
	"status" text DEFAULT 'new',
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"order" integer DEFAULT 0,
	"is_featured" boolean DEFAULT false,
	"alt_text" text,
	"size" integer,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_request_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"office_id" uuid,
	"property_id" uuid,
	"price" numeric(15, 2),
	"message" text,
	"status" text DEFAULT 'pending',
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"deal_type" text NOT NULL,
	"property_type" text NOT NULL,
	"country" text NOT NULL,
	"governorate" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"budget" numeric(15, 2),
	"area" numeric(10, 2),
	"bedrooms" integer,
	"bathrooms" integer,
	"description" text,
	"status" text DEFAULT 'active',
	"matched_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"user_id" uuid,
	"ip" text,
	"user_agent" text,
	"referer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"notify" boolean DEFAULT true,
	"last_notification" timestamp,
	"match_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_office_id_organizations_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_request_offers" ADD CONSTRAINT "property_request_offers_request_id_property_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."property_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_request_offers" ADD CONSTRAINT "property_request_offers_office_id_organizations_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_request_offers" ADD CONSTRAINT "property_request_offers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "properties_user_id_idx" ON "properties" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "properties_office_id_idx" ON "properties" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_deal_type_idx" ON "properties" USING btree ("deal_type");--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree ("city");--> statement-breakpoint
CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "property_favorites_user_property_idx" ON "property_favorites" USING btree ("user_id","property_id");--> statement-breakpoint
CREATE INDEX "property_inquiries_property_id_idx" ON "property_inquiries" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_media_property_id_idx" ON "property_media" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_offer_request_id_idx" ON "property_request_offers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "property_offer_office_id_idx" ON "property_request_offers" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "property_requests_user_id_idx" ON "property_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "property_requests_status_idx" ON "property_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "property_views_property_id_idx" ON "property_views" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches" USING btree ("user_id");