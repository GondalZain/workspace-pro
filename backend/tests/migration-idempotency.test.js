const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const migrationPath = path.join(__dirname, '..', 'migrations', 'zzz_task_attachments.sql');

test('task attachments migration is idempotent and does not duplicate the column', async () => {
  const sql = await fs.readFile(migrationPath, 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS attachments/i);
});
