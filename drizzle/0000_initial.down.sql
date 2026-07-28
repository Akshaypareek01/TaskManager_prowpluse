-- Reversible down migration for 0000_initial.sql
-- WARNING: drops all tasks and alerts data

DROP INDEX IF EXISTS "alerts_type_created_idx";
DROP INDEX IF EXISTS "alerts_task_id_idx";
DROP INDEX IF EXISTS "alerts_member_read_created_idx";
DROP INDEX IF EXISTS "tasks_member_completed_at_idx";
DROP INDEX IF EXISTS "tasks_due_date_status_idx";
DROP INDEX IF EXISTS "tasks_member_status_idx";
DROP INDEX IF EXISTS "tasks_member_due_date_idx";

DROP TABLE IF EXISTS "alerts";
DROP TABLE IF EXISTS "tasks";

DROP TYPE IF EXISTS "alert_type";
DROP TYPE IF EXISTS "task_status";
