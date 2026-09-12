-- AKARPROMAX FORWARD MIGRATION 0017
-- AD CREATIVE METADATA — five columns the ad engine reads on every page load,
-- created by a write path, on a database whose coordinator refuses to run.
--
-- `loadCreatives` (lib/ads/engine.ts) selects alt_text_ar, alt_text_en,
-- alt_text_tr, media_width and media_height from ad_creatives. None of the five
-- is in the table's CREATE — not in lib/content-schema.ts and not in
-- lib/mysql-runtime.ts. They exist only in AD_CREATIVE_NEW_COLUMNS, an ALTER
-- list applied by `ensureAdSchema`.
--
-- And `ensureAdSchema` is reached from exactly three places: two POST handlers
-- (/api/admin/ads and the public /api/ads/request) and `ensureContentSchema`.
-- The third never fires on a live remote database: ensureContentSchema returns
-- at its first line when the schema-version row already reads
-- CONTENT_SCHEMA_VERSION, which production has been stamped with since v3.
--
-- So a column the READ path requires is created by a WRITE path. The reads have
-- worked because somebody posted an ad at some point and the ALTER ran then;
-- nothing guarantees that order, and on a freshly provisioned database every
-- ad request fails until an ad is submitted.
--
-- This makes the five part of the versioned schema, which is where a column the
-- engine cannot run without belongs. Additive and idempotent: on a database
-- where the ALTER list has already run, every statement is a no-op. The ALTER
-- list itself is left in place — it is harmless, and it is still how the local
-- D1 development path gets these columns.

ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS alt_text_ar varchar(180);
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS alt_text_en varchar(180);
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS alt_text_tr varchar(180);
-- Intrinsic pixel size, captured at upload: lets a slot reserve its space
-- before the image arrives, and lets the admin be warned when a creative does
-- not match the placement's aspect ratio.
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS media_width integer;
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS media_height integer;
