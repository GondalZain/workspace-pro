-- Add statuses.manage permission
INSERT IGNORE INTO permissions (name, description) 
VALUES ('statuses.manage', 'Configure, add, reorder, and manage task status pipeline');

-- Grant statuses.manage to the default admin role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.name = 'statuses.manage';
