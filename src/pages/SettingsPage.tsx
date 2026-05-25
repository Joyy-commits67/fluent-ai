import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Volume2, VolumeX, Globe, User,
  Target, Bell, LogOut, Edit2, Save, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUE_ICONS, LEVEL_NAMES } from '../lib/xp';
import type { EnglishLevel, League } from '../types';

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>(profile?.english_level || 'A1');
  const [dailyGoal, setDailyGoal] = useState(profile?.daily_goal || 50);
  const [soundEnabled, setSoundEnabled] = useState(profile?.sound_enabled ?? true);
  const [speechSpeed, setSpeechSpeed] = useState(profile?.speech_speed || 1);
  const [autoListen, setAutoListen] = useState(profile?.auto_listen ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      display_name: displayName,
      bio,
      english_level: englishLevel,
      daily_goal: dailyGoal,
      sound_enabled: soundEnabled,
      speech_speed: speechSpeed,
      auto_listen,
    });
    setEditing(false);
    setSaving(false);
  };

  const levels: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const dailyGoals = [30, 50, 75, 100, 150, 200];

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14 pb-12">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2">Settings</h1>
        </motion.div>

        {/* Profile section */}
        <div className="p-6 bg-white/[0.04] border border-white/10 rounded-2xl mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                {profile?.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-bold text-lg">{profile?.display_name}</div>
                <div className="text-sm text-white/50">@{profile?.username}</div>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {editing ? <X size={18} /> : <Edit2 size={18} className="text-white/50" />}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          ) : (
            <>
              {profile?.bio && <p className="text-white/60 text-sm">{profile.bio}</p>}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-white/[0.03] rounded-xl">
                  <div className="text-xl font-bold text-amber-400">{profile?.xp || 0}</div>
                  <div className="text-xs text-white/40">XP</div>
                </div>
                <div className="text-center p-3 bg-white/[0.03] rounded-xl">
                  <div className="text-xl font-bold text-blue-400">{profile?.level || 1}</div>
                  <div className="text-xs text-white/40">Level</div>
                </div>
                <div className="text-center p-3 bg-white/[0.03] rounded-xl">
                  <div className="text-xl font-bold text-emerald-400">{profile?.streak || 0}</div>
                  <div className="text-xs text-white/40">Streak</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* English Level */}
        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-emerald-400" />
              <span className="font-medium">English Level</span>
            </div>
            {editing ? (
              <select
                value={englishLevel}
                onChange={(e) => setEnglishLevel(e.target.value as EnglishLevel)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
              >
                {levels.map((l) => (
                  <option key={l} value={l}>{l} - {LEVEL_NAMES[l]}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold">{profile?.english_level || 'A1'}</span>
                <span className="text-white/40 text-sm">({LEVEL_NAMES[profile?.english_level || 'A1']})</span>
              </div>
            )}
          </div>
        </div>

        {/* League */}
        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{LEAGUE_ICONS[profile?.league as League]}</span>
              <span className="font-medium">Current League</span>
            </div>
            <span className="text-amber-400 font-semibold capitalize">{profile?.league || 'bronze'}</span>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-blue-400" />
              <span className="font-medium">Daily Goal</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {dailyGoals.map((goal) => (
              <button
                key={goal}
                onClick={() => updateProfile({ daily_goal: goal })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  dailyGoal === goal
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {goal} XP
              </button>
            ))}
          </div>
        </div>

        {/* Sound Settings */}
        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 size={20} className="text-violet-400" /> : <VolumeX size={20} className="text-white/30" />}
              <span className="font-medium">Sound Effects</span>
            </div>
            <button
              onClick={async () => {
                setSoundEnabled(!soundEnabled);
                await updateProfile({ sound_enabled: !soundEnabled });
              }}
              className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-emerald-500' : 'bg-white/20'}`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full"
                animate={{ x: soundEnabled ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Speech Speed */}
        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center gap-3 mb-3">
            <User size={20} className="text-cyan-400" />
            <span className="font-medium">AI Voice Speed</span>
          </div>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.1"
            value={speechSpeed}
            onChange={async (e) => {
              const speed = parseFloat(e.target.value);
              setSpeechSpeed(speed);
              await updateProfile({ speech_speed: speed });
            }}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-white/40 mt-2">
            <span>Slower</span>
            <span>{speechSpeed}x</span>
            <span>Faster</span>
          </div>
        </div>

        {/* Auto-listen */}
        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-amber-400" />
              <span className="font-medium">Auto-listen Mode</span>
            </div>
            <button
              onClick={async () => {
                setAutoListen(!autoListen);
                await updateProfile({ auto_listen: !autoListen });
              }}
              className={`w-12 h-6 rounded-full transition-colors ${autoListen ? 'bg-emerald-500' : 'bg-white/20'}`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full"
                animate={{ x: autoListen ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2 ml-8">Microphone activates automatically after AI responds</p>
        </div>

        {/* Sign out */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={signOut}
          className="w-full mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-semibold flex items-center justify-center gap-2 hover:bg-red-500/15"
        >
          <LogOut size={18} />
          Sign Out
        </motion.button>
      </div>
    </div>
  );
}
