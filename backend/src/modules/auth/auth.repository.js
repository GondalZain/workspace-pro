const { pool } = require('../../config/database');

async function findByEmail(email, companyId = null) {
  let query = `
    SELECT 
       users.id, users.username, users.email, users.password_hash, users.profile_image_path, users.role_id, users.company_id,
       roles.name AS role_name,
       c.name AS company_name, c.title AS company_title, c.description AS company_description,
       c.logo_path AS company_logo_path, c.primary_color AS company_primary_color, c.secondary_color AS company_secondary_color,
       c.email_domain AS company_email_domain, c.domain AS company_domain, c.status AS company_status,
       c.plan_id AS company_plan_id, c.subscription_status AS company_subscription_status
     FROM users 
     LEFT JOIN roles ON roles.id = users.role_id 
     LEFT JOIN companies c ON c.id = users.company_id
     WHERE users.email = ?`;
  const params = [email];

  if (companyId !== null && companyId !== undefined) {
    query += ` AND users.company_id = ?`;
    params.push(companyId);
  }

  query += ` ORDER BY users.id ASC`;
  const [rows] = await pool.execute(query, params);
  return rows[0] || null;
}

async function findAllByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT 
       users.id, users.username, users.email, users.password_hash, users.profile_image_path, users.role_id, users.company_id,
       roles.name AS role_name,
       c.name AS company_name, c.title AS company_title, c.description AS company_description,
       c.logo_path AS company_logo_path, c.primary_color AS company_primary_color, c.secondary_color AS company_secondary_color,
       c.email_domain AS company_email_domain, c.domain AS company_domain, c.status AS company_status,
       c.plan_id AS company_plan_id, c.subscription_status AS company_subscription_status
     FROM users 
     LEFT JOIN roles ON roles.id = users.role_id 
     LEFT JOIN companies c ON c.id = users.company_id
     WHERE users.email = ?
     ORDER BY users.id ASC`,
    [email]
  );
  return rows;
}

async function create({ username, email, originalEmail = null, passwordHash, profileImagePath, companyId = null }) {
  let assignedCompanyId = companyId ? Number(companyId) : null;
  if (!assignedCompanyId && email && email.includes('@')) {
    const domain = email.split('@')[1].toLowerCase().trim();
    const [matched] = await pool.execute('SELECT id FROM companies WHERE LOWER(email_domain) = ? LIMIT 1', [domain]);
    if (matched.length > 0) {
      assignedCompanyId = Number(matched[0].id);
    }
  }

  const [result] = await pool.execute(
    'INSERT INTO users (username, email, original_email, password_hash, profile_image_path, company_id) VALUES (?, ?, ?, ?, ?, ?)',
    [username, email, originalEmail || null, passwordHash, profileImagePath || null, assignedCompanyId]
  );
  await pool.execute('UPDATE users SET role_id = (SELECT id FROM roles WHERE name = \'user\') WHERE id = ?', [result.insertId]);
  return findById(result.insertId);
}

async function createWithRole({ username, email, originalEmail = null, passwordHash, profileImagePath, companyId = null, roleId }) {
  let assignedCompanyId = companyId ? Number(companyId) : null;
  if (!assignedCompanyId && email && email.includes('@')) {
    const domain = email.split('@')[1].toLowerCase().trim();
    const [matched] = await pool.execute('SELECT id FROM companies WHERE LOWER(email_domain) = ? LIMIT 1', [domain]);
    if (matched.length > 0) {
      assignedCompanyId = Number(matched[0].id);
    }
  }

  const [result] = await pool.execute(
    'INSERT INTO users (username, email, original_email, password_hash, profile_image_path, company_id, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [username, email, originalEmail || null, passwordHash, profileImagePath || null, assignedCompanyId, roleId]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT 
       users.id, users.username, users.email, users.original_email, users.profile_image_path, users.role_id, users.company_id,
       roles.name AS role_name,
       c.name AS company_name, c.title AS company_title, c.description AS company_description,
       c.logo_path AS company_logo_path, c.primary_color AS company_primary_color, c.secondary_color AS company_secondary_color,
       c.email_domain AS company_email_domain, c.domain AS company_domain,
       c.plan_id AS company_plan_id, c.subscription_status AS company_subscription_status
     FROM users 
     LEFT JOIN roles ON roles.id = users.role_id 
     LEFT JOIN companies c ON c.id = users.company_id
     WHERE users.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listUsers(companyId = null, isSuperAdmin = false) {
  let query = `
    SELECT 
       users.id, users.username, users.email, users.original_email, users.profile_image_path, users.role_id, users.company_id,
       roles.name AS role_name,
       c.name AS company_name, c.title AS company_title, c.description AS company_description,
       c.logo_path AS company_logo_path, c.primary_color AS company_primary_color, c.secondary_color AS company_secondary_color,
       c.email_domain AS company_email_domain, c.domain AS company_domain,
       c.plan_id AS company_plan_id, c.subscription_status AS company_subscription_status
     FROM users 
     LEFT JOIN roles ON roles.id = users.role_id 
     LEFT JOIN companies c ON c.id = users.company_id
  `;
  const values = [];

  if (!isSuperAdmin) {
    query += ` WHERE users.company_id = ? AND (roles.name IS NULL OR roles.name != 'super_admin')`;
    values.push(companyId);
  }

  query += ` ORDER BY users.username`;
  const [rows] = await pool.execute(query, values);
  return rows;
}

async function findAccessByUserId(id) {
  const [rows] = await pool.execute(
    `SELECT roles.id AS role_id, roles.name AS role_name, permissions.name AS permission
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
     LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
     WHERE users.id = ?`,
    [id]
  );
  const roleName = rows[0]?.role_name || null;
  if (roleName === 'super_admin') {
    const allPerms = await listPermissions();
    return {
      roleId: rows[0]?.role_id || null,
      role: 'super_admin',
      permissions: allPerms.map((p) => p.name)
    };
  }
  return {
    roleId: rows[0]?.role_id || null,
    role: roleName,
    permissions: rows.map((row) => row.permission).filter(Boolean)
  };
}

async function listPermissions() {
  const [rows] = await pool.execute('SELECT id, name, description FROM permissions ORDER BY name');
  if (rows.length === 0) {
    const defaults = [
      { name: 'users.manage', description: 'Manage & register company user accounts and assign roles' },
      { name: 'tasks.create', description: 'Create new tasks within the workspace' },
      { name: 'tasks.edit', description: 'Edit task details, status, and assignees' },
      { name: 'tasks.delete', description: 'Delete company tasks' },
      { name: 'projects.manage', description: 'Create, update, and manage company projects' },
      { name: 'timesheets.manage', description: 'Log, edit, and manage timesheets' }
    ];
    for (const p of defaults) {
      await pool.execute('INSERT IGNORE INTO permissions (name, description) VALUES (?, ?)', [p.name, p.description]);
    }
    const [seeded] = await pool.execute('SELECT id, name, description FROM permissions ORDER BY name');
    const [adminRole] = await pool.execute("SELECT id FROM roles WHERE name = 'admin'");
    if (adminRole[0]?.id) {
      for (const p of seeded) {
        await pool.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole[0].id, p.id]);
      }
    }
    return seeded;
  }
  return rows;
}

async function listRoles(companyId = null, isSuperAdmin = false) {
  let query = `
    SELECT roles.id, roles.name, roles.description, roles.company_id, permissions.name AS permission
    FROM roles
    LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
    LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
  `;
  const values = [];

  if (!isSuperAdmin && companyId) {
    query += ` WHERE (roles.company_id IS NULL OR roles.company_id = ?)`;
    values.push(companyId);
  }

  query += ` ORDER BY roles.name, permissions.name`;
  const [rows] = await pool.execute(query, values);
  return rows;
}

async function createRole({ name, description, permissions, companyId = null }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'INSERT INTO roles (name, description, company_id) VALUES (?, ?, ?)',
      [name, description, companyId ? Number(companyId) : null]
    );
    for (const permission of permissions) {
      await connection.execute(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT ?, id FROM permissions WHERE name = ?`,
        [result.insertId, permission]
      );
    }
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function updateRole(id, { name, description, permissions }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, description, id]);
    await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    for (const permission of permissions) {
      await connection.execute(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT ?, id FROM permissions WHERE name = ?`,
        [id, permission]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function setRoleById(userId, roleId) {
  await pool.execute('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
  return findById(userId);
}

async function updateUser(id, { username, email, originalEmail, passwordHash, profileImagePath }) {
  const updates = ['username = ?', 'email = ?'];
  const values = [username, email];
  if (originalEmail !== undefined) {
    updates.push('original_email = ?');
    values.push(originalEmail || null);
  }
  if (passwordHash) {
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }

  if (profileImagePath !== undefined) {
    updates.push('profile_image_path = ?');
    values.push(profileImagePath || null);
  }

  values.push(id);
  await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function updateProfile(id, { username, email, originalEmail, passwordHash, profileImagePath }) {
  const updates = ['username = ?', 'email = ?'];
  const values = [username, email];
  if (originalEmail !== undefined) {
    updates.push('original_email = ?');
    values.push(originalEmail || null);
  }
  if (passwordHash) {
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }

  if (profileImagePath !== undefined) {
    updates.push('profile_image_path = ?');
    values.push(profileImagePath || null);
  }

  values.push(id);
  await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function countUsersForRole(roleId) {
  const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM users WHERE role_id = ?', [roleId]);
  return Number(rows[0].count);
}

async function deleteRole(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    const [result] = await connection.execute('DELETE FROM roles WHERE id = ?', [id]);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setPasswordResetToken(userId, token, expiresAt) {
  await pool.execute(
    'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
    [token, expiresAt, userId]
  );
  return true;
}

async function findByPasswordResetToken(token) {
  const [rows] = await pool.execute(
    `SELECT 
       users.id, users.username, users.email, users.role_id, users.company_id, users.password_reset_expires,
       roles.name AS role_name,
       c.name AS company_name, c.title AS company_title, c.description AS company_description,
       c.logo_path AS company_logo_path, c.primary_color AS company_primary_color, c.secondary_color AS company_secondary_color,
       c.email_domain AS company_email_domain, c.domain AS company_domain, c.status AS company_status
     FROM users 
     LEFT JOIN roles ON roles.id = users.role_id 
     LEFT JOIN companies c ON c.id = users.company_id
     WHERE users.password_reset_token = ? AND users.password_reset_expires > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function setPasswordWithToken(userId, passwordHash) {
  await pool.execute(
    'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
    [passwordHash, userId]
  );
  return findById(userId);
}

module.exports = {
  findByEmail,
  findAllByEmail,
  create,
  createWithRole,
  findById,
  listUsers,
  findAccessByUserId,
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  setRoleById,
  updateUser,
  updateProfile,
  countUsersForRole,
  deleteRole,
  setPasswordResetToken,
  findByPasswordResetToken,
  setPasswordWithToken
};