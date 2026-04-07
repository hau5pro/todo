-- List folders
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON folders USING (auth.uid() = user_id);
