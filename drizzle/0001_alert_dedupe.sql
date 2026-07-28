ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "dedupe_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_dedupe_key_unique" ON "alerts" ("dedupe_key");
