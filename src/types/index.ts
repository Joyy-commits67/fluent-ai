export type SessionMode =
  | 'speaking'
  | 'interview'
  | 'casual'
  | 'ielts'
  | 'debate'
  | 'story'
  | 'pronunciation'
  | 'vocab'
  | 'confidence'
  | 'rapid'
  | 'shadow'
  | 'grammar_challenge'
  | 'listening';

export type Difficulty = 'beginner' | 'elementary' | 'intermediate' | 'upper_intermediate' | 'advanced' | 'fluent';

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type LeagueName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'legend';

export interface Profile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  english_level: EnglishLevel;
  xp: number;
  level: number;
  streak: number;
  longest_streak: number;
  total_sessions: number;
  total_messages: number;
  total_words_learned: number;
  grammar_accuracy: number;
  speaking_fluency: number;
  last_session_at: string | null;
  last_streak_date: string | null;
  league: LeagueName;
  league_xp: number;
  daily_goal: number;
  daily_xp: number;
  sound_enabled: boolean;
  speech_speed: number;
  auto_listen: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  mode: SessionMode;
  topic: string;
  role: string;
  company: string;
  difficulty: Difficulty;
  status: 'active' | 'completed' | 'abandoned';
  duration_seconds: number;
  message_count: number;
  grammar_score: number | null;
  vocabulary_score: number | null;
  confidence_score: number | null;
  communication_score: number | null;
  speaking_score: number | null;
  fluency_score: number | null;
  overall_score: number | null;
  feedback: string;
  xp_earned: number;
  created_at: string;
  completed_at: string | null;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  has_grammar_error: boolean;
  corrected_content: string;
  grammar_explanation: string;
  pronunciation_score: number | null;
  created_at: string;
}

export interface GrammarCorrection {
  id: string;
  user_id: string;
  session_id: string | null;
  original: string;
  corrected: string;
  explanation: string;
  error_type: 'grammar' | 'vocabulary' | 'pronunciation' | 'structure' | 'spelling';
  created_at: string;
}

export interface VocabularyWord {
  id: string;
  user_id: string;
  word: string;
  meaning: string;
  pronunciation: string;
  part_of_speech: string;
  example_sentence: string;
  synonyms: string[];
  antonyms: string[];
  difficulty: Difficulty;
  is_favorite: boolean;
  times_reviewed: number;
  correct_count: number;
  next_review_at: string;
  learned_at: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  sessions_count: number;
  messages_count: number;
  xp_earned: number;
  minutes_practiced: number;
  words_learned: number;
  grammar_correct: number;
  grammar_total: number;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend_profile?: Profile;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  grammarCorrection?: {
    original: string;
    corrected: string;
    explanation: string;
    errorType?: string;
  } | null;
  pronunciationScore?: number;
}

export interface InterviewReport {
  grammar_score: number;
  vocabulary_score: number;
  confidence_score: number;
  communication_score: number;
  speaking_score: number;
  fluency_score: number;
  overall_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface LearningLesson {
  id: string;
  level: EnglishLevel;
  category: 'vocabulary' | 'grammar' | 'speaking' | 'listening' | 'pronunciation';
  title: string;
  description: string;
  xp_reward: number;
  order_index: number;
  is_unlocked: boolean;
  is_completed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string;
  xp: number;
  is_current_user: boolean;
}
