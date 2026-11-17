/**
 * Dynamic domain, subdomain, and base-path detection utilities.
 *
 * Works seamlessly across:
 * - Angular dev server (http://localhost:4200/, http://tangent.localhost:4200/)
 * - XAMPP Apache server (http://localhost/todo/, http://tangent.localhost/todo/)
 * - Production domains (https://tangent.yourdomain.com/)
 */

export interface HostInfo {
  hostname: string;
  subdomain: string | null;
  isSuperAdmin: boolean;
  isLocalhost: boolean;
}

/**
 * Dynamically detects the application's base path (e.g., '/todo' on XAMPP or '' on root/dev server).
 */
export function getAppBasePath(): string {
  if (typeof document !== 'undefined') {
    const baseEl = document.querySelector('base');
    const href = baseEl?.getAttribute('href') || '/';
    const cleaned = href.replace(/\/+$/, '');
    if (cleaned && cleaned !== '/' && !cleaned.startsWith('http')) {
      return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    }
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname || '';
    if (path === '/todo' || path.startsWith('/todo/')) {
      return '/todo';
    }
  }
  return '';
}

/**
 * Gets configured superadmin subdomain keyword (e.g. 'superadmin' or 'admin').
 */
export function getSuperAdminSubdomain(): string {
  return (window.__env?.SUPERADMIN_SUBDOMAIN || 'superadmin').toLowerCase();
}

/**
 * Extracts host information dynamically from window.location.hostname.
 */
export function getHostInfo(hostname: string = window.location.hostname): HostInfo {
  const host = hostname.toLowerCase();
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');

  // If an exact full custom domain is configured (e.g. admin.company.com or portal.admin.com)
  const configuredSuperAdminDomain = window.__env?.SUPERADMIN_DOMAIN?.toLowerCase().trim();
  if (configuredSuperAdminDomain && host === configuredSuperAdminDomain) {
    return {
      hostname: host,
      subdomain: host.split('.')[0],
      isSuperAdmin: true,
      isLocalhost
    };
  }

  const parts = host.split('.');
  const configuredKeyword = getSuperAdminSubdomain();

  let subdomain: string | null = null;
  if (isLocalhost) {
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      subdomain = parts[0];
    }
  } else {
    if (parts.length >= 3 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  }

  // Matches either the configured prefix (e.g. 'superadmin' or 'admin')
  const isSuperAdmin = subdomain === configuredKeyword || subdomain === 'superadmin' || subdomain === 'admin';

  return {
    hostname: host,
    subdomain,
    isSuperAdmin,
    isLocalhost
  };
}

/**
 * Checks if the current visitor is on the Super Admin subdomain or domain.
 */
export function isSuperAdminHost(): boolean {
  return getHostInfo().isSuperAdmin;
}

/**
 * Checks if current host is a customized domain/subdomain (either any Company domain or Super Admin).
 * Returns false only on bare root localhost / 127.0.0.1 or root platform domain.
 */
export function isCustomDomainHost(): boolean {
  const info = getHostInfo();
  return info.isSuperAdmin || Boolean(info.subdomain);
}

/**
 * Returns tenant company subdomain (e.g., 'acme' from 'acme.localhost') if not superadmin.
 */
export function getCompanySubdomain(): string | null {
  const info = getHostInfo();
  if (info.isSuperAdmin) return null;
  return info.subdomain;
}

/**
 * Builds a full URL for a tenant company domain that dynamically preserves the port and XAMPP base path (/todo).
 */
export function getTenantDomainUrl(domain: string, path: string = '/'): string {
  const raw = (domain || '').trim();
  if (!raw) return '/';
  const basePath = getAppBasePath();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = cleanPath === '/' ? `${basePath}/` : `${basePath}${cleanPath}`;

  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    if (url.pathname === '/' || !url.pathname) {
      url.pathname = fullPath;
    }
    return url.toString();
  }

  const hostOnly = raw.split(':')[0];
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol || 'http:';
  return `${protocol}//${hostOnly}${port}${fullPath}`;
}

/**
 * Builds the URL to the Super Admin portal dynamically (preserving port and XAMPP /todo base path).
 */
export function getSuperAdminUrl(path: string = '/'): string {
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const basePath = getAppBasePath();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = cleanPath === '/' ? `${basePath}/` : `${basePath}${cleanPath}`;

  // 1. If an exact full domain was set in .env (e.g., SUPERADMIN_DOMAIN=admin.ittefaq.com)
  const fullDomain = window.__env?.SUPERADMIN_DOMAIN?.trim();
  if (fullDomain) {
    return `${protocol}//${fullDomain}${port}${fullPath}`;
  }

  const prefix = getSuperAdminSubdomain();

  // 2. Localhost development or XAMPP localhost
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
    return `${protocol}//${prefix}.localhost${port}${fullPath}`;
  }

  // 3. Production: use configured BASE_DOMAIN or auto-detect from window.location.hostname
  const baseDomain = window.__env?.BASE_DOMAIN?.trim();
  if (baseDomain) {
    return `${protocol}//${prefix}.${baseDomain}${fullPath}`;
  }

  const parts = host.split('.');
  const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : host;
  return `${protocol}//${prefix}.${rootDomain}${fullPath}`;
}