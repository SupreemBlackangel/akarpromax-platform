CREATE TABLE `ad_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`url` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`media_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ad_assets_object_key_unique` ON `ad_assets` (`object_key`);--> statement-breakpoint
CREATE INDEX `ad_assets_media_created_idx` ON `ad_assets` (`media_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `ad_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`internal_name` text NOT NULL,
	`advertiser_name` text NOT NULL,
	`campaign_type` text DEFAULT 'platform' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`media_type` text DEFAULT 'image' NOT NULL,
	`media_url` text NOT NULL,
	`mobile_media_url` text,
	`poster_url` text,
	`eyebrow_ar` text NOT NULL,
	`eyebrow_en` text NOT NULL,
	`eyebrow_tr` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`title_tr` text NOT NULL,
	`accent_ar` text NOT NULL,
	`accent_en` text NOT NULL,
	`accent_tr` text NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`description_tr` text NOT NULL,
	`cta_ar` text NOT NULL,
	`cta_en` text NOT NULL,
	`cta_tr` text NOT NULL,
	`target_url` text NOT NULL,
	`countries` text DEFAULT '[]' NOT NULL,
	`cities` text DEFAULT '[]' NOT NULL,
	`languages` text DEFAULT '["ar","en","tr"]' NOT NULL,
	`devices` text DEFAULT '["desktop","mobile"]' NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`weight` integer DEFAULT 100 NOT NULL,
	`start_at` text,
	`end_at` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ad_campaigns_status_dates_idx` ON `ad_campaigns` (`status`,`start_at`,`end_at`);--> statement-breakpoint
CREATE INDEX `ad_campaigns_priority_idx` ON `ad_campaigns` (`priority`,`updated_at`);--> statement-breakpoint
CREATE TABLE `ad_events` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`event_type` text NOT NULL,
	`country_code` text NOT NULL,
	`city_id` text,
	`locale` text NOT NULL,
	`device` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ad_events_campaign_type_idx` ON `ad_events` (`campaign_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `ad_events_country_date_idx` ON `ad_events` (`country_code`,`occurred_at`);