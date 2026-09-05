-- AKARPROMAX FORWARD MIGRATION 0012
-- SERVICE TIMESTAMPS — eleven `_at` columns were text, and one of them broke
-- an admin action in production.
--
-- Reproduced on the live runtime, not inferred. An admin resolving a report:
--
--   POST /api/service-reports/<id>/resolve   ->  500 (empty body)
--   log: 42P08 "inconsistent types deduced for parameter $3:
--                text versus timestamp without time zone"
--
-- resolveReport() runs
--   UPDATE service_reports SET ... resolved_at = ?3, updated_at = ?3 ...
-- binding one parameter to both columns. That is fine when both are the same
-- type -- acceptOfferFlow reuses a parameter across three timestamps and works.
-- It fails here because resolved_at is TEXT while updated_at is TIMESTAMP, so
-- Postgres cannot deduce a single type for $3 and aborts the whole request.
--
-- The drift is wider than the one column that surfaced. Across the services
-- schema, eleven `_at` columns are text where their siblings (created_at,
-- updated_at) are timestamp. They mostly pass unnoticed because the app binds
-- nowMySqlDateTime() strings to them, but any query that shares a parameter
-- between one of them and a real timestamp is the same latent 500. This aligns
-- all eleven with the type the Drizzle schema declares.
--
-- Idempotent and non-destructive: each column is converted ONLY if it is still
-- text, and NULLIF(col,'') maps the empty strings some rows hold to NULL rather
-- than failing the cast. Existing datetime strings are in nowMySqlDateTime
-- form ('YYYY-MM-DD HH:MM:SS'), which casts to timestamp directly. No row is
-- deleted and no column is dropped.

DO $$
DECLARE
  target text;
  cols text[][] := ARRAY[
    ['service_listings','approved_at'],
    ['service_listings','published_at'],
    ['service_messages','read_at'],
    ['service_notifications','read_at'],
    ['service_outbox_events','processed_at'],
    ['service_provider_documents','verified_at'],
    ['service_provider_profiles','approved_at'],
    ['service_provider_profiles','suspended_at'],
    ['service_provider_profiles','verified_at'],
    ['service_reports','resolved_at'],
    ['service_request_matches','contacted_at']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(cols, 1) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = cols[i][1]
        AND column_name = cols[i][2]
        AND data_type = 'text'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamp USING NULLIF(%I, '''')::timestamp',
        cols[i][1], cols[i][2], cols[i][2]
      );
      RAISE NOTICE '0012: %.% converted text -> timestamp', cols[i][1], cols[i][2];
    END IF;
  END LOOP;
END
$$;
