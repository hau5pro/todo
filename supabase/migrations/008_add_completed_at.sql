-- Add completed_at to tasks so My Day can keep completed tasks visible until the next day
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
