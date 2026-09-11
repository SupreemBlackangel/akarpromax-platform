-- AKARPROMAX FORWARD MIGRATION 0014
-- GEO DEPTH — villages/hamlets as a first-class level, coordinates on the
-- district level, a deduplication key on every growable level, and registry
-- ids on the property record.
--
-- The catalogue is grown by publishers: a place named while advertising is
-- searchable immediately (origin = 'listing'). `match_key` is the only thing
-- standing between that and three spellings of the same neighbourhood, so the
-- unique index per parent is part of the schema, not an afterthought.
-- Reference rows are still never inserted by a migration.

CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  code text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  latitude text,
  longitude text,
  match_key text,
  origin text DEFAULT 'seed',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS villages_city_id_idx ON villages (city_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS villages_is_active_idx ON villages (is_active);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS villages_city_match_key_idx ON villages (city_id, match_key);
--> statement-breakpoint

ALTER TABLE districts ADD COLUMN IF NOT EXISTS latitude text;
--> statement-breakpoint
ALTER TABLE districts ADD COLUMN IF NOT EXISTS longitude text;
--> statement-breakpoint
ALTER TABLE districts ADD COLUMN IF NOT EXISTS match_key text;
--> statement-breakpoint
ALTER TABLE districts ADD COLUMN IF NOT EXISTS origin text DEFAULT 'seed';
--> statement-breakpoint
ALTER TABLE cities ADD COLUMN IF NOT EXISTS match_key text;
--> statement-breakpoint
ALTER TABLE cities ADD COLUMN IF NOT EXISTS origin text DEFAULT 'seed';
--> statement-breakpoint

-- Existing rows get their key from the application's own normaliser on next
-- write; these indexes tolerate the NULLs until then because a NULL match_key
-- never collides in PostgreSQL.
CREATE UNIQUE INDEX IF NOT EXISTS districts_city_match_key_idx ON districts (city_id, match_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS cities_governorate_match_key_idx ON cities (governorate_id, match_key);
--> statement-breakpoint

ALTER TABLE properties ADD COLUMN IF NOT EXISTS village text;
--> statement-breakpoint
ALTER TABLE properties ADD COLUMN IF NOT EXISTS country_id uuid;
--> statement-breakpoint
ALTER TABLE properties ADD COLUMN IF NOT EXISTS governorate_id uuid;
--> statement-breakpoint
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city_id uuid;
--> statement-breakpoint
ALTER TABLE properties ADD COLUMN IF NOT EXISTS district_id uuid;
--> statement-breakpoint
ALTER TABLE properties ADD COLUMN IF NOT EXISTS village_id uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS properties_city_id_idx ON properties (city_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS properties_district_id_idx ON properties (district_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS properties_village_id_idx ON properties (village_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS properties_coordinates_idx ON properties (latitude, longitude);
--> statement-breakpoint

ALTER TABLE property_requests ADD COLUMN IF NOT EXISTS village text;
