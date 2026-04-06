-- Convert any existing cyclical lists to general
UPDATE lists SET type = 'general' WHERE type = 'cyclical';

-- Update the type constraint to remove cyclical
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_type_check;
ALTER TABLE lists ADD CONSTRAINT lists_type_check
  CHECK (type IN ('general', 'daily', 'shopping', 'template'));
