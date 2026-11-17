const bcrypt = require('bcryptjs');
const companyRepository = require('./company.repository');
const taskService = require('../tasks/task.service');
const taskRepository = require('../tasks/task.repository');
const { pool } = require('../../config/database');

async function listCompanies() {
  const companies = await companyRepository.listCompanies();
  
  // Total summary statistics
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const pendingCompanies = companies.filter(c => c.status === 'pending').length;
  const totalAdmins = companies.reduce((sum, c) => sum + (c.totalAdmins || c.admins?.length || 0), 0);
  const totalUsers = companies.reduce((sum, c) => sum + c.totalUsers, 0);

  return {
    companies,
    stats: {
      totalCompanies,
      activeCompanies,
      pendingCompanies,
      totalAdmins,
      totalUsers
    }
  };
}

async function createCompanyWithAdmin(input) {
  const companyName = typeof input?.companyName === 'string' ? input.companyName.trim() : (typeof input?.name === 'string' ? input.name.trim() : '');
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const logoPath = typeof input?.logoPath === 'string' ? input.logoPath.trim() : null;

  let emailDomain = null;
  if (typeof input?.emailDomain === 'string' && input.emailDomain.trim()) {
    const trimmed = input.emailDomain.trim();
    emailDomain = trimmed.startsWith('@') ? trimmed : '@' + trimmed;
  } else if (input?.emailDomain === undefined && companyName && input?.status !== 'pending') {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    emailDomain = slug ? `@${slug}.com` : '@company.com';
  }

  const adminUsername = typeof input?.adminUsername === 'string' ? input.adminUsername.trim() : '';
  let adminEmail = typeof input?.adminEmail === 'string' ? input.adminEmail.trim().toLowerCase() : '';
  if (adminEmail && !adminEmail.includes('@') && emailDomain) {
    adminEmail = `${adminEmail}${emailDomain}`;
  }
  const adminPassword = typeof input?.adminPassword === 'string' ? input.adminPassword : '';

  if (!companyName) {
    const error = new Error('Company Name is required.');
    error.statusCode = 400;
    throw error;
  }

  // Check if a company with this name already exists
  const existingCompany = await companyRepository.findByName(companyName);
  if (existingCompany) {
    const error = new Error('A company workspace is already registered with this name.');
    error.statusCode = 409;
    error.code = 'COMPANY_NAME_EXISTS';
    throw error;
  }

  // Pre-validate: Check if admin email is already registered to an existing account to prevent orphan company creation
  const [existingUserRows] = await pool.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existingUserRows.length > 0) {
    const error = new Error('That email address is already registered to an existing account.');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const primaryColor = typeof input?.primaryColor === 'string' && input.primaryColor.trim() ? input.primaryColor.trim() : '#0f766e';
  const secondaryColor = typeof input?.secondaryColor === 'string' && input.secondaryColor.trim() ? input.secondaryColor.trim() : '#ffffff';
  const domain = typeof input?.domain === 'string' && input.domain.trim() ? input.domain.trim().toLowerCase() : null;
  const status = typeof input?.status === 'string' && ['active', 'suspended', 'pending', 'rejected'].includes(input.status) ? input.status : 'active';

  const isPendingRegistration = status === 'pending';
  if (!adminUsername || !adminEmail || (!isPendingRegistration && adminPassword.length < 8)) {
    const error = new Error('Initial admin username and valid email are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\S+@\S+\.\S+$/.test(adminEmail)) {
    const error = new Error('A valid admin email address is required (e.g. admin@company.com).');
    error.statusCode = 400;
    throw error;
  }

  const planId = input?.planId || 'trial';
  let companyId = null;

  try {
    // 1. Create Company
    companyId = await companyRepository.createCompany({
      name: companyName,
      title,
      description,
      logoPath,
      primaryColor,
      secondaryColor,
      emailDomain,
      domain,
      status,
      planId
    });

    // 2. Create Initial Company Admin User
    const adminUser = await companyRepository.addCompanyAdmin(companyId, {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword
    });

    // 3. Assign initial statuses to company if provided, or initialize standard default statuses
    if (Array.isArray(input?.statuses) && input.statuses.length > 0) {
      await taskService.updateStatuses(companyId, input.statuses);
    } else if (typeof input?.statuses === 'string' && input.statuses.trim()) {
      try {
        const parsedStatuses = JSON.parse(input.statuses);
        if (Array.isArray(parsedStatuses) && parsedStatuses.length > 0) {
          await taskService.updateStatuses(companyId, parsedStatuses);
        } else {
          await taskRepository.ensureDefaultCompanyStatuses(companyId);
        }
      } catch {
        await taskRepository.ensureDefaultCompanyStatuses(companyId);
      }
    } else {
      await taskRepository.ensureDefaultCompanyStatuses(companyId);
    }

    const company = await companyRepository.findById(companyId);
    return {
      company,
      adminUser
    };
  } catch (error) {
    // Atomic Integrity: If anything failed after creating the company record, clean up orphaned rows immediately
    if (companyId) {
      try {
        await pool.execute('DELETE FROM users WHERE company_id = ?', [companyId]);
        await pool.execute('DELETE FROM task_statuses WHERE company_id = ?', [companyId]);
        await pool.execute('DELETE FROM companies WHERE id = ?', [companyId]);
        console.warn(`[WorkspaceCreation] Rolled back partially created company ID ${companyId} due to error: ${error.message}`);
      } catch (cleanupErr) {
        console.error('Failed to cleanup company after registration error:', cleanupErr);
      }
    }
    throw error;
  }
}

async function addCompanyAdmin(companyId, input) {
  const existing = await companyRepository.findById(companyId);
  if (!existing) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }

  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  let email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email && !email.includes('@') && existing.emailDomain) {
    email = `${email}${existing.emailDomain}`;
  }
  const password = typeof input?.password === 'string' ? input.password : '';
  const roleId = input?.roleId ? Number(input.roleId) : undefined;

  if (!username || !email || password.length < 8) {
    const error = new Error('Admin username, valid email, and password (min 8 chars) are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('A valid email address is required (e.g. admin@company.com).');
    error.statusCode = 400;
    throw error;
  }

  const newAdmin = await companyRepository.addCompanyAdmin(companyId, { username, email, password, roleId });
  const updatedAdmins = await companyRepository.listCompanyAdmins(companyId);

  return {
    admin: newAdmin,
    admins: updatedAdmins
  };
}

async function updateCompanyAdmin(companyId, adminId, input) {
  const existingCompany = await companyRepository.findById(companyId);
  if (!existingCompany) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }

  const username = typeof input?.username === 'string' && input.username.trim() ? input.username.trim() : undefined;
  let email = typeof input?.email === 'string' && input.email.trim() ? input.email.trim().toLowerCase() : undefined;
  if (email && !email.includes('@') && existingCompany.emailDomain) {
    email = `${email}${existingCompany.emailDomain}`;
  }
  const password = typeof input?.password === 'string' && input.password ? input.password : undefined;
  const roleId = input?.roleId ? Number(input.roleId) : undefined;

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('A valid email address is required (e.g. admin@company.com).');
    error.statusCode = 400;
    throw error;
  }

  if (password && password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  await companyRepository.updateCompanyAdminDetails(companyId, adminId, { username, email, password, roleId });
  return companyRepository.listCompanyAdmins(companyId);
}

async function updateCompanyAdminRole(companyId, adminId, roleId) {
  const existing = await companyRepository.findById(companyId);
  if (!existing) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }
  const success = await companyRepository.updateCompanyAdminRole(companyId, adminId, roleId);
  if (!success) {
    const error = new Error('Admin account not found.');
    error.statusCode = 404;
    throw error;
  }
  return companyRepository.listCompanyAdmins(companyId);
}

async function deleteCompanyAdmin(companyId, adminId) {
  const existing = await companyRepository.findById(companyId);
  if (!existing) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }

  const admins = await companyRepository.listCompanyAdmins(companyId);
  if (admins.length <= 1) {
    const error = new Error('Cannot delete the last admin account for this company. Each company must have at least one admin.');
    error.statusCode = 400;
    throw error;
  }

  const success = await companyRepository.deleteCompanyAdmin(companyId, adminId);
  if (!success) {
    const error = new Error('Admin account not found for this company.');
    error.statusCode = 404;
    throw error;
  }

  return companyRepository.listCompanyAdmins(companyId);
}

async function updateCompany(id, input) {
  const existing = await companyRepository.findById(id);
  if (!existing) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }

  const name = typeof input?.name === 'string' ? input.name.trim() : existing.name;
  if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
    const conflict = await companyRepository.findByName(name, id);
    if (conflict) {
      const error = new Error('Another active company workspace is already registered with this name.');
      error.statusCode = 409;
      error.code = 'COMPANY_NAME_EXISTS';
      throw error;
    }
  }
  const title = typeof input?.title === 'string' ? input.title.trim() : existing.title;
  const description = typeof input?.description === 'string' ? input.description.trim() : existing.description;
  const logoPath = input?.logoPath === null ? null : (typeof input?.logoPath === 'string' && input.logoPath.trim() ? input.logoPath.trim() : existing.logoPath);
  const primaryColor = typeof input?.primaryColor === 'string' && input.primaryColor.trim() ? input.primaryColor.trim() : existing.primaryColor;
  const secondaryColor = typeof input?.secondaryColor === 'string' && input.secondaryColor.trim() ? input.secondaryColor.trim() : existing.secondaryColor;
  let emailDomain;
  if (input?.emailDomain === null || (typeof input?.emailDomain === 'string' && input.emailDomain.trim() === '')) {
    emailDomain = null;
  } else if (typeof input?.emailDomain === 'string') {
    const trimmed = input.emailDomain.trim();
    emailDomain = trimmed.startsWith('@') ? trimmed : '@' + trimmed;
  } else {
    emailDomain = existing.emailDomain;
  }
  const domain = input?.domain === null ? null : (typeof input?.domain === 'string' ? input.domain.trim().toLowerCase() : existing.domain);
  const status = typeof input?.status === 'string' && ['active', 'suspended', 'pending', 'rejected'].includes(input.status) ? input.status : existing.status;

  return companyRepository.updateCompany(id, { name, title, description, logoPath, primaryColor, secondaryColor, emailDomain, domain, status });
}

async function deleteCompany(id) {
  const existing = await companyRepository.findById(id);
  if (!existing) {
    const error = new Error('Company not found.');
    error.statusCode = 404;
    throw error;
  }
  return companyRepository.deleteCompany(id);
}

async function getCompanyById(id) {
  return companyRepository.findById(id);
}

module.exports = {
  listCompanies,
  getCompanyById,
  createCompanyWithAdmin,
  addCompanyAdmin,
  updateCompanyAdmin,
  updateCompanyAdminRole,
  deleteCompanyAdmin,
  updateCompany,
  deleteCompany
};
