const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const taskRepository = require('../src/modules/tasks/task.repository');

test('task serialization keeps attachment metadata', () => {
  const row = {
    id: 12,
    title: 'Upload files',
    description: 'Need docs',
    completed: false,
    status: 'pending',
    priority: 'medium',
    due_date: new Date('2026-09-20T00:00:00Z'),
    due_time: '14:30:00',
    category: 'Personal',
    tags: JSON.stringify(['design', 'urgent']),
    attachments: JSON.stringify([
      { id: 'a1', name: 'report.pdf', type: 'application/pdf', size: 2048, dataUrl: 'data:application/pdf;base64,AAA' }
    ]),
    created_at: new Date('2026-09-18T10:00:00Z')
  };

  const result = taskRepository.serializeTask(row);

  assert.deepEqual(result.attachments, [{
    id: 'a1',
    name: 'report.pdf',
    type: 'application/pdf',
    size: 2048,
    dataUrl: 'data:application/pdf;base64,AAA'
  }]);
  assert.deepEqual(result.tags, ['design', 'urgent']);
});

test('task attachments are saved to the task uploads folder instead of keeping raw data URLs', async () => {
  const folder = path.join(__dirname, '..', 'uploads', 'tasks', 'test-task-attachments');
  fs.rmSync(folder, { recursive: true, force: true });

  const attachments = [{
    id: 'a1',
    name: 'report.pdf',
    type: 'application/pdf',
    size: 0,
    dataUrl: 'data:application/pdf;base64,SGVsbG8gV29ybGQ=' 
  }];

  const result = await taskRepository.persistAttachments(attachments, 'test-task-attachments');

  assert.equal(result[0].dataUrl.includes('/uploads/tasks/test-task-attachments/'), true);
  const savedFile = path.join(__dirname, '..', result[0].dataUrl.replace(/^\//, ''));
  assert.equal(fs.existsSync(savedFile), true);
  assert.equal(fs.readFileSync(savedFile, 'utf8'), 'Hello World');

  fs.rmSync(folder, { recursive: true, force: true });
});
