import { pgTable, text, decimal, timestamp, uuid, jsonb, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';
import { properties } from './properties-schema';

export const auctionTerms = pgTable('auction_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role').notNull(),
  version: text('version').notNull(),
  contentAr: text('content_ar').notNull(),
  contentEn: text('content_en'),
  contentHash: text('content_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  roleVersionUnique: uniqueIndex('auction_terms_role_version_uidx').on(table.role, table.version),
  activeIdx: index('auction_terms_active_idx').on(table.role, table.isActive),
}));

export const auctionTermsAcceptance = pgTable('auction_terms_acceptance', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  termsId: uuid('terms_id').notNull().references(() => auctionTerms.id, { onDelete: 'restrict' }),
  acceptanceHash: text('acceptance_hash').notNull(),
  acceptedAt: timestamp('accepted_at').notNull().defaultNow(),
}, (table) => ({
  uniqueAcceptance: uniqueIndex('auction_terms_acceptance_uidx').on(table.propertyId, table.userId, table.termsId),
  propertyIdx: index('auction_terms_acceptance_property_idx').on(table.propertyId),
  userIdx: index('auction_terms_acceptance_user_idx').on(table.userId),
}));

export const auctionAwards = pgTable('auction_awards', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  organizerOrganizationId: uuid('organizer_organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  finalPrice: decimal('final_price', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('SAR'),
  auctionType: text('auction_type').notNull(),
  propertySnapshot: jsonb('property_snapshot').notNull(),
  sellerSnapshot: jsonb('seller_snapshot').notNull(),
  buyerSnapshot: jsonb('buyer_snapshot').notNull(),
  termsSnapshot: jsonb('terms_snapshot').notNull(),
  status: text('status').notNull().default('awarded'),
  awardedBy: uuid('awarded_by').references(() => users.id, { onDelete: 'set null' }),
  awardedAt: timestamp('awarded_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  propertyUnique: uniqueIndex('auction_awards_property_uidx').on(table.propertyId),
  buyerIdx: index('auction_awards_buyer_idx').on(table.buyerId),
  sellerIdx: index('auction_awards_seller_idx').on(table.sellerId),
}));

export const auctionContracts = pgTable('auction_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  awardId: uuid('award_id').notNull().references(() => auctionAwards.id, { onDelete: 'restrict' }),
  propertyId: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  organizerOrganizationId: uuid('organizer_organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  contractNumber: text('contract_number').notNull(),
  templateVersion: text('template_version').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  documentHtml: text('document_html'),
  documentHash: text('document_hash'),
  documentMime: text('document_mime').notNull().default('text/html; charset=utf-8'),
  documentFilename: text('document_filename'),
  status: text('status').notNull().default('generated'),
  sellerSignedAt: timestamp('seller_signed_at'),
  buyerSignedAt: timestamp('buyer_signed_at'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  signedAt: timestamp('signed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  awardUnique: uniqueIndex('auction_contracts_award_uidx').on(table.awardId),
  propertyUnique: uniqueIndex('auction_contracts_property_uidx').on(table.propertyId),
  numberUnique: uniqueIndex('auction_contracts_number_uidx').on(table.contractNumber),
}));

export const auctionContractSignatures = pgTable('auction_contract_signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => auctionContracts.id, { onDelete: 'restrict' }),
  propertyId: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  partyRole: text('party_role').notNull(),
  contractHash: text('contract_hash').notNull(),
  signatureHash: text('signature_hash').notNull(),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partyUnique: uniqueIndex('auction_contract_signatures_party_uidx').on(table.contractId, table.userId, table.partyRole),
  contractIdx: index('auction_contract_signatures_contract_idx').on(table.contractId, table.signedAt),
  userIdx: index('auction_contract_signatures_user_idx').on(table.userId),
}));

export const auctionEvents = pgTable('auction_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  propertyCreatedIdx: index('auction_events_property_created_idx').on(table.propertyId, table.createdAt),
  typeIdx: index('auction_events_type_idx').on(table.eventType),
}));
