-- AKARPROMAX FORWARD MIGRATION 0002 — CURRENCY REGISTRY: ADD ILS
--
-- Owner-binding correction: ILS is an ACTIVE PRICING CURRENCY (the 25th).
-- Publishers may price a listing in ILS — notably in the Palestinian market.
-- This is pricing capability only: PS's official-currency metadata stays null,
-- because country official-currency metadata != allowed pricing currencies.
--
-- Scope: ONE idempotent upsert into `currencies`, following the 0000 seed
-- conventions. No FX value is introduced into active product behaviour
-- (exchange_rate_to_usd keeps its schema default and is never read).
-- No changes to users, no L1B identity changes, no DROP/DELETE/TRUNCATE.
-- 0000 and 0001 are untouched.

INSERT INTO currencies (id, code, symbol, name_ar, name_en, name_tr, is_active, is_default, display_order)
VALUES
  ('ILS', 'ILS', '₪', 'شيكل إسرائيلي جديد', 'Israeli New Shekel', 'İsrail Yeni Şekeli', true, false, 65)
ON CONFLICT (code) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  name_tr = COALESCE(EXCLUDED.name_tr, currencies.name_tr),
  is_active = true,
  is_default = false,
  display_order = EXCLUDED.display_order,
  updated_at = now();
