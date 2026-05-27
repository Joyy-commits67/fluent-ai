/*
  # Create User Lessons Progress Table

  1. New Tables
    - `user_lessons` - Tracks user's position on the learning path

  2. Columns
    - `user_id` - FK to auth.users
    - `current_section` - Current section index (1-based)
    - `current_unit` - Current unit index within section (1-based)
    - `current_node` - Current node index within unit (0-based)
    - `completed_steps` - Total steps completed across all nodes
    - `unlocked_nodes` - JSON array of node keys that are unlocked (e.g. ["1-1-0","1-1-1"])
    - `completed_nodes` - JSON array of node keys that are fully completed
    - `chests_claimed` - JSON array of chest keys that have been claimed
    - `total_stars` - Total stars earned across all nodes (0-3 per node)
    - `node_stars` - JSON object mapping node key to stars earned (e.g. {"1-1-0": 3})
    - `updated_at` - Timestamp of last progress save

  3. Security
    - RLS enabled
    - Users can only access their own progress

  4. Notes
    - Only one row per user (upsert on user_id)
    - Progress is loaded on login and saved after each exercise
*/

CREATE TABLE IF NOT EXISTS user_lessons (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_section integer NOT NULL DEFAULT 1,
  current_unit integer NOT NULL DEFAULT 1,
  current_node integer NOT NULL DEFAULT 0,
  completed_steps integer NOT NULL DEFAULT 0,
  unlocked_nodes jsonb NOT NULL DEFAULT '["1-1-0"]'::jsonb,
  completed_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  chests_claimed jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_stars integer NOT NULL DEFAULT 0,
  node_stars jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lessons"
  ON user_lessons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lessons"
  ON user_lessons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lessons"
  ON user_lessons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_lessons_user ON user_lessons(user_id);
