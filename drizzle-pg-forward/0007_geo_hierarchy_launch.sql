-- AKARPROMAX FORWARD MIGRATION 0007
-- GEO LAUNCH — canonical Country -> Governorate -> City -> District hierarchy.
-- Reference rows are deliberately not inserted here. Environments own their
-- location catalogue; the migration only guarantees the shared schema.

CREATE TABLE IF NOT EXISTS governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS governorates_country_id_idx ON governorates (country_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS governorates_is_active_idx ON governorates (is_active);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  governorate_id uuid NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  code text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  latitude text,
  longitude text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cities_governorate_id_idx ON cities (governorate_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cities_is_active_idx ON cities (is_active);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  code text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS districts_city_id_idx ON districts (city_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS districts_is_active_idx ON districts (is_active);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS streets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  district_id uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  code text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS streets_district_id_idx ON streets (district_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS streets_is_active_idx ON streets (is_active);
