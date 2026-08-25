CREATE TABLE "property_offer_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"description_ar" text,
	"description_en" text,
	"description_tr" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"allow_direct" boolean DEFAULT true,
	"allow_auction" boolean DEFAULT true,
	"allow_fixed_auction" boolean DEFAULT true,
	"allow_open_auction" boolean DEFAULT true,
	"allowed_countries" jsonb DEFAULT '[]'::jsonb,
	"allowed_property_categories" jsonb DEFAULT '[]'::jsonb,
	"requires_verification" boolean DEFAULT false,
	"requires_documents" boolean DEFAULT false,
	"requires_terms" boolean DEFAULT true,
	"contract_template_type" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "property_offer_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "property_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"offer_type_id" uuid,
	"marketing_method" text NOT NULL,
	"auction_type" text,
	"status" text DEFAULT 'draft',
	"price" text,
	"currency" text DEFAULT 'SAR',
	"negotiable" boolean DEFAULT false,
	"details" jsonb DEFAULT '{}'::jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "property_offers" ADD CONSTRAINT "property_offers_offer_type_id_property_offer_types_id_fk" FOREIGN KEY ("offer_type_id") REFERENCES "public"."property_offer_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "property_offer_types_code_idx" ON "property_offer_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "property_offer_types_is_active_idx" ON "property_offer_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "property_offers_property_id_idx" ON "property_offers" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_offers_offer_type_id_idx" ON "property_offers" USING btree ("offer_type_id");--> statement-breakpoint
CREATE INDEX "property_offers_status_idx" ON "property_offers" USING btree ("status");