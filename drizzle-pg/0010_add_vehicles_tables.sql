-- Vehicles table
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"price" integer NOT NULL,
	"type" text NOT NULL CHECK (type IN ('Car', 'Truck', 'Motorcycle')),
	"location_id" uuid REFERENCES "locations"("id") ON DELETE SET NULL,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "vehicles_type_idx" ON "vehicles" ("type");
CREATE INDEX IF NOT EXISTS "vehicles_location_id_idx" ON "vehicles" ("location_id");
CREATE INDEX IF NOT EXISTS "vehicles_brand_model_idx" ON "vehicles" ("brand", "model");
CREATE INDEX IF NOT EXISTS "vehicles_is_active_idx" ON "vehicles" ("is_active");

-- Locations table
CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text NOT NULL,
	"city_id" uuid NOT NULL,
	"district_id" uuid,
	"street_name" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Indexes for locations
CREATE INDEX IF NOT EXISTS "locations_country_code_idx" ON "locations" ("country_code");
CREATE INDEX IF NOT EXISTS "locations_city_id_idx" ON "locations" ("city_id");
CREATE INDEX IF NOT EXISTS "locations_is_active_idx" ON "locations" ("is_active");

-- Add foreign key constraints
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL;