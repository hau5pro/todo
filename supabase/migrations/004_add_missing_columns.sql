-- Add icon and folder_id to lists
ALTER TABLE lists ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS folder_id UUID;

-- Add rrule to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rrule TEXT;
