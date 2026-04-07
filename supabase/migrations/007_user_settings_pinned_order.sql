ALTER TABLE user_settings ADD COLUMN pinned_order JSONB NOT NULL DEFAULT '["my-day"]';
