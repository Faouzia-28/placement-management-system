const notificationService = require('../services/notificationService');

async function listMine(req, res) {
  try {
    const userId = req.user.user_id;
    const limit = req.query.limit || 20;
    const [items, unread] = await Promise.all([
      notificationService.listForUser(userId, limit),
      notificationService.unreadCount(userId)
    ]);
    res.json({ items, unread_count: unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listing notifications' });
  }
}

async function markRead(req, res) {
  try {
    const userId = req.user.user_id;
    const notificationId = parseInt(req.params.id, 10);
    const updated = await notificationService.markAsRead(userId, notificationId);
    if (!updated) return res.status(404).json({ message: 'Notification not found' });
    const unread = await notificationService.unreadCount(userId);
    res.json({ item: updated, unread_count: unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating notification' });
  }
}

async function markAllRead(req, res) {
  try {
    const userId = req.user.user_id;
    await notificationService.markAllAsRead(userId);
    res.json({ ok: true, unread_count: 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating notifications' });
  }
}

module.exports = { listMine, markRead, markAllRead };