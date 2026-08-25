import { pgTable, text, timestamp, boolean, uuid, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { users } from '../schema';

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  context: text('context').notNull(),
  contextId: uuid('context_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  lastMessageAt: timestamp('last_message_at'),
  isArchived: boolean('is_archived').default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messageParticipants = pgTable('message_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => messageThreads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  lastReadAt: timestamp('last_read_at'),
  isActive: boolean('is_active').default(true),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => messageThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type').default('text'),
  metadata: jsonb('metadata').default({}),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messageAttachments = pgTable('message_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: text('type').notNull(),
  size: integer('size'),
  name: text('name'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').defaultNow(),
});
