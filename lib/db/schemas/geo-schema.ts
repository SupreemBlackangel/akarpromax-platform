import { pgTable, text, integer, timestamp, boolean, uuid, index, uniqueIndex, doublePrecision } from 'drizzle-orm/pg-core';

export const countries = pgTable(
  'countries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    phoneCode: text('phone_code'),
    // No platform-wide monetary default: each country row owns its own
    // currency code explicitly. See lib/market/currency-registry.ts.
    currencyCode: text('currency_code'),
    flagEmoji: text('flag_emoji'),
    mapCenterLat: doublePrecision('map_center_lat'),
    mapCenterLng: doublePrecision('map_center_lng'),
    defaultZoom: integer('default_zoom').default(12),
    publicationsEnabled: boolean('publications_enabled').default(true),
    measurementSystem: text('measurement_system').default('metric'),
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    countriesActiveIdx: index('countries_is_active_idx').on(table.isActive),
    countriesOrderIdx: index('countries_display_order_idx').on(table.displayOrder),
  }),
);

export const governorates = pgTable(
  'governorates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    countryId: uuid('country_id')
      .notNull()
      .references(() => countries.id, { onDelete: 'cascade' }),
    code: text('code'),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    governoratesCountryIdx: index('governorates_country_id_idx').on(table.countryId),
    governoratesActiveIdx: index('governorates_is_active_idx').on(table.isActive),
  }),
);

/**
 * Where a registry row came from. 'seed' is catalogue data shipped by an
 * environment; 'listing' is a place a publisher named while advertising a
 * property or a service. Listing-born rows are searchable immediately — the
 * catalogue grows from the market itself — and `match_key` is what keeps
 * "حي النسيم"، "النسيم" and "الـنسيم" from becoming three different places.
 */
const PLACE_ORIGIN = { seed: 'seed', listing: 'listing' } as const;
export type PlaceOrigin = (typeof PLACE_ORIGIN)[keyof typeof PLACE_ORIGIN];

export const cities = pgTable(
  'cities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    governorateId: uuid('governorate_id')
      .notNull()
      .references(() => governorates.id, { onDelete: 'cascade' }),
    code: text('code'),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    matchKey: text('match_key'),
    origin: text('origin').default(PLACE_ORIGIN.seed),
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    citiesGovernorateIdx: index('cities_governorate_id_idx').on(table.governorateId),
    citiesActiveIdx: index('cities_is_active_idx').on(table.isActive),
    citiesMatchKeyIdx: uniqueIndex('cities_governorate_match_key_idx').on(table.governorateId, table.matchKey),
  }),
);

export const districts = pgTable(
  'districts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'cascade' }),
    code: text('code'),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    // A district without coordinates cannot centre a map or answer a radius
    // search, which is why the level was useless before this column existed.
    latitude: text('latitude'),
    longitude: text('longitude'),
    matchKey: text('match_key'),
    origin: text('origin').default(PLACE_ORIGIN.seed),
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    districtsCityIdx: index('districts_city_id_idx').on(table.cityId),
    districtsActiveIdx: index('districts_is_active_idx').on(table.isActive),
    districtsMatchKeyIdx: uniqueIndex('districts_city_match_key_idx').on(table.cityId, table.matchKey),
  }),
);

/**
 * Villages and hamlets (قرى وهجر) — a sibling of `districts` under the same
 * city/wilayat, not a replacement for it. Rural addresses are named by village
 * rather than by neighbourhood, and outside the big cities that is most of the
 * map. Coordinates matter more here than anywhere else: a village is found on
 * a map long before its name is known.
 */
export const villages = pgTable(
  'villages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'cascade' }),
    code: text('code'),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    matchKey: text('match_key'),
    origin: text('origin').default(PLACE_ORIGIN.seed),
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    villagesCityIdx: index('villages_city_id_idx').on(table.cityId),
    villagesActiveIdx: index('villages_is_active_idx').on(table.isActive),
    villagesMatchKeyIdx: uniqueIndex('villages_city_match_key_idx').on(table.cityId, table.matchKey),
  }),
);

export const streets = pgTable(
  'streets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    districtId: uuid('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'cascade' }),
    code: text('code'),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    nameTr: text('name_tr'),
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    streetsDistrictIdx: index('streets_district_id_idx').on(table.districtId),
    streetsActiveIdx: index('streets_is_active_idx').on(table.isActive),
  }),
);
