UPDATE users JOIN roles ON roles.name = 'user' SET users.role_id = roles.id WHERE users.role_id IS NULL;
