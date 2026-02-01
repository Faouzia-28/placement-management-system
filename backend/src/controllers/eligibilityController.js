const eligibilityService = require('../services/eligibilityService');

async function filterStudents(req, res) {
  try {
    const drive_id = req.params.id;
    const { min_cgpa, min_10th, min_12th, max_backlogs } = req.body;
    const filtered_by = req.user.user_id;
    const studentIds = await eligibilityService.filterAndStoreEligibility({ drive_id, min_cgpa, min_10th, min_12th, max_backlogs, filtered_by });
    res.json({ filtered_count: studentIds.length, studentIds });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error filtering' });
  }
}

async function listEligible(req, res) {
  try {
    const drive_id = req.params.id;
    let rows = await eligibilityService.listEligibleStudents(drive_id);

    // If there are no stored eligibility results yet, compute using the drive's HEAD criteria
    if ((!rows || rows.length === 0)) {
      const pool = require('../db/pool');
      const dres = await pool.query('SELECT min_cgpa, min_10th, min_12th, max_backlogs FROM placement_drives WHERE drive_id=$1', [drive_id]);
      if (dres.rows.length) {
        const drive = dres.rows[0];
        // run filter and store using current user's id as filtered_by (coordinator or head)
        await eligibilityService.filterAndStoreEligibility({
          drive_id,
          min_cgpa: drive.min_cgpa,
          min_10th: drive.min_10th,
          min_12th: drive.min_12th,
          max_backlogs: drive.max_backlogs,
          filtered_by: (req.user?.role === 'COORDINATOR') ? req.user.user_id : null
        });
        rows = await eligibilityService.listEligibleStudents(drive_id);
      }
    }

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching eligible' });
  }
}

async function listMyEligible(req, res) {
  try {
    const pool = require('../db/pool');
    const student_id = req.user.user_id;
    let rows = await eligibilityService.listEligibleDrivesForStudent(student_id);

    // Backfill eligibility for this student on auto-published drives if missing
    const studentRes = await pool.query(
      'SELECT cgpa, tenth_percent, twelfth_percent, active_backlogs FROM students WHERE student_id = $1',
      [student_id]
    );
    const student = studentRes.rows[0];

    if (student) {
      const autoDrives = await pool.query(
        'SELECT drive_id, min_cgpa, min_10th, min_12th, max_backlogs FROM placement_drives WHERE status = $1 AND auto_published = true',
        ['posted']
      );

      for (const drive of autoDrives.rows) {
        const hasRow = await pool.query(
          'SELECT 1 FROM drive_eligibility_results WHERE drive_id = $1 AND student_id = $2',
          [drive.drive_id, student_id]
        );

        if (hasRow.rows.length === 0) {
          const eligible =
            Number(student.cgpa) >= Number(drive.min_cgpa || 0) &&
            Number(student.tenth_percent) >= Number(drive.min_10th || 0) &&
            Number(student.twelfth_percent) >= Number(drive.min_12th || 0) &&
            Number(student.active_backlogs) <= Number(drive.max_backlogs || 0);

          if (eligible) {
            await pool.query(
              'INSERT INTO drive_eligibility_results (drive_id, student_id, is_eligible, filtered_by, filtered_at) VALUES ($1,$2,true,$3,now())',
              [drive.drive_id, student_id, null]
            );
          }
        }
      }

      rows = await eligibilityService.listEligibleDrivesForStudent(student_id);
    }

    console.log(`listMyEligible for student ${student_id}: found ${rows.length} eligible drives from criteria`);
    
    // Filter to only include drives where student was selected by coordinator
    // BUT: skip this check for auto-published drives (where HEAD selected all)
    const filtered = [];
    for (const row of rows) {
      // Check if this drive was posted and check auto_published flag
      const driveRes = await pool.query(
        'SELECT status, auto_published FROM placement_drives WHERE drive_id = $1',
        [row.drive_id]
      );
      
      if (!driveRes.rows[0]) continue; // Drive doesn't exist
      
      const { status, auto_published } = driveRes.rows[0];
      
      // Only show posted drives
      if (status !== 'posted') {
        console.log(`Drive ${row.drive_id} skipped: status=${status}`);
        continue;
      }
      
      console.log(`Drive ${row.drive_id}: auto_published=${auto_published}`);
      
      if (auto_published) {
        // Auto-published drives are visible to all eligible students (no coordinator selection needed)
        console.log(`Drive ${row.drive_id}: auto-published, showing to student`);
        filtered.push(row);
      } else {
        // Manual drives: check if student was selected by coordinator
        const selRes = await pool.query(
          'SELECT 1 FROM drive_coordinator_selections WHERE drive_id = $1 AND student_id = $2',
          [row.drive_id, student_id]
        );
        
        if (selRes.rows.length > 0) {
          console.log(`Drive ${row.drive_id}: manually selected, showing to student`);
          filtered.push(row);
        } else {
          console.log(`Drive ${row.drive_id}: not selected by coordinator, hiding from student`);
        }
      }
    }
    
    console.log(`listMyEligible final result: ${filtered.length} drives to show`);
    res.json(filtered);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching eligible' });
  }
}

async function checkMyEligibility(req, res) {
  try {
    const pool = require('../db/pool');
    const drive_id = req.params.id;
    const student_id = req.user.user_id;
    
    // Check if student has eligibility record for this drive
    const eligibilityResult = await pool.query(`
      SELECT der.is_eligible, pd.status, pd.auto_published
      FROM drive_eligibility_results der
      JOIN placement_drives pd ON der.drive_id = pd.drive_id
      WHERE der.drive_id = $1 AND der.student_id = $2
    `, [drive_id, student_id]);
    
    if (eligibilityResult.rows.length === 0) {
      // No eligibility record found - student is not eligible
      return res.json({ eligible: false, reason: 'No eligibility record found' });
    }
    
    const eligibilityRecord = eligibilityResult.rows[0];
    
    // Check if drive is posted
    if (eligibilityRecord.status !== 'posted') {
      return res.json({ eligible: false, reason: 'Drive not posted yet' });
    }
    
    // Check if student is eligible
    if (!eligibilityRecord.is_eligible) {
      return res.json({ eligible: false, reason: 'Student does not meet eligibility criteria' });
    }
    
    // For auto-published drives, student is eligible if they have eligibility record
    if (eligibilityRecord.auto_published) {
      return res.json({ eligible: true, reason: 'Auto-published drive' });
    }
    
    // For manual drives, check if coordinator selected this student
    const selectionResult = await pool.query(`
      SELECT 1 FROM drive_coordinator_selections 
      WHERE drive_id = $1 AND student_id = $2
    `, [drive_id, student_id]);
    
    if (selectionResult.rows.length > 0) {
      return res.json({ eligible: true, reason: 'Selected by coordinator' });
    } else {
      return res.json({ eligible: false, reason: 'Not selected by coordinator' });
    }
    
  } catch (e) {
    console.error('Error checking eligibility:', e);
    res.status(500).json({ message: 'Error checking eligibility: ' + e.message });
  }
}

module.exports = { filterStudents, listEligible, listMyEligible, checkMyEligibility };
