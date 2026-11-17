-- Multi-tenant Dynamic Task Statuses
CREATE TABLE IF NOT EXISTS task_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL DEFAULT NULL,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT '#dc2626',
  sort_order INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_statuses_company (company_id),
  INDEX idx_task_statuses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default statuses (company_id = NULL means default for all companies)
INSERT IGNORE INTO task_statuses (id, company_id, name, slug, color, sort_order, is_completed, is_default)
VALUES 
  (1, NULL, 'To Do', 'pending', '#dc2626', 1, FALSE, TRUE),
  (2, NULL, 'In Progress', 'in-progress', '#2563eb', 2, FALSE, TRUE),
  (3, NULL, 'Done', 'completed', '#16a34a', 3, TRUE, TRUE);
