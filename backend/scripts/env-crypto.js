const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'ENC(v1:';
const SUFFIX = ')';

const projectRoot = path.resolve(__dirname, '..');
const defaultKeyPath = path.join(projectRoot, '.env.key');
const defaultEnvPath = path.join(projectRoot, '.env');

function validateKeyHex(hex, sourceName) {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Invalid master key in ${sourceName}: expected a 64-character hex string (256-bit key).`);
  }
}

function loadMasterKey({ createIfMissing = false } = {}) {
  const envKey = process.env.ENV_MASTER_KEY && process.env.ENV_MASTER_KEY.trim();
  if (envKey) {
    validateKeyHex(envKey, 'ENV_MASTER_KEY');
    return Buffer.from(envKey, 'hex');
  }

  if (fs.existsSync(defaultKeyPath)) {
    const fileContent = fs.readFileSync(defaultKeyPath, 'utf8');
    const match = fileContent.match(/ENV_MASTER_KEY\s*=\s*([0-9a-fA-F]{64})/);
    const rawHex = match ? match[1] : fileContent.trim();
    validateKeyHex(rawHex, '.env.key');
    return Buffer.from(rawHex, 'hex');
  }

  if (createIfMissing) {
    const newKeyHex = crypto.randomBytes(32).toString('hex');
    const keyFileContent = [
      '# Master Encryption Key for .env (DO NOT COMMIT TO GIT)',
      `ENV_MASTER_KEY=${newKeyHex}`,
      ''
    ].join('\n');
    fs.writeFileSync(defaultKeyPath, keyFileContent, { encoding: 'utf8', mode: 0o600 });
    console.log(`Generated new 256-bit master key in ${path.relative(projectRoot, defaultKeyPath)}`);
    return Buffer.from(newKeyHex, 'hex');
  }

  return null;
}

function isEncryptedValue(value) {
  return typeof value === 'string' && value.startsWith(PREFIX) && value.endsWith(SUFFIX);
}

function encryptValue(plainText, keyBuffer) {
  if (plainText === '' || isEncryptedValue(plainText)) return plainText;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}${SUFFIX}`;
}

function decryptValue(value, keyBuffer) {
  if (!isEncryptedValue(value)) return value;
  if (!keyBuffer) {
    throw new Error(
      'Encrypted value found in .env, but no master key was found. Provide ENV_MASTER_KEY or .env.key.'
    );
  }
  const inner = value.slice(PREFIX.length, -SUFFIX.length);
  const parts = inner.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted .env value.');
  }
  const [ivHex, tagHex, cipherHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

/**
 * Automatically decrypts any ENC(v1:...) values loaded into process.env in memory.
 */
function decryptProcessEnv() {
  const hasEncrypted = Object.values(process.env).some((v) => isEncryptedValue(v));
  if (!hasEncrypted) return;
  const keyBuffer = loadMasterKey({ createIfMissing: false });
  for (const [key, val] of Object.entries(process.env)) {
    if (isEncryptedValue(val)) {
      process.env[key] = decryptValue(val, keyBuffer);
    }
  }
}

function transformEnvFile(envFilePath, mode) {
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`File not found: ${envFilePath}`);
  }
  const keyBuffer = loadMasterKey({ createIfMissing: mode === 'encrypt' });
  const content = fs.readFileSync(envFilePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let count = 0;

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return line;

    const keyPart = line.slice(0, eqIdx);
    const rawValPart = line.slice(eqIdx + 1).trim();
    const unquotedVal = rawValPart.replace(/^['"]|['"]$/g, '');
    if (!unquotedVal) return line;

    if (mode === 'encrypt') {
      if (isEncryptedValue(unquotedVal)) return line;
      count++;
      return `${keyPart}=${encryptValue(unquotedVal, keyBuffer)}`;
    } else {
      if (!isEncryptedValue(unquotedVal)) return line;
      count++;
      const plain = decryptValue(unquotedVal, keyBuffer);
      const needsQuotes = /\s/.test(plain);
      return `${keyPart}=${needsQuotes ? `"${plain}"` : plain}`;
    }
  });

  fs.writeFileSync(envFilePath, updatedLines.join('\n'), 'utf8');
  console.log(
    `${mode === 'encrypt' ? 'Encrypted' : 'Decrypted'} ${count} variable(s) in ${path.relative(projectRoot, envFilePath)}`
  );
}

if (require.main === module) {
  const action = process.argv[2];
  const targetFile = process.argv[3] ? path.resolve(projectRoot, process.argv[3]) : defaultEnvPath;
  if (action !== 'encrypt' && action !== 'decrypt') {
    console.error('Usage: node scripts/env-crypto.js <encrypt|decrypt> [.env]');
    process.exit(1);
  }
  transformEnvFile(targetFile, action);
}

module.exports = {
  loadMasterKey,
  isEncryptedValue,
  encryptValue,
  decryptValue,
  decryptProcessEnv,
  transformEnvFile
};