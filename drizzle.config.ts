import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-pg",
  schema: [
    "./lib/db/schema.ts",
    "./lib/db/schemas/properties-schema.ts",
    "./lib/db/schemas/services-schema.ts",
    "./lib/db/schemas/messages-schema.ts",
    "./lib/db/schemas/community-schema.ts",
    "./lib/db/schemas/knowledge-schema.ts",
    "./lib/db/schemas/advertising-schema.ts",
    "./lib/db/schemas/auctions-schema.ts",
    "./lib/db/schemas/roles-schema.ts",
    "./lib/db/schemas/leads-schema.ts",
    "./lib/db/schemas/land-schema.ts",
    "./lib/db/schemas/offer-types-schema.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
