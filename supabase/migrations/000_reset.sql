-- !! DESTRUCTIVE — drops and recreates all app tables !!
-- Run this to fully reset the database schema.

-- Drop tables in FK-safe order
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS habit_completions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- Lists
CREATE TABLE lists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'daily', 'shopping', 'template')),
  icon TEXT,
  folder_id UUID,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists" ON lists USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Folders
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON folders USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  list_id UUID REFERENCES lists(id) NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  recurrence_interval INTEGER,
  recurrence_unit TEXT CHECK (recurrence_unit IN ('days', 'weeks', 'months')),
  rrule TEXT,
  "group" TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON tasks USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Habit completions
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  UNIQUE(task_id, date)
);
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit_completions" ON habit_completions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accent TEXT NOT NULL DEFAULT 'blue',
  hidden_list_ids TEXT[] NOT NULL DEFAULT '{}',
  show_my_day BOOLEAN NOT NULL DEFAULT true,
  setup_done BOOLEAN NOT NULL DEFAULT false,
  pinned_order JSONB NOT NULL DEFAULT '["my-day"]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_settings" ON user_settings USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push_subscriptions" ON push_subscriptions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
