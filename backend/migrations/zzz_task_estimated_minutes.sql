ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes INT UNSIGNED NULL COMMENT 'Expected effort to complete' AFTER due_time;
