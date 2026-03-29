const pool = require('../db/pool');

async function createForUser(userId, payload) {
  const { title, message, type = 'info', entity_type = null, entity_id = null } = payload;
  const q = `
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const { rows } = await pool.query(q, [userId, title, message, type, entity_type, entity_id]);
  return rows[0];
}

async function createForUsers(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const uniqueUserIds = [...new Set(userIds.map((id) => parseInt(id, 10)).filter(Boolean))];
  if (uniqueUserIds.length === 0) return;

  const { title, message, type = 'info', entity_type = null, entity_id = null } = payload;
  const q = `
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    SELECT u.user_id, $1, $2, $3, $4, $5
    FROM users u
    WHERE u.user_id = ANY($6::int[])
  `;
  await pool.query(q, [title, message, type, entity_type, entity_id, uniqueUserIds]);
}

async function createForRoles(roles, payload) {
  if (!Array.isArray(roles) || roles.length === 0) return;
  const normalized = roles.map((r) => String(r || '').toUpperCase()).filter(Boolean);
  if (normalized.length === 0) return;

  const { title, message, type = 'info', entity_type = null, entity_id = null } = payload;
  const q = `
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    SELECT u.user_id, $1, $2, $3, $4, $5
    FROM users u
    WHERE UPPER(u.role) = ANY($6::text[])
  `;
  await pool.query(q, [title, message, type, entity_type, entity_id, normalized]);
}

async function listForUser(userId, limit = 20) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const q = `
    SELECT notification_id, title, message, type, entity_type, entity_id, is_read, created_at, read_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const { rows } = await pool.query(q, [userId, safeLimit]);
  return rows;
}

async function unreadCount(userId) {
  const q = 'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false';
  const { rows } = await pool.query(q, [userId]);
  return rows[0]?.count || 0;
}

async function markAsRead(userId, notificationId) {
  const q = `
    UPDATE notifications
    SET is_read = true, read_at = now()
    WHERE user_id = $1 AND notification_id = $2
    RETURNING *
  `;
  const { rows } = await pool.query(q, [userId, notificationId]);
  return rows[0];
}

async function markAllAsRead(userId) {
  const q = `
    UPDATE notifications
    SET is_read = true, read_at = now()
    WHERE user_id = $1 AND is_read = false
  `;
  await pool.query(q, [userId]);
}

module.exports = {
  createForUser,
  createForUsers,
  createForRoles,
  listForUser,
  unreadCount,
  markAsRead,
  markAllAsRead
};