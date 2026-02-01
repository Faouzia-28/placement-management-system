const pool = require('../db/pool');

async function registerStudent(drive_id, student_id) {
  // check eligibility
  const q = 'SELECT is_eligible FROM drive_eligibility_results WHERE drive_id=$1 AND student_id=$2';
  const { rows } = await pool.query(q, [drive_id, student_id]);
  if (rows.length === 0 || !rows[0].is_eligible) {
    const err = new Error('Student not eligible');
    err.status = 400;
    throw err;
  }

  const r = await pool.query('INSERT INTO drive_registrations (drive_id, student_id, registered_at) VALUES ($1,$2,now()) RETURNING *', [drive_id, student_id]);
  return r.rows[0];
}

async function listRegistrationsByDrive(drive_id) {
  const q = `SELECT dr.*, u.name, u.email FROM drive_registrations dr JOIN users u ON dr.student_id = u.user_id WHERE dr.drive_id=$1`;
  const { rows } = await pool.query(q, [drive_id]);
  return rows;
}

module.exports = { registerStudent, listRegistrationsByDrive };
