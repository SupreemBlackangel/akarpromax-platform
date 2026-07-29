CREATE TABLE `ad_creatives` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`media_type` text NOT NULL,
	`media_url` text NOT NULL,
	`mobile_media_url` text,
	`poster_url` text,
	`position` integer DEFAULT 1 NOT NULL,
	`duration_seconds` integer DEFAULT 6 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ad_creatives_campaign_position_idx` ON `ad_creatives` (`campaign_id`,`position`);