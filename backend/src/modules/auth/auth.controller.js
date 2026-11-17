// @ts-nocheck
const authService = require('./auth.service');

async function register(request, response, next) {
  try {
    response.status(201).json(await authService.register({
      ...request.body,
      profileImagePath: request.file ? `/uploads/profiles/${request.file.filename}` : null
    }));
  } catch (error) {
    next(error);
  }
}

async function handleInboundEmail(request, response, next) {
  try {
    const inboundPayload = request.body || {};
    const result = await authService.handleInboundEmailRegistration(inboundPayload, request);
    response.json(result);
  } catch (error) {
    console.error('[InboundEmailHandler Error]:', error.message);
    response.status(error.statusCode || 500).json({ error: error.message });
  }
}
async function registerWorkspace(request, response, next) {
  try {
    const registrationResult = await authService.registerCompanyWorkspace(request.body, request);
    response.status(201).json(registrationResult);
  } catch (error) {
    next(error);
  }
}

async function login(request, response, next) {
  try {
    response.json(await authService.login(request.body));
  } catch (error) {
    next(error);
  }
}

async function listUsers(request, response, next) {
  try {
    const currentUserAccess = await authService.getAccess(Number(request.user.sub));
    const includeSensitive = currentUserAccess.permissions.includes('users.manage');
    response.json(await authService.listUsers({
      includeSensitive,
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    }));
  } catch (error) {
    next(error);
  }
}

async function getUserById(request, response, next) {
  try {
    const user = await authService.getUserById(Number(request.params.id), {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    });
    if (!user) return response.status(404).json({ error: 'User not found.' });
    response.json(user);
  } catch (error) {
    next(error);
  }
}

async function setRole(request, response, next) {
  try {
    const user = await authService.setRoleById(Number(request.params.id), request.body?.roleId, {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    });
    if (!user) return response.status(404).json({ error: 'User not found.' });
    response.json(user);
  } catch (error) {
    next(error);
  }
}

async function updateUser(request, response, next) {
  try {
    const removeProfileImage = request.body?.removeProfileImage === 'true' || request.body?.removeProfileImage === true;
    const profileImagePath = request.file
      ? `/uploads/profiles/${request.file.filename}`
      : removeProfileImage
        ? null
        : (typeof request.body?.profileImagePath === 'string' && request.body.profileImagePath.trim() ? request.body.profileImagePath.trim() : undefined);

    const user = await authService.updateUser(Number(request.params.id), {
      ...request.body,
      profileImagePath
    }, {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    });
    if (!user) return response.status(404).json({ error: 'User not found.' });
    response.json(user);
  } catch (error) {
    next(error);
  }
}

async function getMe(request, response, next) {
  try {
    const user = await authService.getUserById(Number(request.user.sub), {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    });
    if (!user) return response.status(404).json({ error: 'User not found.' });
    response.json(user);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(request, response, next) {
  try {
    const removeProfileImage = request.body?.removeProfileImage === 'true' || request.body?.removeProfileImage === true;
    const profileImagePath = request.file
      ? `/uploads/profiles/${request.file.filename}`
      : removeProfileImage
        ? null
        : (typeof request.body?.profileImagePath === 'string' && request.body.profileImagePath.trim() ? request.body.profileImagePath.trim() : undefined);

    const user = await authService.updateProfile(Number(request.user.sub), {
      ...request.body,
      profileImagePath
    });
    if (!user) return response.status(404).json({ error: 'User not found.' });
    response.json(user);
  } catch (error) {
    next(error);
  }
}

async function listRoles(request, response, next) {
  try {
    response.json(await authService.listRoles(request.user.companyId, request.user.isSuperAdmin));
  } catch (error) {
    next(error);
  }
}

async function listPermissions(request, response, next) {
  try {
    response.json(await authService.listPermissions());
  } catch (error) {
    next(error);
  }
}

async function createRole(request, response, next) {
  try {
    response.status(201).json(await authService.createRole(request.body, {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    }));
  } catch (error) {
    next(error);
  }
}

async function updateRole(request, response, next) {
  try {
    const role = await authService.updateRole(Number(request.params.id), request.body, {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    });
    if (!role) return response.status(404).json({ error: 'Role not found.' });
    response.json(role);
  } catch (error) {
    next(error);
  }
}

async function deleteRole(request, response, next) {
  try {
    if (!await authService.deleteRole(Number(request.params.id), {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    })) return response.status(404).json({ error: 'Role not found.' });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function createUser(request, response, next) {
  try {
    const profileImagePath = request.file ? `/uploads/profiles/${request.file.filename}` : null;
    const user = await authService.createUser({
      ...request.body,
      profileImagePath
    }, {
      companyId: request.user.companyId,
      isSuperAdmin: request.user.isSuperAdmin
    });
    response.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

async function companyLookup(request, response, next) {
  try {
    const hostHeader = request.headers['x-forwarded-host'] || request.headers['host'] || '';
    const cleanHost = hostHeader ? hostHeader.split(':')[0].trim().toLowerCase() : '';
    const queryStr = request.query.domain || request.query.company || request.query.slug || request.query.q || cleanHost;
    if (!queryStr) return response.json(null);
    const company = await authService.lookupCompany(queryStr);
    response.json(company || null);
  } catch (error) {
    next(error);
  }
}

async function verifyPasswordToken(request, response, next) {
  try {
    const token = request.query.token;
    const tokenStatus = await authService.verifyPasswordToken(token);
    response.json(tokenStatus);
  } catch (error) {
    next(error);
  }
}

async function createPassword(request, response, next) {
  try {
    const passwordCreationResult = await authService.createPasswordWithToken(request.body, request);
    response.json(passwordCreationResult);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleInboundEmail,
  register,
  registerWorkspace,
  login,
  createUser,
  listUsers,
  getUserById,
  setRole,
  updateUser,
  getMe,
  updateProfile,
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
  companyLookup,
  verifyPasswordToken,
  createPassword
};
