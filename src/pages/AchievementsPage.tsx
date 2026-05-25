import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Achievement, UserAchievement } from '../types';

export default function AchievementsPage() {
  const { profile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase.from('achievements').select('*').order('xp_reward'),
      supabase.from('user_achievements').select('*').eq('user_id', profile.id),
    ]).then(([achRes, earnedRes]) => {
      if (achRes.data) setAchievements(achRes.data as Achievement[]);
      if (earnedRes.data) {
        setEarned(new Set((earnedRes.data as UserAchievement[]).map((a) => a.achievement_id)));
      }
      setLoading(false);
    });
  }, [profile]);

  const earnedCount = earned.size;
  const totalCount = achievements.length;

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
            <Trophy size={24} className="text-amber-400" />
            Achievements
          </h1>
          <p className="text-white/50 text-sm">
            {earnedCount} of {totalCount} unlocked
          </p>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((ach, i) => {
              const isEarned = earned.has(ach.id);
              return (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative p-5 border rounded-2xl transition-all ${
                    isEarned
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/25'
                      : 'bg-white/[0.02] border-white/8 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-3xl ${isEarned ? '' : 'grayscale opacity-40'}`}>
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm ${isEarned ? 'text-white' : 'text-white/50'}`}>
                        {ach.title}
                      </div>
                      <div className="text-white/40 text-xs mt-0.5 leading-relaxed">
                        {ach.description}
                      </div>
                      <div className={`text-xs mt-2 font-semibold ${isEarned ? 'text-amber-400' : 'text-white/25'}`}>
                        +{ach.xp_reward} XP
                      </div>
                    </div>
                    {!isEarned && (
                      <Lock size={14} className="text-white/20 shrink-0 mt-0.5" />
                    )}
                    {isEarned && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0"
                      >
                        <span className="text-xs">✓</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
