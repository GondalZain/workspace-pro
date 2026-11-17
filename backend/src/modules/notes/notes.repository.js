const { pool } = require('../../config/database');

async function getNotesByTaskId(taskId) {
  const [rows] = await pool.execute(
    `SELECT 
       tn.id,
       tn.task_id AS taskId,
       tn.user_id AS userId,
       tn.content,
       tn.created_at AS createdAt,
       u.username,
       u.email,
       u.profile_image_path AS profileImagePath
     FROM task_notes tn
     JOIN users u ON tn.user_id = u.id
     WHERE tn.task_id = ?
     ORDER BY tn.created_at ASC, tn.id ASC`,
    [Number(taskId)]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    taskId: Number(row.taskId),
    userId: Number(row.userId),
    username: row.username,
    email: row.email,
    profileImagePath: row.profileImagePath,
    content: row.content,
    createdAt: row.createdAt
  }));
}

async function addNote(taskId, userId, content) {
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent) return null;

  const [result] = await pool.execute(
    'INSERT INTO task_notes (task_id, user_id, content) VALUES (?, ?, ?)',
    [Number(taskId), Number(userId), trimmedContent]
  );

  const [rows] = await pool.execute(
    `SELECT 
       tn.id,
       tn.task_id AS taskId,
       tn.user_id AS userId,
       tn.content,
       tn.created_at AS createdAt,
       u.username,
       u.email,
       u.profile_image_path AS profileImagePath
     FROM task_notes tn
     JOIN users u ON tn.user_id = u.id
     WHERE tn.id = ?`,
    [result.insertId]
  );

  const note = rows[0];
  if (!note) return null;

  return {
    id: Number(note.id),
    taskId: Number(note.taskId),
    userId: Number(note.userId),
    username: note.username,
    email: note.email,
    profileImagePath: note.profileImagePath,
    content: note.content,
    createdAt: note.createdAt
  };
}

module.exports = { getNotesByTaskId, addNote };
