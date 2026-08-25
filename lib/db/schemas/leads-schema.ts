import { pgTable, text, integer, decimal, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull().default('website'),
  type: text('type').notNull().default('property_inquiry'),
  status: text('status').notNull().default('new'),
  priority: text('priority').default('normal'),
  subject: text('subject').notNull(),
  description: text('description'),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  contactWhatsapp: text('contact_whatsapp'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  propertyId: uuid('property_id'),
  serviceRequestId: uuid('service_request_id'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at'),
  respondedAt: timestamp('responded_at'),
  convertedAt: timestamp('converted_at'),
  lostAt: timestamp('lost_at'),
  lostReason: text('lost_reason'),
  score: integer('score').default(0),
  tags: jsonb('tags'),
  metadata: jsonb('metadata'),
  country: text('country'),
  governorate: text('governorate'),
  city: text('city'),
  budget: decimal('budget', { precision: 15, scale: 2 }),
  preferredDate: timestamp('preferred_date'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('leads_status_idx').on(table.status),
  index('leads_assigned_idx').on(table.assignedTo),
  index('leads_user_idx').on(table.userId),
  index('leads_source_idx').on(table.source),
  index('leads_created_idx').on(table.createdAt),
]);

export const leadActivities = pgTable('lead_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('lead_activities_lead_idx').on(table.leadId),
]);

export const leadAssignments = pgTable('lead_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  assignedTo: uuid('assigned_to').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('lead_assignments_lead_idx').on(table.leadId),
  index('lead_assignments_user_idx').on(table.assignedTo),
]);
