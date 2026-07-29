CREATE TABLE IF NOT EXISTS "weekly_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "week_start" date NOT NULL,
  "week_end" date NOT NULL,
  "content" jsonb NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "weekly_reports_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_reports_week_start_idx" ON "weekly_reports" ("week_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_reports_generated_at_idx" ON "weekly_reports" ("generated_at");
