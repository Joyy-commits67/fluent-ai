/*
  # FluentAI Platform - Complete Database Schema

  1. New Tables
    - `profiles` - Extended user profile with XP, level, streak data
    - `sessions` - Speaking/interview practice sessions
    - `session_messages` - Individual messages within sessions
    - `grammar_corrections` - Grammar mistake records
    - `achievements` - Achievement definitions
    - `user_achievements` - Earned achievements per user
    - `daily_activity` - Daily usage tracking for streaks/goals

  2. Security
    - RLS enabled on all tables
    - Users can only access their own data

  3. Notes
    - XP system: 10 XP per message, 50 XP per session completion
    - Level thresholds: 100 XP per level
    - Streak increments daily on first session of the day
*/

-- Profiles table: extends auth.users with gamification data
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_sessions integer NOT NULL DEFAULT 0,
  total_messages integer NOT NULL DEFAULT 0,
  grammar_accuracy real NOT NULL DEFAULT 0,
  last_session_at timestamptz,
  last_streak_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Sessions table: each practice session
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'speaking', -- speaking | interview | casual | ielts | debate | story | pronunciation | vocab | confidence | rapid
  topic text NOT NULL DEFAULT '',
  role text DEFAULT '',
  company text DEFAULT '',
  difficulty text NOT NULL DEFAULT 'beginner', -- beginner | intermediate | advanced
  status text NOT NULL DEFAULT 'active', -- active | completed | abandoned
  duration_seconds integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  grammar_score real DEFAULT NULL,
  vocabulary_score real DEFAULT NULL,
  confidence_score real DEFAULT NULL,
  communication_score real DEFAULT NULL,
  overall_score real DEFAULT NULL,
  feedback text DEFAULT '',
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session messages
CREATE TABLE IF NOT EXISTS session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user', -- user | assistant
  content text NOT NULL DEFAULT '',
  has_grammar_error boolean NOT NULL DEFAULT false,
  corrected_content text DEFAULT '',
  grammar_explanation text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session messages"
  ON session_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session messages"
  ON session_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grammar corrections log
CREATE TABLE IF NOT EXISTS grammar_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  original text NOT NULL DEFAULT '',
  corrected text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  error_type text NOT NULL DEFAULT '', -- grammar | vocabulary | pronunciation | structure
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grammar_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grammar corrections"
  ON grammar_corrections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grammar corrections"
  ON grammar_corrections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Achievements definitions
CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  xp_reward integer NOT NULL DEFAULT 0,
  condition_type text NOT NULL DEFAULT '', -- sessions | messages | streak | grammar | level
  condition_value integer NOT NULL DEFAULT 0
);

-- Pre-populate achievements
INSERT INTO achievements (id, title, description, icon, xp_reward, condition_type, condition_value)
VALUES
  ('first_words', 'First Words', 'Complete your first speaking session', '🎤', 50, 'sessions', 1),
  ('chatterbox', 'Chatterbox', 'Send 50 messages in conversations', '💬', 100, 'messages', 50),
  ('consistent', 'Consistent', 'Maintain a 3-day streak', '🔥', 75, 'streak', 3),
  ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 150, 'streak', 7),
  ('grammar_guru', 'Grammar Guru', 'Complete 10 sessions with corrections', '📚', 200, 'sessions', 10),
  ('interview_ace', 'Interview Ace', 'Complete your first interview session', '💼', 100, 'sessions', 1),
  ('level_5', 'Rising Star', 'Reach level 5', '⭐', 250, 'level', 5),
  ('level_10', 'Expert Speaker', 'Reach level 10', '🏆', 500, 'level', 10),
  ('marathon', 'Marathon Talker', 'Send 200 total messages', '🚀', 300, 'messages', 200),
  ('month_streak', 'Monthly Master', 'Maintain a 30-day streak', '👑', 1000, 'streak', 30)
ON CONFLICT (id) DO NOTHING;

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES achievements(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily activity tracking
CREATE TABLE IF NOT EXISTS daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  sessions_count integer NOT NULL DEFAULT 0,
  messages_count integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  minutes_practiced integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, activity_date)
);

ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily activity"
  ON daily_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily activity"
  ON daily_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily activity"
  ON daily_activity FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_grammar_corrections_user_id ON grammar_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
