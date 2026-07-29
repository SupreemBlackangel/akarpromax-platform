CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`ip_address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `policy_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text DEFAULT 'OM' NOT NULL,
	`type` text NOT NULL,
	`version` text NOT NULL,
	`title_ar` text NOT NULL,
	`body_ar` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_scope_type_version_unique` ON `policy_documents` (`scope`,`type`,`version`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sponsor_access` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`country_code` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sponsor_access_email_unique` ON `sponsor_access` (`email`);--> statement-breakpoint
CREATE INDEX `sponsor_access_role_country_idx` ON `sponsor_access` (`role`,`country_code`);--> statement-breakpoint
CREATE TABLE `sponsor_events` (
	`id` text PRIMARY KEY NOT NULL,
	`sponsor_id` text NOT NULL,
	`country_code` text NOT NULL,
	`placement` text NOT NULL,
	`event_type` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sponsor_events_sponsor_type_idx` ON `sponsor_events` (`sponsor_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `sponsor_events_country_date_idx` ON `sponsor_events` (`country_code`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`name_tr` text NOT NULL,
	`tier` text DEFAULT 'exclusive' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`website_url` text,
	`logo_url` text,
	`banner_url` text DEFAULT '/sponsors/arab-blue.webp' NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`placements` text DEFAULT '["header","content","footer"]' NOT NULL,
	`start_at` text,
	`end_at` text,
	`priority` integer DEFAULT 100 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sponsors_country_status_priority_idx` ON `sponsors` (`country_code`,`status`,`priority`);--> statement-breakpoint
CREATE INDEX `sponsors_campaign_dates_idx` ON `sponsors` (`start_at`,`end_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role_id` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending_verification' NOT NULL,
	`country_code` text DEFAULT 'OM' NOT NULL,
	`city` text,
	`email_verified_at` text,
	`phone_verified_at` text,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `users_status_role_idx` ON `users` (`status`,`role_id`);--> statement-breakpoint
CREATE TABLE `verification_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`channel` text NOT NULL,
	`destination` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_user_purpose_idx` ON `verification_challenges` (`user_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `verification_expiry_idx` ON `verification_challenges` (`expires_at`);