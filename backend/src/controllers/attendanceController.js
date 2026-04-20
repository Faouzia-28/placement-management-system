const attendanceService = require('../services/attendanceService');
const notificationService = require('../services/notificationService');

async function hasAttendancePublishedColumn(pool) {
  const q = `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'placement_drives'
      AND column_name = 'attendance_published'
    LIMIT 1
  `;
  const result = await pool.query(q);
  return result.rows.length > 0;
}

async function getAttendanceLock(pool, drive_id) {
  const driveRes = await pool.query('SELECT drive_id FROM placement_drives WHERE drive_id = $1', [drive_id]);
  if (!driveRes.rows.length) {
    return { exists: false, locked: false, hasColumn: false };
  }

  const hasColumn = await hasAttendancePublishedColumn(pool);
  if (!hasColumn) {
    return { exists: true, locked: false, hasColumn: false };
  }

  const lockRes = await pool.query('SELECT attendance_published FROM placement_drives WHERE drive_id = $1', [drive_id]);
  return {
    exists: true,
    locked: !!(lockRes.rows.length && lockRes.rows[0].attendance_published),
    hasColumn: true
  };
}

async function getTableColumns(pool, tableName) {
  const q = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `;
  const res = await pool.query(q, [tableName]);
  return new Set(res.rows.map((r) => r.column_name));
}

async function upsertFinishedDrive(pool, drive_id, regCount, presentCount, absentCount, drive) {
  const cols = await getTableColumns(pool, 'finished_drives');
  if (!cols.size) return;

  const payload = {
    drive_id,
    company_name: drive.company_name,
    job_title: drive.job_title,
    interview_date: drive.interview_date,
    total_registered: regCount,
    total_present: presentCount,
    total_absent: absentCount,
    total_attended: presentCount,
    total_selected: 0,
    finished_date: new Date(),
    finished_at: new Date()
  };

  const allowed = Object.keys(payload).filter((k) => cols.has(k));
  if (!allowed.length) return;

  if (cols.has('drive_id')) {
    const updatable = allowed.filter((k) => k !== 'drive_id');
    if (updatable.length) {
      const setSql = updatable.map((k, idx) => `${k} = $${idx + 2}`).join(', ');
      const updateParams = [drive_id, ...updatable.map((k) => payload[k])];
      const updated = await pool.query(`UPDATE finished_drives SET ${setSql} WHERE drive_id = $1`, updateParams);
      if (updated.rowCount > 0) return;
    }
  }

  const insertCols = cols.has('drive_id') ? allowed : allowed.filter((k) => k !== 'drive_id');
  if (!insertCols.length) return;

  const valuesSql = insertCols.map((_, idx) => `$${idx + 1}`).join(', ');
  const insertParams = insertCols.map((k) => payload[k]);
  await pool.query(
    `INSERT INTO finished_drives (${insertCols.join(', ')}) VALUES (${valuesSql})`,
    insertParams
  );
}

async function mark(req, res) {
  try {
    const drive_id = parseInt(req.params.id, 10);
    const { student_id, status } = req.body;
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : '';

    if (!Number.isInteger(drive_id) || drive_id <= 0) {
      return res.status(400).json({ message: 'Invalid drive id' });
    }

    if (!Number.isInteger(Number(student_id)) || Number(student_id) <= 0) {
      return res.status(400).json({ message: 'Invalid student id' });
    }

    if (!['PRESENT', 'ABSENT'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid attendance status' });
    }

    const pool = require('../db/pool');
    const lockState = await getAttendanceLock(pool, drive_id);
    if (!lockState.exists) {
      return res.status(404).json({ message: 'Drive not found' });
    }

    if (lockState.locked) {
      return res.status(400).json({ message: 'Attendance already published' });
    }

    const row = await attendanceService.markAttendance(drive_id, Number(student_id), normalizedStatus);
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error marking attendance', detail: e.message });
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
    const drive_id = parseInt(req.params.id, 10);
    if (!Number.isInteger(drive_id) || drive_id <= 0) {
      return res.status(400).json({ message: 'Invalid drive id' });
    }

    const pool = require('../db/pool');

    // Get drive details
    const driveRes = await pool.query('SELECT company_name, job_title, interview_date FROM placement_drives WHERE drive_id = $1', [drive_id]);
    if (!driveRes.rows.length) {
      return res.status(404).json({ message: 'Drive not found' });
    }
    const drive = driveRes.rows[0];

    const lockState = await getAttendanceLock(pool, drive_id);
    if (lockState.locked) {
      return res.status(400).json({ message: 'Attendance already published' });
    }
    
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
    const totalMarked = parseInt(stats.total_count, 10) || 0;

    if (totalMarked === 0) {
      return res.status(400).json({ message: 'Mark attendance for at least one student before publishing.' });
    }
    
    // Get total registrations
    const regRes = await pool.query('SELECT COUNT(*) as reg_count FROM drive_registrations WHERE drive_id = $1', [drive_id]);
    const regCount = parseInt(regRes.rows[0].reg_count) || 0;
    
    // Update placement_drives only when column exists in this environment.
    if (lockState.hasColumn) {
      await pool.query('UPDATE placement_drives SET attendance_published = true WHERE drive_id = $1', [drive_id]);
    }
    
    const presentCount = parseInt(stats.present_count, 10) || 0;
    const absentCount = parseInt(stats.absent_count, 10) || 0;

    // Persist summary to finished_drives with schema-tolerant logic.
    await upsertFinishedDrive(pool, drive_id, regCount, presentCount, absentCount, drive);

    const regStudents = await pool.query('SELECT student_id FROM drive_registrations WHERE drive_id = $1', [drive_id]);
    const studentIds = regStudents.rows.map((r) => r.student_id);
    try {
      await notificationService.createForUsers(studentIds, {
        title: 'Attendance Published',
        message: `Attendance has been published for ${drive.company_name} - ${drive.job_title}.`,
        type: 'info',
        entity_type: 'drive',
        entity_id: parseInt(drive_id, 10)
      });

      await notificationService.createForRoles(['HEAD', 'COORDINATOR', 'STAFF'], {
        title: 'Drive Completed',
        message: `${drive.company_name} - ${drive.job_title} has been moved to finished drives.`,
        type: 'success',
        entity_type: 'drive',
        entity_id: parseInt(drive_id, 10)
      });
    } catch (notifyErr) {
      console.warn('Publish completed but notification creation failed:', notifyErr.message);
    }
    
    res.json({ message: 'Attendance published' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error publishing attendance', detail: e.message });
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
