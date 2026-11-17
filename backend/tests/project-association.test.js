const test = require('node:test');
const assert = require('node:assert/strict');
const taskRepository = require('../src/modules/tasks/task.repository');

test('task serialization exposes associated project id', () => {
  const row = {
    id: 7,
    user_id: 3,
    title: 'Launch sprint',
    description: 'Ship the release',
    completed: false,
    status: 'pending',
    priority: 'high',
    due_date: '2026-09-30',
    due_time: '10:00:00',
    category: 'Product',
    tags: JSON.stringify(['launch']),
    attachments: JSON.stringify([]),
    project_id: 12,
    created_at: new Date('2026-09-18T10:00:00Z')
  };

  const result = taskRepository.serializeTask(row);

  assert.equal(result.projectId, 12);
});
