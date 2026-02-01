const pool = require('../db/pool');

async function markAttendance(drive_id, student_id, status) {
  const q = `INSERT INTO attendance (drive_id, student_id, status) VALUES ($1,$2,$3) ON CONFLICT (drive_id, student_id) DO UPDATE SET status = EXCLUDED.status RETURNING *`;
  const { rows } = await pool.query(q, [drive_id, student_id, status]);
  return rows[0];
}

async function listAttendance(drive_id) {
  const q = `SELECT a.*, u.name FROM attendance a JOIN users u ON a.student_id = u.user_id WHERE a.drive_id=$1`;
  const { rows } = await pool.query(q, [drive_id]);
  return rows;
}

module.exports = { markAttendance, listAttendance };
