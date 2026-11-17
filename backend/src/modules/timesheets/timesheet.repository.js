const { pool } = require('../../config/database');

function serializeTimesheet(row) {
  const createdDate = row.created_at ? new Date(row.created_at) : new Date();
  const dateStr = createdDate.toISOString().split('T')[0];
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    title: row.title,
    description: row.description || '',
    task: row.task,
    project: row.project,
    time: row.time,
    date: dateStr,
    createdAt: createdDate.toISOString()
  };
}

async function findAll(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM timesheets WHERE user_id = ? ORDER BY id ASC`,
    [userId]
  );
  return rows.map(serializeTimesheet);
}

async function findById(userId, id) {
  const [rows] = await pool.execute(
    `SELECT * FROM timesheets WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0] ? serializeTimesheet(rows[0]) : null;
}

async function create(userId, input = {}) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const task = String(input.task || '').trim() || '-';
  const project = String(input.project || '').trim() || '-';
  const time = String(input.time || '').trim();

  if (!title || !time) {
    const error = new Error('Title and Time fields are required.');
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.execute(
    `INSERT INTO timesheets (user_id, title, description, task, project, time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, description, task, project, time, new Date()]
  );

  return findById(userId, result.insertId);
}

async function update(userId, id, input = {}) {
  const existing = await findById(userId, id);
  if (!existing) return null;

  const title = String(input.title ?? existing.title).trim();
  const description = String(input.description ?? existing.description ?? '').trim();
  const task = String(input.task ?? existing.task).trim();
  const project = String(input.project ?? existing.project).trim();
  const time = String(input.time ?? existing.time).trim();

  await pool.execute(
    `UPDATE timesheets
     SET title = ?, description = ?, task = ?, project = ?, time = ?
     WHERE id = ? AND user_id = ?`,
    [title, description, task, project, time, id, userId]
  );

  return findById(userId, id);
}

async function deleteTimesheet(userId, id) {
  const [result] = await pool.execute(
    `DELETE FROM timesheets WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  delete: deleteTimesheet,
  serializeTimesheet
};
