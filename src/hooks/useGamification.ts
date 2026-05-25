import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { XP_PER_MESSAGE, XP_PER_SESSION, levelFromXp } from '../lib/xp';

export function useGamification(userId: string | undefined) {
  const awardXP = useCallback(async (amount: number) => {
    if (!userId) return;
    const { data: current } = await supabase
      .from('profiles')
      .select('xp, level, streak, total_messages, last_streak_date')
      .eq('id', userId)
      .maybeSingle();

    if (!current) return;

    const newXp = (current.xp ?? 0) + amount;
    const newLevel = levelFromXp(newXp);

    await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }, [userId]);

  const recordMessage = useCallback(async (sessionId: string) => {
    if (!userId) return;
    await awardXP(XP_PER_MESSAGE);

    await supabase.rpc('increment_messages', { p_user_id: userId }).catch(() => {
      supabase
        .from('profiles')
        .select('total_messages')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('profiles')
              .update({ total_messages: (data.total_messages ?? 0) + 1 })
              .eq('id', userId);
          }
        });
    });

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
      });
    }

    void sessionId;
  }, [userId, awardXP]);

  const completeSession = useCallback(async (sessionId: string, durationSeconds: number) => {
    if (!userId) return;
    await awardXP(XP_PER_SESSION);

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
      });
    }

    void sessionId;
  }, [userId, awardXP]);

  return { awardXP, recordMessage, completeSession };
}
