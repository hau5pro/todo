CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accent TEXT NOT NULL DEFAULT 'blue',
  hidden_list_ids TEXT[] NOT NULL DEFAULT '{}',
  show_my_day BOOLEAN NOT NULL DEFAULT true,
  setup_done BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_settings" ON user_settings USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
