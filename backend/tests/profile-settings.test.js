const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const authService = require('../src/modules/auth/auth.service');
const authRepository = require('../src/modules/auth/auth.repository');

test('updateProfile allows a user to update username, email, password, and avatar', async () => {
  const originalUpdateProfile = authRepository.updateProfile;
  const originalFindAccessByUserId = authRepository.findAccessByUserId;

  authRepository.updateProfile = async (id, input) => ({
    id,
    username: input.username,
    email: input.email,
    profile_image_path: input.profileImagePath || null,
    role_id: 2,
    role_name: 'user'
  });
  authRepository.findAccessByUserId = async () => ({ permissions: ['tasks.create'] });

  try {
    const profile = await authService.updateProfile(12, {
      username: 'Jane Doe',
      email: 'jane@example.com',
      password: 'newpass123',
      profileImagePath: '/uploads/profiles/jane.png'
    });

    assert.equal(profile.id, 12);
    assert.equal(profile.username, 'Jane Doe');
    assert.equal(profile.email, 'jane@example.com');
    assert.equal(profile.profileImagePath, '/uploads/profiles/jane.png');
    assert.deepEqual(profile.permissions, ['tasks.create']);
  } finally {
    authRepository.updateProfile = originalUpdateProfile;
    authRepository.findAccessByUserId = originalFindAccessByUserId;
  }
});

test('updateProfile deletes the old uploaded image when a new one replaces it', async () => {
  const originalFindById = authRepository.findById;
  const originalUpdateProfile = authRepository.updateProfile;
  const originalFindAccessByUserId = authRepository.findAccessByUserId;
  const originalUnlink = fs.unlink;
  let deletedPath = null;

  authRepository.findById = async () => ({
    id: 12,
    username: 'Old Name',
    email: 'old@example.com',
    profile_image_path: '/uploads/profiles/old-avatar.png',
    role_id: 2,
    role_name: 'user'
  });
  authRepository.updateProfile = async (id, input) => ({
    id,
    username: input.username,
    email: input.email,
    profile_image_path: input.profileImagePath,
    role_id: 2,
    role_name: 'user'
  });
  authRepository.findAccessByUserId = async () => ({ permissions: ['tasks.create'] });
  fs.unlink = async (targetPath) => {
    deletedPath = targetPath;
  };

  try {
    const profile = await authService.updateProfile(12, {
      username: 'Jane Doe',
      email: 'jane@example.com',
      profileImagePath: '/uploads/profiles/new-avatar.png'
    });

    const expectedDeletePath = path.join(__dirname, '..', 'uploads', 'profiles', 'old-avatar.png');
    assert.equal(profile.profileImagePath, '/uploads/profiles/new-avatar.png');
    assert.equal(deletedPath, expectedDeletePath);
  } finally {
    authRepository.findById = originalFindById;
    authRepository.updateProfile = originalUpdateProfile;
    authRepository.findAccessByUserId = originalFindAccessByUserId;
    fs.unlink = originalUnlink;
  }
});

test('updateProfile does not delete the existing avatar when the profile is saved without changing the image', async () => {
  const originalFindById = authRepository.findById;
  const originalUpdateProfile = authRepository.updateProfile;
  const originalFindAccessByUserId = authRepository.findAccessByUserId;
  const originalUnlink = fs.unlink;
  let deletedPath = null;

  authRepository.findById = async () => ({
    id: 12,
    username: 'Jane Doe',
    email: 'jane@example.com',
    profile_image_path: '/uploads/profiles/jane.png',
    role_id: 2,
    role_name: 'user'
  });
  authRepository.updateProfile = async (id, input) => ({
    id,
    username: input.username,
    email: input.email,
    profile_image_path: input.profileImagePath ?? '/uploads/profiles/jane.png',
    role_id: 2,
    role_name: 'user'
  });
  authRepository.findAccessByUserId = async () => ({ permissions: ['tasks.create'] });
  fs.unlink = async (targetPath) => {
    deletedPath = targetPath;
  };

  try {
    const profile = await authService.updateProfile(12, {
      username: 'Jane Doe',
      email: 'jane@example.com'
    });

    assert.equal(profile.profileImagePath, '/uploads/profiles/jane.png');
    assert.equal(deletedPath, null);
  } finally {
    authRepository.findById = originalFindById;
    authRepository.updateProfile = originalUpdateProfile;
    authRepository.findAccessByUserId = originalFindAccessByUserId;
    fs.unlink = originalUnlink;
  }
});

test('updateUser allows an admin to update username, email, and password', async () => {
  const originalUpdateUser = authRepository.updateUser;
  const originalFindAccessByUserId = authRepository.findAccessByUserId;

  authRepository.updateUser = async (id, input) => ({
    id,
    username: input.username,
    email: input.email,
    password_hash: input.passwordHash,
    profile_image_path: null,
    role_id: 2,
    role_name: 'user'
  });
  authRepository.findAccessByUserId = async () => ({ permissions: ['users.manage'] });

  try {
    const user = await authService.updateUser(7, {
      username: 'Admin Edit',
      email: 'admin-edit@example.com',
      password: 'strongpass123'
    });

    assert.equal(user.id, 7);
    assert.equal(user.username, 'Admin Edit');
    assert.equal(user.email, 'admin-edit@example.com');
    assert.ok(user.permissions.includes('users.manage'));
  } finally {
    authRepository.updateUser = originalUpdateUser;
    authRepository.findAccessByUserId = originalFindAccessByUserId;
  }
});
