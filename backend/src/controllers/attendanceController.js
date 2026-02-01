const attendanceService = require('../services/attendanceService');

async function mark(req, res) {
  try {
    const drive_id = req.params.id;
    const { student_id, status } = req.body;
    const pool = require('../db/pool');
    const lockRes = await pool.query('SELECT attendance_published FROM placement_drives WHERE drive_id = $1', [drive_id]);
    if (lockRes.rows.length && lockRes.rows[0].attendance_published) {
      return res.status(400).json({ message: 'Attendance already published' });
    }
    const row = await attendanceService.markAttendance(drive_id, student_id, status);
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error marking attendance' });
  }
}

async function list(req, res) {
  try {
    const drive_id = req.params.id;
    const rows = await attendanceService.listAttendance(drive_id);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listing attendance' });
  }
}

async function publish(req, res) {
  try {
    const drive_id = req.params.id;
    const pool = require('../db/pool');
    
    // Get drive details
    const driveRes = await pool.query('SELECT company_name, job_title, interview_date FROM placement_drives WHERE drive_id = $1', [drive_id]);
    if (!driveRes.rows.length) {
      return res.status(404).json({ message: 'Drive not found' });
    }
    const drive = driveRes.rows[0];
    
    // Get attendance counts
    const attendanceRes = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'PRESENT') as present_count,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_count,
        COUNT(*) as total_count
      FROM attendance WHERE drive_id = $1`,
      [drive_id]
    );
    const stats = attendanceRes.rows[0];
    
    // Get total registrations
    const regRes = await pool.query('SELECT COUNT(*) as reg_count FROM drive_registrations WHERE drive_id = $1', [drive_id]);
    const regCount = parseInt(regRes.rows[0].reg_count) || 0;
    
    // Update placement_drives
    await pool.query('UPDATE placement_drives SET attendance_published = true WHERE drive_id = $1', [drive_id]);
    
    // Insert into finished_drives
    await pool.query(
      `INSERT INTO finished_drives (drive_id, finished_date, total_registered, total_present, total_absent, company_name, job_title, interview_date)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
       ON CONFLICT (drive_id) DO UPDATE SET
         finished_date = NOW(),
         total_registered = $2,
         total_present = $3,
         total_absent = $4`,
      [drive_id, regCount, parseInt(stats.present_count) || 0, parseInt(stats.absent_count) || 0, drive.company_name, drive.job_title, drive.interview_date]
    );
    
    res.json({ message: 'Attendance published' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error publishing attendance' });
  }
}

async function downloadCsv(req, res) {
  try {
    const drive_id = req.params.id;
    const attendance = await attendanceService.listAttendance(drive_id);

    // Build CSV
    let csv = 'student_id,name,status\n';
    for (const row of attendance) {
      const sid = row.student_id;
      const name = (row.name || '').replace(/"/g, '""');
      const status = row.status || '';
      // wrap name in quotes in case of commas
      csv += `${sid},"${name}",${status}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${drive_id}-${Date.now()}.csv`);
    res.send(csv);
  } catch (e) {
    console.error('Error generating CSV:', e);
    res.status(500).json({ message: 'Error generating CSV' });
  }
}

module.exports = { mark, list, publish, downloadCsv };
