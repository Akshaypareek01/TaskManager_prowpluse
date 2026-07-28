-- Per-user opt-in for hourly roast visibility and joke targeting
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allow_hourly_roast" boolean DEFAULT false NOT NULL;
