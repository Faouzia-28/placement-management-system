const pool = require('../db/pool');

async function createDrive(drive) {
  const q = `INSERT INTO placement_drives
    (company_name, job_title, domain_id, job_description, interview_date, min_cgpa, min_10th, min_12th, max_backlogs, posted_by, pdf_path, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,'pending'),now()) RETURNING *`;
  const params = [
    drive.company_name,
    drive.job_title,
    drive.domain_id,
    drive.job_description,
    drive.interview_date,
    drive.min_cgpa,
    drive.min_10th,
    drive.min_12th,
    drive.max_backlogs,
    drive.posted_by,
    drive.pdf_path,
    drive.status || 'pending'
  ];
  const { rows } = await pool.query(q, params);
  return rows[0];
}

async function listDrives() {
  const q = `SELECT pd.*, jd.domain_name FROM placement_drives pd
    LEFT JOIN job_domains jd ON pd.domain_id = jd.domain_id
    ORDER BY pd.created_at DESC`;
  const { rows } = await pool.query(q);
  return rows;
}

async function getDriveById(drive_id) {
  const q = 'SELECT * FROM placement_drives WHERE drive_id=$1';
  const { rows } = await pool.query(q, [drive_id]);
  return rows[0];
}

async function deleteDrive(drive_id) {
  const q = 'DELETE FROM placement_drives WHERE drive_id=$1 RETURNING *';
  const { rows } = await pool.query(q, [drive_id]);
  return rows[0];
}

module.exports = { createDrive, listDrives, getDriveById, deleteDrive };
