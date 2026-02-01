const pool = require('../db/pool');

async function filterAndStoreEligibility({ drive_id, min_cgpa, min_10th, min_12th, max_backlogs, filtered_by }) {
  // find students matching criteria
  const q = `SELECT u.user_id FROM users u
    JOIN students s ON s.student_id = u.user_id
    WHERE u.role='STUDENT' AND s.cgpa >= $1 AND s.tenth_percent >= $2
    AND s.twelfth_percent >= $3 AND s.active_backlogs <= $4`;
  const { rows } = await pool.query(q, [min_cgpa, min_10th, min_12th, max_backlogs]);

  console.log(`filterAndStoreEligibility: found ${rows.length} eligible students for drive ${drive_id}`);

  // upsert results into drive_eligibility_results
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      const exists = await client.query('SELECT id FROM drive_eligibility_results WHERE drive_id=$1 AND student_id=$2', [drive_id, r.user_id]);
      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO drive_eligibility_results (drive_id, student_id, is_eligible, filtered_by, filtered_at) VALUES ($1,$2,true,$3,now())`,
          [drive_id, r.user_id, filtered_by]
        );
      } else {
        await client.query('UPDATE drive_eligibility_results SET is_eligible=true, filtered_by=$2, filtered_at=now() WHERE id=$1', [exists.rows[0].id, filtered_by]);
      }
    }
    await client.query('COMMIT');
    console.log(`filterAndStoreEligibility: committed ${rows.length} records`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`filterAndStoreEligibility error: ${e.message}`);
    throw e;
  } finally {
    client.release();
  }

  return rows.map(r => r.user_id);
}

async function listEligibleStudents(drive_id) {
  const q = `SELECT der.*, u.name, u.email, s.cgpa, s.roll_number, s.branch, s.active_backlogs, s.tenth_percent, s.twelfth_percent
    FROM drive_eligibility_results der
    JOIN users u ON der.student_id = u.user_id
    JOIN students s ON s.student_id = u.user_id
    WHERE der.drive_id=$1 AND der.is_eligible = true`;
  const { rows } = await pool.query(q, [drive_id]);
  return rows;
}

async function listEligibleDrivesForStudent(student_id) {
  const q = `SELECT der.drive_id, pd.company_name, pd.job_title FROM drive_eligibility_results der
    JOIN placement_drives pd ON der.drive_id = pd.drive_id
    WHERE der.student_id=$1 AND der.is_eligible = true AND pd.status='posted'`;
  const { rows } = await pool.query(q, [student_id]);
  console.log(`listEligibleDrivesForStudent(${student_id}): found ${rows.length} posted eligible drives`);
  return rows;
}

module.exports = { filterAndStoreEligibility, listEligibleStudents, listEligibleDrivesForStudent };
