const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const authService = require('../src/modules/auth/auth.service');
const { ensureDefaultAdminUser } = require('../src/config/database');

test('public user sanitization strips sensitive fields', () => {
  const user = {
    id: 7,
    username: 'Ava',
    email: 'ava@company.com',
    password_hash: 'hash',
    profile_image_path: '/uploads/profiles/ava.png',
    role_id: 2,
    role_name: 'admin'
  };

  const result = authService.sanitizeUserForPublicView(user);

  assert.deepEqual(result, {
    id: 7,
    username: 'Ava',
    profileImagePath: '/uploads/profiles/ava.png'
  });
  assert.equal(result.email, undefined);
  assert.equal(result.roleId, undefined);
  assert.equal(result.permissions, undefined);
});

test('default admin account is seeded with the requested credentials', async () => {
  const calls = [];
  const fakePool = {
    execute: async (...args) => {
      calls.push(args);
      const [query] = args;

      if (query.includes('SELECT id FROM roles WHERE name = ?')) {
        return [[{ id: 9 }]];
      }

      if (query.includes('SELECT id FROM users WHERE email = ?')) {
        return [[]];
      }

      if (query.includes('INSERT INTO users')) {
        return [{ insertId: 42 }];
      }

      return [[]];
    }
  };

  await ensureDefaultAdminUser(fakePool, 'admin1234');

  assert.equal(calls[0][0], 'SELECT id FROM roles WHERE name = ?');
  assert.deepEqual(calls[0][1], ['admin']);
  assert.equal(calls[1][0], 'SELECT id FROM users WHERE email = ?');
  assert.deepEqual(calls[1][1], ['admin@gmail.com']);
  assert.equal(calls[2][0], 'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)');
  assert.deepEqual(calls[2][1][0], 'admin');
  assert.deepEqual(calls[2][1][1], 'admin@gmail.com');
  assert.ok(await bcrypt.compare('admin1234', calls[2][1][2]));
  assert.equal(calls[2][1][3], 9);
});
