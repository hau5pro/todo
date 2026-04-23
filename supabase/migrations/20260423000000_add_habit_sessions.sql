-- Add habit_sessions table for time logging against habit tasks.
-- Sync logic is deferred; this migration creates the schema so the table
-- exists on the remote when sync is eventually implemented.

CREATE TABLE habit_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  pending_sync BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE habit_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit_sessions" ON habit_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX habit_sessions_task_id_idx ON habit_sessions (task_id);
CREATE INDEX habit_sessions_date_idx ON habit_sessions (date);
CREATE INDEX habit_sessions_task_id_date_idx ON habit_sessions (task_id, date);
