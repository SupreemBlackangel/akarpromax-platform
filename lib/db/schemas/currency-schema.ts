import { pgTable, text, numeric, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';

export const currencies = pgTable(
  'currencies',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    symbol: text('symbol').notNull(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    exchangeRateToUSD: numeric('exchange_rate_to_usd', { precision: 18, scale: 8 }).notNull().default('1'),
    isActive: boolean('is_active').default(true),
    isDefault: boolean('is_default').default(false),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    currenciesActiveIdx: index('currencies_is_active_idx').on(table.isActive),
    currenciesDefaultIdx: index('currencies_is_default_idx').on(table.isDefault),
  }),
);
