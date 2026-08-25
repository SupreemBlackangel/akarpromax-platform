import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';
import { properties } from './properties-schema';

export const auctions = pgTable('auctions', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  startingPrice: decimal('starting_price', { precision: 15, scale: 2 }).notNull(),
  currentPrice: decimal('current_price', { precision: 15, scale: 2 }).notNull(),
  bidIncrement: decimal('bid_increment', { precision: 15, scale: 2 }),
  minBid: decimal('min_bid', { precision: 15, scale: 2 }),
  maxBid: decimal('max_bid', { precision: 15, scale: 2 }),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  status: text('status').default('active'),
  winnerId: uuid('winner_id').references(() => users.id, { onDelete: 'set null' }),
  winningPrice: decimal('winning_price', { precision: 15, scale: 2 }),
  isVerified: boolean('is_verified').default(false),
  verifiedBy: uuid('verified_by').references(() => organizations.id, { onDelete: 'set null' }),
  contractUrl: text('contract_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const auctionBids = pgTable('auction_bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  auctionId: uuid('auction_id').references(() => auctions.id, { onDelete: 'cascade' }),
  bidderId: uuid('bidder_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  isAutoBid: boolean('is_auto_bid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auctionParticipants = pgTable(
  'auction_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auctionId: uuid('auction_id')
      .notNull()
      .references(() => auctions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bidAmount: decimal('bid_amount', { precision: 15, scale: 2 }),
    status: text('status').default('pending'),
    joinedAt: timestamp('joined_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    auctionIdx: index('idx_auction_participants_auction').on(table.auctionId),
    userIdx: index('idx_auction_participants_user').on(table.userId),
  })
);

export const auctionTerms = pgTable('auction_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // seller, bidder
  version: text('version').notNull(),
  contentAr: text('content_ar'),
  contentEn: text('content_en'),
  contentTr: text('content_tr'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const auctionTermsAcceptance = pgTable('auction_terms_acceptance', {
  id: uuid('id').primaryKey().defaultRandom(),
  auctionId: uuid('auction_id').references(() => auctions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  termsId: uuid('terms_id').references(() => auctionTerms.id, { onDelete: 'cascade' }),
  acceptedAt: timestamp('accepted_at').defaultNow(),
});

export const engineeringInspections = pgTable('engineering_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  inspectorId: uuid('inspector_id').references(() => users.id, { onDelete: 'set null' }),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
  status: text('status').default('pending'),
  reportUrl: text('report_url'),
  findings: text('findings'),
  recommendation: text('recommendation'),
  inspectedAt: timestamp('inspected_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const valuations = pgTable('valuations', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  valuerId: uuid('valuer_id').references(() => users.id, { onDelete: 'set null' }),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
  estimatedPrice: decimal('estimated_price', { precision: 15, scale: 2 }).notNull(),
  marketPrice: decimal('market_price', { precision: 15, scale: 2 }),
  reportUrl: text('report_url'),
  status: text('status').default('pending'),
  valuedAt: timestamp('valued_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const certifiedProfessionals = pgTable('certified_professionals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  officeId: uuid('office_id').references(() => organizations.id, { onDelete: 'set null' }),
  licenseNumber: text('license_number'),
  licenseExpiry: timestamp('license_expiry'),
  specialty: text('specialty'),
  isActive: boolean('is_active').default(true),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
