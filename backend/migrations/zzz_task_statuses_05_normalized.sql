-- Ensure System Default Company (id = 0) exists for default system foreign keys
SET @old_sql_mode = @@sql_mode;
SET @@sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
INSERT IGNORE INTO companies (id, name, title, description) 
VALUES (0, 'System Default', 'Default System Workspace', 'System fallback template');
SET @@sql_mode = @old_sql_mode;

-- Drop obsolete single-row JSON tables
DROP TABLE IF EXISTS task_status_templates;
DROP TABLE IF EXISTS task_statuses;

-- Create normalized dynamic task_statuses table (one status per row)
CREATE TABLE IF NOT EXISTS task_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL DEFAULT 0,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  color VARCHAR(30) DEFAULT '#2563eb',
  sort_order INT NOT NULL DEFAULT 1,
  is_initial BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_statuses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_task_statuses_company (company_id),
  INDEX idx_task_statuses_order (company_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default statuses with company_id = 0 (System Default template)
INSERT INTO task_statuses (company_id, name, slug, color, sort_order, is_initial, is_completed, is_default)
VALUES 
  (0, 'To Do', 'pending', '#dc2626', 1, TRUE, FALSE, TRUE),
  (0, 'In Progress', 'in-progress', '#2563eb', 2, FALSE, FALSE, TRUE),
  (0, 'Done', 'completed', '#16a34a', 3, FALSE, TRUE, TRUE);
