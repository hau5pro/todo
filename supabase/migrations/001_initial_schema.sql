-- Lists
CREATE TABLE lists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general','cyclical','daily','shopping','template')),
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists" ON lists USING (auth.uid() = user_id);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  list_id UUID REFERENCES lists(id) NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  recurrence_interval INTEGER,
  recurrence_unit TEXT CHECK (recurrence_unit IN ('days','weeks','months')),
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON tasks USING (auth.uid() = user_id);

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
CREATE POLICY "own habit_completions" ON habit_completions USING (auth.uid() = user_id);

-- Push subscriptions (for Web Push notifications)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push_subscriptions" ON push_subscriptions USING (auth.uid() = user_id);
