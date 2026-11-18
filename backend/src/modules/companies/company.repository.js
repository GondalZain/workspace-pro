const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');

async function listCompanies() {
  const [rows] = await pool.execute(
    `SELECT 
       c.id,
       c.name,
       c.title,
       c.description,
       c.logo_path,
       c.primary_color,
       c.secondary_color,
       c.email_domain,
       c.domain,
       c.status,
       c.created_at,
       COUNT(DISTINCT u.id) AS total_users,
       COUNT(DISTINCT CASE WHEN r.name = 'admin' THEN u.id END) AS total_admins
     FROM companies c
     LEFT JOIN users u ON u.company_id = c.id
     LEFT JOIN roles r ON r.id = u.role_id
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );

  const [allAdmins] = await pool.execute(
    `SELECT u.id, u.username, u.email, u.company_id, u.profile_image_path, u.created_at
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'admin'
     ORDER BY u.id ASC`
  );

  const adminsByCompany = new Map();
  for (const a of allAdmins) {
    const cid = Number(a.company_id);
    if (!adminsByCompany.has(cid)) adminsByCompany.set(cid, []);
    adminsByCompany.get(cid).push({
      id: Number(a.id),
      username: a.username,
      email: a.email,
      profileImagePath: a.profile_image_path || null,
      createdAt: a.created_at
    });
  }

  return rows.map(r => {
    const id = Number(r.id);
    const admins = adminsByCompany.get(id) || [];
    return {
      id,
      name: r.name,
      title: r.title || '',
      description: r.description || '',
      logoPath: r.logo_path || null,
      primaryColor: r.primary_color || '#0f766e',
      secondaryColor: r.secondary_color || '#ffffff',
      emailDomain: r.email_domain || null,
      domain: r.domain || null,
      status: r.status || 'active',
      planId: r.plan_id || 'trial',
      subscriptionStatus: r.subscription_status || 'active',
      trialEndsAt: r.trial_ends_at || null,
      createdAt: r.created_at,
      totalUsers: Number(r.total_users || 0),
      totalAdmins: Number(r.total_admins || 0),
      admins,
      adminUsername: admins[0]?.username || '—',
      adminEmail: admins[0]?.email || '—'
    };
  });
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM companies WHERE id = ?', [id]);
  if (!rows[0]) return null;
  const r = rows[0];
  const admins = await listCompanyAdmins(id);

  return {
    id: Number(r.id),
    name: r.name,
    title: r.title || '',
    description: r.description || '',
    logoPath: r.logo_path || null,
    primaryColor: r.primary_color || '#0f766e',
    secondaryColor: r.secondary_color || '#ffffff',
    emailDomain: r.email_domain || null,
    domain: r.domain || null,
    status: r.status || 'active',
    planId: r.plan_id || 'trial',
    subscriptionStatus: r.subscription_status || 'active',
    trialEndsAt: r.trial_ends_at || null,
    createdAt: r.created_at,
    admins,
    adminUsername: admins[0]?.username || '—',
    adminEmail: admins[0]?.email || '—'
  };
}

async function findByName(name, excludeId = null) {
  if (!name || typeof name !== 'string') return null;
  let query = "SELECT * FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND status IN ('active', 'pending')";
  const params = [name.trim()];

  if (excludeId !== null && excludeId !== undefined) {
    query += " AND id != ?";
    params.push(Number(excludeId));
  }

  query += " LIMIT 1";
  const [rows] = await pool.execute(query, params);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    name: r.name,
    title: r.title || '',
    description: r.description || '',
    logoPath: r.logo_path || null,
    primaryColor: r.primary_color || '#0f766e',
    secondaryColor: r.secondary_color || '#ffffff',
    emailDomain: r.email_domain || null,
    domain: r.domain || null,
    status: r.status || 'active',
    createdAt: r.created_at
  };
}

async function listCompanyAdmins(companyId) {
  const authRepository = require('../auth/auth.repository');
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.email, u.original_email, u.profile_image_path, u.role_id, r.name AS role_name, r.description AS role_description, u.created_at
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.company_id = ? AND (r.name LIKE '%admin%' OR r.name != 'user')
     ORDER BY u.id ASC`,
    [companyId]
  );

  const admins = await Promise.all(rows.map(async (r) => {
    const access = await authRepository.findAccessByUserId(r.id);
    return {
      id: Number(r.id),
      username: r.username,
      email: r.email,
      originalEmail: r.original_email || null,
      profileImagePath: r.profile_image_path || null,
      roleId: Number(r.role_id),
      roleName: r.role_name,
      roleDescription: r.role_description || '',
      permissions: access.permissions || [],
      createdAt: r.created_at
    };
  }));

  return admins;
}

async function addCompanyAdmin(companyId, { username, email, originalEmail, password, roleId }) {
  let targetRoleId = roleId ? Number(roleId) : null;
  if (!targetRoleId) {
    const [adminRole] = await pool.execute("SELECT id FROM roles WHERE name = 'admin'");
    targetRoleId = adminRole[0]?.id;
  }
  if (!targetRoleId) throw new Error('Admin role not found in database.');

  const crypto = require('crypto');
  const rawPass = password && typeof password === 'string' && password.length >= 8
    ? password
    : crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(rawPass, 12);

  const [result] = await pool.execute(
    'INSERT INTO users (username, email, original_email, password_hash, role_id, company_id) VALUES (?, ?, ?, ?, ?, ?)',
    [username, email, originalEmail || null, passwordHash, targetRoleId, companyId]
  );
  return {
    id: result.insertId,
    username,
    email,
    companyId,
    roleId: targetRoleId
  };
}

async function updateCompanyAdminRole(companyId, adminId, roleId) {
  const [result] = await pool.execute(
    'UPDATE users SET role_id = ? WHERE id = ? AND company_id = ?',
    [Number(roleId), Number(adminId), Number(companyId)]
  );
  return result.affectedRows > 0;
}

async function updateCompanyAdminDetails(companyId, adminId, { username, email, originalEmail, password, roleId }) {
  const updates = [];
  const values = [];
  if (originalEmail !== undefined) {
    updates.push('original_email = ?');
    values.push(originalEmail || null);
  }
  if (username) {
    updates.push('username = ?');
    values.push(username);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (password && password.length >= 8) {
    const hash = await bcrypt.hash(password, 12);
    updates.push('password_hash = ?');
    values.push(hash);
  }
  if (roleId) {
    updates.push('role_id = ?');
    values.push(Number(roleId));
  }

  if (updates.length === 0) return true;

  values.push(Number(adminId), Number(companyId));
  const [result] = await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
    values
  );
  return result.affectedRows > 0;
}

async function deleteCompanyAdmin(companyId, adminId) {
  const [result] = await pool.execute(
    `DELETE u FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.company_id = ? AND r.name != 'super_admin'`,
    [adminId, companyId]
  );
  return result.affectedRows > 0;
}

async function createCompany({ name, title, description, logoPath, primaryColor, secondaryColor, emailDomain, domain, status = 'active', planId = 'trial', subscriptionStatus = 'active', trialEndsAt }) {
  // If not provided, calculate a trial end date 30 days from now (or random within next 30 days)
  let calculatedTrialEnd = trialEndsAt;
  if (!calculatedTrialEnd && (planId === 'trial' || !planId)) {
    const randomDays = Math.floor(Math.random() * 20) + 10; // 10 to 30 days in the month
    const d = new Date();
    d.setDate(d.getDate() + randomDays);
    calculatedTrialEnd = d;
  }

  const [result] = await pool.execute(
    'INSERT INTO companies (name, title, description, logo_path, primary_color, secondary_color, email_domain, domain, status, plan_id, subscription_status, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, title || null, description || null, logoPath || null, primaryColor || '#0f766e', secondaryColor || '#ffffff', emailDomain || null, domain || null, status || 'active', planId || 'trial', subscriptionStatus || 'active', calculatedTrialEnd || null]
  );
  return result.insertId;
}

async function updateCompany(id, { name, title, description, logoPath, primaryColor, secondaryColor, emailDomain, domain, status, planId, subscriptionStatus }) {
  const updates = ['name = ?', 'title = ?', 'description = ?'];
  const values = [name, title || null, description || null];

  if (logoPath !== undefined) {
    updates.push('logo_path = ?');
    values.push(logoPath || null);
  }

  if (primaryColor) {
    updates.push('primary_color = ?');
    values.push(primaryColor);
  }

  if (secondaryColor) {
    updates.push('secondary_color = ?');
    values.push(secondaryColor);
  }

  if (emailDomain !== undefined) {
    updates.push('email_domain = ?');
    values.push(emailDomain || null);
  }

  if (domain !== undefined) {
    updates.push('domain = ?');
    values.push(domain || null);
  }

  if (status) {
    updates.push('status = ?');
    values.push(status);
  }

  if (planId) {
    updates.push('plan_id = ?');
    values.push(planId);
  }

  if (subscriptionStatus) {
    updates.push('subscription_status = ?');
    values.push(subscriptionStatus);
  }

  values.push(id);
  await pool.execute(`UPDATE companies SET ${updates.join(', ')} WHERE id = ?`, values);
  try {
    const { clearCompanySubscriptionCache } = require('../../middleware/subscription.middleware');
    clearCompanySubscriptionCache(id);
  } catch {}
  return findById(id);
}

async function deleteCompany(id) {
  const companyId = Number(id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Delete notifications related to this company or its users
    await conn.execute('DELETE FROM notifications WHERE company_id = ? OR recipient_user_id IN (SELECT id FROM users WHERE company_id = ?)', [companyId, companyId]);

    // 2. Delete tasks and child records belonging to company or company users
    await conn.execute(`
      DELETE tn FROM task_notes tn 
      WHERE tn.task_id IN (SELECT t.id FROM tasks t WHERE t.company_id = ? OR t.user_id IN (SELECT id FROM users WHERE company_id = ?))
         OR tn.user_id IN (SELECT id FROM users WHERE company_id = ?)
    `, [companyId, companyId, companyId]);

    await conn.execute(`
      DELETE ts FROM timesheets ts 
      WHERE ts.user_id IN (SELECT id FROM users WHERE company_id = ?)
    `, [companyId]);

    await conn.execute('DELETE FROM tasks WHERE company_id = ? OR user_id IN (SELECT id FROM users WHERE company_id = ?)', [companyId, companyId]);

    // 3. Delete projects belonging to company or company users
    await conn.execute('DELETE FROM projects WHERE company_id = ? OR user_id IN (SELECT id FROM users WHERE company_id = ?)', [companyId, companyId]);

    // 4. Delete task statuses of this company
    await conn.execute('DELETE FROM task_statuses WHERE company_id = ?', [companyId]);

    // 5. Delete all users belonging to this company (except system super_admin if any)
    await conn.execute(`
      DELETE u FROM users u 
      LEFT JOIN roles r ON r.id = u.role_id 
      WHERE u.company_id = ? AND (r.name IS NULL OR r.name != 'super_admin')
    `, [companyId]);

    // 6. Delete company-specific roles if any
    await conn.execute('DELETE FROM roles WHERE company_id = ?', [companyId]);

    // 7. Delete the company record itself
    const [result] = await conn.execute('DELETE FROM companies WHERE id = ?', [companyId]);

    await conn.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function findPublicCompanyByQuery(queryStr) {
  if (!queryStr || typeof queryStr !== 'string') return null;
  const rawClean = queryStr.trim().toLowerCase();
  if (!rawClean) return null;

  // Clean hostname stripping port e.g. "company1.com:4200" -> "company1.com"
  const clean = rawClean.split(':')[0].trim();
  const domainQuery = clean.startsWith('@') ? clean : `@${clean}`;
  const cleanNoDash = clean.replace(/[\s-]+/g, '');
  const likeQuery = `%${clean}%`;
  const likeNoDashQuery = `%${cleanNoDash}%`;

  const [rows] = await pool.execute(
    `SELECT id, name, title, description, logo_path, primary_color, secondary_color, email_domain, domain, status
     FROM companies
     WHERE status = 'active' AND (
       LOWER(domain) = ? OR
       LOWER(domain) LIKE ? OR
       LOWER(name) = ? OR
       LOWER(REPLACE(REPLACE(name, ' ', ''), '-', '')) = ? OR
       LOWER(name) LIKE ? OR
       LOWER(REPLACE(REPLACE(name, ' ', ''), '-', '')) LIKE ? OR
       id = ? OR
       LOWER(email_domain) = ? OR
       LOWER(email_domain) = ? OR
       LOWER(email_domain) LIKE ?
     )
     ORDER BY (LOWER(domain) = ?) DESC, (LOWER(name) = ?) DESC, id ASC
     LIMIT 1`,
    [
      clean,
      likeQuery,
      clean,
      cleanNoDash,
      likeQuery,
      likeNoDashQuery,
      isNaN(Number(clean)) ? -1 : Number(clean),
      clean,
      domainQuery,
      likeQuery,
      clean,
      clean
    ]
  );

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    name: r.name,
    title: r.title || '',
    description: r.description || '',
    logoPath: r.logo_path || null,
    primaryColor: r.primary_color || '#0f766e',
    secondaryColor: r.secondary_color || '#ffffff',
    emailDomain: r.email_domain || null,
    domain: r.domain || null
  };
}

module.exports = {
  listCompanies,
  findById,
  findByName,
  findPublicCompanyByQuery,
  listCompanyAdmins,
  addCompanyAdmin,
  updateCompanyAdminDetails,
  updateCompanyAdminRole,
  deleteCompanyAdmin,
  createCompany,
  updateCompany,
  deleteCompany
};
