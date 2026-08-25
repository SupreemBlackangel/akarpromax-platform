import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { users } from '../schema';
import { properties } from './properties-schema';

export const adCampaigns = pgTable('ad_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: text('status').default('draft'),
  priority: integer('priority').default(5),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  maxViews: integer('max_views'),
  maxClicks: integer('max_clicks'),
  targeting: jsonb('targeting').default({}),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const adCreatives = pgTable('ad_creatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => adCampaigns.id, { onDelete: 'cascade' }),
  language: text('language').default('ar'),
  title: text('title'),
  description: text('description'),
  cta: text('cta'),
  url: text('url'),
  imageUrl: text('image_url'),
  imageAlt: text('image_alt'),
  videoUrl: text('video_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const adAnalytics = pgTable('ad_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => adCampaigns.id, { onDelete: 'cascade' }),
  creativeId: uuid('creative_id').references(() => adCreatives.id, { onDelete: 'set null' }),
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
