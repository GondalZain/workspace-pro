const { pool } = require('../../config/database');

async function getNotificationsForUser(userId, limit = 20) {
  const [rows] = await pool.execute(
    `SELECT 
       n.id,
       n.company_id AS companyId,
       n.recipient_user_id AS recipientUserId,
       n.actor_user_id AS actorUserId,
       n.type,
       n.title,
       n.message,
       n.task_id AS taskId,
       n.is_read AS isRead,
       n.created_at AS createdAt,
       u.username AS actorName,
       u.profile_image_path AS actorProfileImage
     FROM notifications n
     LEFT JOIN users u ON n.actor_user_id = u.id
     WHERE n.recipient_user_id = ?
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT ?`,
    [Number(userId), Number(limit)]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    companyId: row.companyId ? Number(row.companyId) : null,
    recipientUserId: Number(row.recipientUserId),
    actorUserId: row.actorUserId ? Number(row.actorUserId) : null,
    actorName: row.actorName || 'System',
    actorProfileImage: row.actorProfileImage || null,
    type: row.type,
    title: row.title,
    message: row.message,
    taskId: row.taskId ? Number(row.taskId) : null,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt
  }));
}

async function getUnreadCount(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS unreadCount
     FROM notifications
     WHERE recipient_user_id = ? AND is_read = FALSE`,
    [Number(userId)]
  );

  return Number(row?.unreadCount || 0);
}

async function markAsRead(userId, notificationId) {
  await pool.execute(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = ? AND recipient_user_id = ?`,
    [Number(notificationId), Number(userId)]
  );
  return true;
}

async function markAllAsRead(userId) {
  await pool.execute(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE recipient_user_id = ? AND is_read = FALSE`,
    [Number(userId)]
  );
  return true;
}

async function createNotification({ companyId, recipientUserId, actorUserId, type = 'mention', title, message, taskId }) {
  const [result] = await pool.execute(
    `INSERT INTO notifications (company_id, recipient_user_id, actor_user_id, type, title, message, task_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId ? Number(companyId) : null,
      Number(recipientUserId),
      actorUserId ? Number(actorUserId) : null,
      type,
      title,
      message,
      taskId ? Number(taskId) : null
    ]
  );

  const insertedId = result.insertId;

  // Real-time dispatch via SSE if recipient is connected
  try {
    const fullNotification = await getNotificationById(insertedId);
    const unreadCount = await getUnreadCount(recipientUserId);
    const { sendToUser } = require('./notifications.controller');
    sendToUser(recipientUserId, 'new_notification', {
      notification: fullNotification,
      unreadCount
    });
  } catch (err) {
    // Non-blocking log if SSE broadcast fails
    console.warn('Real-time notification dispatch failed:', err.message);
  }

  return insertedId;
}

async function getNotificationById(id) {
  const [rows] = await pool.execute(
    `SELECT 
       n.id,
       n.company_id AS companyId,
       n.recipient_user_id AS recipientUserId,
       n.actor_user_id AS actorUserId,
       n.type,
       n.title,
       n.message,
       n.task_id AS taskId,
       n.is_read AS isRead,
       n.created_at AS createdAt,
       u.username AS actorName,
       u.profile_image_path AS actorProfileImage
     FROM notifications n
     LEFT JOIN users u ON n.actor_user_id = u.id
     WHERE n.id = ?`,
    [Number(id)]
  );

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    id: Number(row.id),
    companyId: row.companyId ? Number(row.companyId) : null,
    recipientUserId: Number(row.recipientUserId),
    actorUserId: row.actorUserId ? Number(row.actorUserId) : null,
    actorName: row.actorName || 'System',
    actorProfileImage: row.actorProfileImage || null,
    type: row.type,
    title: row.title,
    message: row.message,
    taskId: row.taskId ? Number(row.taskId) : null,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt
  };
}

module.exports = {
  getNotificationsForUser,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification
};
