import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { XP_PER_MESSAGE, XP_PER_SESSION, XP_PER_WORD_LEARNED, levelFromXp } from '../lib/xp';

// Get current week boundaries (Monday to Sunday)
function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start of week
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

export function useGamification(userId: string | undefined) {
  // Update weekly XP in profiles table for leaderboard
  const updateWeeklyXP = useCallback(async (additionalXp: number) => {
    if (!userId) return;

    // Get current week's XP and add new XP
    const { data: profileData } = await supabase
      .from('profiles')
      .select('league_xp')
      .eq('id', userId)
      .maybeSingle();

    const currentLeagueXp = profileData?.league_xp ?? 0;
    const newLeagueXp = currentLeagueXp + additionalXp;

    await supabase
      .from('profiles')
      .update({ league_xp: newLeagueXp, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }, [userId]);

  const awardXP = useCallback(async (amount: number, reason?: string) => {
    if (!userId) return;

    const { data: current } = await supabase
      .from('profiles')
      .select('xp, level, streak, total_messages, last_streak_date, league_xp')
      .eq('id', userId)
      .maybeSingle();

    if (!current) return;

    const newXp = (current.xp ?? 0) + amount;
    const newLevel = levelFromXp(newXp);
    const newLeagueXp = (current.league_xp ?? 0) + amount;

    await supabase
      .from('profiles')
      .update({
        xp: newXp,
        level: newLevel,
        league_xp: newLeagueXp, // Weekly XP for leaderboard
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    void reason;
  }, [userId]);

  const recordMessage = useCallback(async (sessionId: string) => {
    if (!userId) return;
    await awardXP(XP_PER_MESSAGE, 'message');

    // Update total messages count
    const { data: profileData } = await supabase
      .from('profiles')
      .select('total_messages')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      await supabase
        .from('profiles')
        .update({ total_messages: (profileData.total_messages ?? 0) + 1 })
        .eq('id', userId);
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('daily_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('daily_activity')
        .update({
          messages_count: existing.messages_count + 1,
          xp_earned: existing.xp_earned + XP_PER_MESSAGE,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('daily_activity').insert({
        user_id: userId,
        activity_date: today,
        messages_count: 1,
        xp_earned: XP_PER_MESSAGE,
        sessions_count: 0,
        minutes_practiced: 0,
        words_learned: 0,
        grammar_correct: 0,
        grammar_total: 0,
      });
    }

    void sessionId;
  }, [userId, awardXP]);

  const completeSession = useCallback(async (sessionId: string, durationSeconds: number) => {
    if (!userId) return;
    await awardXP(XP_PER_SESSION, 'session');

    const { data: profileData } = await supabase
      .from('profiles')
      .select('total_sessions, streak, longest_streak, last_streak_date')
      .eq('id', userId)
      .maybeSingle();

    if (!profileData) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastDate = profileData.last_streak_date;

    let newStreak = profileData.streak ?? 0;
    if (lastDate === yesterday) {
      newStreak += 1;
    } else if (lastDate !== today) {
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, profileData.longest_streak ?? 0);

    await supabase
      .from('profiles')
      .update({
        total_sessions: (profileData.total_sessions ?? 0) + 1,
        streak: newStreak,
        longest_streak: newLongest,
        last_streak_date: today,
        last_session_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    const activityDate = today;
    const { data: existingActivity } = await supabase
      .from('daily_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_date', activityDate)
      .maybeSingle();

    if (existingActivity) {
      await supabase
        .from('daily_activity')
        .update({
          sessions_count: existingActivity.sessions_count + 1,
          xp_earned: existingActivity.xp_earned + XP_PER_SESSION,
          minutes_practiced: existingActivity.minutes_practiced + Math.round(durationSeconds / 60),
        })
        .eq('id', existingActivity.id);
    } else {
      await supabase.from('daily_activity').insert({
        user_id: userId,
        activity_date: activityDate,
        sessions_count: 1,
        xp_earned: XP_PER_SESSION,
        messages_count: 0,
        minutes_practiced: Math.round(durationSeconds / 60),
        words_learned: 0,
        grammar_correct: 0,
        grammar_total: 0,
      });
    }

    void sessionId;
  }, [userId, awardXP]);

  const recordWordLearned = useCallback(async () => {
    if (!userId) return;
    await awardXP(XP_PER_WORD_LEARNED, 'word');

    const { data: profileData } = await supabase
      .from('profiles')
      .select('total_words_learned')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      await supabase
        .from('profiles')
        .update({
          total_words_learned: (profileData.total_words_learned ?? 0) + 1,
        })
        .eq('id', userId);
    }
  }, [userId, awardXP]);

  // Reset weekly XP (should be called at start of new week)
  const resetWeeklyXP = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ league_xp: 0 })
      .eq('id', userId);
  }, [userId]);

  return {
    awardXP,
    recordMessage,
    completeSession,
    recordWordLearned,
    resetWeeklyXP,
    updateWeeklyXP,
  };
}
