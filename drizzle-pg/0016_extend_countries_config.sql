-- Extend countries table with config fields per Part 8 spec
-- Map center, zoom, publication toggle, measurement system

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS flag_emoji text,
  ADD COLUMN IF NOT EXISTS map_center_lat double precision,
  ADD COLUMN IF NOT EXISTS map_center_lng double precision,
  ADD COLUMN IF NOT EXISTS default_zoom integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS publications_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS measurement_system text DEFAULT 'metric';

-- Update existing rows with sensible defaults
UPDATE countries SET
  flag_emoji = CASE code
    WHEN 'om' THEN '🇴🇲' WHEN 'sa' THEN '🇸🇦' WHEN 'ae' THEN '🇦🇪'
    WHEN 'eg' THEN '🇪🇬' WHEN 'iq' THEN '🇮🇶' WHEN 'jo' THEN '🇯🇴'
    WHEN 'kw' THEN '🇰🇼' WHEN 'lb' THEN '🇱🇧' WHEN 'ly' THEN '🇱🇾'
    WHEN 'ma' THEN '🇲🇦' WHEN 'tn' THEN '🇹🇳' WHEN 'dz' THEN '🇩🇿'
    WHEN 'ps' THEN '🇵🇸' WHEN 'qa' THEN '🇶🇦' WHEN 'ye' THEN '🇾🇪'
    WHEN 'sy' THEN '🇸🇾' WHEN 'sd' THEN '🇸🇩' WHEN 'so' THEN '🇸🇴'
    WHEN 'mr' THEN '🇲🇷' WHEN 'km' THEN '🇰🇲' WHEN 'dj' THEN '🇩🇯'
    WHEN 'bh' THEN '🇧🇭' WHEN 'tr' THEN '🇹🇷'
    ELSE '🌍'
  END,
  map_center_lat = CASE code
    WHEN 'om' THEN 21.4735 WHEN 'sa' THEN 24.7136 WHEN 'ae' THEN 25.2048
    WHEN 'eg' THEN 30.0444 WHEN 'iq' THEN 33.3152 WHEN 'jo' THEN 31.9454
    WHEN 'kw' THEN 29.3759 WHEN 'lb' THEN 33.8938 WHEN 'ly' THEN 32.9022
    WHEN 'ma' THEN 31.7917 WHEN 'tn' THEN 36.8065 WHEN 'dz' THEN 36.7538
    WHEN 'ps' THEN 31.9522 WHEN 'qa' THEN 25.2854 WHEN 'ye' THEN 15.3694
    WHEN 'sy' THEN 33.5138 WHEN 'sd' THEN 15.5007 WHEN 'so' THEN 2.0469
    WHEN 'mr' THEN 18.0858 WHEN 'km' THEN -11.7172 WHEN 'dj' THEN 11.5721
    WHEN 'bh' THEN 26.0667 WHEN 'tr' THEN 39.9334
    ELSE 21.4735
  END,
  map_center_lng = CASE code
    WHEN 'om' THEN 55.9761 WHEN 'sa' THEN 46.6753 WHEN 'ae' THEN 55.2708
    WHEN 'eg' THEN 31.2357 WHEN 'iq' THEN 44.3661 WHEN 'jo' THEN 35.9284
    WHEN 'kw' THEN 47.9774 WHEN 'lb' THEN 35.5131 WHEN 'ly' THEN 13.1875
    WHEN 'ma' THEN -7.5898 WHEN 'tn' THEN 10.1815 WHEN 'dz' THEN 3.0588
    WHEN 'ps' THEN 35.2034 WHEN 'qa' THEN 51.1846 WHEN 'ye' THEN 44.191
    WHEN 'sy' THEN 36.2765 WHEN 'sd' THEN 30.2176 WHEN 'so' THEN 45.2049
    WHEN 'mr' THEN -15.9582 WHEN 'km' THEN 43.2433 WHEN 'dj' THEN 43.1456
    WHEN 'bh' THEN 50.5577 WHEN 'tr' THEN 32.8597
    ELSE 55.9761
  END,
  default_zoom = 12,
  publications_enabled = true,
  measurement_system = 'metric'
WHERE map_center_lat IS NULL;
