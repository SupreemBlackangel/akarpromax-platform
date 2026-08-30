import { pgTable, text, integer, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { users } from '../schema';
import { properties } from './properties-schema';

/**
 * Ad *campaigns* and *creatives* are owned entirely by the raw-SQL system
 * (lib/ad-schema.ts, text ids), served by lib/ads/engine.ts. They were once
 * also declared here as drizzle pgTables with uuid ids — a second, incompatible
 * definition of the same physical `ad_campaigns` / `ad_creatives` tables. That
 * duplicate has been removed so drizzle never reconciles the same table name to
 * a conflicting shape. This file now owns only the tables that are genuinely
 * drizzle-managed: analytics events, the news ticker, and featured properties.
 */

export const adAnalytics = pgTable('ad_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Campaign/creative ids come from the raw-SQL system, so these are plain
  // columns, not foreign keys into a drizzle-owned table.
  campaignId: uuid('campaign_id'),
  creativeId: uuid('creative_id'),
  eventType: text('event_type').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  ip: text('ip'),
  page: text('page'),
  placement: text('placement'),
  country: text('country'),
  governorate: text('governorate'),
  city: text('city'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsTickerItems = pgTable('news_ticker_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageAr: text('message_ar').notNull(),
  messageEn: text('message_en'),
  messageTr: text('message_tr'),
  pageTargeting: jsonb('page_targeting').default({}),
  geoTargeting: jsonb('geo_targeting').default({}),
  speed: text('speed').default('medium'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const featuredProperties = pgTable('featured_properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  durationDays: integer('duration_days').default(30),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  priority: integer('priority').default(5),
  geoTargeting: jsonb('geo_targeting').default({}),
  status: text('status').default('active'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
