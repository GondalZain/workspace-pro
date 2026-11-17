const test = require('node:test');
const assert = require('node:assert/strict');

const chatService = require('../src/modules/chat/chat.service');

test('createThread creates a shared thread and stores the first message', async () => {
  const thread = await chatService.createThread(1, 2, 'Hello there');

  assert.ok(thread.id > 0);
  assert.ok(thread.participants.some((user) => user.id === 1));
  assert.ok(thread.participants.some((user) => user.id === 2));
  assert.ok(thread.messages.length > 0);
  assert.equal(thread.messages[0].content, 'Hello there');
});

test('createThread accepts a shared note without a target user and stores the author id', async () => {
  const thread = await chatService.createThread(9, null, 'Team update');

  assert.ok(thread.id > 0);
  assert.ok(thread.messages.length > 0);
  assert.equal(thread.messages[0].senderId, 9);
  assert.equal(thread.messages[0].content, 'Team update');
});

test('shared team threads resolve names for later senders even when they are not the thread creator', async () => {
  const thread = await chatService.createThread(1, null, 'Team update');
  const message = await chatService.addMessage(thread.id, 2, 'Looks good');

  const threads = await chatService.getThreadsForUser(2);
  const savedThread = threads.find((item) => item.id === thread.id);
  assert.ok(savedThread);
  const savedMessage = savedThread.messages.find((item) => item.id === message.id);
  assert.ok(savedMessage);
  assert.equal(savedMessage.senderId, 2);
  assert.equal(savedMessage.senderName, 'zain');
});
