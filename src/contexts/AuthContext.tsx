import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_PROFILE: Omit<Profile, 'id' | 'created_at' | 'updated_at'> = {
  display_name: '',
  username: '',
  avatar_url: '',
  bio: '',
  english_level: 'A1',
  xp: 0,
  level: 1,
  streak: 0,
  longest_streak: 0,
  total_sessions: 0,
  total_messages: 0,
  total_words_learned: 0,
  grammar_accuracy: 100,
  speaking_fluency: 0,
  last_session_at: null,
  last_streak_date: null,
  league: 'bronze',
  league_xp: 0,
  daily_goal: 50,
  daily_xp: 0,
  sound_enabled: true,
  speech_speed: 1,
  auto_listen: true,
  hearts: 5,
  hearts_refilled_at: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    return null;
  }, []);

  const createProfile = useCallback(async (user: User, displayName: string, username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: displayName || user.email?.split('@')[0] || 'Learner',
        username: username || `user_${Date.now().toString(36)}`,
        ...DEFAULT_PROFILE,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    if (data) {
      setProfile(data as Profile);
    }
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        fetchProfile(session.user.id);
      } else if (!session) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        await createProfile(data.user, displayName, username);
      }
      return { error: null };
    } catch (err) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) return { error: error.message };

    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
