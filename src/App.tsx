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
import ProgressPage from './pages/ProgressPage';
import AchievementsPage from './pages/AchievementsPage';
import VocabularyPage from './pages/VocabularyPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FriendsPage from './pages/FriendsPage';
import SettingsPage from './pages/SettingsPage';
import Navbar from './components/Navbar';
import FloatingGradient from './components/ui/FloatingGradient';
import type { SessionMode } from './types';

type AppPage = 'landing' | 'auth' | 'dashboard' | 'session' | 'interview' | 'ielts' | 'grammar' | 'progress' | 'achievements' | 'vocabulary' | 'leaderboard' | 'friends' | 'settings';

interface SessionConfig {
  mode: SessionMode;
  topic?: string;
  role?: string;
  company?: string;
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
    // Special routing for interview and ielts
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

  const handleNavNavigate = (navPage: 'dashboard' | 'progress' | 'achievements' | 'vocabulary' | 'friends' | 'settings' | 'leaderboard') => {
    setPage(navPage);
  };

  const isAppPage = user && page !== 'session' && page !== 'landing' && page !== 'auth' && page !== 'grammar' && page !== 'interview' && page !== 'ielts';

  return (
    <div className="min-h-screen bg-[#090e1a] text-white">
      {!['landing', 'auth', 'session', 'grammar', 'interview', 'ielts'].includes(page) && <FloatingGradient />}

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
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard onStartSession={startSession} onStartGrammar={startGrammarDrills} />
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
