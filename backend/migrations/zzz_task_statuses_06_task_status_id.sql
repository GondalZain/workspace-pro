-- Migration: Add status_id to tasks table, migrate status slugs to display names, and backfill status_id
SET @dbname = DATABASE();
SET @tablename = "tasks";
SET @columnname = "status_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "ALTER TABLE tasks MODIFY COLUMN status_id INT NULL AFTER assignee_ids",
  "ALTER TABLE tasks ADD COLUMN status_id INT NULL, ADD CONSTRAINT fk_tasks_status_id FOREIGN KEY (status_id) REFERENCES task_statuses(id) ON DELETE SET NULL, ADD INDEX idx_tasks_status_id (status_id)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Backfill status_id and update status column from slug to stage display name without losing any data
UPDATE tasks t
JOIN task_statuses ts ON (ts.company_id = t.company_id OR ts.company_id = 0)
  AND (
    ts.slug COLLATE utf8mb4_general_ci = t.status COLLATE utf8mb4_general_ci 
    OR ts.name COLLATE utf8mb4_general_ci = t.status COLLATE utf8mb4_general_ci
  )
SET 
  t.status_id = ts.id,
  t.status = ts.name;
