DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='status'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='published_at'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN published_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='placement_drives' AND column_name='published_by'
  ) THEN
    ALTER TABLE placement_drives ADD COLUMN published_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END$$;
