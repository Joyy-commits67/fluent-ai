import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const MAX_HEARTS = 5;
const XP_REFILL_COST = 100;

export function useHearts() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [isRefilling, setIsRefilling] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);

  useEffect(() => {
    if (profile?.hearts !== undefined) {
      setHearts(profile.hearts);
    }
  }, [profile?.hearts]);

  const loseHeart = useCallback(async (): Promise<boolean> => {
    if (!user || !profile) return false;

    const currentHearts = profile.hearts;
    if (currentHearts <= 0) {
      setShowRefillModal(true);
      return false;
    }

    const newHearts = Math.max(0, currentHearts - 1);
    setHearts(newHearts);

    await supabase
      .from('profiles')
      .update({ hearts: newHearts, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    refreshProfile();

    if (newHearts === 0) {
      setShowRefillModal(true);
    }

    return true;
  }, [user, profile, refreshProfile]);

  const refillWithXP = useCallback(async (): Promise<boolean> => {
    if (!user || !profile) return false;
    if (profile.xp < XP_REFILL_COST) return false;

    setIsRefilling(true);

    const newXp = profile.xp - XP_REFILL_COST;
    await supabase
      .from('profiles')
      .update({
        xp: newXp,
        league_xp: Math.max(0, profile.league_xp - XP_REFILL_COST),
        hearts: MAX_HEARTS,
        hearts_refilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setHearts(MAX_HEARTS);
    setShowRefillModal(false);
    refreshProfile();
    setIsRefilling(false);
    return true;
  }, [user, profile, refreshProfile]);

  const refillByPractice = useCallback(async (): Promise<boolean> => {
    if (!user || !profile) return false;

    const newHearts = Math.min(MAX_HEARTS, profile.hearts + 1);
    setHearts(newHearts);

    await supabase
      .from('profiles')
      .update({
        hearts: newHearts,
        hearts_refilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    refreshProfile();
    return true;
  }, [user, profile, refreshProfile]);

  const canPlay = hearts > 0;

  return {
    hearts,
    maxHearts: MAX_HEARTS,
    canPlay,
    isRefilling,
    showRefillModal,
    setShowRefillModal,
    loseHeart,
    refillWithXP,
    refillByPractice,
    xpRefillCost: XP_REFILL_COST,
  };
}
