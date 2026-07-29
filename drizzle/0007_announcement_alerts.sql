-- Team-wide announcement alerts with title and author
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'announcement';
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "announced_by_name" text;
