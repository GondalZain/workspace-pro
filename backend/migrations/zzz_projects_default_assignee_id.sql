ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS default_assignee_id BIGINT UNSIGNED NULL AFTER image_path;
