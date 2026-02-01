const driveService = require('../services/driveService');
const eligibilityService = require('../services/eligibilityService');
const { jobQueue } = require('../../queue');

async function createDrive(req, res) {
  try {
    const { company_name, job_title, domain_id, job_description, interview_date, min_cgpa, min_10th, min_12th, max_backlogs } = req.body;
    
    if (!company_name || !job_title) {
      return res.status(400).json({ message: 'Company name and job title are required' });
    }

    const driveData = {
      company_name,
      job_title,
      domain_id: parseInt(domain_id) || 1,
      job_description: job_description || '',
      interview_date: interview_date || null,
      min_cgpa: parseFloat(min_cgpa) || 0,
      min_10th: parseFloat(min_10th) || 0,
      min_12th: parseFloat(min_12th) || 0,
      max_backlogs: parseInt(max_backlogs) || 0,
      posted_by: req.user.user_id,
      pdf_path: req.file ? `/uploads/job-descriptions/${req.file.filename}` : null
    };

    const created = await driveService.createDrive(driveData);

    // Check if auto_calc is enabled — enqueue background job to handle eligibility & publishing
    const autoCalcRaw = req.body.auto_calc || req.body.autoCalc;
    const autoCalc = (typeof autoCalcRaw === 'string') ? autoCalcRaw.toLowerCase() === 'true' : !!autoCalcRaw;
    if (autoCalc) {
      const pool = require('../db/pool');
      try {
        // mark as posted and auto_published so it appears to users immediately
        await pool.query(
          'UPDATE placement_drives SET status = $1, published_at = now(), published_by = $2, auto_published = true WHERE drive_id = $3',
          ['posted', driveData.posted_by, created.drive_id]
        );
        try {
          await jobQueue.add('auto-publish', { drive_id: created.drive_id, published_by: driveData.posted_by }, { attempts: 3 });
          console.log(`Enqueued auto-publish job for drive ${created.drive_id}`);
        } catch (qerr) {
          console.error('Failed to enqueue auto-publish job, falling back to inline processing:', qerr.message);
          // fallback: run eligibility and store selections synchronously
          try {
            const eligibleStudents = await eligibilityService.filterAndStoreEligibility({
              drive_id: created.drive_id,
              min_cgpa: driveData.min_cgpa,
              min_10th: driveData.min_10th,
              min_12th: driveData.min_12th,
              max_backlogs: driveData.max_backlogs,
              filtered_by: (req.user?.role === 'COORDINATOR') ? req.user.user_id : null
            });
            if (eligibleStudents && eligibleStudents.length > 0) {
              for (const studentId of eligibleStudents) {
                await pool.query('INSERT INTO drive_coordinator_selections (drive_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [created.drive_id, studentId]);
              }
            }
          } catch (inner) {
            console.error('Fallback auto-publish failed:', inner.message);
          }
        }
      } catch (e) {
        console.error('Auto-publish mark-posted failed:', e.message, e);
      }
    }

    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error creating drive: ' + e.message });
  }
}

async function listDrives(req, res) {
  try {
    const rows = await driveService.listDrives();
    // If the requester is a STUDENT or STAFF, show posted, ongoing, and finished drives
    const role = (req.user && req.user.role) ? req.user.role.toUpperCase() : null;
    if (role === 'STUDENT' || role === 'STAFF') {
      return res.json(
        rows.filter(r => (r.status || 'posted') === 'posted' || r.status === 'attending' || r.attendance_published)
      );
    }
    // For HEAD and COORDINATOR, show all (including pending)
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error listing drives' });
  }
}

async function getDrive(req, res) {
  try {
    const d = await driveService.getDriveById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    res.json(d);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching drive' });
  }
}

async function deleteDrive(req, res) {
  try {
    const driveId = req.params.id;
    if (!driveId) {
      return res.status(400).json({ message: 'Drive ID is required' });
    }

    await driveService.deleteDrive(driveId);
    res.json({ message: 'Drive deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting drive: ' + e.message });
  }
}

// Coordinator or HEAD can publish a pending drive to make it visible to students/staff
async function publishDrive(req, res) {
  try {
    const driveId = req.params.id;
    const { selected_students } = req.body; // Array of student IDs from coordinator selection
    const pool = require('../db/pool');
    const userId = req.user.user_id;
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Mark drive as posted
      const q = 'UPDATE placement_drives SET status = $1, published_at = now(), published_by = $2 WHERE drive_id = $3 RETURNING *';
      const { rows } = await client.query(q, ['posted', userId, driveId]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Drive not found' });
      }

      // Clear any existing selections for this drive
      await client.query('DELETE FROM drive_coordinator_selections WHERE drive_id = $1', [driveId]);
      // Try to enqueue a background job to persist coordinator selections.
      // If the queue is unavailable, fall back to inline insertion so behavior remains consistent.
      let enqueued = false;
      try {
        await jobQueue.add('auto-publish', { drive_id: parseInt(driveId), published_by: userId, selected_students }, { attempts: 3 });
        enqueued = true;
        console.log(`Enqueued publish job for drive ${driveId}`);
      } catch (qerr) {
        console.error('Failed to enqueue publish job, will persist selections inline as fallback:', qerr.message);
      }

      if (!enqueued) {
        // Store the selected students inline as a fallback
        if (selected_students && Array.isArray(selected_students) && selected_students.length > 0) {
          for (const studentId of selected_students) {
            await client.query(
              'INSERT INTO drive_coordinator_selections (drive_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [driveId, studentId]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json(rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error publishing drive: ' + e.message });
  }
}

async function stopRegistrations(req, res) {
  try {
    const { id } = req.params;
    const pool = require('../db/pool');

    // Verify coordinator can update this drive
    const driveRes = await pool.query('SELECT published_by FROM placement_drives WHERE drive_id = $1', [id]);
    if (driveRes.rows.length === 0) {
      return res.status(404).json({ message: 'Drive not found' });
    }

    // Update drive status to 'attending'
    await pool.query(
      'UPDATE placement_drives SET status = $1 WHERE drive_id = $2',
      ['attending', id]
    );

    res.json({ message: 'Registrations stopped. Drive moved to attendance phase.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error stopping registrations: ' + e.message });
  }
}

module.exports = { createDrive, listDrives, getDrive, deleteDrive, publishDrive, stopRegistrations };
