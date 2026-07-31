CREATE TABLE `ad_assets` (
	`id` varchar(36) NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`content_type` varchar(128) NOT NULL,
	`media_type` varchar(32) NOT NULL,
	`size_bytes` int NOT NULL,
	`uploaded_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `ad_assets_object_key_unique` UNIQUE(`object_key`)
);
--> statement-breakpoint
CREATE TABLE `ad_campaigns` (
	`id` varchar(36) NOT NULL,
	`internal_name` varchar(190) NOT NULL,
	`advertiser_name` varchar(190) NOT NULL,
	`campaign_type` varchar(32) NOT NULL DEFAULT 'platform',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`media_type` varchar(32) NOT NULL DEFAULT 'image',
	`media_url` varchar(1024) NOT NULL,
	`mobile_media_url` varchar(1024),
	`poster_url` varchar(1024),
	`eyebrow_ar` varchar(190) NOT NULL,
	`eyebrow_en` varchar(190) NOT NULL,
	`eyebrow_tr` varchar(190) NOT NULL,
	`title_ar` varchar(255) NOT NULL,
	`title_en` varchar(255) NOT NULL,
	`title_tr` varchar(255) NOT NULL,
	`accent_ar` varchar(190) NOT NULL,
	`accent_en` varchar(190) NOT NULL,
	`accent_tr` varchar(190) NOT NULL,
	`description_ar` longtext NOT NULL,
	`description_en` longtext NOT NULL,
	`description_tr` longtext NOT NULL,
	`cta_ar` varchar(190) NOT NULL,
	`cta_en` varchar(190) NOT NULL,
	`cta_tr` varchar(190) NOT NULL,
	`target_url` varchar(1024) NOT NULL,
	`countries` text NOT NULL DEFAULT ('[]'),
	`cities` text NOT NULL DEFAULT ('[]'),
	`languages` text NOT NULL DEFAULT ('["ar","en","tr"]'),
	`devices` text NOT NULL DEFAULT ('["desktop","mobile"]'),
	`priority` int NOT NULL DEFAULT 100,
	`weight` int NOT NULL DEFAULT 100,
	`start_at` timestamp,
	`end_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ad_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ad_creatives` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`media_type` varchar(32) NOT NULL,
	`media_url` varchar(1024) NOT NULL,
	`mobile_media_url` varchar(1024),
	`poster_url` varchar(1024),
	`position` int NOT NULL DEFAULT 1,
	`duration_seconds` int NOT NULL DEFAULT 6,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_creatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ad_events` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`event_type` varchar(32) NOT NULL,
	`country_code` varchar(8) NOT NULL,
	`city_id` varchar(36),
	`locale` varchar(16) NOT NULL,
	`device` varchar(32) NOT NULL,
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` varchar(36),
	`metadata` text NOT NULL DEFAULT ('{}'),
	`ip_address` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `office_links` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`office_id` varchar(36),
	`device_id` varchar(128),
	`license_key` varchar(128) NOT NULL,
	`application_version` varchar(32),
	`last_sync_at` timestamp,
	`last_ip` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`activated_at` timestamp,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `office_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `office_links_license_key_unique` UNIQUE(`license_key`)
);
--> statement-breakpoint
CREATE TABLE `policy_documents` (
	`id` varchar(36) NOT NULL,
	`scope` varchar(8) NOT NULL DEFAULT 'OM',
	`type` varchar(64) NOT NULL,
	`version` varchar(32) NOT NULL,
	`title_ar` varchar(190) NOT NULL,
	`body_ar` longtext NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`published_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `policy_scope_type_version_unique` UNIQUE(`scope`,`type`,`version`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`name_ar` varchar(100) NOT NULL,
	`name_en` varchar(100) NOT NULL,
	`permissions` text NOT NULL DEFAULT ('[]'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_access` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`display_name` varchar(190),
	`role` varchar(32) NOT NULL DEFAULT 'viewer',
	`country_code` varchar(8),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_access_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_activity_logs` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` varchar(36),
	`old_values` text,
	`new_values` text,
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsor_activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_branches` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`name_ar` varchar(190) NOT NULL,
	`name_en` varchar(190) NOT NULL,
	`country_code` varchar(8) NOT NULL,
	`city_id` varchar(36) NOT NULL,
	`district_id` varchar(36),
	`governorate` varchar(190),
	`village` varchar(190),
	`street` varchar(255),
	`address_ar` varchar(512),
	`address_en` varchar(512),
	`phone` varchar(32),
	`email` varchar(255),
	`lat` varchar(32),
	`lng` varchar(32),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_contracts` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`contract_number` varchar(64) NOT NULL,
	`title_ar` varchar(190) NOT NULL,
	`title_en` varchar(190) NOT NULL,
	`file_url` varchar(1024),
	`signed_at` timestamp,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`value` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'OMR',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`notes` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_contracts_number_unique` UNIQUE(`contract_number`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_documents` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`type` varchar(64) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(1024) NOT NULL,
	`file_size` int NOT NULL DEFAULT 0,
	`mime_type` varchar(128) NOT NULL,
	`notes` text,
	`uploaded_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsor_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_events` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`country_code` varchar(8) NOT NULL,
	`placement` varchar(32) NOT NULL,
	`event_type` varchar(32) NOT NULL,
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsor_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_invoices` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`invoice_number` varchar(64) NOT NULL,
	`subscription_id` varchar(36),
	`contract_id` varchar(36),
	`amount` int NOT NULL DEFAULT 0,
	`tax_amount` int NOT NULL DEFAULT 0,
	`total_amount` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'OMR',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`due_date` timestamp NOT NULL,
	`paid_at` timestamp,
	`file_url` varchar(1024),
	`notes` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_invoices_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_payments` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`subscription_id` varchar(36),
	`invoice_id` varchar(36),
	`amount` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'OMR',
	`method` varchar(32) NOT NULL,
	`reference_number` varchar(128),
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`paid_at` timestamp,
	`notes` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsor_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_plans` (
	`id` varchar(36) NOT NULL,
	`name_ar` varchar(190) NOT NULL,
	`name_en` varchar(190) NOT NULL,
	`code` varchar(64) NOT NULL,
	`price_monthly` int NOT NULL DEFAULT 0,
	`price_yearly` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'OMR',
	`max_branches` int NOT NULL DEFAULT 0,
	`max_users` int NOT NULL DEFAULT 0,
	`max_properties` int NOT NULL DEFAULT 0,
	`max_ads` int NOT NULL DEFAULT 0,
	`features` text NOT NULL DEFAULT ('[]'),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsor_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_profiles` (
	`id` varchar(36) NOT NULL,
	`sponsor_code` varchar(64) NOT NULL,
	`company_name_ar` varchar(190) NOT NULL,
	`company_name_en` varchar(190) NOT NULL,
	`logo_url` varchar(512),
	`cover_url` varchar(512),
	`commercial_registration` varchar(64),
	`tax_number` varchar(64),
	`country_code` varchar(8) NOT NULL DEFAULT 'OM',
	`city_id` varchar(36),
	`district_id` varchar(36),
	`governorate` varchar(190),
	`village` varchar(190),
	`street` varchar(255),
	`address_ar` varchar(512),
	`address_en` varchar(512),
	`contact_name` varchar(190),
	`email` varchar(255),
	`phone` varchar(32),
	`website` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`verified_at` timestamp,
	`approved_at` timestamp,
	`suspended_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_profiles_code_unique` UNIQUE(`sponsor_code`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_subscriptions` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'trial',
	`auto_renew` boolean NOT NULL DEFAULT true,
	`payment_method` varchar(32),
	`notes` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_users` (
	`id` varchar(36) NOT NULL,
	`sponsor_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(255) NOT NULL,
	`display_name` varchar(190),
	`role` varchar(32) NOT NULL DEFAULT 'viewer',
	`phone` varchar(32),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsor_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_users_email_unique` UNIQUE(`sponsor_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` varchar(36) NOT NULL,
	`country_code` varchar(8) NOT NULL,
	`name_ar` varchar(190) NOT NULL,
	`name_en` varchar(190) NOT NULL,
	`name_tr` varchar(190) NOT NULL,
	`tier` varchar(32) NOT NULL DEFAULT 'exclusive',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`website_url` varchar(255),
	`logo_url` varchar(512),
	`banner_url` varchar(512) NOT NULL DEFAULT '/sponsors/arab-blue.webp',
	`contact_name` varchar(190),
	`contact_email` varchar(255),
	`contact_phone` varchar(32),
	`placements` text NOT NULL DEFAULT ('["header","content","footer"]'),
	`start_at` timestamp,
	`end_at` timestamp,
	`priority` int NOT NULL DEFAULT 100,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`full_name` varchar(190) NOT NULL,
	`role_id` varchar(36) NOT NULL DEFAULT 'member',
	`status` varchar(32) NOT NULL DEFAULT 'pending_verification',
	`country_code` varchar(8) NOT NULL DEFAULT 'OM',
	`city` varchar(190),
	`email_verified_at` timestamp,
	`phone_verified_at` timestamp,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `verification_challenges` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`channel` varchar(16) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ad_assets_media_created_idx` ON `ad_assets` (`media_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `ad_campaigns_status_dates_idx` ON `ad_campaigns` (`status`,`start_at`,`end_at`);--> statement-breakpoint
CREATE INDEX `ad_campaigns_priority_idx` ON `ad_campaigns` (`priority`,`updated_at`);--> statement-breakpoint
CREATE INDEX `ad_creatives_campaign_position_idx` ON `ad_creatives` (`campaign_id`,`position`);--> statement-breakpoint
CREATE INDEX `ad_events_campaign_type_idx` ON `ad_events` (`campaign_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `ad_events_country_date_idx` ON `ad_events` (`country_code`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `office_links_sponsor_idx` ON `office_links` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sponsor_access_role_country_idx` ON `sponsor_access` (`role`,`country_code`);--> statement-breakpoint
CREATE INDEX `sponsor_activity_sponsor_idx` ON `sponsor_activity_logs` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_activity_action_idx` ON `sponsor_activity_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `sponsor_branches_sponsor_idx` ON `sponsor_branches` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_branches_location_idx` ON `sponsor_branches` (`country_code`,`city_id`);--> statement-breakpoint
CREATE INDEX `sponsor_contracts_sponsor_idx` ON `sponsor_contracts` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_documents_sponsor_idx` ON `sponsor_documents` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_documents_type_idx` ON `sponsor_documents` (`sponsor_id`,`type`);--> statement-breakpoint
CREATE INDEX `sponsor_events_sponsor_type_idx` ON `sponsor_events` (`sponsor_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `sponsor_events_country_date_idx` ON `sponsor_events` (`country_code`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `sponsor_invoices_sponsor_idx` ON `sponsor_invoices` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_payments_sponsor_idx` ON `sponsor_payments` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_payments_status_idx` ON `sponsor_payments` (`status`,`paid_at`);--> statement-breakpoint
CREATE INDEX `sponsor_profiles_country_status_idx` ON `sponsor_profiles` (`country_code`,`status`);--> statement-breakpoint
CREATE INDEX `sponsor_subscriptions_sponsor_idx` ON `sponsor_subscriptions` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsor_subscriptions_dates_idx` ON `sponsor_subscriptions` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `sponsor_users_sponsor_idx` ON `sponsor_users` (`sponsor_id`);--> statement-breakpoint
CREATE INDEX `sponsors_country_status_priority_idx` ON `sponsors` (`country_code`,`status`,`priority`);--> statement-breakpoint
CREATE INDEX `sponsors_campaign_dates_idx` ON `sponsors` (`start_at`,`end_at`);--> statement-breakpoint
CREATE INDEX `users_status_role_idx` ON `users` (`status`,`role_id`);--> statement-breakpoint
CREATE INDEX `verification_user_purpose_idx` ON `verification_challenges` (`user_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `verification_expiry_idx` ON `verification_challenges` (`expires_at`);