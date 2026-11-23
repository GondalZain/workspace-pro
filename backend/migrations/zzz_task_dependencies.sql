-- Migration: Create task_dependencies table for SRS AI and project management
CREATE TABLE IF NOT EXISTS task_dependencies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL,
  project_id INT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  depends_on_task_id BIGINT UNSIGNED NOT NULL,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'finish_to_start',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_dep_task (task_id),
  INDEX idx_task_dep_depends_on (depends_on_task_id),
  INDEX idx_task_dep_project (project_id),
  INDEX idx_task_dep_company (company_id),
  CONSTRAINT fk_dep_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_dep_depends_on FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT uq_task_dependency UNIQUE (task_id, depends_on_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
