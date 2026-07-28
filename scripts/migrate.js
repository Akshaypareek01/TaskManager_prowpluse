import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SKIP_CODES = new Set(["42710", "42P07", "42701", "23505"]);

/**
 * Load .env into process.env when running scripts outside Next.js.
 */
function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

/**
 * Apply SQL migration files in order, skipping already-applied objects.
 */
async function migrate() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env");
    process.exit(1);
  }

  const drizzleDir = path.join(__dirname, "../drizzle");
  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    for (const file of files) {
      const raw = fs.readFileSync(path.join(drizzleDir, file), "utf8");
      const statements = raw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      console.log(`Applying ${file} (${statements.length} statements)…`);

      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (err) {
          if (SKIP_CODES.has(err.code) || err.message?.includes("already exists")) {
            continue;
          }
          throw err;
        }
      }
    }
    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
