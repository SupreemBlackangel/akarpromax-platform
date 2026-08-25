-- AkarProMax Auctions F3 - immutable contract document + party acceptance trail

ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_html" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_hash" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_mime" text NOT NULL DEFAULT 'text/html; charset=utf-8';
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_filename" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "seller_signed_at" timestamp;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "buyer_signed_at" timestamp;

CREATE TABLE IF NOT EXISTS "auction_contract_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "party_role" text NOT NULL,
  "contract_hash" text NOT NULL,
  "signature_hash" text NOT NULL,
  "signed_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_contract_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_contract_fk"
      FOREIGN KEY ("contract_id") REFERENCES "auction_contracts"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_property_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_user_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_user_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_role_ck') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_role_ck"
      CHECK ("party_role" IN ('seller','buyer'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "auction_contract_signatures_party_uidx"
  ON "auction_contract_signatures" ("contract_id", "user_id", "party_role");
CREATE INDEX IF NOT EXISTS "auction_contract_signatures_contract_idx"
  ON "auction_contract_signatures" ("contract_id", "signed_at");
CREATE INDEX IF NOT EXISTS "auction_contract_signatures_user_idx"
  ON "auction_contract_signatures" ("user_id");
