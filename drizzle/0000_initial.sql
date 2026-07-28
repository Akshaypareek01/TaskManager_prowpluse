-- v1 initial schema: tasks + alerts (team roster stays in lib/team.js)
-- Up: apply with `npm run db:migrate`
-- Down: see 0000_initial.down.sql

CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('completion_congrats', 'reminder_6pm', 'overdue');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"duration_minutes" integer,
	"status" "task_status" DEFAULT 'pending' NOT NULL
);--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "alert_type" NOT NULL,
	"member_id" text NOT NULL,
	"task_id" text,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read" boolean DEFAULT false NOT NULL
);--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_member_due_date_idx" ON "tasks" USING btree ("member_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_member_status_idx" ON "tasks" USING btree ("member_id","status");--> statement-breakpoint
CREATE INDEX "tasks_due_date_status_idx" ON "tasks" USING btree ("due_date","status");--> statement-breakpoint
CREATE INDEX "tasks_member_completed_at_idx" ON "tasks" USING btree ("member_id","completed_at");--> statement-breakpoint
CREATE INDEX "alerts_member_read_created_idx" ON "alerts" USING btree ("member_id","read","created_at");--> statement-breakpoint
CREATE INDEX "alerts_task_id_idx" ON "alerts" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "alerts_type_created_idx" ON "alerts" USING btree ("type","created_at");
