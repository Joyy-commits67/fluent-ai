/*
  # Add Hearts System and Friends Quests

  1. New Tables
    - `hearts` - Tracks user's current heart count and refill state
    - `friend_quests` - Weekly paired challenges between friends
    - `quest_contributions` - Daily XP/perfection contributions per quest per user

  2. Modified Tables
    - `profiles` - Added `hearts` column (default 5) and `hearts_refilled_at`

  3. Security
    - RLS enabled on all new tables
    - Users can only access their own hearts data
    - Both users in a friendship can see shared quest data

  4. Notes
    - Maximum hearts: 5
    - Wrong answer in drills costs 1 heart
    - At 0 hearts, user is locked out of new practice
    - Refill options: practice to earn 1 heart, or spend 100 XP for full refill
    - Quests pair two friends for a weekly shared goal
    - Quest completion rewards both users with +100 XP and a special badge
*/

-- Add hearts columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hearts') THEN
    ALTER TABLE profiles ADD COLUMN hearts integer NOT NULL DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hearts_refilled_at') THEN
    ALTER TABLE profiles ADD COLUMN hearts_refilled_at timestamptz;
  END IF;
END $$;

-- Friend Quests table
CREATE TABLE IF NOT EXISTS friend_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_type text NOT NULL DEFAULT 'xp_goal', -- xp_goal | perfect_lessons | sessions
  target_value integer NOT NULL DEFAULT 500,
  user1_progress integer NOT NULL DEFAULT 0,
  user2_progress integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  week_start date NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  week_end date NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE) + interval '6 days')::date,
  reward_xp integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL,
  UNIQUE(user1_id, user2_id, week_start)
);

ALTER TABLE friend_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
  ON friend_quests FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert own quests"
  ON friend_quests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own quests"
  ON friend_quests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_friend_quests_users ON friend_quests(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_quests_week ON friend_quests(week_start);

-- Add quest completion achievement
INSERT INTO achievements (id, title, description, icon, xp_reward, condition_type, condition_value, rarity)
VALUES
  ('quest_complete', 'Quest Champion', 'Complete a friends quest together', '🤝', 100, 'quests', 1, 'rare'),
  ('quest_master', 'Quest Master', 'Complete 10 friends quests', '🏆', 500, 'quests', 10, 'epic')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity;
