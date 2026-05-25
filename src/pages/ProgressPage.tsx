import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, MessageSquare, Clock, Target, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getModeLabel, getModeIcon, scoreColor } from '../lib/xp';
import XPBar from '../components/ui/XPBar';
import type { Session, DailyActivity } from '../types';

export default function ProgressPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase
        .from('sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', profile.id)
        .order('activity_date', { ascending: false })
        .limit(30),
    ]).then(([sessRes, actRes]) => {
      if (sessRes.data) setSessions(sessRes.data as Session[]);
      if (actRes.data) setActivity(actRes.data as DailyActivity[]);
      setLoading(false);
    });
  }, [profile]);

  const totalMinutes = activity.reduce((a, d) => a + d.minutes_practiced, 0);
  const totalXpThisWeek = activity.slice(0, 7).reduce((a, d) => a + d.xp_earned, 0);
  const avgScore = sessions.filter((s) => s.overall_score != null).reduce((a, s, _, arr) => a + (s.overall_score ?? 0) / arr.length, 0);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const found = activity.find((a) => a.activity_date === dateStr);
    return { date: dateStr, xp: found?.xp_earned ?? 0, sessions: found?.sessions_count ?? 0 };
  });

  const maxXp = Math.max(...last30Days.map((d) => d.xp), 1);

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-black mb-1">Your Progress</h1>
          <p className="text-white/50 text-sm">Track your English improvement journey</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: 'Day Streak', value: profile?.streak ?? 0, sub: `Best: ${profile?.longest_streak ?? 0}`, color: 'text-amber-400', bg: 'from-amber-500/15 to-orange-500/10' },
            { icon: Clock, label: 'Minutes Practiced', value: totalMinutes, sub: 'All time', color: 'text-blue-400', bg: 'from-blue-500/15 to-cyan-500/10' },
            { icon: Target, label: 'Sessions Done', value: profile?.total_sessions ?? 0, sub: 'Completed', color: 'text-emerald-400', bg: 'from-emerald-500/15 to-teal-500/10' },
            { icon: TrendingUp, label: 'Avg Score', value: avgScore ? `${Math.round(avgScore)}%` : 'N/A', sub: 'Interview avg', color: 'text-rose-400', bg: 'from-rose-500/15 to-pink-500/10' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`p-4 bg-gradient-to-br ${s.bg} border border-white/10 rounded-2xl`}
            >
              <s.icon size={18} className={`${s.color} mb-2`} />
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
              <div className="text-white/25 text-xs">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Level progress */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-white/[0.04] border border-white/10 rounded-2xl mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <Target size={16} className="text-amber-400" />
                Level Progress
              </h2>
              <span className="text-white/50 text-sm">{profile.xp} total XP</span>
            </div>
            <XPBar xp={profile.xp} level={profile.level} />
            <div className="mt-2 flex justify-between text-xs text-white/30">
              <span>This week: +{totalXpThisWeek} XP</span>
              <span>Level {profile.level}</span>
            </div>
          </motion.div>
        )}

        {/* Activity heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-white/[0.04] border border-white/10 rounded-2xl mb-8"
        >
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-blue-400" />
            30-Day Activity
          </h2>
          <div className="flex items-end gap-1 h-20">
            {last30Days.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (day.xp / maxXp) * 100)}%` }}
                transition={{ delay: i * 0.02, duration: 0.5 }}
                className="flex-1 rounded-sm min-h-1 relative group cursor-default"
                style={{
                  background: day.xp > 0
                    ? `rgba(59, 130, 246, ${0.3 + (day.xp / maxXp) * 0.7})`
                    : 'rgba(255,255,255,0.05)',
                }}
              >
                {day.xp > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a2540] border border-white/15 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                    {day.date.slice(5)}: {day.xp} XP
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-white/25 mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </motion.div>

        {/* Session history */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h2 className="font-bold flex items-center gap-2">
            <MessageSquare size={16} className="text-emerald-400" />
            Session History
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              No completed sessions yet. Start practicing!
            </div>
          ) : (
            sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-white/15 transition-colors"
              >
                <div className="text-2xl shrink-0">{getModeIcon(session.mode)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{getModeLabel(session.mode)}</div>
                  <div className="text-white/40 text-xs mt-0.5">
                    {session.topic && <span className="truncate">{session.topic} • </span>}
                    {session.message_count} messages •{' '}
                    {Math.round(session.duration_seconds / 60)} min
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {session.overall_score != null ? (
                    <div className={`font-bold text-sm ${scoreColor(session.overall_score)}`}>
                      {session.overall_score}%
                    </div>
                  ) : (
                    <div className="text-white/30 text-sm">—</div>
                  )}
                  <div className="text-amber-400/70 text-xs">+{session.xp_earned} XP</div>
                  <div className="text-white/25 text-xs">
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
