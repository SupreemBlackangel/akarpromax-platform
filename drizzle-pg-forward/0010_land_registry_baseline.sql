-- AKARPROMAX FORWARD MIGRATION 0010
-- LAND REGISTRY — the four tables behind /land and "اعثر على أرضي".
--
-- Reproduced against production, not inferred from the source:
--
--   GET https://www.akarpromax.com/api/land/search
--   500 {"error":"Failed query: select count(*)::int from \"land_parcels\"
--        where \"land_parcels\".\"status\" = $1  params: available"}
--
-- Same cause as 0008 and 0009. land_parcels is defined in
-- lib/db/schemas/land-schema.ts and created by drizzle-pg/0005, which is the
-- abandoned lineage. The deployed truth is drizzle-pg-forward and nothing in
-- it has ever created these tables. The land search page has therefore never
-- returned a result to anyone; it answers 500 on every call, including the
-- unfiltered browse.
--
-- Columns and types mirror land-schema.ts exactly, so the Drizzle definition
-- and the database agree. Timestamps are without time zone because that is
-- what the schema file declares (`timestamp('created_at')`); changing that
-- here would make the ORM and the table disagree in the other direction.
--
-- CREATE only. Nothing here alters or removes an existing row, column or table.

CREATE TABLE IF NOT EXISTS land_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  parcel_number text,
  block_number text,
  title text NOT NULL,
  description text,
  type text DEFAULT 'residential' NOT NULL,
  status text DEFAULT 'available',
  area numeric(12, 2),
  area_unit text DEFAULT 'sqm',
  price numeric(15, 2),
  price_per_unit numeric(15, 2),
  currency text DEFAULT 'OMR',
  country text NOT NULL,
  governorate text NOT NULL,
  city text NOT NULL,
  district text,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  boundary jsonb,
  zoning text,
  frontage numeric(8, 2),
  road_access text,
  utilities jsonb,
  features jsonb,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamp,
  listed_at timestamp,
  sold_at timestamp,
  expires_at timestamp,
  views integer DEFAULT 0,
  favorites integer DEFAULT 0,
  score integer DEFAULT 0,
  metadata jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint

-- The six indexes land-schema.ts declares. The status one carries the query
-- that was failing; the location one carries the country/governorate/city
-- filter every search on the page applies. There are no rows yet, so these
-- cost nothing now and would cost a lock later.
CREATE INDEX IF NOT EXISTS land_parcels_type_idx ON land_parcels (type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_parcels_status_idx ON land_parcels (status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_parcels_location_idx ON land_parcels (country, governorate, city);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_parcels_owner_idx ON land_parcels (owner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_parcels_org_idx ON land_parcels (organization_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_parcels_created_idx ON land_parcels (created_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS land_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  parcel_id uuid NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  file_url text,
  file_size integer,
  mime_type text,
  is_verified boolean DEFAULT false,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_documents_parcel_idx ON land_documents (parcel_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS land_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  parcel_id uuid NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
  valued_by uuid REFERENCES users(id) ON DELETE SET NULL,
  methodology text,
  estimated_value numeric(15, 2),
  min_value numeric(15, 2),
  max_value numeric(15, 2),
  currency text DEFAULT 'OMR',
  comparables jsonb,
  notes text,
  valid_until timestamp,
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_valuations_parcel_idx ON land_valuations (parcel_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS land_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parcel_id uuid NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
  notes text,
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_favorites_user_idx ON land_favorites (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS land_favorites_parcel_idx ON land_favorites (parcel_id);
