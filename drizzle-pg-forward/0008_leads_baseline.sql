-- AKARPROMAX FORWARD MIGRATION 0008
-- LEADS — the table the website contact form has always written to.
--
-- Found in the production log, three times, with a real visitor's name, phone
-- and email in the parameters:
--
--   Failed query: insert into "leads" (...) values (...)
--
-- `leads` does not exist. It is defined in lib/db/schemas/leads-schema.ts and
-- created by drizzle-pg/0005_add_leads_and_land.sql, but drizzle-pg is an
-- abandoned lineage; the deployed truth is drizzle-pg-forward, and no migration
-- in it has ever created this table.
--
-- app/api/contact/route.ts has no catch around the insert, so every submission
-- answered 500 with an empty body. Reproduced against production before writing
-- this. Every message a visitor sent through the contact form was lost, and
-- nothing anywhere said so.
--
-- CREATE only. Nothing here alters or removes an existing row or column.

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  source text DEFAULT 'website' NOT NULL,
  type text DEFAULT 'property_inquiry' NOT NULL,
  status text DEFAULT 'new' NOT NULL,
  priority text DEFAULT 'normal',
  subject text NOT NULL,
  description text,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_whatsapp text,
  user_id uuid,
  property_id uuid,
  service_request_id uuid,
  assigned_to uuid,
  assigned_at timestamp,
  responded_at timestamp,
  converted_at timestamp,
  lost_at timestamp,
  lost_reason text,
  score integer DEFAULT 0,
  tags jsonb,
  metadata jsonb,
  country text,
  governorate text,
  city text,
  budget numeric(15, 2),
  preferred_date timestamp,
  expires_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint

-- The columns every list and filter in lib/services/leads/lead.service.ts
-- actually reads. There are no rows yet, so these cost nothing to add now and
-- would cost a lock later.
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads (assigned_to);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lead_activities_lead_id_idx ON lead_activities (lead_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL,
  assigned_by uuid,
  notes text,
  status text DEFAULT 'active',
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lead_assignments_lead_id_idx ON lead_assignments (lead_id);
