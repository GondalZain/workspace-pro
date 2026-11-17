-- Replace multi-row table with single row JSON structure per company / default
DROP TABLE IF EXISTS task_statuses;

CREATE TABLE IF NOT EXISTS task_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL UNIQUE,
  statuses JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed ONE single default row containing the entire status array in JSON format
INSERT INTO task_statuses (id, company_id, statuses) VALUES (
  1,
  NULL,
  '[
    {"id": 1, "name": "To Do", "slug": "pending", "color": "#dc2626", "sortOrder": 1, "isCompleted": false},
    {"id": 2, "name": "In Progress", "slug": "in-progress", "color": "#2563eb", "sortOrder": 2, "isCompleted": false},
    {"id": 3, "name": "Done", "slug": "completed", "color": "#16a34a", "sortOrder": 3, "isCompleted": true}
  ]'
) ON DUPLICATE KEY UPDATE statuses = VALUES(statuses);
