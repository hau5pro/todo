-- Add group/section support to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "group" text DEFAULT NULL;
