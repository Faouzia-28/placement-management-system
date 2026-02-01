-- Comprehensive fix for drive status display issues
-- This script ensures all required columns exist and have proper defaults

-- 1. Ensure status column exists with proper default
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='status'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END$;

-- 2. Ensure published_at column exists
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='published_at'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN published_at TIMESTAMP;
  END IF;
END$;

-- 3. Ensure published_by column exists
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='published_by'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN published_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END$;

-- 4. Ensure auto_published column exists
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='auto_published'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN auto_published BOOLEAN DEFAULT FALSE;
  END IF;
END$;

-- 5. Ensure attendance_published column exists
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='attendance_published'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN attendance_published BOOLEAN DEFAULT FALSE;
  END IF;
END$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drives_status ON placement_drives(status);
CREATE INDEX IF NOT EXISTS idx_drives_auto_published ON placement_drives(auto_published);
CREATE INDEX IF NOT EXISTS idx_drives_attendance_published ON placement_drives(attendance_published);

-- 7. Update any existing drives that don't have status set
UPDATE placement_drives 
SET status = 'pending' 
WHERE status IS NULL OR status = '';

-- 8. Ensure drive_eligibility_results table exists
CREATE TABLE IF NOT EXISTS drive_eligibility_results (
    id SERIAL PRIMARY KEY,
    drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    is_eligible BOOLEAN DEFAULT FALSE,
    filtered_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    filtered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(drive_id, student_id)
);

-- 9. Ensure drive_coordinator_selections table exists
CREATE TABLE IF NOT EXISTS drive_coordinator_selections (
    id SERIAL PRIMARY KEY,
    drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    selected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(drive_id, student_id)
);

-- 10. Create indexes for eligibility and selections tables
CREATE INDEX IF NOT EXISTS idx_eligibility_drive_id ON drive_eligibility_results(drive_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_student_id ON drive_eligibility_results(student_id);
CREATE INDEX IF NOT EXISTS idx_selections_drive_id ON drive_coordinator_selections(drive_id);
CREATE INDEX IF NOT EXISTS idx_selections_student_id ON drive_coordinator_selections(student_id);

COMMIT;