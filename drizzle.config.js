import { defineConfig } from "drizzle-kit";

/** Drizzle Kit config — run migrations against DATABASE_URL. */
export default defineConfig({
  schema: "./lib/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
