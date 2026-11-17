-- Rollback script for task_statuses migration
-- Run this query manually if you ever want to completely rollback:
DROP TABLE IF EXISTS task_statuses;
DELETE FROM schema_migrations WHERE name = 'zzz_task_statuses.sql';
DELETE FROM schema_migrations WHERE name = 'rollback_zzz_task_statuses.sql';
