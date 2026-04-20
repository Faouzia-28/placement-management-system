const pool = require('../db/pool');

async function markAttendance(drive_id, student_id, status) {
  const updateQ = `
    UPDATE attendance
    SET status = $3
    WHERE drive_id = $1 AND student_id = $2
    RETURNING *
  `;
  const updated = await pool.query(updateQ, [drive_id, student_id, status]);
  if (updated.rows.length) {
    return updated.rows[0];
  }

  const insertQ = `
    INSERT INTO attendance (drive_id, student_id, status)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const inserted = await pool.query(insertQ, [drive_id, student_id, status]);
  return inserted.rows[0];
}

async function listAttendance(drive_id) {
  const q = `SELECT a.*, u.name FROM attendance a JOIN users u ON a.student_id = u.user_id WHERE a.drive_id=$1`;
  const { rows } = await pool.query(q, [drive_id]);
  return rows;
}

module.exports = { markAttendance, listAttendance };
