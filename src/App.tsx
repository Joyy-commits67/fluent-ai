import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SessionPage from './pages/SessionPage';
import InterviewPrepPage from './pages/InterviewPrepPage';
import IELTSPage from './pages/IELTSPage';
import GrammarDrillsPage from './pages/GrammarDrillsPage';
import VocabularyLabPage from './pages/VocabularyLabPage';
import QuestsPage from './pages/QuestsPage';
import PremiumPage from './pages/PremiumPage';
import ProgressPage from './pages/ProgressPage';
import AchievementsPage from './pages/AchievementsPage';
import VocabularyPage from './pages/VocabularyPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FriendsPage from './pages/FriendsPage';
import SettingsPage from './pages/SettingsPage';
import Navbar from './components/Navbar';
import FloatingGradient from './components/ui/FloatingGradient';
import type { SessionMode, InterviewCompany } from './types';

type AppPage = 'landing' | 'auth' | 'dashboard' | 'session' | 'interview' | 'ielts' | 'grammar' | 'vocablab' | 'quests' | 'premium' | 'progress' | 'achievements' | 'vocabulary' | 'leaderboard' | 'friends' | 'settings';

interface SessionConfig {
  mode: SessionMode;
  topic?: string;
  role?: string;
  company?: string;
  companyId?: string;
  difficulty?: string;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<AppPage>('landing');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  useEffect(() => {
    if (!loading) {
      if (user && page === 'landing') setPage('dashboard');
      if (user && page === 'auth') setPage('dashboard');
      if (!user && (page !== 'landing' && page !== 'auth')) setPage('landing');
    }
  }, [user, loading, page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090e1a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const startSession = (mode: SessionMode, options?: { topic?: string; role?: string; company?: string; difficulty?: string }) => {
    if (mode === 'interview') {
      setSessionConfig({ mode, ...options });
      setPage('interview');
      return;
    }
    if (mode === 'ielts') {
      setPage('ielts');
      return;
    }
    if (mode === 'grammar_challenge') {
      setPage('grammar');
      return;
    }

    setSessionConfig({ mode, ...options });
    setPage('session');
  };

  const startGrammarDrills = () => {
    setPage('grammar');
  };

  const startVocabLab = () => {
    setPage('vocablab');
  };

  const startPremium = () => {
    setPage('premium');
  };

  const handleNavNavigate = (navPage: 'dashboard' | 'progress' | 'achievements' | 'vocabulary' | 'friends' | 'settings' | 'leaderboard') => {
    setPage(navPage);
  };

  const isAppPage = user && page !== 'session' && page !== 'landing' && page !== 'auth' && page !== 'grammar' && page !== 'interview' && page !== 'ielts' && page !== 'vocablab' && page !== 'quests' && page !== 'premium';

  return (
    <div className="min-h-screen bg-[#090e1a] text-white">
      {!['landing', 'auth', 'session', 'grammar', 'interview', 'ielts', 'vocablab', 'quests', 'premium'].includes(page) && <FloatingGradient />}

      {isAppPage && (
        <Navbar
          currentPage={page as 'dashboard' | 'progress' | 'achievements' | 'vocabulary' | 'friends' | 'settings' | 'leaderboard'}
          onNavigate={handleNavNavigate}
        />
      )}

      <AnimatePresence mode="wait">
        {page === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onGetStarted={() => setPage('auth')} />
          </motion.div>
        )}

        {page === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AuthPage onBack={() => setPage('landing')} />
          </motion.div>
        )}

        {page === 'dashboard' && user && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto px-4 pt-6">
            
            {/* Sleek Obsidian & Gold Premium Card Container */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl p-6 mb-8 bg-gradient-to-r from-[#111625] via-[#1c1710] to-[#111625] border border-yellow-600/30 shadow-lg cursor-pointer group"
              onClick={() => setPage('premium')}
            >
              {/* Shimmer Overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer ease-in-out" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-2xl shadow-md">
                    👑
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-yellow-100 flex items-center gap-2">
                      FluentAI Pro Premium
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Status: <span className="text-yellow-500 font-semibold">Active Premium Member</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-gray-300">
                  <div className="flex items-center gap-1.5 bg-[#090e1a]/60 px-3 py-1.5 rounded-lg border border-gray-800">
                    <span>♾️</span> <span className="text-gray-400">Infinite Hearts Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#090e1a]/60 px-3 py-1.5 rounded-lg border border-gray-800 hover:border-yellow-600/30 transition-colors">
                    <span>📓</span> <span className="text-gray-400">Error Notebook</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-200 px-3 py-1.5 rounded-lg border border-yellow-500/20 font-medium">
                    View Perks &rarr;
                  </div>
                </div>
              </div>
            </motion.div>

            <Dashboard onStartSession={startSession} onStartGrammar={startGrammarDrills} onStartVocabLab={startVocabLab} onStartPremium={startPremium} />
          </motion.div>
        )}

        {page === 'session' && sessionConfig && (
          <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SessionPage
              mode={sessionConfig.mode}
              topic={sessionConfig.topic}
              role={sessionConfig.role}
              company={sessionConfig.company}
              difficulty={sessionConfig.difficulty}
              onExit={() => setPage('dashboard')}
            />
          </motion.div>
        )}

        {page === 'interview' && sessionConfig && (
          <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InterviewPrepPage
              role={sessionConfig.role || 'Software Engineer'}
              company={sessionConfig.company || ''}
              companyId={sessionConfig.companyId}
              difficulty={sessionConfig.difficulty || 'intermediate'}
              onExit={() => setPage('dashboard')}
            />
          </motion.div>
        )}

        {page === 'ielts' && user && (
          <motion.div key="ielts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IELTSPage onExit={() => setPage('dashboard')} />
          </motion.div>
        )}

        {page === 'grammar' && user && (
          <motion.div key="grammar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GrammarDrillsPage onBack={() => setPage('dashboard')} />
          </motion.div>
        )}

        {page === 'vocablab' && user && (
          <motion.div key="vocablab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VocabularyLabPage onBack={() => setPage('dashboard')} />
          </motion.div>
        )}

        {page === 'quests' && user && (
          <motion.div key="quests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuestsPage onBack={() => setPage('dashboard')} />
          </motion.div>
        )}

        {page === 'premium' && user && (
          <motion.div key="premium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PremiumPage
              onBack={() => setPage('dashboard')}
              onStartInterview={(company, companyId) => {
                setSessionConfig({ mode: 'interview', company, companyId, difficulty: 'intermediate' });
                setPage('interview');
              }}
            />
          </motion.div>
        )}

        {page === 'vocabulary' && user && (
          <motion.div key="vocabulary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VocabularyPage />
          </motion.div>
        )}

        {page === 'leaderboard' && user && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LeaderboardPage />
          </motion.div>
        )}

        {page === 'friends' && user && (
          <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FriendsPage />
          </motion.div>
        )}

        {page === 'progress' && user && (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProgressPage />
          </motion.div>
        )}

        {page === 'achievements' && user && (
          <motion.div key="achievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AchievementsPage />
          </motion.div>
        )}

        {page === 'settings' && user && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SettingsPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
