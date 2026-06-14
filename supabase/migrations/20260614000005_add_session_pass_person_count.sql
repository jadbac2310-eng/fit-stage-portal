ALTER TABLE session_passes
  ADD COLUMN IF NOT EXISTS person_count smallint NOT NULL DEFAULT 1;
