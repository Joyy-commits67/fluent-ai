/*
  # Add Premium User Features and Error Notebook

  1. New Tables
    - `error_notebook` - Stores user's failed grammar/vocab questions for smart review

  2. Modified Tables
    - `profiles` - Added `is_premium` boolean column (default false)

  3. Security
    - RLS enabled on error_notebook
    - Users can only access their own error data

  4. Notes
    - Premium users bypass the hearts system (infinite hearts)
    - Premium users get a diamond badge and exclusive "Diamond+" league tier
    - Error notebook aggregates mistakes for smart review quiz generation
*/

-- Add is_premium to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_premium') THEN
    ALTER TABLE profiles ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Error Notebook table
CREATE TABLE IF NOT EXISTS error_notebook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'grammar', -- grammar | vocabulary | interview
  question_type text NOT NULL DEFAULT '', -- scramble | fill-blanks | pick-definition | type-word
  question_text text NOT NULL DEFAULT '',
  correct_answer text NOT NULL DEFAULT '',
  user_answer text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  word text DEFAULT '',
  meaning text DEFAULT '',
  times_wrong integer NOT NULL DEFAULT 1,
  times_reviewed integer NOT NULL DEFAULT 0,
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  mastered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE error_notebook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own errors"
  ON error_notebook FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own errors"
  ON error_notebook FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own errors"
  ON error_notebook FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own errors"
  ON error_notebook FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_notebook_user ON error_notebook(user_id);
CREATE INDEX IF NOT EXISTS idx_error_notebook_mastered ON error_notebook(user_id, mastered);
CREATE INDEX IF NOT EXISTS idx_error_notebook_source ON error_notebook(user_id, source);

-- Add premium achievements
INSERT INTO achievements (id, title, description, icon, xp_reward, condition_type, condition_value, rarity)
VALUES
  ('premium_member', 'Premium Member', 'Upgrade to FluentAI Premium', '💎', 0, 'premium', 1, 'legendary'),
  ('error_slayer', 'Error Slayer', 'Master 25 mistakes in Smart Review', '🛡️', 200, 'errors_mastered', 25, 'rare'),
  ('error_annihilator', 'Error Annihilator', 'Master 100 mistakes in Smart Review', '⚔️', 500, 'errors_mastered', 100, 'epic')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity;
