const notesRepository = require('./notes.repository');
const notificationsRepository = require('../notifications/notifications.repository');
const { pool } = require('../../config/database');

async function getNotes(req, res, next) {
  try {
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId) || taskId < 1) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }
    const notes = await notesRepository.getNotesByTaskId(taskId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
}

async function createNote(req, res, next) {
  try {
    const taskId = Number(req.params.taskId);
    const userId = Number(req.user.sub);
    const companyId = req.user.companyId ? Number(req.user.companyId) : null;
    const { content } = req.body;

    if (!Number.isInteger(taskId) || taskId < 1) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required.' });
    }

    const note = await notesRepository.addNote(taskId, userId, content);
    if (!note) {
      return res.status(500).json({ error: 'Failed to create note.' });
    }

    // Process mentions (@username)
    const matches = Array.from(content.matchAll(/@([a-zA-Z0-9_\.\-]+)/g)).map((m) => m[1].toLowerCase());
    const uniqueMentionedNames = Array.from(new Set(matches));
    console.log('[notes] Mention matches (including duplicates):', matches);
    console.log('[notes] Unique mention usernames:', uniqueMentionedNames);

    if (uniqueMentionedNames.length > 0) {
      // Fetch task title for rich notification context
      const [[taskRow]] = await pool.query('SELECT title FROM tasks WHERE id = ?', [taskId]);
      const taskTitle = taskRow?.title ? `"${taskRow.title}"` : 'a task';

      // Find matching users in the database
      const placeholders = uniqueMentionedNames.map(() => '?').join(',');
      const [users] = await pool.query(
        `SELECT id, username FROM users WHERE LOWER(username) IN (${placeholders}) OR LOWER(REPLACE(username, ' ', '')) IN (${placeholders})`,
        [...uniqueMentionedNames, ...uniqueMentionedNames]
      );

      for (const recipient of users) {
        // Do not notify self
        if (Number(recipient.id) !== userId) {
          const senderName = note.username || 'A team member';
          const contentSnippet = content.length > 80 ? `${content.slice(0, 80)}…` : content;
          await notificationsRepository.createNotification({
            companyId,
            recipientUserId: recipient.id,
            actorUserId: userId,
            type: 'mention',
            title: `${senderName} tagged you on ${taskTitle}`,
            message: `Mentioned you in note: "${contentSnippet}"`,
            taskId
          }).catch((err) => console.error('Failed to create mention notification:', err));
        }
      }
    }

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
}

module.exports = { getNotes, createNote };
