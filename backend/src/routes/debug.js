const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Debug endpoint to check database schema and drive status
router.get('/check-drive-status', async (req, res) => {
  try {
    console.log('🔍 Checking drive status and database schema...');
    
    const result = {
      timestamp: new Date().toISOString(),
      database_schema: {},
      drives: [],
      eligibility_tables: {},
      student_eligibility_sample: {},
      issues: [],
      recommendations: []
    };

    // Check placement_drives table columns
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'placement_drives' 
      ORDER BY ordinal_position
    `);
    
    result.database_schema.placement_drives_columns = columns.rows;

    // Check for required columns
    const requiredColumns = ['status', 'auto_published', 'published_at', 'published_by', 'attendance_published'];
    const existingColumns = columns.rows.map(row => row.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      result.issues.push(`Missing required columns: ${missingColumns.join(', ')}`);
      result.recommendations.push('Run database migrations to add missing columns');
    }

    // Check current drives with detailed info
    const drives = await pool.query(`
      SELECT drive_id, company_name, job_title, status, auto_published, published_at, attendance_published, created_at,
             min_cgpa, min_10th, min_12th, max_backlogs
      FROM placement_drives 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    result.drives = drives.rows;

    // Check eligibility tables
    try {
      const eligibilityCount = await pool.query('SELECT COUNT(*) as count FROM drive_eligibility_results');
      result.eligibility_tables.drive_eligibility_results = eligibilityCount.rows[0].count;
      
      // Get sample eligibility records
      const eligibilitySample = await pool.query(`
        SELECT der.drive_id, der.student_id, der.is_eligible, u.name as student_name, pd.company_name
        FROM drive_eligibility_results der
        JOIN users u ON der.student_id = u.user_id
        JOIN placement_drives pd ON der.drive_id = pd.drive_id
        ORDER BY der.drive_id DESC
        LIMIT 5
      `);
      result.eligibility_tables.sample_records = eligibilitySample.rows;
    } catch (e) {
      result.issues.push('drive_eligibility_results table missing or inaccessible');
      result.eligibility_tables.drive_eligibility_results = 'ERROR: ' + e.message;
    }

    try {
      const selectionsCount = await pool.query('SELECT COUNT(*) as count FROM drive_coordinator_selections');
      result.eligibility_tables.drive_coordinator_selections = selectionsCount.rows[0].count;
      
      // Get sample selection records
      const selectionsSample = await pool.query(`
        SELECT dcs.drive_id, dcs.student_id, u.name as student_name, pd.company_name
        FROM drive_coordinator_selections dcs
        JOIN users u ON dcs.student_id = u.user_id
        JOIN placement_drives pd ON dcs.drive_id = pd.drive_id
        ORDER BY dcs.drive_id DESC
        LIMIT 5
      `);
      result.eligibility_tables.selection_records = selectionsSample.rows;
    } catch (e) {
      result.issues.push('drive_coordinator_selections table missing or inaccessible');
      result.eligibility_tables.drive_coordinator_selections = 'ERROR: ' + e.message;
    }

    // Check student eligibility for a sample student
    try {
      const sampleStudent = await pool.query(`
        SELECT user_id, name, email FROM users WHERE role = 'STUDENT' LIMIT 1
      `);
      
      if (sampleStudent.rows.length > 0) {
        const studentId = sampleStudent.rows[0].user_id;
        result.student_eligibility_sample.student = sampleStudent.rows[0];
        
        // Get student profile
        const studentProfile = await pool.query(`
          SELECT cgpa, tenth_percent, twelfth_percent, active_backlogs, branch
          FROM students WHERE student_id = $1
        `, [studentId]);
        result.student_eligibility_sample.profile = studentProfile.rows[0];
        
        // Check what drives this student should be eligible for
        const eligibleDrives = await pool.query(`
          SELECT drive_id, company_name, job_title, status, auto_published,
                 min_cgpa, min_10th, min_12th, max_backlogs
          FROM placement_drives 
          WHERE status = 'posted'
          ORDER BY created_at DESC
        `);
        
        result.student_eligibility_sample.posted_drives = eligibleDrives.rows;
        
        // Check eligibility records for this student
        const studentEligibility = await pool.query(`
          SELECT der.drive_id, der.is_eligible, pd.company_name, pd.status, pd.auto_published
          FROM drive_eligibility_results der
          JOIN placement_drives pd ON der.drive_id = pd.drive_id
          WHERE der.student_id = $1
        `, [studentId]);
        
        result.student_eligibility_sample.eligibility_records = studentEligibility.rows;
        
        // Check coordinator selections for this student
        const studentSelections = await pool.query(`
          SELECT dcs.drive_id, pd.company_name
          FROM drive_coordinator_selections dcs
          JOIN placement_drives pd ON dcs.drive_id = pd.drive_id
          WHERE dcs.student_id = $1
        `, [studentId]);
        
        result.student_eligibility_sample.coordinator_selections = studentSelections.rows;
      }
    } catch (e) {
      result.student_eligibility_sample.error = e.message;
    }

    // Check for drives with status issues
    const statusIssues = drives.rows.filter(drive => !drive.status || drive.status === '');
    if (statusIssues.length > 0) {
      result.issues.push(`${statusIssues.length} drives have missing or empty status`);
      result.recommendations.push('Update drives with missing status to "pending"');
    }

    // Check for posted drives without eligibility records
    const postedDrives = drives.rows.filter(drive => drive.status === 'posted');
    if (postedDrives.length > 0) {
      for (const drive of postedDrives) {
        const eligibilityCount = await pool.query(
          'SELECT COUNT(*) as count FROM drive_eligibility_results WHERE drive_id = $1',
          [drive.drive_id]
        );
        if (parseInt(eligibilityCount.rows[0].count) === 0) {
          result.issues.push(`Posted drive ${drive.drive_id} (${drive.company_name}) has no eligibility records`);
          result.recommendations.push(`Create eligibility records for drive ${drive.drive_id}`);
        }
      }
    }

    console.log('✅ Drive status check completed');
    res.json(result);

  } catch (error) {
    console.error('❌ Error checking drive status:', error);
    res.status(500).json({ 
      error: 'Database check failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to fix common drive status issues
router.post('/fix-drive-status', async (req, res) => {
  try {
    console.log('🔧 Applying drive status fixes...');
    
    const fixes = [];
    
    // Fix 1: Update drives with missing status
    const statusFix = await pool.query(`
      UPDATE placement_drives 
      SET status = 'pending' 
      WHERE status IS NULL OR status = ''
      RETURNING drive_id, company_name
    `);
    
    if (statusFix.rows.length > 0) {
      fixes.push(`Updated ${statusFix.rows.length} drives with missing status`);
    }

    // Fix 2: Ensure auto_published is set correctly
    const autoPublishedFix = await pool.query(`
      UPDATE placement_drives 
      SET auto_published = COALESCE(auto_published, false)
      WHERE auto_published IS NULL
      RETURNING drive_id, company_name
    `);
    
    if (autoPublishedFix.rows.length > 0) {
      fixes.push(`Updated ${autoPublishedFix.rows.length} drives with missing auto_published flag`);
    }

    // Fix 3: Create missing eligibility records for posted drives
    const postedDrives = await pool.query(`
      SELECT drive_id, min_cgpa, min_10th, min_12th, max_backlogs, auto_published
      FROM placement_drives 
      WHERE status = 'posted'
    `);

    for (const drive of postedDrives.rows) {
      // Check if eligibility records exist
      const existingEligibility = await pool.query(
        'SELECT COUNT(*) as count FROM drive_eligibility_results WHERE drive_id = $1',
        [drive.drive_id]
      );

      if (parseInt(existingEligibility.rows[0].count) === 0) {
        // Find eligible students
        const eligibleStudents = await pool.query(`
          SELECT u.user_id FROM users u
          JOIN students s ON s.student_id = u.user_id
          WHERE u.role='STUDENT' 
          AND s.cgpa >= $1 
          AND s.tenth_percent >= $2
          AND s.twelfth_percent >= $3 
          AND s.active_backlogs <= $4
        `, [drive.min_cgpa || 0, drive.min_10th || 0, drive.min_12th || 0, drive.max_backlogs || 999]);

        // Insert eligibility records
        for (const student of eligibleStudents.rows) {
          await pool.query(`
            INSERT INTO drive_eligibility_results (drive_id, student_id, is_eligible, filtered_at) 
            VALUES ($1, $2, true, NOW()) 
            ON CONFLICT (drive_id, student_id) DO NOTHING
          `, [drive.drive_id, student.user_id]);
        }

        if (eligibleStudents.rows.length > 0) {
          fixes.push(`Created eligibility records for drive ${drive.drive_id}: ${eligibleStudents.rows.length} students`);
          
          // If it's an auto-published drive, also create coordinator selections for all eligible students
          if (drive.auto_published) {
            for (const student of eligibleStudents.rows) {
              await pool.query(`
                INSERT INTO drive_coordinator_selections (drive_id, student_id, selected_at) 
                VALUES ($1, $2, NOW()) 
                ON CONFLICT (drive_id, student_id) DO NOTHING
              `, [drive.drive_id, student.user_id]);
            }
            fixes.push(`Created coordinator selections for auto-published drive ${drive.drive_id}: ${eligibleStudents.rows.length} students`);
          }
        }
      }
    }

    console.log('✅ Drive status fixes applied');
    res.json({ 
      success: true, 
      fixes_applied: fixes,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error applying fixes:', error);
    res.status(500).json({ 
      error: 'Fix operation failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;