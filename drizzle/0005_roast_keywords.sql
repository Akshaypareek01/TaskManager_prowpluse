-- Per-user keywords for hourly roast joke generation (JSON array, max 4 entries)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roast_keywords" text DEFAULT '[]' NOT NULL;
