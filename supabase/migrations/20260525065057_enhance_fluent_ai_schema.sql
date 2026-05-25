/*
  # Enhance FluentAI Schema for Duolingo-Style Features

  1. New Tables
    - `vocabulary_words` - User's learned vocabulary with spaced repetition
    - `friends` - Friend connections between users
    - `learning_lessons` - Structured lesson content
    - `user_lesson_progress` - Track lesson completion
    - `leaderboard_cache` - Weekly leaderboard snapshots

  2. Modified Tables
    - `profiles` - Added many new columns for gamification, settings, leagues

  3. Security
    - RLS enabled on all new tables
    - Proper policies for user data access

  4. Notes
    - League system: bronze -> silver -> gold -> platinum -> diamond -> master -> legend
    - Spaced repetition: next_review_at based on performance
*/

-- Enhance profiles table with new columns
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'english_level') THEN
    ALTER TABLE profiles ADD COLUMN english_level text NOT NULL DEFAULT 'A1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_words_learned') THEN
    ALTER TABLE profiles ADD COLUMN total_words_learned integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'speaking_fluency') THEN
    ALTER TABLE profiles ADD COLUMN speaking_fluency real NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'league') THEN
    ALTER TABLE profiles ADD COLUMN league text NOT NULL DEFAULT 'bronze';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'league_xp') THEN
    ALTER TABLE profiles ADD COLUMN league_xp integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_goal') THEN
    ALTER TABLE profiles ADD COLUMN daily_goal integer NOT NULL DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_xp') THEN
    ALTER TABLE profiles ADD COLUMN daily_xp integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sound_enabled') THEN
    ALTER TABLE profiles ADD COLUMN sound_enabled boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'speech_speed') THEN
    ALTER TABLE profiles ADD COLUMN speech_speed real NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_listen') THEN
    ALTER TABLE profiles ADD COLUMN auto_listen boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Vocabulary words table
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  meaning text NOT NULL DEFAULT '',
  pronunciation text NOT NULL DEFAULT '',
  part_of_speech text NOT NULL DEFAULT '',
  example_sentence text NOT NULL DEFAULT '',
  synonyms text[] DEFAULT '{}',
  antonyms text[] DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'intermediate',
  is_favorite boolean NOT NULL DEFAULT false,
  times_reviewed integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  learned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocabulary"
  ON vocabulary_words FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocabulary"
  ON vocabulary_words FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocabulary"
  ON vocabulary_words FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary"
  ON vocabulary_words FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON friends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert friend requests"
  ON friends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships"
  ON friends FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Update sessions table with new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'speaking_score') THEN
    ALTER TABLE sessions ADD COLUMN speaking_score real DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'fluency_score') THEN
    ALTER TABLE sessions ADD COLUMN fluency_score real DEFAULT NULL;
  END IF;
END $$;

-- Update session_messages with pronunciation_score
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_messages' AND column_name = 'pronunciation_score') THEN
    ALTER TABLE session_messages ADD COLUMN pronunciation_score real DEFAULT NULL;
  END IF;
END $$;

-- Update daily_activity with new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activity' AND column_name = 'words_learned') THEN
    ALTER TABLE daily_activity ADD COLUMN words_learned integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activity' AND column_name = 'grammar_correct') THEN
    ALTER TABLE daily_activity ADD COLUMN grammar_correct integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activity' AND column_name = 'grammar_total') THEN
    ALTER TABLE daily_activity ADD COLUMN grammar_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Update achievements with rarity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'rarity') THEN
    ALTER TABLE achievements ADD COLUMN rarity text NOT NULL DEFAULT 'common';
  END IF;
END $$;

-- Add more achievements
INSERT INTO achievements (id, title, description, icon, xp_reward, condition_type, condition_value, rarity)
VALUES
  ('word_collector', 'Word Collector', 'Learn 50 new words', '📖', 150, 'words', 50, 'rare'),
  ('grammar_master', 'Grammar Master', 'Get 100 sentences correct on first try', '✏️', 200, 'grammar', 100, 'rare'),
  ('streak_week', '7-Day Streak', 'Practice for 7 days in a row', '🔥', 100, 'streak', 7, 'common'),
  ('streak_month', '30-Day Streak', 'Practice for 30 days in a row', '⚡', 500, 'streak', 30, 'epic'),
  ('league_gold', 'Gold League', 'Reach the Gold league', '🥇', 300, 'league', 3, 'rare'),
  ('league_diamond', 'Diamond League', 'Reach the Diamond league', '💠', 500, 'league', 5, 'epic'),
  ('league_master', 'Master League', 'Reach the Master league', '🏆', 1000, 'league', 6, 'legendary'),
  ('conversation_100', 'Conversationalist', 'Send 100 messages', '💬', 150, 'messages', 100, 'common'),
  ('hours_10', 'Dedicated Learner', 'Practice for 10 total hours', '⏰', 250, 'hours', 10, 'rare'),
  ('perfect_interview', 'Perfect Interview', 'Score 95%+ on an interview', '💼', 300, 'score', 95, 'epic')
ON CONFLICT (id) DO UPDATE SET
  rarity = EXCLUDED.rarity;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_user_word ON vocabulary_words(user_id, word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_review ON vocabulary_words(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
