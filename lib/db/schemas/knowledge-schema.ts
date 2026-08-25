import { pgTable, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core';
import { users } from '../schema';

export const knowledgeItems = pgTable('knowledge_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en'),
  descriptionAr: text('description_ar').notNull(),
  descriptionEn: text('description_en'),
  category: text('category'),
  author: text('author'),
  vendor: text('vendor'),
  cover: text('cover'),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  version: text('version'),
  language: text('language').default('ar'),
  downloadCount: integer('download_count').default(0),
  isFree: boolean('is_free').default(true),
  isVerified: boolean('is_verified').default(false),
  status: text('status').default('published'),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
