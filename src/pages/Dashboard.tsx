import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Flame, Zap, Trophy, Briefcase, Mic, Sparkles, BookOpen, Award, Headphones, ArrowRight } from 'lucide-react';

// --- MOCKED COMPONENTS & UTILS (To ensure zero compilation errors) ---
const AriaMascot = ({ state }: { state: 'idle' | 'happy' | 'excited' }) => (
  <div className="text-6xl select-none">{state === 'excited' ? '🤩' : state === 'happy' ? '😊' : '👋'}</div>
);

// --- DASHBOARD COMPONENT ---
export default function Dashboard({ onStartSession }: any) {
  const [dailyGoalMet, setDailyGoalMet] = useState(false);
  const [selectedMode, setSelectedMode] = useState<any>(null);

  // Mock data for the dashboard
  const profile = { display_name: 'Learner', streak: 5, xp: 1250, total_sessions: 42, daily_goal: 50 };
  const todayXp = 45;

  return (
    <div className="min-h-screen bg-[#090e1a] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 p-8 rounded-[2rem] bg-gradient-to-br from-indigo-900/40 to-blue-900/20 border border-white/10 flex items-center justify-between">
            <div className="space-y-4">
              <h1 className="text-3xl font-black tracking-tight">Welcome back, {profile.display_name}!</h1>
              <p className="text-white/60">Your streak is heating up. Complete a lesson to crush your goals!</p>
              <button 
                onClick={() => setDailyGoalMet(!dailyGoalMet)}
                className="px-6 py-3 bg-blue-500 rounded-2xl font-bold hover:bg-blue-400 transition-all"
              >
                {dailyGoalMet ? 'Goal Met!' : 'Start Practice'}
              </button>
            </div>
            <div className="hidden sm:block">
              <AriaMascot state={dailyGoalMet ? 'excited' : 'happy'} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <Flame className="text-amber-500 mb-2" size={32} />
              <span className="text-2xl font-black">{profile.streak}</span>
              <span className="text-xs text-white/50">Day Streak</span>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <Trophy className="text-yellow-500 mb-2" size={32} />
              <span className="text-2xl font-black">{profile.xp}</span>
              <span className="text-xs text-white/50">Total XP</span>
            </div>
          </div>
        </div>

        {/* Practice Grid */}
        <h2 className="text-2xl font-bold flex items-center gap-3">Choose Your Practice</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Speaking', icon: Mic, color: 'from-blue-500 to-cyan-500' },
            { label: 'Interview', icon: Briefcase, color: 'from-emerald-500 to-teal-500' },
            { label: 'Vocabulary', icon: Sparkles, color: 'from-violet-500 to-purple-500' },
          ].map((mode) => (
            <div 
              key={mode.label}
              className="bg-[#111827] border border-white/5 rounded-3xl p-6 hover:border-violet-500/50 transition-all group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${mode.color} flex items-center justify-center mb-4`}>
                <mode.icon size={28} />
              </div>
              <h3 className="font-bold text-lg">{mode.label}</h3>
              <p className="text-white/50 text-sm mt-1">Practice your skills with AI-powered feedback.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
