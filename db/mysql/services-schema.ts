import { double, index, int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const serviceCategories = mysqlTable(
  "service_categories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    parentId: varchar("parent_id", { length: 36 }),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("OM"),
    code: varchar("code", { length: 128 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: int("is_active").notNull().default(1),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("service_categories_country_code_unique").on(table.countryCode, table.code),
    index("service_categories_parent_idx").on(table.parentId),
  ],
);

export const serviceListings = mysqlTable(
  "service_listings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    providerUserId: varchar("provider_user_id", { length: 36 }).notNull(),
    categoryId: varchar("category_id", { length: 36 }).notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    cityId: varchar("city_id", { length: 100 }).notNull(),
    districtId: varchar("district_id", { length: 100 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    titleKey: varchar("title_key", { length: 255 }),
    descriptionKey: varchar("description_key", { length: 255 }),
    price: int("price").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    unit: varchar("unit", { length: 32 }).notNull().default("project"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    isFeatured: int("is_featured").notNull().default(0),
    tags: text("tags"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("service_listings_cat_geo_status_idx").on(table.categoryId, table.countryCode, table.cityId, table.status),
    index("service_listings_provider_idx").on(table.providerUserId),
  ],
);

export const serviceRequests = mysqlTable(
  "service_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    customerUserId: varchar("customer_user_id", { length: 36 }).notNull(),
    categoryId: varchar("category_id", { length: 36 }).notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull(),
    cityId: varchar("city_id", { length: 100 }).notNull(),
    districtId: varchar("district_id", { length: 100 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    titleKey: varchar("title_key", { length: 255 }),
    descriptionKey: varchar("description_key", { length: 255 }),
    budgetMin: int("budget_min"),
    budgetMax: int("budget_max"),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    preferredDate: timestamp("preferred_date", { mode: "string" }),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("service_requests_cat_geo_status_idx").on(table.categoryId, table.countryCode, table.cityId, table.status),
    index("service_requests_customer_idx").on(table.customerUserId),
  ],
);

export const serviceOffers = mysqlTable(
  "service_offers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 36 }).notNull(),
    listingId: varchar("listing_id", { length: 36 }),
    price: int("price").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    durationDays: int("duration_days"),
    messageKey: varchar("message_key", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("sent"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("service_offers_request_idx").on(table.requestId),
    index("service_offers_provider_idx").on(table.providerUserId),
    uniqueIndex("service_offers_request_provider_unique").on(table.requestId, table.providerUserId),
  ],
);

export const serviceOrders = mysqlTable(
  "service_orders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    offerId: varchar("offer_id", { length: 36 }).notNull(),
    customerUserId: varchar("customer_user_id", { length: 36 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 36 }).notNull(),
    price: int("price").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("OMR"),
    status: varchar("status", { length: 32 }).notNull().default("created"),
    acceptedAt: timestamp("accepted_at", { mode: "string" }),
    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    cancelledAt: timestamp("cancelled_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("service_orders_request_idx").on(table.requestId),
    index("service_orders_participants_idx").on(table.customerUserId, table.providerUserId),
  ],
);

export const serviceMessages = mysqlTable(
  "service_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    threadType: varchar("thread_type", { length: 16 }).notNull(),
    threadId: varchar("thread_id", { length: 36 }).notNull(),
    senderUserId: varchar("sender_user_id", { length: 36 }).notNull(),
    body: text("body").notNull(),
    isSystem: int("is_system").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("service_messages_thread_idx").on(table.threadType, table.threadId, table.createdAt),
    index("service_messages_sender_idx").on(table.senderUserId),
  ],
);

export const serviceReviews = mysqlTable(
  "service_reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull(),
    reviewerUserId: varchar("reviewer_user_id", { length: 36 }).notNull(),
    revieweeUserId: varchar("reviewee_user_id", { length: 36 }).notNull(),
    rating: int("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("service_reviews_order_reviewer_unique").on(table.orderId, table.reviewerUserId),
    index("service_reviews_reviewee_idx").on(table.revieweeUserId),
  ],
);

export const serviceDisputes = mysqlTable(
  "service_disputes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull(),
    openedByUserId: varchar("opened_by_user_id", { length: 36 }).notNull(),
    reason: varchar("reason", { length: 64 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    resolutionNote: text("resolution_note"),
    openedAt: timestamp("opened_at", { mode: "string" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("service_disputes_order_idx").on(table.orderId),
    index("service_disputes_status_idx").on(table.status),
  ],
);

export const serviceBookmarks = mysqlTable(
  "service_bookmarks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    listingId: varchar("listing_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("service_bookmarks_user_listing_unique").on(table.userId, table.listingId)],
);
