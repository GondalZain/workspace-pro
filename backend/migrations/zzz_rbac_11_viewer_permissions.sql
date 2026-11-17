INSERT IGNORE INTO role_permissions (role_id, permission_id) SELECT roles.id, permissions.id FROM roles JOIN permissions WHERE roles.name = 'viewer' AND permissions.name = 'tasks.read';
