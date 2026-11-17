-- Ensure task_form_templates table exists and has target_entity, and projects/tasks have form_template_id
CREATE TABLE IF NOT EXISTS task_form_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  target_entity VARCHAR(32) NOT NULL DEFAULT 'task',
  fields_config JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE task_form_templates
  ADD COLUMN IF NOT EXISTS target_entity VARCHAR(32) NOT NULL DEFAULT 'task' AFTER is_default;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS form_template_id INT UNSIGNED NULL AFTER default_assignee_id;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS form_template_id INT UNSIGNED NULL AFTER project_id;

