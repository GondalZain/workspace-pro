const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { databaseName, databaseUrl } = require('./env');

function buildPoolOptions(rawUrl) {
  let isLocal = true;
  let poolConfig = {};

  try {
    const url = new URL(rawUrl);
    isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    poolConfig = {
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)) || undefined,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 20000
    };
  } catch (e) {
    poolConfig = {
      uri: rawUrl,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 20000
    };
  }

  return { isLocal, poolConfig };
}

const { isLocal, poolConfig } = buildPoolOptions(databaseUrl);
const pool = mysql.createPool(poolConfig);

let adminPool = null;
if (isLocal) {
  let adminPoolUrl = databaseUrl;
  try {
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/';
    adminPoolUrl = adminUrl.toString();
  } catch (e) {
    adminPoolUrl = databaseUrl;
  }
  adminPool = mysql.createPool(adminPoolUrl);
}

function splitSqlStatements(sql) {
  const statements = [];
  let buffer = '';
  let quoteChar = null;
  let escaped = false;

  for (const char of sql) {
    if (quoteChar) {
      buffer += char;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quoteChar) {
        quoteChar = null;
      }

      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quoteChar = char;
      buffer += char;
      continue;
    }

    if (char === ';') {
      const statement = buffer.trim();
      if (statement) {
        statements.push(statement);
      }
      buffer = '';
      continue;
    }

    buffer += char;
  }

  const trailingStatement = buffer.trim();
  if (trailingStatement) {
    statements.push(trailingStatement);
  }

  return statements;
}

async function ensureDefaultAdminUser(poolInstance = pool, password = 'admin1234') {
  const email = 'admin@gmail.com';
  const username = 'admin';

  const [[adminRole]] = await poolInstance.execute('SELECT id FROM roles WHERE name = ?', ['admin']);
  if (!adminRole) return;

  const [existingUsers] = await poolInstance.execute('SELECT id FROM users WHERE email = ?', [email]);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existingUsers.length > 0) {
    await poolInstance.execute(
      'UPDATE users SET username = ?, password_hash = ?, role_id = ? WHERE email = ?',
      [username, passwordHash, adminRole.id, email]
    );
    return;
  }

  await poolInstance.execute(
    'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, adminRole.id]
  );
}

async function initializeDatabase() {
  if (isLocal && adminPool) {
    try {
      await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } catch (error) {
      console.warn(`[DB Init] Skipped CREATE DATABASE (${error.message})`);
    }
  }
  await runMigrations();
  await ensureDefaultSuperAdminUser();
}

async function ensureDefaultSuperAdminUser(poolInstance = pool, password = 'superadmin1234') {
  const email = 'superadmin@gmail.com';
  const username = 'Super Admin';

  const [[superAdminRole]] = await poolInstance.execute('SELECT id FROM roles WHERE name = ?', ['super_admin']);
  if (!superAdminRole) return;

  const [existingUsers] = await poolInstance.execute('SELECT id FROM users WHERE email = ?', [email]);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existingUsers.length > 0) {
    await poolInstance.execute(
      'UPDATE users SET username = ?, password_hash = ?, role_id = ?, company_id = NULL WHERE email = ?',
      [username, passwordHash, superAdminRole.id, email]
    );
    return;
  }

  await poolInstance.execute(
    'INSERT INTO users (username, email, password_hash, role_id, company_id) VALUES (?, ?, ?, ?, NULL)',
    [username, email, passwordHash, superAdminRole.id]
  );
}

async function runMigrations() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    applied_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_schema_migration_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const migrationsDirectory = path.join(__dirname, '../../migrations');
  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const [appliedRows] = await pool.execute(
      'SELECT id FROM schema_migrations WHERE name = ?',
      [migrationFile]
    );
    if (appliedRows.length > 0) continue;

    const migrationSql = await fs.readFile(path.join(migrationsDirectory, migrationFile), 'utf8');
    const statements = splitSqlStatements(migrationSql);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.execute(
        'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
        [migrationFile, new Date()]
      );
      await connection.commit();
      console.log(`Applied migration ${migrationFile}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = { pool, initializeDatabase, runMigrations, ensureDefaultAdminUser, ensureDefaultSuperAdminUser };
