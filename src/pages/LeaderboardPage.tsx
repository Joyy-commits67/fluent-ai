import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Trophy, Flame, ChevronUp, ChevronDown, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LEAGUES, LEAGUE_ICONS } from '../lib/xp';
import type { LeaderboardEntry, League } from '../types';

export default function LeaderboardPage() {
  const { profile, refreshProfile } = useAuth();
  const [currentLeague, setCurrentLeague] = useState<League>('bronze');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'weekly' | 'all-time'>('weekly');

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    if (!profile) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // For weekly, use league_xp; for all-time, use total xp
      const orderField = timeframe === 'weekly' ? 'league_xp' : 'xp';

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, league_xp, xp, league, streak')
        .eq('league', currentLeague)
        .order(orderField, { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }

      const entries: LeaderboardEntry[] = (data || []).map((p, i) => ({
        rank: i + 1,
        user_id: p.id,
        display_name: p.display_name || 'Anonymous',
        avatar_url: p.avatar_url || '',
        xp: timeframe === 'weekly' ? p.league_xp : p.xp,
        is_current_user: p.id === profile.id,
      }));

      setLeaderboard(entries);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, currentLeague, timeframe]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (profile?.league) {
      setCurrentLeague(profile.league as League);
    }
  }, [profile?.league]);

  useEffect(() => {
    if (profile) {
      fetchLeaderboard();
    }
  }, [fetchLeaderboard, profile]);

  // Refresh user profile when entering page
  useEffect(() => {
    if (profile) {
      refreshProfile();
    }
  }, []);

  const leagueIndex = LEAGUES.indexOf(currentLeague);
  const canPromote = leagueIndex < LEAGUES.length - 1;
  const canDemote = leagueIndex > 0;

  const currentUserEntry = leaderboard.find((e) => e.is_current_user);
  const userRank = currentUserEntry?.rank || 0;

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold';
    return 'bg-white/10 text-white/70';
  };

  const changeLeague = (direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? leagueIndex + 1 : leagueIndex - 1;
    if (newIndex >= 0 && newIndex < LEAGUES.length) {
      setCurrentLeague(LEAGUES[newIndex] as League);
    }
  };

  const handleRefresh = () => {
    refreshProfile();
    fetchLeaderboard(true);
  };

  // Calculate user's weekly XP from profile
  const userWeeklyXp = profile?.league_xp ?? 0;

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2 flex items-center justify-center gap-3">
            <Crown size={28} className="text-yellow-400" />
            Leaderboard
          </h1>
          <p className="text-white/50">Compete with other learners</p>
        </motion.div>

        {/* League selector */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => changeLeague('down')}
            disabled={!canDemote}
            className={`p-2 rounded-lg transition-colors ${canDemote ? 'hover:bg-white/10 text-white' : 'opacity-30 text-white/30'}`}
          >
            <ChevronDown size={20} />
          </button>

          <motion.div
            key={currentLeague}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/15 rounded-2xl"
          >
            <span className="text-4xl">{LEAGUE_ICONS[currentLeague]}</span>
            <div className="text-left">
              <div className="font-bold text-lg capitalize">{currentLeague}</div>
              <div className="text-xs text-white/40">League</div>
            </div>
          </motion.div>

          <button
            onClick={() => changeLeague('up')}
            disabled={!canPromote}
            className={`p-2 rounded-lg transition-colors ${canPromote ? 'hover:bg-white/10 text-white' : 'opacity-30 text-white/30'}`}
          >
            <ChevronUp size={20} />
          </button>
        </div>

        {/* Timeframe toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <div className="flex bg-white/5 rounded-xl p-1">
            {(['weekly', 'all-time'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  timeframe === t ? 'bg-white/10 text-white' : 'text-white/50'
                }`}
              >
                {t === 'weekly' ? 'This Week' : 'All Time'}
              </button>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={18} className={`${refreshing ? 'animate-spin' : ''} text-white/60`} />
          </motion.button>
        </div>

        {/* Your position - show immediately after profile loads */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-blue-500/15 to-cyan-500/10 border border-blue-500/20 rounded-2xl"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${getRankStyle(userRank || 1)}`}>
                {userRank || '-'}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                {profile.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{profile.display_name || 'You'}</div>
                <div className="text-xs text-white/50">
                  {timeframe === 'weekly' ? userWeeklyXp : profile.xp} XP this {timeframe === 'weekly' ? 'week' : 'time'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">
                  {timeframe === 'weekly' ? userWeeklyXp : profile.xp}
                </div>
                <div className="text-xs text-white/40">XP</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Promotion info */}
        {userRank > 0 && userRank <= 5 && canPromote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3"
          >
            <Sparkles size={20} className="text-emerald-400" />
            <span className="text-sm text-emerald-300">Top 5 this week get promoted to the next league!</span>
          </motion.div>
        )}

        {/* Leaderboard */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
            ))
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Trophy size={40} className="mx-auto mb-3 opacity-50" />
              <p>No one in this league yet. Be the first!</p>
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  entry.is_current_user
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : 'bg-white/[0.03] border border-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${getRankStyle(entry.rank)}`}>
                  {entry.rank <= 3 ? (
                    <span className="text-lg">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    entry.rank
                  )}
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                  {entry.display_name[0]?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${entry.is_current_user ? 'text-blue-300' : ''}`}>
                    {entry.display_name}
                    {entry.is_current_user && ' (You)'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-amber-400">{entry.xp}</div>
                  <div className="text-xs text-white/40">XP</div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* League info */}
        <div className="mt-8 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Medal size={18} className="text-violet-400" />
            How Leagues Work
          </h3>
          <ul className="text-sm text-white/60 space-y-2">
            <li>- Earn XP to climb the leaderboard each week</li>
            <li>- Top 5 learners get promoted to the next league</li>
            <li>- Bottom 5 learners may be demoted</li>
            <li>- Weekly XP resets at the start of each week</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
