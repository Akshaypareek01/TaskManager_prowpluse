import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

/** @type {import("pg").Pool | null} */
let pool;

/**
 * Return a singleton Drizzle client backed by pg Pool.
 * @returns {import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>}
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!pool) {
    pool = new Pool({ connectionString: url });
  }

  return drizzle(pool, { schema });
}

export { schema };
