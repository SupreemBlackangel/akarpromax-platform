-- How a visitor reaches the advertiser: the platform chat thread (default, the
-- behaviour every existing listing already had) or WhatsApp.
--
-- The office picks the method once in the desktop control panel
-- (office_profiles.contact_method); the bridge stamps it onto every listing that
-- office publishes. A listing added on the web carries its own choice.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS contact_method text NOT NULL DEFAULT 'chat';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contact_whatsapp text;

ALTER TABLE office_profiles ADD COLUMN IF NOT EXISTS contact_method text NOT NULL DEFAULT 'chat';
