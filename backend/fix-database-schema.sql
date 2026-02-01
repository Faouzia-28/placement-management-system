-- Comprehensive database schema fix for PlaceOps
-- This script adds all missing columns and tables

BEGIN;

-- 1. Add missing columns to placement_drives table
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS published_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS auto_published BOOLEAN DEFAULT FALSE;
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS attendance_published BOOLEAN DEFAULT FALSE;

-- 2. Update any existing drives that don't have status set
UPDATE placement_drives SET status = 'pending' WHERE status IS NULL OR status = '';

-- 3. Create drive_eligibility_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS drive_eligibility_results (
    id SERIAL PRIMARY KEY,
    drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    is_eligible BOOLEAN DEFAULT FALSE,
    filtered_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    filtered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(drive_id, student_id)
);

-- 4. Create drive_coordinator_selections table if it doesn't exist
CREATE TABLE IF NOT EXISTS drive_coordinator_selections (
    id SERIAL PRIMARY KEY,
    drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    selected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(drive_id, student_id)
);

-- 5. Create finished_drives table if it doesn't exist
CREATE TABLE IF NOT EXISTS finished_drives (
    id SERIAL PRIMARY KEY,
    drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    total_registered INTEGER DEFAULT 0,
    total_attended INTEGER DEFAULT 0,
    total_selected INTEGER DEFAULT 0,
    finished_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drives_status ON placement_drives(status);
CREATE INDEX IF NOT EXISTS idx_drives_auto_published ON placement_drives(auto_published);
CREATE INDEX IF NOT EXISTS idx_drives_attendance_published ON placement_drives(attendance_published);
CREATE INDEX IF NOT EXISTS idx_eligibility_drive_id ON drive_eligibility_results(drive_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_student_id ON drive_eligibility_results(student_id);
CREATE INDEX IF NOT EXISTS idx_selections_drive_id ON drive_coordinator_selections(drive_id);
CREATE INDEX IF NOT EXISTS idx_selections_student_id ON drive_coordinator_selections(student_id);

-- 7. Fix any existing data inconsistencies
UPDATE placement_drives SET auto_published = COALESCE(auto_published, false) WHERE auto_published IS NULL;
UPDATE placement_drives SET attendance_published = COALESCE(attendance_published, false) WHERE attendance_published IS NULL;

COMMIT;

-- Verify the fix
SELECT 'Schema fix completed successfully!' as status;