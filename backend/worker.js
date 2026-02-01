require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createWorker } = require('./queue');
const eligibilityService = require('./src/services/eligibilityService');
const driveService = require('./src/services/driveService');
const pool = require('./src/db/pool');

// Ensure temp uploads folder exists
const TEMP_DIR = path.join(__dirname, 'uploads', 'temp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

async function processor(job) {
  console.log(`Worker processing job ${job.id} (${job.name})`, job.data || '');
  try {
    switch (job.name) {
      case 'eligibility-filter': {
        const { drive_id, min_cgpa, min_10th, min_12th, max_backlogs, filtered_by } = job.data;
        const ids = await eligibilityService.filterAndStoreEligibility({ drive_id, min_cgpa, min_10th, min_12th, max_backlogs, filtered_by });
        return { eligible_count: ids.length };
      }

      case 'auto-publish': {
        let { drive_id, selected_students, published_by } = job.data;
        // If no selected_students provided, run eligibility filtering first
        if (!Array.isArray(selected_students) || selected_students.length === 0) {
          try {
            const drive = await driveService.getDriveById(drive_id);
            if (drive) {
              selected_students = await eligibilityService.filterAndStoreEligibility({
                drive_id,
                min_cgpa: drive.min_cgpa,
                min_10th: drive.min_10th,
                min_12th: drive.min_12th,
                max_backlogs: drive.max_backlogs,
                filtered_by: published_by
              });
              console.log(`auto-publish: found ${selected_students.length} students for drive ${drive_id}`);
            }
          } catch (e) {
            console.error('auto-publish eligibility step failed:', e);
          }
        }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const q = 'UPDATE placement_drives SET status = $1, published_at = now(), published_by = $2 WHERE drive_id = $3 RETURNING *';
          const { rows } = await client.query(q, ['posted', published_by, drive_id]);
          // clear existing selections
          await client.query('DELETE FROM drive_coordinator_selections WHERE drive_id = $1', [drive_id]);
          if (Array.isArray(selected_students) && selected_students.length > 0) {
            for (const sid of selected_students) {
              await client.query('INSERT INTO drive_coordinator_selections (drive_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [drive_id, sid]);
            }
          }
          await client.query('COMMIT');
          return { published: true, drive: rows[0] };
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      case 'export-registrations-csv': {
        const { drive_id } = job.data;
        // get registrations
        const res = await pool.query('SELECT dr.*, u.name, u.email FROM drive_registrations dr JOIN users u ON dr.student_id = u.user_id WHERE dr.drive_id=$1', [drive_id]);
        const rows = res.rows || [];
        const header = ['Name', 'Email', 'Registered At'];
        const csvRows = [header, ...rows.map(r => [r.name || '', r.email || '', r.registered_at ? new Date(r.registered_at).toISOString() : ''])];
        const csv = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const filename = `student-list-drive-${drive_id}-${Date.now()}.csv`;
        const filepath = path.join(TEMP_DIR, filename);
        fs.writeFileSync(filepath, csv, 'utf8');
        return { path: `/uploads/temp/${filename}`, filepath };
      }

      case 'refresh-materialized-views': {
        const sqlPath = path.join(__dirname, 'scripts', 'sql', 'materialized_views.sql');
        if (!fs.existsSync(sqlPath)) {
          console.warn('No materialized_views.sql found');
          return { refreshed: false };
        }
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        return { refreshed: true };
      }

      default:
        console.warn('Unknown job type:', job.name);
        return { ok: true };
    }
  } catch (e) {
    console.error('Job failed:', e);
    throw e;
  }
}

const worker = createWorker(processor);

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} (${job.name}) completed`, returnvalue);
});
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} (${job.name}) failed:`, err.message);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

console.log('Worker started and waiting for jobs...');
