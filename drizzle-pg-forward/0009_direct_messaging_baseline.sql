-- AKARPROMAX FORWARD MIGRATION 0009
-- DIRECT MESSAGING — the tables /api/messages has always queried.
--
-- Found in the production log alongside the leads failure:
--
--   Failed query: select "thread_id" from "message_participants"
--                 where user_id = $1 and is_active = $2
--
-- None of message_threads, message_participants or messages exists. They are
-- defined in lib/db/schemas/messages-schema.ts and created by
-- drizzle-pg/0004_add_new_tables.sql, but drizzle-pg is an abandoned lineage;
-- the deployed truth is drizzle-pg-forward, and no migration in it ever created
-- them.
--
-- This is not a dead endpoint. /api/messages is called from the user's inbox
-- (app/messages), from a conversation (app/messages/[id]), from "contact this
-- office" (app/offices/[id]) and from "contact about this property"
-- (app/properties/[id]) -- the two routes by which an interested buyer reaches
-- a seller. Every one of them has been failing.
--
-- Note this is a SECOND messaging stack. service_message_threads,
-- service_message_participants and service_messages exist and are used by the
-- services marketplace. Consolidating the two is a piece of work in its own
-- right and is deliberately not attempted here: the immediate defect is that
-- a live, user-facing feature queries tables that were never created.
--
-- CREATE only. Nothing here alters or removes an existing row or column.

CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  title text,
  context text NOT NULL,
  context_id uuid,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at timestamp,
  is_archived boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS message_threads_context_idx ON message_threads (context, context_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS message_threads_last_message_at_idx ON message_threads (last_message_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS message_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamp,
  is_active boolean DEFAULT true,
  joined_at timestamp DEFAULT now()
);
--> statement-breakpoint
-- The exact shape of the query that was failing: user_id together with
-- is_active, to find every thread a person is in.
CREATE INDEX IF NOT EXISTS message_participants_user_active_idx
  ON message_participants (user_id, is_active);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS message_participants_thread_idx ON message_participants (thread_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text DEFAULT 'text',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
-- A conversation is read newest-last by thread; this is the only access path.
CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON messages (thread_id, created_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL,
  size integer,
  name text,
  mime_type text,
  created_at timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS message_attachments_message_idx ON message_attachments (message_id);
