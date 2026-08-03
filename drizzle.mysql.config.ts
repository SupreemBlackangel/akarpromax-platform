import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-mysql",
  schema: "./db/mysql/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.MYSQL_URL ?? "mysql://root:root@localhost:3306/akarpromax",
  },
});
