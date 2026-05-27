import { motion } from 'framer-motion';
import { LayoutDashboard, TrendingUp, Trophy, Settings, LogOut, Menu, X, Mic, BookOpen, Users, Crown, Target, Diamond } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from './ui/ProgressBar';
import StreakFlame from './ui/StreakFlame';
import HeartsBar from './ui/HeartsBar';
import { LEAGUE_ICONS } from '../lib/xp';

type Page = 'dashboard' | 'progress' | 'achievements' | 'vocabulary' | 'friends' | 'settings' | 'leaderboard' | 'quests';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Navbar({ currentPage, onNavigate }: Props) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { page: Page; icon: typeof LayoutDashboard; label: string }[] = [
    { page: 'dashboard', icon: LayoutDashboard, label: 'Learn' },
    { page: 'vocabulary', icon: BookOpen, label: 'Words' },
    { page: 'quests', icon: Target, label: 'Quests' },
    { page: 'leaderboard', icon: Crown, label: 'Leagues' },
    { page: 'friends', icon: Users, label: 'Friends' },
    { page: 'progress', icon: TrendingUp, label: 'Progress' },
    { page: 'achievements', icon: Trophy, label: 'Badges' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#090e1a]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Mic size={16} className="text-white" />
            </div>
            <span className="font-black text-lg hidden sm:block">FluentAI</span>
          </button>

          {/* Streak */}
          {profile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orange-500/15 border border-orange-500/25 rounded-full">
              <StreakFlame streak={profile.streak} size="sm" />
            </div>
          )}

          {/* Hearts */}
          {profile && (
            <div className="flex items-center px-2">
              <HeartsBar hearts={profile.hearts} maxHearts={5} size="sm" isPremium={profile.is_premium} />
            </div>
          )}

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ page, icon: Icon, label }) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  currentPage === page
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* XP Progress compact */}
            {profile && (
              <div className="hidden md:block w-32">
                <ProgressBar xp={profile.xp} level={profile.level} compact />
              </div>
            )}

            {/* Settings */}
            <button
              onClick={() => onNavigate('settings')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'settings'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings size={18} />
            </button>

            {/* Premium button */}
            {profile && (
              <button
                onClick={() => window.location.href = '#premium'}
                className={`p-2 rounded-lg transition-colors ${
                  profile.is_premium
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-white/30 hover:text-amber-400 hover:bg-amber-500/5'
                }`}
                title={profile.is_premium ? 'Premium Dashboard' : 'Upgrade to Premium'}
              >
                <Crown size={18} />
              </button>
            )}

            {/* Profile */}
            {profile && (
              <button
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors relative"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative ${
                  profile.is_premium
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600 ring-2 ring-amber-400/30'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                  {profile.display_name?.[0]?.toUpperCase() || 'U'}
                  {profile.is_premium && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                      <Diamond size={8} className="text-black" />
                    </span>
                  )}
                </div>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 text-white/60 hover:text-white"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-14 left-0 right-0 z-40 bg-[#0d1424] border-b border-white/10 p-4 md:hidden"
        >
          <div className="space-y-1">
            {navItems.map(({ page, icon: Icon, label }) => (
              <button
                key={page}
                onClick={() => {
                  onNavigate(page);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentPage === page
                    ? 'bg-white/10 text-white'
                    : 'text-white/50'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          {profile && (
            <div className="mt-4 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold">
                  {profile.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-semibold text-sm">{profile.display_name}</div>
                  <div className="text-xs text-white/40">Level {profile.level}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  setMobileOpen(false);
                }}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
