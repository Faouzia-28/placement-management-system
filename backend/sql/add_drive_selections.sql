-- Store which students were selected by coordinator for each drive
CREATE TABLE IF NOT EXISTS drive_coordinator_selections (
  selection_id SERIAL PRIMARY KEY,
  drive_id INT NOT NULL REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(drive_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_selections_drive ON drive_coordinator_selections(drive_id);
CREATE INDEX IF NOT EXISTS idx_drive_selections_student ON drive_coordinator_selections(student_id);
