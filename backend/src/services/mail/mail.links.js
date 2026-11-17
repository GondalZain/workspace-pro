const { appClientUrl, appClientPort } = require('../../config/env');

/**
 * Normalizes client base URL from env (strips trailing slash)
 */
function getClientBaseUrl() {
  const base = (appClientUrl || 'http://localhost:4200').trim().replace(/\/+$/, '');
  return base;
}

/**
 * Builds an absolute frontend URL for any company domain and path.
 * 
 * Works completely dynamically between local dev and cloud production:
 * 1. If domain is configured:
 *    - In dev (localhost / 127.0.0.1): respects APP_CLIENT_PORT (e.g. http://acme.localhost:4200/create-password?token=...)
 *    - In production (e.g. acme.mycompany.com): creates https://acme.mycompany.com/create-password?token=...
 * 2. If no domain is configured:
 *    - Uses APP_CLIENT_URL from .env (e.g. https://app.myproduction.com/create-password?token=...)
 *
 * @param {string|null|undefined} domain - The company domain (e.g. 'boss.localhost' or 'portal.acme.com')
 * @param {string} path - The route path (e.g. '/create-password' or '/login')
 * @param {Record<string, string>} [queryParams] - Optional query parameters
 * @returns {string} Fully qualified absolute URL
 */
function buildDynamicClientUrl(domain, path = '', queryParams = {}, req = null) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanDomain = (domain || '').trim().toLowerCase();

  // Detect if the request originated from XAMPP / Apache (port 80/443 without :4200, or /todo base path)
  const originHeader = req ? String(req.headers?.origin || req.headers?.referer || '').trim() : '';
  let originPort = null;
  let originBasePath = '';
  if (originHeader) {
    try {
      const parsedOrigin = new URL(originHeader);
      originPort = parsedOrigin.port; // '' on port 80/443, '4200' on Angular dev server
      if (parsedOrigin.pathname.toLowerCase().startsWith('/todo')) {
        originBasePath = '/todo';
      } else if (!originPort && (parsedOrigin.hostname.includes('localhost') || parsedOrigin.hostname.includes('127.0.0.1'))) {
        // On local XAMPP Apache (port 80), the app lives under /todo
        originBasePath = '/todo';
      }
    } catch {}
  }

  let baseUrl = '';

  if (cleanDomain) {
    if (cleanDomain.includes('localhost') || cleanDomain.includes('127.0.0.1')) {
      const hostOnly = cleanDomain.split(':')[0];
      const effectivePort = originPort !== null ? originPort : appClientPort;
      const portSuffix = effectivePort ? `:${effectivePort}` : '';
      baseUrl = `http://${hostOnly}${portSuffix}${originBasePath}`;
    } else {
      // Production cloud domain
      if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
        baseUrl = cleanDomain.replace(/\/+$/, '');
      } else {
        baseUrl = `https://${cleanDomain}`;
      }
    }
  } else {
    // Default platform URL from .env (APP_CLIENT_URL)
    baseUrl = originHeader && originBasePath
      ? `http://localhost${originBasePath}`
      : getClientBaseUrl();
  }

  // Construct URL with query parameters
  const queryString = Object.entries(queryParams)
    .filter(([_, val]) => val !== undefined && val !== null)
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join('&');

  return queryString ? `${baseUrl}${cleanPath}?${queryString}` : `${baseUrl}${cleanPath}`;
}

module.exports = {
  getClientBaseUrl,
  buildDynamicClientUrl
};
