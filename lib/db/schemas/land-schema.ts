import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';

export const landParcels = pgTable('land_parcels', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelNumber: text('parcel_number'),
  blockNumber: text('block_number'),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('residential'),
  status: text('status').default('available'),
  area: decimal('area', { precision: 12, scale: 2 }),
  areaUnit: text('area_unit').default('sqm'),
  price: decimal('price', { precision: 15, scale: 2 }),
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }),
  currency: text('currency').default('OMR'),
  country: text('country').notNull(),
  governorate: text('governorate').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  boundary: jsonb('boundary'),
  zoning: text('zoning'),
  frontage: decimal('frontage', { precision: 8, scale: 2 }),
  roadAccess: text('road_access'),
  utilities: jsonb('utilities'),
  features: jsonb('features'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  isVerified: boolean('is_verified').default(false),
  verifiedAt: timestamp('verified_at'),
  listedAt: timestamp('listed_at'),
  soldAt: timestamp('sold_at'),
  expiresAt: timestamp('expires_at'),
  views: integer('views').default(0),
  favorites: integer('favorites').default(0),
  score: integer('score').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('land_parcels_type_idx').on(table.type),
  index('land_parcels_status_idx').on(table.status),
  index('land_parcels_location_idx').on(table.country, table.governorate, table.city),
  index('land_parcels_owner_idx').on(table.ownerId),
  index('land_parcels_org_idx').on(table.organizationId),
  index('land_parcels_created_idx').on(table.createdAt),
]);

export const landDocuments = pgTable('land_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelId: uuid('parcel_id').notNull().references(() => landParcels.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  isVerified: boolean('is_verified').default(false),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('land_documents_parcel_idx').on(table.parcelId),
]);

export const landValuations = pgTable('land_valuations', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelId: uuid('parcel_id').notNull().references(() => landParcels.id, { onDelete: 'cascade' }),
  valuedBy: uuid('valued_by').references(() => users.id, { onDelete: 'set null' }),
  methodology: text('methodology'),
  estimatedValue: decimal('estimated_value', { precision: 15, scale: 2 }),
  minValue: decimal('min_value', { precision: 15, scale: 2 }),
  maxValue: decimal('max_value', { precision: 15, scale: 2 }),
  currency: text('currency').default('OMR'),
  comparables: jsonb('comparables'),
  notes: text('notes'),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('land_valuations_parcel_idx').on(table.parcelId),
]);

export const landFavorites = pgTable('land_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parcelId: uuid('parcel_id').notNull().references(() => landParcels.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('land_favorites_user_idx').on(table.userId),
  index('land_favorites_parcel_idx').on(table.parcelId),
]);
