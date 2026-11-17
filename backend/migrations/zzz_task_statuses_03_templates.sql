CREATE TABLE IF NOT EXISTS task_status_templates (
id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  statuses JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed popular ready-to-use status structures / templates
INSERT INTO task_status_templates (id, name, description, is_system, statuses) VALUES
(
  1,
  'Standard Scrum (3 States)',
  'Classic To Do, In Progress, Done workflow suitable for standard teams',
  TRUE,
  '[
    {"id": 1, "name": "To Do", "slug": "pending", "color": "#dc2626", "sortOrder": 1, "isCompleted": false},
    {"id": 2, "name": "In Progress", "slug": "in-progress", "color": "#2563eb", "sortOrder": 2, "isCompleted": false},
    {"id": 3, "name": "Done", "slug": "completed", "color": "#16a34a", "sortOrder": 3, "isCompleted": true}
  ]'
),
(
  2,
  'Software Development (5 States)',
  'Feature pipeline with Backlog, In Progress, Code Review, Testing, and Deployed',
  TRUE,
  '[
    {"id": 1, "name": "Backlog", "slug": "backlog", "color": "#64748b", "sortOrder": 1, "isCompleted": false},
    {"id": 2, "name": "In Progress", "slug": "in-progress", "color": "#2563eb", "sortOrder": 2, "isCompleted": false},
    {"id": 3, "name": "Code Review", "slug": "in-review", "color": "#8b5cf6", "sortOrder": 3, "isCompleted": false},
    {"id": 4, "name": "QA Testing", "slug": "qa-testing", "color": "#f59e0b", "sortOrder": 4, "isCompleted": false},
    {"id": 5, "name": "Deployed", "slug": "completed", "color": "#16a34a", "sortOrder": 5, "isCompleted": true}
  ]'
),
(
  3,
  'Creative & Marketing (4 States)',
  'Content creation workflow: Briefed, Drafting, Client Review, Published',
  TRUE,
  '[
    {"id": 1, "name": "Briefed", "slug": "briefed", "color": "#0ea5e9", "sortOrder": 1, "isCompleted": false},
    {"id": 2, "name": "Drafting", "slug": "drafting", "color": "#f97316", "sortOrder": 2, "isCompleted": false},
    {"id": 3, "name": "Client Review", "slug": "client-review", "color": "#a855f7", "sortOrder": 3, "isCompleted": false},
    {"id": 4, "name": "Published", "slug": "completed", "color": "#10b981", "sortOrder": 4, "isCompleted": true}
  ]'
),
(
  4,
  'Support & Operations (5 States)',
  'Ticket lifecycle: Open, Under Investigation, Waiting on Customer, Resolved, Closed',
  TRUE,
  '[
    {"id": 1, "name": "Open", "slug": "pending", "color": "#ef4444", "sortOrder": 1, "isCompleted": false},
    {"id": 2, "name": "Investigating", "slug": "investigating", "color": "#3b82f6", "sortOrder": 2, "isCompleted": false},
    {"id": 3, "name": "Waiting on Customer", "slug": "waiting", "color": "#eab308", "sortOrder": 3, "isCompleted": false},
    {"id": 4, "name": "Resolved", "slug": "resolved", "color": "#14b8a6", "sortOrder": 4, "isCompleted": false},
    {"id": 5, "name": "Closed", "slug": "completed", "color": "#22c55e", "sortOrder": 5, "isCompleted": true}
  ]'
)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), statuses = VALUES(statuses);
