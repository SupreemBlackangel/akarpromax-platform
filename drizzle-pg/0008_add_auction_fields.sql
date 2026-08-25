ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "is_auction" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_type" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_status" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_start_price" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_current_price" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_bid_increment" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_min_bid" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_max_bid" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_end_date" timestamp;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_winner_id" uuid;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_winning_price" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_bid_count" integer DEFAULT 0;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_terms_accepted" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_contract_url" text;
CREATE INDEX IF NOT EXISTS "properties_auction_idx" ON "properties" ("is_auction", "auction_status");
CREATE INDEX IF NOT EXISTS "properties_auction_end_idx" ON "properties" ("auction_end_date");
CREATE TABLE IF NOT EXISTS "auction_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"bidder_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"is_auto_bid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auction_bids_property_id_idx" ON "auction_bids" ("property_id");
CREATE INDEX IF NOT EXISTS "auction_bids_bidder_id_idx" ON "auction_bids" ("bidder_id");
