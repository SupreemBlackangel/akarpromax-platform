/**
 * LEGACY / OWNER-DEFERRED — NOT CANONICAL SERVICES PERSISTENCE.
 *
 * This is the older parallel Drizzle/pg services model. The canonical Services
 * Marketplace store is `lib/services-schema.ts` + `lib/services-marketplace-schema.ts`,
 * owned by `lib/services/marketplace.ts` / `lib/services/core.ts`. The table names
 * below (service_categories / service_requests / service_offers / service_reviews)
 * collide with the canonical tables but declare incompatible columns.
 *
 * L1C-0 removed every active API persistence path from this module. Kept in source
 * for product archaeology only; do not re-import it from an active route or domain
 * service (guarded by tests/services-architecture-legacy-guard.test.mjs).
 */

import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en'),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  description: text('description'),
  parentId: uuid('parent_id'),
  order: integer('order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const serviceProviders = pgTable('service_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  bio: text('bio'),
  categoryId: uuid('category_id').references(() => serviceCategories.id),
  country: text('country'),
  governorate: text('governorate'),
  city: text('city'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  radius: integer('radius').default(50),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  status: text('status').default('draft'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  ratingCount: integer('rating_count').default(0),
  jobsCompleted: integer('jobs_completed').default(0),
  responseRate: decimal('response_rate', { precision: 5, scale: 2 }).default('0'),
  isVerified: boolean('is_verified').default(false),
  isTopRated: boolean('is_top_rated').default(false),
  workingHours: jsonb('working_hours'),
  availability: boolean('availability').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => serviceCategories.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  urgency: text('urgency').default('normal'),
  country: text('country').notNull(),
  governorate: text('governorate').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  radius: integer('radius').default(50),
  budget: decimal('budget', { precision: 15, scale: 2 }),
  preferredDate: timestamp('preferred_date'),
  status: text('status').default('published'),
  matchedAt: timestamp('matched_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const serviceOffers = pgTable('service_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => serviceRequests.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').references(() => serviceProviders.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 15, scale: 2 }),
  message: text('message').notNull(),
  duration: integer('duration'),
  status: text('status').default('pending'),
  viewedAt: timestamp('viewed_at'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const serviceJobs = pgTable('service_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => serviceRequests.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').references(() => serviceProviders.id, { onDelete: 'cascade' }),
  offerId: uuid('offer_id').references(() => serviceOffers.id),
  status: text('status').default('assigned'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const serviceReviews = pgTable('service_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => serviceJobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').references(() => serviceProviders.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  quality: integer('quality'),
  punctuality: integer('punctuality'),
  communication: integer('communication'),
  value: integer('value'),
  recommend: boolean('recommend'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const servicePortfolio = pgTable('service_portfolio', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').references(() => serviceProviders.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  image: text('image'),
  category: text('category'),
  city: text('city'),
  year: integer('year'),
  tags: jsonb('tags'),
  isFeatured: boolean('is_featured').default(false),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
