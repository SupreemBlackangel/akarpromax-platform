import { pgTable, text, timestamp, uuid, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users, organizations } from '../schema';

export const limitedAuctionOrganizers = pgTable(
  'limited_auction_organizers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantedBy: uuid('granted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason'),
    grantedAt: timestamp('granted_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
    revokeReason: text('revoke_reason'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('limited_auction_organizers_org_user_uidx').on(table.organizationId, table.userId),
    index('limited_auction_organizers_org_active_idx').on(table.organizationId, table.revokedAt),
    index('limited_auction_organizers_user_idx').on(table.userId),
  ],
);

export const AUCTION_ORGANIZER_GRANT_TYPE = 'limited_auction_organizer';
