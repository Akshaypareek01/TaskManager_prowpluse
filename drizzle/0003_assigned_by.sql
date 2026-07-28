-- Track who created/assigned each task (nullable for legacy rows)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assigned_by_user_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assigned_by_user_id_idx" ON "tasks" USING btree ("assigned_by_user_id");
