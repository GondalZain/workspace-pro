ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS spent_minutes INT UNSIGNED NULL DEFAULT 0 COMMENT 'Actual time spent on task' AFTER estimated_minutes;
