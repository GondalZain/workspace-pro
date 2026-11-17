import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadMasterKey, decryptValue, isEncryptedValue } from './env-crypto.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environment = process.argv[2] || process.env.APP_ENV || process.env.NODE_ENV || 'development';
const environmentEnvPath = path.join(projectRoot, `.env.${environment}`);
const defaultEnvPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'public', 'env.js');

let envText = '';
let sourcePath = 'process.env';
try {
  envText = await readFile(environmentEnvPath, 'utf8');
  sourcePath = environmentEnvPath;
} catch (error) {
  if (error.code === 'ENOENT') {
    try {
      envText = await readFile(defaultEnvPath, 'utf8');
      sourcePath = defaultEnvPath;
    } catch (fallbackError) {
      if (fallbackError.code === 'ENOENT') {
        try {
          envText = await readFile(path.join(projectRoot, '.env.example'), 'utf8');
          sourcePath = path.join(projectRoot, '.env.example');
        } catch {
          envText = '';
          sourcePath = 'process.env';
        }
      } else {
        throw fallbackError;
      }
    }
  } else {
    throw error;
  }
}

const masterKey = loadMasterKey({ createIfMissing: false });
const resolveValue = (val) => {
  if (!val) return '';
  return isEncryptedValue(val) ? decryptValue(val, masterKey) : val;
};

const values = {};
for (const line of envText.split(/\r?\n/)) {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) continue;

  const separatorIndex = trimmedLine.indexOf('=');
  if (separatorIndex === -1) continue;

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const rawValue = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
  values[key] = resolveValue(rawValue);
}

const apiBaseUrl = resolveValue(process.env.API_BASE_URL) || values.API_BASE_URL || '/api';

const envConfig = {
  API_BASE_URL: apiBaseUrl,
  SUPERADMIN_SUBDOMAIN: resolveValue(process.env.SUPERADMIN_SUBDOMAIN) || values.SUPERADMIN_SUBDOMAIN || 'superadmin',
  SUPERADMIN_DOMAIN: resolveValue(process.env.SUPERADMIN_DOMAIN) || values.SUPERADMIN_DOMAIN || '',
  BASE_DOMAIN: resolveValue(process.env.BASE_DOMAIN) || values.BASE_DOMAIN || '',
  STRIPE_PUBLISHABLE_KEY: resolveValue(process.env.STRIPE_PUBLISHABLE_KEY) || values.STRIPE_PUBLISHABLE_KEY || ''
};

await writeFile(
  outputPath,
  `window.__env = ${JSON.stringify(envConfig, null, 2)};\n`,
  'utf8'
);

console.log(`Generated ${path.relative(projectRoot, outputPath)} for ${environment} from ${path.relative(projectRoot, sourcePath)}`);