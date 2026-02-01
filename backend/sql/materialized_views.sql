-- Materialized views to speed up analytics queries

-- Registrations per drive (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_registrations_per_drive AS
SELECT
  pd.drive_id,
  pd.company_name,
  pd.job_title,
  COUNT(dr.registration_id)::int as registrations,
  MAX(pd.created_at) as last_posted_at
FROM placement_drives pd
LEFT JOIN drive_registrations dr ON dr.drive_id = pd.drive_id
GROUP BY pd.drive_id, pd.company_name, pd.job_title;

-- Attendance daily summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_daily AS
SELECT
  date_trunc('day', pd.created_at) as day,
  SUM(CASE WHEN a.status='PRESENT' THEN 1 ELSE 0 END)::int as present,
  COUNT(a.*)::int as total
FROM placement_drives pd
LEFT JOIN attendance a ON a.drive_id = pd.drive_id
GROUP BY date_trunc('day', pd.created_at);

-- Note: refresh materialized views periodically (e.g., via cron or pg_cron):
-- REFRESH MATERIALIZED VIEW mv_registrations_per_drive;
-- REFRESH MATERIALIZED VIEW mv_attendance_daily;
