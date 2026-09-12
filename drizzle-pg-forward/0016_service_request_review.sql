-- AKARPROMAX FORWARD MIGRATION 0016
-- SERVICE REQUEST REVIEW — the platform could not answer a customer's request.
--
-- The marketplace was built as a customer-driven RFQ: publishing runs the
-- matching engine directly, and that is the whole of it. There is no way for
-- the platform to accept a request, refuse one, ask the customer for something
-- missing, put a member of staff on it, or close it when it is done — not in
-- the API, not in the admin screens, and not in the table. A supervisor holding
-- SERVICE_REQUESTS_MANAGE_ALL could not even cancel an abusive request, because
-- the only cancel path refuses anyone who is not the customer.
--
-- The review track is deliberately a SEPARATE column from `status`.
--
-- `status` is the customer's lifecycle — draft, published, receiving_offers,
-- offer_selected, completed — and it already carries three legacy values
-- (open/offered/ordered) from an earlier design. Folding an administrative
-- verdict into that vocabulary would make every existing guard ambiguous:
-- "published" would no longer tell you whether anyone had looked at it. The two
-- questions are genuinely different — "where is this request in its life" and
-- "what has the platform decided about it" — and they are answered by two
-- columns.
--
-- Non-destructive and idempotent. Every existing request becomes `pending`,
-- which is the truth: nobody has reviewed any of them.

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamp;
-- Why it was refused, or what the customer is being asked for. Belongs to the
-- current verdict only; the history of all of them is in audit_logs and in
-- service_request_status_history.
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS review_note text;
-- The member of staff following this request up. Free text, holding the same
-- account identifier the rest of the services schema uses.
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_at timestamp;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS closed_at timestamp;

-- The queue is read by review state, newest first.
CREATE INDEX IF NOT EXISTS service_requests_review_status_created_idx
  ON service_requests (review_status, created_at DESC);
-- "What is on my desk" is the other question this screen asks.
CREATE INDEX IF NOT EXISTS service_requests_assigned_to_idx
  ON service_requests (assigned_to);
