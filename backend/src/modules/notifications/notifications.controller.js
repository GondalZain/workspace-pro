const notificationsRepository = require('./notifications.repository');

// Keep active SSE client connections mapped: Map<userId, Set<{ res, companyId }>>
const userConnections = new Map();


function addConnection(userId, res, companyId = null, isSuperAdmin = false) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add({ res, companyId: companyId ? Number(companyId) : null, isSuperAdmin: !!isSuperAdmin });
}

function removeConnection(userId, res) {
  if (userConnections.has(userId)) {
    const clients = userConnections.get(userId);
    for (const item of clients) {
      if (item.res === res) {
        clients.delete(item);
        break;
      }
    }
    if (clients.size === 0) {
      userConnections.delete(userId);
    }
  }
}

function sendToUser(userId, eventName, payload) {
  const clients = userConnections.get(Number(userId));
  if (!clients || clients.size === 0) return;
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(data);
    } catch (err) {
      removeConnection(userId, client.res);
    }
  }
}

function sendToSuperAdmins(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [userId, clientSet] of userConnections.entries()) {
    for (const client of clientSet) {
      if (client.isSuperAdmin) {
        try {
          client.res.write(data);
        } catch (err) {
          removeConnection(userId, client.res);
        }
      }
    }
  }
}

function sendToCompany(companyId, eventName, payload) {
  const targetCId = Number(companyId);
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [userId, clientSet] of userConnections.entries()) {
    for (const client of clientSet) {
      if (client.companyId === targetCId || targetCId === 0) {
        try {
          client.res.write(data);
        } catch (err) {
          removeConnection(userId, client.res);
        }
      }
    }
  }
}

function sendToAll(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [userId, clientSet] of userConnections.entries()) {
    for (const client of clientSet) {
      try {
        client.res.write(data);
      } catch (err) {
        removeConnection(userId, client.res);
      }
    }
  }
}

async function streamNotifications(req, res) {
  const userId = Number(req.user.sub);
  const companyId = req.user.companyId || null;
  const isSuperAdmin = !!req.user.isSuperAdmin;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  addConnection(userId, res, companyId, isSuperAdmin);


  // Send initial ping to confirm stream connected
  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  // Keep connection alive with periodic comment pings every 25s
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAliveInterval);
      removeConnection(userId, res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    removeConnection(userId, res);
  });
}

async function getNotifications(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const notifications = await notificationsRepository.getNotificationsForUser(userId, 30);
    const unreadCount = await notificationsRepository.getUnreadCount(userId);

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId < 1) {
      return res.status(400).json({ error: 'Invalid notification ID.' });
    }

    await notificationsRepository.markAsRead(userId, notificationId);
    const unreadCount = await notificationsRepository.getUnreadCount(userId);

    sendToUser(userId, 'unread_count', { unreadCount });

    res.json({ success: true, unreadCount });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    await notificationsRepository.markAllAsRead(userId);

    sendToUser(userId, 'unread_count', { unreadCount: 0 });

    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  streamNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendToUser,
  sendToCompany,
  sendToSuperAdmins,
  sendToAll
};

