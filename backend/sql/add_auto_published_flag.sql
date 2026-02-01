-- Add flag to indicate if drive was auto-published by HEAD
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS auto_published BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_drives_auto_published ON placement_drives(auto_published);
