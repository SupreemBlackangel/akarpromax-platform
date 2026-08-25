import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uuid } from 'drizzle-orm/pg-core';

export const vehicleTypeEnum = pgEnum('type', ['Car', 'Truck', 'Motorcycle']);

export const vehicles = pgTable('vehicles', {
	id: serial('id').primaryKey(),
	brand: text('brand').notNull(),
	model: text('model').notNull(),
	year: integer('year').notNull(),
	price: integer('price').notNull(),
	type: vehicleTypeEnum('type').notNull(),
	location_id: uuid('location_id'),
	is_active: boolean('is_active').default(true),
	display_order: integer('display_order').default(0),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow(),
});

export type Vehicle = typeof vehicles.$inferSelect;

export const locations = pgTable('locations', {
	id: uuid('id').primaryKey().defaultRandom(),
	country_code: text('country_code').notNull(),
	city_id: uuid('city_id').notNull(),
	district_id: uuid('district_id'),
	street_name: text('street_name'),
	is_active: boolean('is_active').default(true),
	display_order: integer('display_order').default(0),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow(),
});

export type Location = typeof locations.$inferSelect;