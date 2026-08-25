import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { organizations } from './organizations-schema';

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en'),
  descriptionAr: text('description_ar').notNull(),
  descriptionEn: text('description_en'),
  dealType: text('deal_type').notNull(),
  category: text('category').notNull(),
  propertyType: text('property_type').notNull(),
  country: text('country').notNull(),
  governorate: text('governorate').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  latitude: decimal('latitude', 10, 8),
  longitude: decimal('longitude', 11, 8),
  address: text('address'),
  price: decimal('price', 15, 2).notNull(),
  currency: text('currency').default('SAR'),
  area: decimal('area', 10, 2).notNull(),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  floor: integer('floor'),
  totalFloors: integer('total_floors'),
  yearBuilt: integer('year_built'),
  facade: text('facade'),
  direction: text('direction'),
  referenceNumber: text('reference_number'),
  advertisingLicense: text('advertising_license'),
  status: text('status').default('draft'),
  isFeatured: boolean('is_featured').default(false),
  isVerified: boolean('is_verified').default(false),
  rejectedReason: text('rejected_reason'),
  approvedAt: timestamp('approved_at'),
  approvedBy: uuid('approved_by'),
  views: integer('views').default(0),
  inquiries: integer('inquiries').default(0),
  favoritesCount: integer('favorites_count').default(0),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const propertyMedia = pgTable('property_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: text('type').notNull(),
  order: integer('order').default(0),
  isFeatured: boolean('is_featured').default(false),
  altText: text('alt_text'),
  size: integer('size'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const propertyFavorites = pgTable('property_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: jsonb('filters').notNull(),
  notify: boolean('notify').default(true),
  lastNotification: timestamp('last_notification'),
  matchCount: integer('match_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const propertyRequests = pgTable('property_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  dealType: text('deal_type').notNull(),
  propertyType: text('property_type').notNull(),
  country: text('country').notNull(),
  governorate: text('governorate').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  budget: decimal('budget', 15, 2),
  area: decimal('area', 10, 2),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  description: text('description'),
  status: text('status').default('active'),
  matchedAt: timestamp('matched_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const propertyRequestOffers = pgTable('property_request_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => propertyRequests.id, { onDelete: 'cascade' }),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'set null' }),
  price: decimal('price', 15, 2),
  message: text('message'),
  status: text('status').default('pending'),
  viewedAt: timestamp('viewed_at'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const propertyInquiries = pgTable('property_inquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  type: text('type').default('general'),
  status: text('status').default('new'),
  repliedAt: timestamp('replied_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const propertyViews = pgTable('property_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  createdAt: timestamp('created_at').defaultNow(),
});
