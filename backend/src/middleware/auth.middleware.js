const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const authRepository = require('../modules/auth/auth.repository');

async function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : (request.query?.token ? String(request.query.token) : '');
  if (!token) return response.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      return response.status(401).json({ error: 'Invalid authentication subject.' });
    }

    // Fast path: If JWT payload contains tenant claims, use them directly (0 DB queries)
    let companyId = payload.companyId !== undefined ? payload.companyId : null;
    let roleName = payload.role || 'user';
    let email = payload.email || '';
    let username = payload.username || '';

    // Fallback for older tokens missing payload claims
    if (payload.companyId === undefined || !payload.role) {
      const user = await authRepository.findById(userId);
      if (!user) return response.status(401).json({ error: 'User no longer exists.' });
      roleName = user.role_name || user.role || 'user';
      companyId = user.company_id ? Number(user.company_id) : null;
      email = user.email;
      username = user.username;
    }

    request.user = {
      sub: userId,
      email,
      username,
      role: roleName,
      companyId,
      isSuperAdmin: roleName === 'super_admin'
    };
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function requireAdmin(request, response, next) {
  return requirePermission('users.manage')(request, response, next);
}

function requirePermission(permission) {
  return async function permissionMiddleware(request, response, next) {
    try {
      if (request.user?.isSuperAdmin || request.user?.role === 'admin' || request.user?.role === 'owner') {
        request.userAccess = { role: request.user?.role || 'admin', permissions: ['*'] };
        return next();
      }
      const access = await authRepository.findAccessByUserId(Number(request.user.sub));
      const requiredList = Array.isArray(permission) ? permission : [permission];
      const hasPermission = requiredList.some((p) => access.permissions.includes(p) || access.permissions.includes('*'));

      if (!hasPermission) {
        return response.status(403).json({ error: 'You do not have permission for this action.' });
      }
      request.userAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requireAuth, requireAdmin, requirePermission };
