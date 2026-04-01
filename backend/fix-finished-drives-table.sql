-- Fix finished_drives table structure
BEGIN;

-- Drop the table if it exists and recreate with correct structure
DROP TABLE IF EXISTS finished_drives;

CREATE TABLE finished_drives (
  id SERIAL PRIMARY KEY,
  drive_id INTEGER NOT NULL REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  finished_date TIMESTAMP NOT NULL DEFAULT NOW(),
  total_registered INTEGER DEFAULT 0,
  total_present INTEGER DEFAULT 0,
  total_absent INTEGER DEFAULT 0,
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  interview_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(drive_id)
);

CREATE INDEX IF NOT EXISTS idx_finished_drives_date ON finished_drives(finished_date DESC);
CREATE INDEX IF NOT EXISTS idx_finished_drives_drive_id ON finished_drives(drive_id);

COMMIT;