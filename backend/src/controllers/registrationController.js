const registrationService = require('../services/registrationService');

async function register(req, res) {
  try {
    const student_id = req.user.user_id;
    const drive_id = req.params.id;
    const pool = require('../db/pool');

    // Ensure drive is posted
    const driveRes = await pool.query(
      'SELECT status, auto_published FROM placement_drives WHERE drive_id = $1',
      [drive_id]
    );
    if (!driveRes.rows.length) {
      return res.status(404).json({ message: 'Drive not found' });
    }
    const { status, auto_published } = driveRes.rows[0];
    if (status !== 'posted') {
      return res.status(403).json({ message: 'Drive is not posted yet' });
    }

    // Must be eligible based on HEAD criteria
    const eligRes = await pool.query(
      'SELECT 1 FROM drive_eligibility_results WHERE drive_id = $1 AND student_id = $2 AND is_eligible = true',
      [drive_id, student_id]
    );
    if (!eligRes.rows.length) {
      return res.status(403).json({ message: 'You are not eligible for this drive' });
    }

    // If not auto-published, student must be selected by coordinator
    if (!auto_published) {
      const selRes = await pool.query(
        'SELECT 1 FROM drive_coordinator_selections WHERE drive_id = $1 AND student_id = $2',
        [drive_id, student_id]
      );
      if (!selRes.rows.length) {
        return res.status(403).json({ message: 'You are not selected for this drive' });
      }
    }

    const reg = await registrationService.registerStudent(drive_id, student_id);
    res.json(reg);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ message: e.message || 'Error registering' });
  }
}

async function listByDrive(req, res) {
  try {
    const drive_id = req.params.id;
    const rows = await registrationService.listRegistrationsByDrive(drive_id);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listing registrations' });
  }
}

async function listMyRegistrations(req, res) {
  try {
    const student_id = req.user.user_id;
    const pool = require('../db/pool');
    
    const query = `
      SELECT dr.*, pd.company_name, pd.job_title, pd.job_description, pd.status, 
             pd.min_cgpa, pd.min_10th, pd.min_12th, pd.max_backlogs, pd.attendance_published
      FROM drive_registrations dr
      JOIN placement_drives pd ON dr.drive_id = pd.drive_id
      WHERE dr.student_id = $1
      ORDER BY dr.registered_at DESC
    `;
    
    const result = await pool.query(query, [student_id]);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listing your registrations' });
  }
}

async function checkMyRegistration(req, res) {
  try {
    const student_id = req.user.user_id;
    const drive_id = req.params.id;
    const pool = require('../db/pool');
    
    // Check if student is registered for this drive
    const registrationResult = await pool.query(`
      SELECT 1 FROM drive_registrations 
      WHERE drive_id = $1 AND student_id = $2
    `, [drive_id, student_id]);
    
    const registered = registrationResult.rows.length > 0;
    
    res.json({ registered });
  } catch (e) {
    console.error('Error checking registration:', e);
    res.status(500).json({ message: 'Error checking registration: ' + e.message });
  }
}

module.exports = { register, listByDrive, listMyRegistrations, checkMyRegistration };
