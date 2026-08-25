import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';
import { sql } from 'drizzle-orm';

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
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
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  address: text('address'),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('SAR'),
  area: decimal('area', { precision: 10, scale: 2 }).notNull(),
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
  isAuction: boolean('is_auction').default(false),
  auctionType: text('auction_type'),
  auctionStatus: text('auction_status'),
  auctionStartPrice: decimal('auction_start_price', { precision: 15, scale: 2 }),
  auctionCurrentPrice: decimal('auction_current_price', { precision: 15, scale: 2 }),
  auctionBidIncrement: decimal('auction_bid_increment', { precision: 15, scale: 2 }),
  auctionMinBid: decimal('auction_min_bid', { precision: 15, scale: 2 }),
  auctionMaxBid: decimal('auction_max_bid', { precision: 15, scale: 2 }),
  auctionEndDate: timestamp('auction_end_date'),
  auctionWinnerId: uuid('auction_winner_id').references(() => users.id, { onDelete: 'set null' }),
  auctionWinningPrice: decimal('auction_winning_price', { precision: 15, scale: 2 }),
  auctionBidCount: integer('auction_bid_count').default(0),
  auctionTermsAccepted: boolean('auction_terms_accepted').default(false),
  auctionContractUrl: text('auction_contract_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('properties_user_id_idx').on(table.userId),
  officeIdIdx: index('properties_office_id_idx').on(table.officeId),
  statusIdx: index('properties_status_idx').on(table.status),
  dealTypeIdx: index('properties_deal_type_idx').on(table.dealType),
  cityIdx: index('properties_city_idx').on(table.city),
  createdAtIdx: index('properties_created_at_idx').on(table.createdAt),
  auctionIdx: index('properties_auction_idx').on(table.isAuction, table.auctionStatus),
  auctionEndIdx: index('properties_auction_end_idx').on(table.auctionEndDate),
}));

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
}, (table) => ({
  propertyIdIdx: index('property_media_property_id_idx').on(table.propertyId),
}));

export const propertyFavorites = pgTable('property_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdPropertyIdIdx: index('property_favorites_user_property_idx').on(table.userId, table.propertyId),
}));

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
}, (table) => ({
  userIdIdx: index('saved_searches_user_id_idx').on(table.userId),
}));

export const propertyRequests = pgTable('property_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  dealType: text('deal_type').notNull(),
  propertyType: text('property_type').notNull(),
  country: text('country').notNull(),
  governorate: text('governorate').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  budget: decimal('budget', { precision: 15, scale: 2 }),
  area: decimal('area', { precision: 10, scale: 2 }),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  description: text('description'),
  status: text('status').default('active'),
  matchedAt: timestamp('matched_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('property_requests_user_id_idx').on(table.userId),
  statusIdx: index('property_requests_status_idx').on(table.status),
}));

export const propertyRequestOffers = pgTable('property_request_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => propertyRequests.id, { onDelete: 'cascade' }),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'set null' }),
  price: decimal('price', { precision: 15, scale: 2 }),
  message: text('message'),
  status: text('status').default('pending'),
  viewedAt: timestamp('viewed_at'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  requestIdIdx: index('property_offer_request_id_idx').on(table.requestId),
  officeIdIdx: index('property_offer_office_id_idx').on(table.officeId),
}));

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
}, (table) => ({
  propertyIdIdx: index('property_inquiries_property_id_idx').on(table.propertyId),
}));

export const propertyViews = pgTable('property_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  propertyIdIdx: index('property_views_property_id_idx').on(table.propertyId),
}));

export const auctionBids = pgTable('auction_bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  bidderId: uuid('bidder_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  isAutoBid: boolean('is_auto_bid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  propertyIdIdx: index('auction_bids_property_id_idx').on(table.propertyId),
  bidderIdIdx: index('auction_bids_bidder_id_idx').on(table.bidderId),
}));
