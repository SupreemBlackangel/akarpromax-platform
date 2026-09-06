-- AKARPROMAX FORWARD MIGRATION 0013
-- REQUEST WAVES — a published request reaches three craftsmen, not everyone.
--
-- Until now `runMatching` notified EVERY approved provider in the city who
-- covered the category and sat within 10 km. The owner's rule is narrower and
-- is the marketplace's actual promise to a craftsman: a request that reaches
-- you is one of three, not one of fifty, so it is worth answering.
--
--   wave 1  -> the three nearest eligible providers
--   wave 2  -> three others, once all of wave 1 declined or their offers expired
--   wave 3  -> three others, on the same condition
--   after   -> the requester is blocked from opening a new request for a while
--
-- Nothing here drops or rewrites a column. Four additions and one table:
--
--   service_request_matches.wave         which wave notified this provider
--   service_request_matches.declined_at  when they said no (or their offer expired)
--   service_requests.renewal_count       how many times the requester asked for others
--   service_requests.provider_sort       how the requester wants the three chosen
--   service_request_blocks               who may not open a request, and until when
--
-- Existing rows: every match already made belongs to wave 1, which is what the
-- default gives them, and every request has renewal_count 0. So a request that
-- was published before this migration behaves as though its first wave has run
-- — which is true.
--
-- The knobs are per country in service_marketplace_settings, because the admin
-- must be able to change them without a deploy: how many per wave, how many
-- renewals, how long the block lasts, and how long an offer stays valid.

BEGIN;

ALTER TABLE service_request_matches
  ADD COLUMN IF NOT EXISTS wave integer NOT NULL DEFAULT 1;

ALTER TABLE service_request_matches
  ADD COLUMN IF NOT EXISTS declined_at timestamp;

CREATE INDEX IF NOT EXISTS service_request_matches_wave_idx
  ON service_request_matches (request_id, wave);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0;

-- 'nearest' | 'rating' | 'trust'. The requester chooses; 'nearest' is the rule
-- as stated, the other two are the orderings they may prefer.
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS provider_sort varchar(16) NOT NULL DEFAULT 'nearest';

-- A block is a row with an end, not a flag on the user. It expires by itself,
-- an admin can delete it, and it keeps its own reason — so nobody has to guess
-- later why an account could not open a request.
CREATE TABLE IF NOT EXISTS service_request_blocks (
  id varchar(64) PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  blocked_until timestamp NOT NULL,
  reason text,
  request_id varchar(64),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS service_request_blocks_user_idx
  ON service_request_blocks (user_id, blocked_until);

-- The four knobs, per country, with the owner's numbers as the defaults.
ALTER TABLE service_marketplace_settings
  ADD COLUMN IF NOT EXISTS match_wave_size integer NOT NULL DEFAULT 3;

ALTER TABLE service_marketplace_settings
  ADD COLUMN IF NOT EXISTS max_request_renewals integer NOT NULL DEFAULT 2;

ALTER TABLE service_marketplace_settings
  ADD COLUMN IF NOT EXISTS request_block_days integer NOT NULL DEFAULT 30;

ALTER TABLE service_marketplace_settings
  ADD COLUMN IF NOT EXISTS offer_validity_hours integer NOT NULL DEFAULT 48;

COMMIT;
