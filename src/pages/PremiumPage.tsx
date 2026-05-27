import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Crown, Diamond, Zap, Heart, Shield, BookOpen,
  Brain, Sparkles, CheckCircle2, Lock, Star, Target, Users,
  Infinity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHearts } from '../hooks/useHearts';
import { supabase } from '../lib/supabase';
import { callGemini } from '../lib/gemini';
import HeartsBar from '../components/ui/HeartsBar';
import { LEAGUES } from '../lib/xp';

type PremiumTab = 'overview' | 'error-notebook' | 'interview-pro' | 'settings';

interface ErrorEntry {
  id: string;
  source: string;
  question_type: string;
  question_text: string;
  correct_answer: string;
  user_answer: string;
  explanation: string;
  word: string | null;
  meaning: string | null;
  times_wrong: number;
  times_reviewed: number;
  mastered: boolean;
  created_at: string;
}

interface ReviewQuestion {
  id: string;
  type: 'scramble' | 'pick-definition' | 'type-word';
  instruction: string;
  correctAnswer: string;
  words?: string[];
  options?: string[];
  explanation: string;
  errorId: string;
}

const INTERVIEW_COMPANIES = [
  { id: 'generic', name: 'Standard Interview', icon: '💼', description: 'General professional interview' },
  { id: 'tcs_nqt', name: 'TCS NQT', icon: '🏢', description: 'Tata Consultancy Services National Qualifier Test' },
  { id: 'google', name: 'Google', icon: '🔍', description: 'Google behavioral & technical rounds' },
  { id: 'amazon', name: 'Amazon', icon: '📦', description: 'Amazon Leadership Principles interview' },
  { id: 'microsoft', name: 'Microsoft', icon: '🪟', description: 'Microsoft cultural & technical fit' },
  { id: 'meta', name: 'Meta', icon: '👤', description: 'Meta behavioral & problem-solving' },
  { id: 'corporate_hr', name: 'Corporate HR', icon: '🏛️', description: 'Formal HR screening & culture fit' },
  { id: 'consulting', name: 'Consulting (McKinsey style)', icon: '📊', description: 'Case interview & structured thinking' },
  { id: 'startup', name: 'Startup', icon: '🚀', description: 'Fast-paced, culture-first startup interview' },
];

interface Props {
  onBack: () => void;
  onStartInterview?: (company: string, companyId: string) => void;
  onStartErrorReview?: (questions: ReviewQuestion[]) => void;
}

export default function PremiumPage({ onBack, onStartInterview, onStartErrorReview }: Props) {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const { hearts, maxHearts, isPremium: hasPremium } = useHearts();
  const [activeTab, setActiveTab] = useState<PremiumTab>('overview');
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('generic');
  const [activating, setActivating] = useState(false);

  const fetchErrors = useCallback(async () => {
    if (!user) return;
    setLoadingErrors(true);
    const { data } = await supabase
      .from('error_notebook')
      .select('*')
      .eq('user_id', user.id)
      .eq('mastered', false)
      .order('times_wrong', { ascending: false })
      .limit(50);
    if (data) setErrors(data as ErrorEntry[]);
    setLoadingErrors(false);
  }, [user]);

  useEffect(() => {
    if (hasPremium) fetchErrors();
  }, [hasPremium, fetchErrors]);

  const activatePremium = async () => {
    if (!user) return;
    setActivating(true);
    await supabase
      .from('profiles')
      .update({ is_premium: true, league: 'diamond_plus', updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Award premium achievement
    await supabase.from('user_achievements').insert({
      user_id: user.id,
      achievement_id: 'premium_member',
    });

    refreshProfile();
    setActivating(false);
  };

  const generateSmartReview = async () => {
    if (errors.length === 0) return;
    setGeneratingQuiz(true);

    const errorSummaries = errors.slice(0, 10).map((e, i) => ({
      source: e.source,
      type: e.question_type,
      question: e.question_text,
      correct: e.correct_answer,
      wrong: e.user_answer,
      explanation: e.explanation,
      word: e.word,
    }));

    const prompt = `Generate a "Smart Review Quiz" based on these user mistakes. Create exactly ${Math.min(5, errors.length)} questions targeting their weak areas.

User's past mistakes:
${errorSummaries.map((e, i) => `${i + 1}. Source: ${e.source}, Type: ${e.type}, Question: "${e.question}", Correct: "${e.correct}", User said: "${e.wrong}", Rule: ${e.explanation}`).join('\n')}

Requirements:
- Focus on the EXACT grammar rules and vocabulary the user got wrong
- Create varied question types: scramble, pick-definition, type-word
- Make questions that directly test the weak areas
- If the mistake was a scrambled sentence, create a NEW scramble with similar grammar structure
- If the mistake was vocabulary, test that specific word again with a different format

Respond ONLY in this exact JSON format:
[
  {
    "id": "rq1",
    "type": "scramble",
    "instruction": "Arrange the words correctly",
    "correctAnswer": "The correct sentence",
    "words": ["scrambled", "word", "order"],
    "explanation": "Why this is correct - relate to the original mistake",
    "errorId": "${errors[0]?.id || ''}"
  }
]

Generate ${Math.min(5, errors.length)} review questions now.`;

    try {
      const response = await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setReviewQuestions(parsed);
    } catch (err) {
      console.error('Failed to generate review quiz:', err);
      // Fallback: create simple review from errors
      const fallback: ReviewQuestion[] = errors.slice(0, 3).map((e, i) => ({
        id: `fq${i}`,
        type: 'type-word' as const,
        instruction: e.source === 'vocabulary' ? `Type the word that means: "${e.meaning || e.correct_answer}"` : `Type the correct answer`,
        correctAnswer: e.correct_answer,
        explanation: e.explanation,
        errorId: e.id,
      }));
      setReviewQuestions(fallback);
    }
    setGeneratingQuiz(false);
  };

  const markErrorMastered = async (errorId: string) => {
    if (!user) return;
    await supabase
      .from('error_notebook')
      .update({ mastered: true, times_reviewed: supabase.rpc('increment', { x: 1 }) })
      .eq('id', errorId);
    // Manual increment fallback
    await supabase
      .from('error_notebook')
      .update({ mastered: true })
      .eq('id', errorId);
    fetchErrors();
  };

  // Non-premium upgrade screen
  if (!hasPremium) {
    return (
      <div className="min-h-screen bg-[#090e1a] pt-14">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white mb-6">
            <ArrowLeft size={18} /> Back
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            {/* Premium hero */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Crown size={48} className="text-white" />
              </div>
            </motion.div>

            <h1 className="text-3xl font-black mb-3">FluentAI Premium</h1>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Unlock infinite practice, smart review, advanced interviews, and exclusive rewards
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
              {[
                { icon: Heart, label: 'Infinite Hearts', desc: 'Never run out of practice hearts', color: 'text-red-400', bg: 'bg-red-500/10' },
                { icon: Brain, label: 'Smart Review Quiz', desc: 'AI-generated quizzes from your mistakes', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { icon: Target, label: 'Advanced Interviews', desc: 'Company-specific interview simulations', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: Diamond, label: 'Diamond+ League', desc: 'Exclusive premium-only league tier', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((feat, i) => (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl"
                >
                  <div className={`w-10 h-10 ${feat.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <feat.icon size={20} className={feat.color} />
                  </div>
                  <div className="font-bold text-sm">{feat.label}</div>
                  <div className="text-xs text-white/40 mt-1">{feat.desc}</div>
                </motion.div>
              ))}
            </div>

            {/* Activate button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={activatePremium}
              disabled={activating}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl font-black text-lg text-black shadow-lg shadow-amber-500/25 disabled:opacity-50"
            >
              {activating ? 'Activating...' : 'Activate Premium'}
            </motion.button>
            <p className="text-xs text-white/25 mt-3">Demo mode - instant activation</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Premium dashboard tabs
  const tabs: { id: PremiumTab; label: string; icon: typeof Crown }[] = [
    { id: 'overview', label: 'Overview', icon: Crown },
    { id: 'error-notebook', label: 'Error Notebook', icon: Brain },
    { id: 'interview-pro', label: 'Interview Pro', icon: Target },
    { id: 'settings', label: 'Settings', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} className="text-white/50" />
          </button>
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-amber-400" />
            <span className="font-bold">Premium Dashboard</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">PRO</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Premium status card */}
              <div className="p-6 bg-gradient-to-br from-amber-500/15 to-yellow-600/10 border border-amber-500/25 rounded-3xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Crown size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black flex items-center gap-2">
                      {profile?.display_name || 'Learner'}
                      <Diamond size={16} className="text-amber-400" />
                    </h2>
                    <p className="text-sm text-amber-400/70">Premium Member</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <Infinity size={18} className="text-red-400 mx-auto mb-1" />
                    <div className="text-xs text-white/40">Hearts</div>
                    <div className="text-sm font-bold text-red-400">Infinite</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <Brain size={18} className="text-blue-400 mx-auto mb-1" />
                    <div className="text-xs text-white/40">Errors to Review</div>
                    <div className="text-sm font-bold text-blue-400">{errors.length}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <Diamond size={18} className="text-amber-400 mx-auto mb-1" />
                    <div className="text-xs text-white/40">League</div>
                    <div className="text-sm font-bold text-amber-400">Diamond+</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <Star size={18} className="text-violet-400 mx-auto mb-1" />
                    <div className="text-xs text-white/40">Level</div>
                    <div className="text-sm font-bold text-violet-400">{profile?.level || 1}</div>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('error-notebook')}
                  className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-left hover:bg-blue-500/15 transition-colors"
                >
                  <Brain size={24} className="text-blue-400 mb-3" />
                  <div className="font-bold text-sm">Smart Review</div>
                  <div className="text-xs text-white/40 mt-1">{errors.length} mistakes to review</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('interview-pro')}
                  className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left hover:bg-emerald-500/15 transition-colors"
                >
                  <Target size={24} className="text-emerald-400 mb-3" />
                  <div className="font-bold text-sm">Interview Pro</div>
                  <div className="text-xs text-white/40 mt-1">9 company simulations</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-left"
                >
                  <Heart size={24} className="text-red-400 mb-3" fill="currentColor" />
                  <div className="font-bold text-sm">Infinite Hearts</div>
                  <div className="text-xs text-white/40 mt-1">Never lose a heart again</div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ERROR NOTEBOOK TAB */}
          {activeTab === 'error-notebook' && (
            <motion.div key="errors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <Brain size={20} className="text-blue-400" />
                    Error Notebook
                  </h2>
                  <p className="text-sm text-white/50">{errors.length} unmastered mistakes</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateSmartReview}
                  disabled={generatingQuiz || errors.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {generatingQuiz ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Smart Review Quiz
                </motion.button>
              </div>

              {/* Review Quiz Section */}
              {reviewQuestions.length > 0 && (
                <div className="p-5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-blue-300 flex items-center gap-2">
                    <Sparkles size={16} />
                    Smart Review Quiz Ready ({reviewQuestions.length} questions)
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onStartErrorReview?.(reviewQuestions)}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl font-bold"
                  >
                    Start Review Quiz
                  </motion.button>
                </div>
              )}

              {/* Error list */}
              {loadingErrors ? (
                <div className="text-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : errors.length === 0 ? (
                <div className="text-center py-12 p-8 bg-white/[0.03] border border-white/10 rounded-2xl">
                  <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-bold">No Mistakes Yet!</h3>
                  <p className="text-sm text-white/40 mt-1">Keep practicing and your errors will appear here for review</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errors.map((error) => (
                    <motion.div
                      key={error.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-white/[0.03] border border-white/10 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              error.source === 'grammar' ? 'bg-rose-500/20 text-rose-300' :
                              error.source === 'vocabulary' ? 'bg-violet-500/20 text-violet-300' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {error.source}
                            </span>
                            <span className="text-xs text-white/30">x{error.times_wrong} wrong</span>
                          </div>
                          <div className="text-sm font-medium mb-1">{error.question_text || error.word}</div>
                          <div className="text-xs text-red-400/70 line-through">Your answer: {error.user_answer}</div>
                          <div className="text-xs text-emerald-400/70">Correct: {error.correct_answer}</div>
                          {error.explanation && (
                            <div className="text-xs text-white/40 mt-1">{error.explanation}</div>
                          )}
                        </div>
                        <button
                          onClick={() => markErrorMastered(error.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                        >
                          Mastered
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* INTERVIEW PRO TAB */}
          {activeTab === 'interview-pro' && (
            <motion.div key="interview-pro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Target size={20} className="text-emerald-400" />
                  Advanced Interview Mode
                </h2>
                <p className="text-sm text-white/50">Company-specific interview simulations with real stakes</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERVIEW_COMPANIES.map((company) => (
                  <motion.button
                    key={company.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCompany(company.id)}
                    className={`p-5 rounded-2xl text-left transition-all ${
                      selectedCompany === company.id
                        ? 'bg-emerald-500/15 border-2 border-emerald-500/40'
                        : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{company.icon}</span>
                      <div>
                        <div className="font-bold text-sm">{company.name}</div>
                        <div className="text-xs text-white/40">{company.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Start Interview Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartInterview?.(
                  INTERVIEW_COMPANIES.find(c => c.id === selectedCompany)?.name || 'Standard Interview',
                  selectedCompany
                )}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <Target size={20} />
                Start {INTERVIEW_COMPANIES.find(c => c.id === selectedCompany)?.name || 'Interview'}
              </motion.button>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Shield size={20} className="text-white/60" />
                Premium Settings
              </h2>

              {/* Infinite Hearts Toggle */}
              <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart size={20} className="text-red-400" fill="currentColor" />
                    <div>
                      <div className="font-bold text-sm">Infinite Hearts</div>
                      <div className="text-xs text-white/40">Hearts never drop below 5</div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg">
                    Active
                  </div>
                </div>
              </div>

              {/* League info */}
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <Diamond size={20} className="text-amber-400" />
                  <div>
                    <div className="font-bold text-sm">Diamond+ League</div>
                    <div className="text-xs text-white/40">Exclusive premium-only league</div>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" style={{ width: '65%' }} />
                </div>
                <div className="text-xs text-white/30 mt-1">1,250 / 2,000 XP to next rank</div>
              </div>

              {/* Premium badge preview */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
                <div className="text-sm font-semibold mb-3 text-white/60">Premium Badge Preview</div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg font-bold">
                    {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {profile?.display_name || 'Learner'}
                      <Diamond size={14} className="text-amber-400" />
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded">PRO</span>
                    </div>
                    <div className="text-xs text-white/40">Diamond+ League - Level {profile?.level || 1}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
