import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Zap, Trophy, Star, Target, Clock, Gift,
  CheckCircle2, RotateCcw, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ProgressBar from '../components/ui/ProgressBar';
import Confetti from '../components/ui/Confetti';
import type { FriendQuest, Friend, Profile } from '../types';

interface Props {
  onBack: () => void;
}

const QUEST_TEMPLATES = [
  { type: 'xp_goal' as const, label: 'Earn {target} XP Together', target: 500 },
  { type: 'xp_goal' as const, label: 'Earn {target} XP Together', target: 1000 },
  { type: 'sessions' as const, label: 'Complete {target} Sessions Together', target: 10 },
  { type: 'perfect_lessons' as const, label: 'Get {target} Perfect Lessons', target: 5 },
];

export default function QuestsPage({ onBack }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [activeQuest, setActiveQuest] = useState<FriendQuest | null>(null);
  const [friends, setFriends] = useState<(Friend & { friend_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<FriendQuest[]>([]);

  const fetchQuestData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch friends
    const { data: friendsData } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:profiles!friends_friend_id_fkey (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (friendsData) {
      setFriends(friendsData as (Friend & { friend_profile?: Profile })[]);
    }

    // Fetch active quest for this week
    const weekStart = getWeekStart();
    const { data: questData } = await supabase
      .from('friend_quests')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (questData) {
      // Fetch partner profile
      const partnerId = questData.user1_id === user.id ? questData.user2_id : questData.user1_id;
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();

      setActiveQuest({
        ...questData,
        partner_profile: partnerProfile as Profile | undefined,
      } as FriendQuest & { partner_profile?: Profile });
    }

    // Fetch completed quests
    const { data: completedData } = await supabase
      .from('friend_quests')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (completedData) {
      setCompletedQuests(completedData as FriendQuest[]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchQuestData();
  }, [fetchQuestData]);

  // Update quest progress based on current XP
  useEffect(() => {
    if (!user || !activeQuest || activeQuest.is_completed) return;

    const updateProgress = async () => {
      const isUser1 = activeQuest.user1_id === user.id;

      if (activeQuest.quest_type === 'xp_goal') {
        // Calculate weekly XP for user
        const weekStart = getWeekStart();
        const { data: weekActivity } = await supabase
          .from('daily_activity')
          .select('xp_earned')
          .eq('user_id', user.id)
          .gte('activity_date', weekStart);

        const myWeeklyXP = weekActivity?.reduce((sum, d) => sum + d.xp_earned, 0) || 0;

        // Update the quest progress
        const updateField = isUser1 ? 'user1_progress' : 'user2_progress';
        await supabase
          .from('friend_quests')
          .update({ [updateField]: myWeeklyXP })
          .eq('id', activeQuest.id);

        // Check for completion
        const total = (isUser1 ? myWeeklyXP : activeQuest.user1_progress) +
                      (isUser1 ? activeQuest.user2_progress : myWeeklyXP);
        if (total >= activeQuest.target_value && !activeQuest.is_completed) {
          await completeQuest(activeQuest.id);
        }
      } else if (activeQuest.quest_type === 'sessions') {
        const weekStart = getWeekStart();
        const { data: weekSessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', weekStart);

        const mySessions = weekSessions?.length || 0;
        const updateField = isUser1 ? 'user1_progress' : 'user2_progress';

        await supabase
          .from('friend_quests')
          .update({ [updateField]: mySessions })
          .eq('id', activeQuest.id);

        const total = (isUser1 ? mySessions : activeQuest.user1_progress) +
                      (isUser1 ? activeQuest.user2_progress : mySessions);
        if (total >= activeQuest.target_value && !activeQuest.is_completed) {
          await completeQuest(activeQuest.id);
        }
      }
    };

    updateProgress();
  }, [user, activeQuest, profile?.xp]);

  const completeQuest = async (questId: string) => {
    if (!user) return;

    await supabase
      .from('friend_quests')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', questId);

    // Award XP to current user
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp, league_xp')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData && activeQuest) {
      await supabase
        .from('profiles')
        .update({
          xp: profileData.xp + activeQuest.reward_xp,
          league_xp: profileData.league_xp + activeQuest.reward_xp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // Also award XP to partner
    if (activeQuest) {
      const partnerId = activeQuest.user1_id === user.id ? activeQuest.user2_id : activeQuest.user1_id;
      const { data: partnerProfileData } = await supabase
        .from('profiles')
        .select('xp, league_xp')
        .eq('id', partnerId)
        .maybeSingle();

      if (partnerProfileData) {
        await supabase
          .from('profiles')
          .update({
            xp: partnerProfileData.xp + activeQuest.reward_xp,
            league_xp: partnerProfileData.league_xp + activeQuest.reward_xp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', partnerId);
      }

      // Award quest achievement
      await supabase.from('user_achievements').insert({
        user_id: user.id,
        achievement_id: 'quest_complete',
      });

      await supabase.from('user_achievements').insert({
        user_id: partnerId,
        achievement_id: 'quest_complete',
      });
    }

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);

    refreshProfile();
    fetchQuestData();
  };

  const createQuest = async () => {
    if (!user || !selectedFriend) return;
    setCreating(true);

    const weekStart = getWeekStart();
    const template = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];

    // Determine user ordering (smaller UUID first for consistency)
    const [uid1, uid2] = [user.id, selectedFriend].sort();

    const { data, error } = await supabase
      .from('friend_quests')
      .insert({
        user1_id: uid1,
        user2_id: uid2,
        quest_type: template.type,
        target_value: template.target,
        week_start: weekStart,
        reward_xp: 100,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      // Fetch partner profile for the new quest
      const partnerId = selectedFriend;
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();

      setActiveQuest({
        ...data,
        partner_profile: partnerProfile as Profile | undefined,
      } as FriendQuest & { partner_profile?: Profile });
    }

    setCreating(false);
    setSelectedFriend(null);
  };

  function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  const getPartnerName = (quest: FriendQuest) => {
    if (!user) return '';
    const partnerId = quest.user1_id === user.id ? quest.user2_id : quest.user1_id;
    const friend = friends.find(
      (f) => f.friend_id === partnerId || f.user_id === partnerId
    );
    const partnerProfile = (quest as FriendQuest & { partner_profile?: Profile })?.partner_profile;
    return partnerProfile?.display_name || friend?.friend_profile?.display_name || 'Partner';
  };

  const totalProgress = activeQuest
    ? activeQuest.user1_progress + activeQuest.user2_progress
    : 0;
  const progressPercent = activeQuest
    ? Math.min(100, Math.round((totalProgress / activeQuest.target_value) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <Confetti trigger={showConfetti} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} className="text-white/50" />
          </button>
          <div className="flex items-center gap-3">
            <Target size={20} className="text-emerald-400" />
            <span className="font-bold">Friends Quests</span>
          </div>
          <div className="w-8" />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Quest */}
            {activeQuest ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Quest Card */}
                <div className={`p-6 rounded-3xl border ${
                  activeQuest.is_completed
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border-emerald-500/20'
                }`}>
                  {/* Quest header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {activeQuest.is_completed ? (
                        <CheckCircle2 size={20} className="text-emerald-400" />
                      ) : (
                        <Sparkles size={20} className="text-emerald-400" />
                      )}
                      <span className="font-bold text-sm">
                        {activeQuest.is_completed ? 'Quest Complete!' : 'Active Quest'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Clock size={14} />
                      <span>Week of {new Date(activeQuest.week_start).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Quest title */}
                  <h3 className="text-lg font-black mb-1">
                    {getPartnerName(activeQuest)} & {profile?.display_name || 'You'}
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    {activeQuest.quest_type === 'xp_goal' && `Earn ${activeQuest.target_value} XP together this week`}
                    {activeQuest.quest_type === 'sessions' && `Complete ${activeQuest.target_value} sessions together this week`}
                    {activeQuest.quest_type === 'perfect_lessons' && `Get ${activeQuest.target_value} perfect lessons this week`}
                  </p>

                  {/* Shared progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-white/50 mb-2">
                      <span>{totalProgress} / {activeQuest.target_value}</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                      {/* Individual contributions markers */}
                      {activeQuest.target_value > 0 && (
                        <>
                          <div
                            className="absolute top-0 h-full w-0.5 bg-blue-400/60"
                            style={{ left: `${Math.min(100, (activeQuest.user1_progress / activeQuest.target_value) * 100)}%` }}
                          />
                          <div
                            className="absolute top-0 h-full w-0.5 bg-violet-400/60"
                            style={{ left: `${Math.min(100, (activeQuest.user2_progress / activeQuest.target_value) * 100)}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Individual contributions */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <div className="text-xs text-white/40 mb-1">
                        {activeQuest.user1_id === user?.id ? 'You' : getPartnerName(activeQuest)}
                      </div>
                      <div className="text-xl font-bold text-blue-400">
                        {activeQuest.user1_progress}
                      </div>
                      <div className="text-xs text-white/30">
                        {activeQuest.quest_type === 'xp_goal' ? 'XP' : activeQuest.quest_type === 'sessions' ? 'Sessions' : 'Lessons'}
                      </div>
                    </div>
                    <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                      <div className="text-xs text-white/40 mb-1">
                        {activeQuest.user2_id === user?.id ? 'You' : getPartnerName(activeQuest)}
                      </div>
                      <div className="text-xl font-bold text-violet-400">
                        {activeQuest.user2_progress}
                      </div>
                      <div className="text-xs text-white/30">
                        {activeQuest.quest_type === 'xp_goal' ? 'XP' : activeQuest.quest_type === 'sessions' ? 'Sessions' : 'Lessons'}
                      </div>
                    </div>
                  </div>

                  {/* Reward */}
                  {activeQuest.is_completed && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center"
                    >
                      <Gift size={18} className="text-amber-400 inline mr-2" />
                      <span className="text-amber-300 font-bold text-sm">
                        Both earned +{activeQuest.reward_xp} XP!
                      </span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Create Quest */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center py-6">
                  <Target size={48} className="text-emerald-400/30 mx-auto mb-3" />
                  <h2 className="text-xl font-black mb-2">Start a Friends Quest</h2>
                  <p className="text-sm text-white/50">
                    Pair up with a friend for a weekly challenge and earn bonus XP together!
                  </p>
                </div>

                {/* Friend selection */}
                {friends.length === 0 ? (
                  <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                    <Users size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">
                      Add friends first to start questing together!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/60">Choose a Quest Partner</h3>
                    {friends.map((friend) => {
                      const friendProfile = friend.friend_profile;
                      if (!friendProfile) return null;

                      return (
                        <motion.button
                          key={friend.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedFriend(friendProfile.id)}
                          className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${
                            selectedFriend === friendProfile.id
                              ? 'bg-emerald-500/15 border-2 border-emerald-500/40'
                              : 'bg-white/5 border border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-sm">
                            {friendProfile.display_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">
                              {friendProfile.display_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-white/40">
                              Level {friendProfile.level} - {friendProfile.xp} XP
                            </div>
                          </div>
                          {selectedFriend === friendProfile.id && (
                            <CheckCircle2 size={20} className="text-emerald-400" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Create button */}
                {selectedFriend && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={createQuest}
                    disabled={creating}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Start Quest
                      </>
                    )}
                  </motion.button>
                )}

                {/* Quest preview */}
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-center">
                  <p className="text-xs text-white/30">
                    A random quest will be chosen for you and your partner.
                    Complete it together to earn +100 XP each!
                  </p>
                </div>
              </motion.div>
            )}

            {/* Completed Quests History */}
            {completedQuests.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" />
                  Completed Quests
                </h3>
                <div className="space-y-3">
                  {completedQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className="p-4 bg-white/[0.03] border border-white/10 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">
                            {quest.quest_type === 'xp_goal' && `${quest.target_value} XP Quest`}
                            {quest.quest_type === 'sessions' && `${quest.target_value} Sessions Quest`}
                            {quest.quest_type === 'perfect_lessons' && `${quest.target_value} Perfect Lessons Quest`}
                          </div>
                          <div className="text-xs text-white/30 mt-1">
                            Completed {quest.completed_at ? new Date(quest.completed_at).toLocaleDateString() : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 text-sm">
                          <Zap size={14} />
                          <span className="font-bold">+{quest.reward_xp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
