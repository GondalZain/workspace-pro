-- Reset templates table to keep only 1 Default System Template
DELETE FROM task_status_templates;

INSERT INTO task_status_templates (id, name, description, is_system, statuses) VALUES
(
  1,
  'Default System Workflow',
  'Original system default status structure: To Do, In Progress, Done',
  TRUE,
  '[
    {"id": 1, "name": "To Do", "slug": "pending", "color": "#dc2626", "sortOrder": 1, "isCompleted": false},
    {"id": 2, "name": "In Progress", "slug": "in-progress", "color": "#2563eb", "sortOrder": 2, "isCompleted": false},
    {"id": 3, "name": "Done", "slug": "completed", "color": "#16a34a", "sortOrder": 3, "isCompleted": true}
  ]'
);
