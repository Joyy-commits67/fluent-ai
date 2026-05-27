import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ArrowRight, Zap, Flame, Target, Clock, Trophy, Star,
  TrendingUp, MessageSquare, Brain, Mic, Award, BookOpen, Heart,
  Sparkles, Headphones, Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getModeLabel, getModeDescription, LEAGUE_ICONS, getStreakEmoji, getMotivationalMessage, LEAGUES } from '../lib/xp';
import ProgressBar from '../components/ui/ProgressBar';
import StreakFlame from '../components/ui/StreakFlame';
import HeartsBar from '../components/ui/HeartsBar';
import RefillHeartsModal from '../components/ui/RefillHeartsModal';
import Confetti from '../components/ui/Confetti';
import { useHearts } from '../hooks/useHearts';
import type { SessionMode, Session, DailyActivity, League } from '../types';

interface ModeCard {
  mode: SessionMode;
  label: string;
  description: string;
  color: string;
  badge?: string;
  icon: typeof Mic;
  special?: 'grammar' | 'vocablab' | 'premium';
}

const MODE_CARDS: ModeCard[] = [
  { mode: 'speaking', label: 'Speaking Coach', description: 'Practice real conversations with instant feedback', color: 'from-blue-500 to-cyan-500', badge: 'Recommended', icon: Mic },
  { mode: 'interview', label: 'Interview Prep', description: 'Simulate job interviews with detailed scoring', color: 'from-emerald-500 to-teal-500', badge: 'Popular', icon: Briefcase },
  { mode: 'vocab', label: 'Learn Words', description: 'Learn new words with Duolingo-style challenges', color: 'from-violet-500 to-purple-500', badge: 'New', icon: Sparkles, special: 'vocablab' },
  { mode: 'grammar_challenge', label: 'Grammar Drills', description: 'Duolingo-style word puzzles and exercises', color: 'from-rose-500 to-pink-500', badge: 'Fun', icon: BookOpen, special: 'grammar' },
  { mode: 'ielts', label: 'IELTS Prep', description: 'Full IELTS speaking test simulation', color: 'from-amber-500 to-orange-500', icon: Award },
  { mode: 'listening', label: 'Listening Lab', description: 'Improve comprehension and listening skills', color: 'from-sky-500 to-blue-500', icon: Headphones },
];

interface Props {
  onStartSession: (mode: SessionMode, options?: { topic?: string; role?: string; company?: string; difficulty?: string }) => void;
  onStartGrammar?: () => void;
  onStartVocabLab?: () => void;
  onStartPremium?: () => void;
}

export default function Dashboard({ onStartSession, onStartGrammar, onStartVocabLab, onStartPremium }: Props) {
  const { profile, refreshProfile } = useAuth();
  const {
    hearts, maxHearts, canPlay, showRefillModal, setShowRefillModal,
    refillWithXP, refillByPractice, isRefilling, xpRefillCost,
    isPremium,
  } = useHearts();
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ModeCard | null>(null);
  const [dailyGoalMet, setDailyGoalMet] = useState(false);

  // Interview options
  const [interviewRole, setInterviewRole] = useState('Software Engineer');
  const [interviewCompany, setInterviewCompany] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const fetchDashboardData = useCallback(async () => {
    if (!profile) return;
    try {
      const [sessionsRes, activityRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('daily_activity')
          .select('*')
          .eq('user_id', profile.id)
          .order('activity_date', { ascending: false })
          .limit(7),
      ]);
      if (sessionsRes.data) setRecentSessions(sessionsRes.data as Session[]);
      if (activityRes.data) setActivity(activityRes.data as DailyActivity[]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (profile) {
      const today = new Date().toISOString().split('T')[0];
      const todayActivity = activity.find((a) => a.activity_date === today);
      setDailyGoalMet((todayActivity?.xp_earned ?? 0) >= profile.daily_goal);
    }
  }, [activity, profile]);

  const todayXp = activity[0]?.xp_earned ?? 0;
  const todayMinutes = activity[0]?.minutes_practiced ?? 0;
  const weekXp = activity.slice(0, 7).reduce((a, d) => a + d.xp_earned, 0);
  const nextLeague = LEAGUES.indexOf(profile?.league ?? 'bronze') < LEAGUES.length - 1;
  const nextLeagueName = nextLeague
    ? LEAGUES[LEAGUES.indexOf(profile?.league ?? 'bronze') + 1]
    : null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleStart = () => {
    if (!selectedMode) return;

    // Check hearts before starting
    if (!canPlay) {
      setShowRefillModal(true);
      return;
    }

    if (selectedMode.special === 'grammar') {
      onStartGrammar?.();
    } else if (selectedMode.special === 'vocablab') {
      onStartVocabLab?.();
    } else if (selectedMode.special === 'premium') {
      onStartPremium?.();
    } else if (selectedMode.mode === 'interview') {
      onStartSession('interview', { role: interviewRole, company: interviewCompany, difficulty });
    } else {
      onStartSession(selectedMode.mode, { difficulty });
    }
    setSelectedMode(null);
  };

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Celebration */}
        <Confetti trigger={dailyGoalMet} />

        {/* Refill Modal */}
        {showRefillModal && (
          <RefillHeartsModal
            hearts={hearts}
            maxHearts={maxHearts}
            xpRefillCost={xpRefillCost}
            isRefilling={isRefilling}
            onRefillWithXP={refillWithXP}
            onRefillByPractice={refillByPractice}
            onClose={() => setShowRefillModal(false)}
          />
        )}

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-6 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-emerald-500/5 border border-blue-500/20 rounded-3xl"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black">
                {greeting()}, {profile?.display_name || 'Learner'}!
              </h1>
              <p className="text-white/60 mt-1 flex items-center gap-2">
                <span className="text-lg">{getStreakEmoji(profile?.streak ?? 0)}</span>
                {getMotivationalMessage(profile?.streak ?? 0)}
              </p>
            </div>

            {profile && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <HeartsBar hearts={hearts} maxHearts={maxHearts} size="md" isPremium={isPremium} />
                  <div className="text-xs text-white/40 mt-1">Hearts</div>
                </div>
                <div className="text-center">
                  <StreakFlame streak={profile.streak} size="md" />
                  <div className="text-xs text-white/40 mt-1">Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-400">{profile.xp}</div>
                  <div className="text-xs text-white/40">Total XP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-400">{profile.total_sessions}</div>
                  <div className="text-xs text-white/40">Sessions</div>
                </div>
              </div>
            )}
          </div>

          {/* Progress bars */}
          {profile && (
            <div className="mt-5 space-y-3">
              <ProgressBar
                xp={profile.xp}
                level={profile.level}
                league={profile.league as League}
                showDaily
                dailyGoal={profile.daily_goal}
                dailyXp={todayXp}
              />
            </div>
          )}
        </motion.div>

        {/* Continue Learning Card */}
        {!dailyGoalMet && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 rounded-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Target size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Daily goal: {todayXp} / {profile?.daily_goal ?? 50} XP</h3>
                <p className="text-white/50 text-sm">Keep learning to earn your daily reward!</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMode(MODE_CARDS[0])}
                className="px-5 py-2.5 bg-emerald-500 rounded-xl font-bold text-sm"
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { icon: Flame, label: 'Streak', value: profile?.streak ?? 0, color: 'text-amber-400', bg: 'from-amber-500/15' },
            { icon: Zap, label: 'Today', value: `${todayXp} XP`, color: 'text-blue-400', bg: 'from-blue-500/15' },
            { icon: Clock, label: 'Minutes', value: todayMinutes, color: 'text-emerald-400', bg: 'from-emerald-500/15' },
            { icon: TrendingUp, label: 'This Week', value: `${weekXp} XP`, color: 'text-violet-400', bg: 'from-violet-500/15' },
            { icon: Brain, label: 'Words', value: profile?.total_words_learned ?? 0, color: 'text-rose-400', bg: 'from-rose-500/15' },
            { icon: Trophy, label: 'League', value: LEAGUE_ICONS[profile?.league as League] || '', color: 'text-cyan-400', bg: 'from-cyan-500/15' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className={`p-3 bg-gradient-to-br ${stat.bg} border border-white/10 rounded-xl text-center`}
            >
              <stat.icon size={16} className={`${stat.color} mx-auto mb-1`} />
              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-white/40">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Practice Modules - 6 Card Grid */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Play size={18} className="text-blue-400" />
            Choose Your Practice
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MODE_CARDS.map((card, i) => (
              <motion.div
                key={card.mode}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                onClick={() => setSelectedMode(card)}
                className="relative p-5 bg-white/[0.03] border border-white/10 rounded-2xl cursor-pointer hover:border-white/20 hover:bg-white/[0.06] transition-all group overflow-hidden"
              >
                {card.badge && (
                  <div className={`absolute -top-0 -right-0 px-2 py-0.5 bg-gradient-to-r ${card.color} rounded-bl-xl rounded-tr-xl text-xs font-bold`}>
                    {card.badge}
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <card.icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-sm mb-1">{card.label}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{card.description}</p>
                <div className={`mt-3 flex items-center gap-1 text-xs font-semibold bg-gradient-to-r ${card.color} bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Start <ArrowRight size={12} className="text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock size={18} className="text-emerald-400" />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/15 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center text-lg">
                    {session.mode === 'interview' ? '💼' : '🎤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{getModeLabel(session.mode)}</div>
                    <div className="text-white/40 text-xs">
                      {session.message_count} messages • {Math.round(session.duration_seconds / 60)} min
                    </div>
                  </div>
                  {session.overall_score != null && (
                    <div className={`text-lg font-bold ${
                      session.overall_score >= 80 ? 'text-emerald-400' :
                      session.overall_score >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {Math.round(session.overall_score)}%
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-amber-400 text-sm font-semibold">+{session.xp_earned} XP</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* League preview */}
        {profile && nextLeague && nextLeagueName && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{LEAGUE_ICONS[profile.league as League]}</div>
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">Current League</div>
                  <div className="font-bold text-lg capitalize">{profile.league}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/40">Next: {LEAGUE_ICONS[nextLeagueName as League]} {nextLeagueName}</div>
                <div className="text-sm font-semibold mt-1">Earn XP to advance!</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mode Selection Modal */}
      <AnimatePresence>
        {selectedMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedMode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0d1424] border border-white/15 rounded-3xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedMode.color} flex items-center justify-center`}>
                  <selectedMode.icon size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{selectedMode.label}</h3>
                  <p className="text-white/50 text-sm">{selectedMode.description}</p>
                </div>
              </div>

              {selectedMode.mode === 'interview' && (
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Job Role</label>
                    <input
                      value={interviewRole}
                      onChange={(e) => setInterviewRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Company (optional)</label>
                    <input
                      value={interviewCompany}
                      onChange={(e) => setInterviewCompany(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
                      placeholder="e.g. Google"
                    />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm text-white/60 mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                        difficulty === d
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode(null)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  className={`flex-1 py-3 bg-gradient-to-r ${selectedMode.color} rounded-xl text-sm font-bold flex items-center justify-center gap-2`}
                >
                  <Play size={16} />
                  Start
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
