const pool = require('../db/pool');

// Simple in-memory cache to avoid heavy DB queries on every request
let _cache = {
  summary: { ts: 0, data: null },
  drivesOverTime: { ts: 0, data: null },
  registrationsByDrive: { ts: 0, data: null },
  attendanceTrend: { ts: 0, data: null }
};

async function summary(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const driveId = req.query.drive_id ? parseInt(req.query.drive_id) : null;
    const sinceClause = `NOW() - INTERVAL '${days} days'`;
    const driveFilter = driveId ? `AND pd.drive_id = ${driveId}` : '';

    // Return cached if recent (30s) and no specific drive filter
    const now = Date.now();
    if (!driveId && _cache.summary.data && now - _cache.summary.ts < 30000 && !req.query.force) {
      return res.json(_cache.summary.data);
    }

    // Drives counts
    const drivesQ = await pool.query(
      `SELECT
         COUNT(*)::int as total_drives,
         COUNT(*) FILTER (WHERE COALESCE(status,'posted') IN ('pending','posted'))::int as posted_count,
         COUNT(*) FILTER (WHERE status = 'attending')::int as ongoing_count,
         COUNT(*) FILTER (WHERE attendance_published = true)::int as finished_count
       FROM placement_drives pd
       WHERE pd.created_at >= ${sinceClause} ${driveFilter}`
    );

    const drivesStats = drivesQ.rows[0] || { total_drives: 0, posted_count: 0, ongoing_count: 0, finished_count: 0 };

    // Registrations in range
    const regsQ = await pool.query(
      `SELECT COUNT(*)::int as registrations FROM drive_registrations dr JOIN placement_drives pd ON dr.drive_id = pd.drive_id WHERE pd.created_at >= ${sinceClause} ${driveFilter}`
    );

    const regs = regsQ.rows[0] || { registrations: 0 };

    // Attendance present/total
    const attQ = await pool.query(
      `SELECT
         SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END)::int as present,
         COUNT(a.*)::int as total
       FROM attendance a
       JOIN placement_drives pd ON a.drive_id = pd.drive_id
       WHERE pd.created_at >= ${sinceClause} ${driveFilter}`
    );

    const att = attQ.rows[0] || { present: 0, total: 0 };

    const attendanceRate = att.total ? Math.round((att.present / att.total) * 100) : 0;

    const payload = {
      total_drives: parseInt(drivesStats.total_drives) || 0,
      posted: parseInt(drivesStats.posted_count) || 0,
      ongoing: parseInt(drivesStats.ongoing_count) || 0,
      finished: parseInt(drivesStats.finished_count) || 0,
      registrations: parseInt(regs.registrations) || 0,
      attendance_rate_percent: attendanceRate
    };

    if (!driveId) {
      _cache.summary = { ts: now, data: payload };
    }
    res.json(payload);
  } catch (e) {
    console.error('Analytics summary error:', e);
    res.status(500).json({ message: 'Error fetching analytics summary' });
  }
}

async function drivesOverTime(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const driveId = req.query.drive_id ? parseInt(req.query.drive_id) : null;
    const driveFilter = driveId ? `AND pd.drive_id = ${driveId}` : '';
    const now = Date.now();
    if (!driveId && _cache.drivesOverTime.data && now - _cache.drivesOverTime.ts < 30000 && !req.query.force) {
      return res.json(_cache.drivesOverTime.data);
    }

    const q = await pool.query(
      `SELECT to_char(date_trunc('day', pd.created_at), 'YYYY-MM-DD') as day, COUNT(*)::int as count
       FROM placement_drives pd
       WHERE pd.created_at >= NOW() - INTERVAL '${days} days' ${driveFilter}
       GROUP BY day
       ORDER BY day`);
    
    if (!driveId) {
      _cache.drivesOverTime = { ts: now, data: q.rows };
    }
    res.json(q.rows);
  } catch (e) {
    console.error('Analytics drivesOverTime error:', e);
    res.status(500).json({ message: 'Error fetching drives over time' });
  }
}

// Registrations by drive (top N)
async function registrationsByDrive(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 10;
    const driveId = req.query.drive_id ? parseInt(req.query.drive_id) : null;
    const driveFilter = driveId ? `AND pd.drive_id = ${driveId}` : '';
    const now = Date.now();
    if (!driveId && _cache.registrationsByDrive.data && now - _cache.registrationsByDrive.ts < 30000 && !req.query.force) {
      return res.json(_cache.registrationsByDrive.data);
    }

    const q = await pool.query(
      `SELECT pd.drive_id, pd.company_name, pd.job_title, COUNT(dr.registration_id)::int as registrations
       FROM placement_drives pd
       LEFT JOIN drive_registrations dr ON dr.drive_id = pd.drive_id
       WHERE pd.created_at >= NOW() - INTERVAL '${days} days' ${driveFilter}
       GROUP BY pd.drive_id, pd.company_name, pd.job_title
       ORDER BY registrations DESC
       LIMIT $1`, [limit]);

    if (!driveId) {
      _cache.registrationsByDrive = { ts: now, data: q.rows };
    }
    res.json(q.rows);
  } catch (e) {
    console.error('registrationsByDrive error:', e);
    res.status(500).json({ message: 'Error fetching registrations by drive' });
  }
}

// Attendance trend: percent present per day
async function attendanceTrend(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const driveId = req.query.drive_id ? parseInt(req.query.drive_id) : null;
    const driveFilter = driveId ? `AND pd.drive_id = ${driveId}` : '';
    const now = Date.now();
    if (!driveId && _cache.attendanceTrend.data && now - _cache.attendanceTrend.ts < 30000 && !req.query.force) {
      return res.json(_cache.attendanceTrend.data);
    }

    const q = await pool.query(
      `SELECT to_char(date_trunc('day', pd.created_at), 'YYYY-MM-DD') as day,
         SUM(CASE WHEN a.status='PRESENT' THEN 1 ELSE 0 END)::int as present,
         COUNT(a.*)::int as total
       FROM placement_drives pd
       LEFT JOIN attendance a ON a.drive_id = pd.drive_id
       WHERE pd.created_at >= NOW() - INTERVAL '${days} days' ${driveFilter}
       GROUP BY day
       ORDER BY day`);

    const rows = q.rows.map(r => ({ day: r.day, percent: r.total ? Math.round((r.present / r.total) * 100) : 0 }));
    if (!driveId) {
      _cache.attendanceTrend = { ts: now, data: rows };
    }
    res.json(rows);
  } catch (e) {
    console.error('attendanceTrend error:', e);
    res.status(500).json({ message: 'Error fetching attendance trend' });
  }
}

module.exports = { summary, drivesOverTime, registrationsByDrive, attendanceTrend };
