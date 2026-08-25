-- AKARPROMAX FORWARD MIGRATION 0000 — L1A GLOBAL MARKET FOUNDATION
--
-- This is the FIRST migration of the canonical forward stream. It does not
-- replay, replace or repair the legacy `drizzle-pg/0000..0016` history and it
-- does not touch `drizzle.__drizzle_migrations`. It reconciles a database that
-- is in the KNOWN LIVE STATE (countries with 11 columns) up to the state the
-- current Drizzle schema expects, using additive, idempotent statements only.
--
-- Nothing here drops a column, drops a table, or deletes a row.

-- 1. Canonicalise country codes to ISO 3166-1 alpha-2 UPPERCASE.
--    Legacy rows were written lowercase ('om', 'sa'); the registry is upper.
--    Rows whose uppercase form would collide with an existing row are left
--    alone and reported by scripts/verify-schema-truth.ts — merging them would
--    be destructive and is out of scope for L1A.
UPDATE countries c
SET code = upper(c.code)
WHERE c.code <> upper(c.code)
  AND NOT EXISTS (
    SELECT 1 FROM countries c2 WHERE c2.code = upper(c.code) AND c2.id <> c.id
  );
--> statement-breakpoint

-- 2. Bring the countries table up to the columns the Drizzle schema declares.
--    This is the reconciliation of the intent behind legacy 0016, which never
--    reached the live database.
ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS name_tr text,
  ADD COLUMN IF NOT EXISTS phone_code text,
  ADD COLUMN IF NOT EXISTS currency_code text,
  ADD COLUMN IF NOT EXISTS flag_emoji text,
  ADD COLUMN IF NOT EXISTS map_center_lat double precision,
  ADD COLUMN IF NOT EXISTS map_center_lng double precision,
  ADD COLUMN IF NOT EXISTS default_zoom integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS publications_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS measurement_system text DEFAULT 'metric';
--> statement-breakpoint

-- 3. AkarProMax has no platform-wide monetary default. A country's currency
--    must be explicitly owned by that country's row, never inherited from a
--    column default such as 'OMR'.
ALTER TABLE countries ALTER COLUMN currency_code DROP DEFAULT;
--> statement-breakpoint

-- 4. GLOBAL is an application state, not a country. This constraint makes it
--    structurally impossible to store a fake 'GLOBAL' / 'ALL' country row.
--    It is only installed when the existing data already satisfies it; a
--    violating row is reported rather than deleted.
--    The existence check is scoped to public.countries by relation AND
--    namespace. A same-named constraint on an unrelated table must never
--    suppress creating this one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.conname = 'countries_code_iso_alpha2_chk'
      AND con.contype = 'c'
      AND rel.relname = 'countries'
      AND nsp.nspname = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.countries WHERE code !~ '^[A-Z]{2}$'
  ) THEN
    ALTER TABLE public.countries
      ADD CONSTRAINT countries_code_iso_alpha2_chk CHECK (code ~ '^[A-Z]{2}$');
  END IF;
END
$$;
--> statement-breakpoint

-- 5. Canonical initial country registry (23 markets: Arab League + Türkiye).
--    Idempotent: existing rows are updated in place, never duplicated.
--    Existing region/city/district/street rows hang off countries.id, which is
--    never rewritten here, so the SA hierarchy is preserved untouched.
--    PS.currency_code is intentionally NULL — its de-facto currency (ILS) is
--    not part of the L1A currency registry and was not fabricated.
INSERT INTO countries (
  code, name_ar, name_en, name_tr, phone_code, currency_code, flag_emoji,
  map_center_lat, map_center_lng, default_zoom, publications_enabled,
  measurement_system, is_active, display_order
)
VALUES
  ('DZ', 'الجزائر', 'Algeria', 'Cezayir', '+213', 'DZD', '🇩🇿', 36.7538, 3.0588, 12, true, 'metric', true, 10),
  ('BH', 'البحرين', 'Bahrain', 'Bahreyn', '+973', 'BHD', '🇧🇭', 26.0667, 50.5577, 12, true, 'metric', true, 20),
  ('KM', 'جزر القمر', 'Comoros', 'Komorlar', '+269', 'KMF', '🇰🇲', -11.7172, 43.2433, 12, true, 'metric', true, 30),
  ('DJ', 'جيبوتي', 'Djibouti', 'Cibuti', '+253', 'DJF', '🇩🇯', 11.5721, 43.1456, 12, true, 'metric', true, 40),
  ('EG', 'مصر', 'Egypt', 'Mısır', '+20', 'EGP', '🇪🇬', 30.0444, 31.2357, 12, true, 'metric', true, 50),
  ('IQ', 'العراق', 'Iraq', 'Irak', '+964', 'IQD', '🇮🇶', 33.3152, 44.3661, 12, true, 'metric', true, 60),
  ('JO', 'الأردن', 'Jordan', 'Ürdün', '+962', 'JOD', '🇯🇴', 31.9454, 35.9284, 12, true, 'metric', true, 70),
  ('KW', 'الكويت', 'Kuwait', 'Kuveyt', '+965', 'KWD', '🇰🇼', 29.3759, 47.9774, 12, true, 'metric', true, 80),
  ('LB', 'لبنان', 'Lebanon', 'Lübnan', '+961', 'LBP', '🇱🇧', 33.8938, 35.5131, 12, true, 'metric', true, 90),
  ('LY', 'ليبيا', 'Libya', 'Libya', '+218', 'LYD', '🇱🇾', 32.9022, 13.1875, 12, true, 'metric', true, 100),
  ('MR', 'موريتانيا', 'Mauritania', 'Moritanya', '+222', 'MRU', '🇲🇷', 18.0858, -15.9582, 12, true, 'metric', true, 110),
  ('MA', 'المغرب', 'Morocco', 'Fas', '+212', 'MAD', '🇲🇦', 31.7917, -7.5898, 12, true, 'metric', true, 120),
  ('OM', 'سلطنة عُمان', 'Oman', 'Umman', '+968', 'OMR', '🇴🇲', 21.4735, 55.9761, 12, true, 'metric', true, 130),
  ('PS', 'فلسطين', 'Palestine', 'Filistin', '+970', NULL, '🇵🇸', 31.9522, 35.2034, 12, true, 'metric', true, 140),
  ('QA', 'قطر', 'Qatar', 'Katar', '+974', 'QAR', '🇶🇦', 25.2854, 51.1846, 12, true, 'metric', true, 150),
  ('SA', 'السعودية', 'Saudi Arabia', 'Suudi Arabistan', '+966', 'SAR', '🇸🇦', 24.7136, 46.6753, 12, true, 'metric', true, 160),
  ('SO', 'الصومال', 'Somalia', 'Somali', '+252', 'SOS', '🇸🇴', 2.0469, 45.2049, 12, true, 'metric', true, 170),
  ('SD', 'السودان', 'Sudan', 'Sudan', '+249', 'SDG', '🇸🇩', 15.5007, 30.2176, 12, true, 'metric', true, 180),
  ('SY', 'سوريا', 'Syria', 'Suriye', '+963', 'SYP', '🇸🇾', 33.5138, 36.2765, 12, true, 'metric', true, 190),
  ('TN', 'تونس', 'Tunisia', 'Tunus', '+216', 'TND', '🇹🇳', 36.8065, 10.1815, 12, true, 'metric', true, 200),
  ('AE', 'الإمارات العربية المتحدة', 'United Arab Emirates', 'Birleşik Arap Emirlikleri', '+971', 'AED', '🇦🇪', 25.2048, 55.2708, 12, true, 'metric', true, 210),
  ('YE', 'اليمن', 'Yemen', 'Yemen', '+967', 'YER', '🇾🇪', 15.3694, 44.191, 12, true, 'metric', true, 220),
  ('TR', 'تركيا', 'Türkiye', 'Türkiye', '+90', 'TRY', '🇹🇷', 39.9334, 32.8597, 12, true, 'metric', true, 230)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  name_tr = COALESCE(EXCLUDED.name_tr, countries.name_tr),
  phone_code = COALESCE(EXCLUDED.phone_code, countries.phone_code),
  currency_code = COALESCE(EXCLUDED.currency_code, countries.currency_code),
  flag_emoji = COALESCE(EXCLUDED.flag_emoji, countries.flag_emoji),
  map_center_lat = COALESCE(countries.map_center_lat, EXCLUDED.map_center_lat),
  map_center_lng = COALESCE(countries.map_center_lng, EXCLUDED.map_center_lng),
  default_zoom = COALESCE(countries.default_zoom, EXCLUDED.default_zoom),
  publications_enabled = COALESCE(countries.publications_enabled, EXCLUDED.publications_enabled),
  measurement_system = COALESCE(countries.measurement_system, EXCLUDED.measurement_system),
  is_active = true,
  display_order = EXCLUDED.display_order,
  updated_at = now();
--> statement-breakpoint

-- 6. Canonical currency registry (24 active codes).
--    exchange_rate_to_usd is left untouched: L1A adds no FX layer and reads no
--    rate. The column keeps its existing value purely for schema compatibility.
INSERT INTO currencies (id, code, symbol, name_ar, name_en, name_tr, is_active, is_default, display_order)
VALUES
  ('AED', 'AED', 'د.إ', 'درهم إماراتي', 'UAE Dirham', 'BAE Dirhemi', true, false, 10),
  ('BHD', 'BHD', 'د.ب', 'دينار بحريني', 'Bahraini Dinar', 'Bahreyn Dinarı', true, false, 20),
  ('DZD', 'DZD', 'د.ج', 'دينار جزائري', 'Algerian Dinar', 'Cezayir Dinarı', true, false, 30),
  ('DJF', 'DJF', 'Fdj', 'فرنك جيبوتي', 'Djiboutian Franc', 'Cibuti Frangı', true, false, 40),
  ('EGP', 'EGP', 'ج.م', 'جنيه مصري', 'Egyptian Pound', 'Mısır Lirası', true, false, 50),
  ('IQD', 'IQD', 'د.ع', 'دينار عراقي', 'Iraqi Dinar', 'Irak Dinarı', true, false, 60),
  ('JOD', 'JOD', 'د.أ', 'دينار أردني', 'Jordanian Dinar', 'Ürdün Dinarı', true, false, 70),
  ('KMF', 'KMF', 'CF', 'فرنك قمري', 'Comorian Franc', 'Komor Frangı', true, false, 80),
  ('KWD', 'KWD', 'د.ك', 'دينار كويتي', 'Kuwaiti Dinar', 'Kuveyt Dinarı', true, false, 90),
  ('LBP', 'LBP', 'ل.ل', 'ليرة لبنانية', 'Lebanese Pound', 'Lübnan Lirası', true, false, 100),
  ('LYD', 'LYD', 'د.ل', 'دينار ليبي', 'Libyan Dinar', 'Libya Dinarı', true, false, 110),
  ('MAD', 'MAD', 'د.م', 'درهم مغربي', 'Moroccan Dirham', 'Fas Dirhemi', true, false, 120),
  ('MRU', 'MRU', 'أ.م', 'أوقية موريتانية', 'Mauritanian Ouguiya', 'Moritanya Ugiyası', true, false, 130),
  ('OMR', 'OMR', 'ر.ع', 'ريال عماني', 'Omani Rial', 'Umman Riyali', true, false, 140),
  ('QAR', 'QAR', 'ر.ق', 'ريال قطري', 'Qatari Riyal', 'Katar Riyali', true, false, 150),
  ('SAR', 'SAR', 'ر.س', 'ريال سعودي', 'Saudi Riyal', 'Suudi Riyali', true, false, 160),
  ('SDG', 'SDG', 'ج.س', 'جنيه سوداني', 'Sudanese Pound', 'Sudan Lirası', true, false, 170),
  ('SOS', 'SOS', 'S', 'شلن صومالي', 'Somali Shilling', 'Somali Şilini', true, false, 180),
  ('SYP', 'SYP', 'ل.س', 'ليرة سورية', 'Syrian Pound', 'Suriye Lirası', true, false, 190),
  ('TND', 'TND', 'د.ت', 'دينار تونسي', 'Tunisian Dinar', 'Tunus Dinarı', true, false, 200),
  ('YER', 'YER', 'ر.ي', 'ريال يمني', 'Yemeni Rial', 'Yemen Riyali', true, false, 210),
  ('TRY', 'TRY', '₺', 'ليرة تركية', 'Turkish Lira', 'Türk Lirası', true, false, 220),
  ('USD', 'USD', '$', 'دولار أمريكي', 'US Dollar', 'ABD Doları', true, false, 230),
  ('EUR', 'EUR', '€', 'يورو', 'Euro', 'Euro', true, false, 240)
ON CONFLICT (code) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  name_tr = COALESCE(EXCLUDED.name_tr, currencies.name_tr),
  is_active = true,
  display_order = EXCLUDED.display_order,
  updated_at = now();
--> statement-breakpoint

-- 7. Remove the single global monetary default.
--    The listing publisher chooses the currency the price is expressed in, and
--    that currency stays with the listing. A visitor never receives a converted
--    value: a currency choice in a search/filter form only selects listings
--    already priced in that same currency. There is no FX, so the platform
--    nominates no default currency.
UPDATE currencies SET is_default = false, updated_at = now()
WHERE is_default IS DISTINCT FROM false;
