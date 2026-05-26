import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle2, XCircle, Lightbulb, ArrowLeft, RotateCcw,
  Volume2, Trophy, Zap, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { callGemini } from '../lib/gemini';
import Confetti from '../components/ui/Confetti';
import XPPopup from '../components/ui/XPPopup';

interface GrammarQuestion {
  id: string;
  type: 'scramble' | 'fill-blank' | 'error-spot' | 'translate';
  sentence: string;
  correctAnswer: string;
  words?: string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const GRAMMAR_TOPICS = [
  { id: 'articles', name: 'Articles (a/an/the)', icon: '📝' },
  { id: 'tenses', name: 'Verb Tenses', icon: '⏰' },
  { id: 'prepositions', name: 'Prepositions', icon: '📍' },
  { id: 'conditionals', name: 'Conditionals', icon: '🔀' },
  { id: 'passive', name: 'Passive Voice', icon: '🔇' },
  { id: 'reported', name: 'Reported Speech', icon: '💬' },
];

// Fallback question pools per topic and difficulty
const FALLBACK_QUESTIONS: Record<string, Record<string, GrammarQuestion[]>> = {
  articles: {
    easy: [
      { id: 'a1', type: 'scramble', sentence: 'I have a dog.', correctAnswer: 'I have a dog.', words: ['dog', 'I', 'a', 'have'], explanation: 'Use "a" before consonant sounds.', difficulty: 'easy' },
      { id: 'a2', type: 'scramble', sentence: 'She is an engineer.', correctAnswer: 'She is an engineer.', words: ['engineer', 'She', 'an', 'is'], explanation: 'Use "an" before vowel sounds.', difficulty: 'easy' },
      { id: 'a3', type: 'scramble', sentence: 'The sun is bright.', correctAnswer: 'The sun is bright.', words: ['sun', 'The', 'bright', 'is'], explanation: 'Use "the" for specific/unique things.', difficulty: 'easy' },
    ],
    medium: [
      { id: 'a4', type: 'scramble', sentence: 'The boy played an interesting game.', correctAnswer: 'The boy played an interesting game.', words: ['interesting', 'The', 'game', 'boy', 'an', 'played'], explanation: '"An" before vowel sound words, "the" for specific.', difficulty: 'medium' },
      { id: 'a5', type: 'scramble', sentence: 'She bought a uniform for the ceremony.', correctAnswer: 'She bought a uniform for the ceremony.', words: ['uniform', 'She', 'ceremony', 'the', 'a', 'bought', 'for'], explanation: '"Uniform" starts with consonant sound "y", use "a".', difficulty: 'medium' },
    ],
    hard: [
      { id: 'a6', type: 'scramble', sentence: 'An hour passed before the event started.', correctAnswer: 'An hour passed before the event started.', words: ['hour', 'An', 'event', 'passed', 'started', 'before', 'the'], explanation: '"Hour" has silent H, vowel sound = use "an".', difficulty: 'hard' },
      { id: 'a7', type: 'scramble', sentence: 'The university offers an honors program.', correctAnswer: 'The university offers an honors program.', words: ['university', 'The', 'program', 'offers', 'honors', 'an'], explanation: '"University" = consonant sound, "honors" = vowel sound.', difficulty: 'hard' },
    ],
  },
  tenses: {
    easy: [
      { id: 't1', type: 'scramble', sentence: 'She goes to school every day.', correctAnswer: 'She goes to school every day.', words: ['day', 'every', 'goes', 'She', 'school', 'to'], explanation: 'Simple present: Subject + base verb (+s for he/she/it).', difficulty: 'easy' },
      { id: 't2', type: 'scramble', sentence: 'They played football yesterday.', correctAnswer: 'They played football yesterday.', words: ['football', 'They', 'yesterday', 'played'], explanation: 'Simple past: Subject + verb-ed.', difficulty: 'easy' },
      { id: 't3', type: 'scramble', sentence: 'I will visit Paris next year.', correctAnswer: 'I will visit Paris next year.', words: ['year', 'visit', 'Paris', 'next', 'I', 'will'], explanation: 'Simple future: Subject + will + base verb.', difficulty: 'easy' },
    ],
    medium: [
      { id: 't4', type: 'scramble', sentence: 'We have been working on this project.', correctAnswer: 'We have been working on this project.', words: ['working', 'We', 'project', 'been', 'this', 'have', 'on'], explanation: 'Present perfect continuous: have/has + been + verb-ing.', difficulty: 'medium' },
      { id: 't5', type: 'scramble', sentence: 'She had finished the report by noon.', correctAnswer: 'She had finished the report by noon.', words: ['finished', 'She', 'report', 'had', 'noon', 'the', 'by'], explanation: 'Past perfect: had + past participle for earlier past action.', difficulty: 'medium' },
      { id: 't6', type: 'scramble', sentence: 'They were watching television when I arrived.', correctAnswer: 'They were watching television when I arrived.', words: ['watching', 'They', 'television', 'were', 'arrived', 'I', 'when'], explanation: 'Past continuous: was/were + verb-ing for ongoing past action.', difficulty: 'medium' },
    ],
    hard: [
      { id: 't7', type: 'scramble', sentence: 'By next month, I will have been working here for five years.', correctAnswer: 'By next month, I will have been working here for five years.', words: ['working', 'By', 'years', 'month', 'next', 'five', 'here', 'I', 'been', 'for', 'will', 'have'], explanation: 'Future perfect continuous: will + have + been + verb-ing.', difficulty: 'hard' },
      { id: 't8', type: 'scramble', sentence: 'She would have passed the exam if she had studied harder.', correctAnswer: 'She would have passed the exam if she had studied harder.', words: ['passed', 'She', 'exam', 'would', 'studied', 'the', 'had', 'if', 'she', 'harder', 'have'], explanation: 'Third conditional: would have + past participle + if + had + past participle.', difficulty: 'hard' },
    ],
  },
  prepositions: {
    easy: [
      { id: 'p1', type: 'scramble', sentence: 'The book is on the table.', correctAnswer: 'The book is on the table.', words: ['table', 'The', 'on', 'is', 'book', 'the'], explanation: '"On" indicates position above and touching.', difficulty: 'easy' },
      { id: 'p2', type: 'scramble', sentence: 'She lives in New York.', correctAnswer: 'She lives in New York.', words: ['New York', 'She', 'lives', 'in'], explanation: '"In" for cities, countries, enclosed spaces.', difficulty: 'easy' },
      { id: 'p3', type: 'scramble', sentence: 'I go to school by bus.', correctAnswer: 'I go to school by bus.', words: ['bus', 'I', 'to', 'school', 'by', 'go'], explanation: '"By" for modes of transport.', difficulty: 'easy' },
    ],
    medium: [
      { id: 'p4', type: 'scramble', sentence: 'Please arrive at the station before noon.', correctAnswer: 'Please arrive at the station before noon.', words: ['station', 'Please', 'before', 'arrive', 'the', 'noon', 'at'], explanation: '"At" for specific points, "before" for time.', difficulty: 'medium' },
      { id: 'p5', type: 'scramble', sentence: 'The cat jumped over the fence and ran across the yard.', correctAnswer: 'The cat jumped over the fence and ran across the yard.', words: ['fence', 'The', 'ran', 'over', 'cat', 'yard', 'across', 'the', 'and', 'jumped'], explanation: '"Over" = above/across, "across" = from one side to other.', difficulty: 'medium' },
    ],
    hard: [
      { id: 'p6', type: 'scramble', sentence: 'Despite the heavy rain, they proceeded with the construction.', correctAnswer: 'Despite the heavy rain, they proceeded with the construction.', words: ['rain', 'Despite', 'construction', 'the', 'heavy', 'they', 'proceeded', 'with', 'the'], explanation: '"Despite" + noun = in spite of; "with" = using/accompanying.', difficulty: 'hard' },
    ],
  },
  conditionals: {
    easy: [
      { id: 'c1', type: 'scramble', sentence: 'If it rains, I will stay home.', correctAnswer: 'If it rains, I will stay home.', words: ['rains', 'If', 'home', 'it', 'stay', 'will', 'I'], explanation: 'First conditional: If + present, will + infinitive.', difficulty: 'easy' },
      { id: 'c2', type: 'scramble', sentence: 'If you study hard, you will pass.', correctAnswer: 'If you study hard, you will pass.', words: ['hard', 'If', 'study', 'pass', 'you', 'will', 'you'], explanation: 'Real conditional for future possibilities.', difficulty: 'easy' },
    ],
    medium: [
      { id: 'c3', type: 'scramble', sentence: 'If I had money, I would buy a car.', correctAnswer: 'If I had money, I would buy a car.', words: ['money', 'If', 'car', 'had', 'buy', 'would', 'I', 'a'], explanation: 'Second conditional: If + past, would + infinitive.', difficulty: 'medium' },
      { id: 'c4', type: 'scramble', sentence: 'If she were here, she would help us.', correctAnswer: 'If she were here, she would help us.', words: ['here', 'If', 'help', 'she', 'would', 'were', 'us', 'she'], explanation: 'Use "were" for all subjects in second conditional.', difficulty: 'medium' },
    ],
    hard: [
      { id: 'c5', type: 'scramble', sentence: 'If they had arrived earlier, they would have caught the train.', correctAnswer: 'If they had arrived earlier, they would have caught the train.', words: ['earlier', 'If', 'train', 'had', 'the', 'caught', 'would', 'they', 'arrived', 'have', 'they'], explanation: 'Third conditional: If + had + participle, would have + participle.', difficulty: 'hard' },
    ],
  },
  passive: {
    easy: [
      { id: 'pa1', type: 'scramble', sentence: 'The cake was baked by my mother.', correctAnswer: 'The cake was baked by my mother.', words: ['mother', 'cake', 'baked', 'The', 'my', 'was', 'by'], explanation: 'Passive: subject + be + past participle + by + agent.', difficulty: 'easy' },
      { id: 'pa2', type: 'scramble', sentence: 'The letter was written yesterday.', correctAnswer: 'The letter was written yesterday.', words: ['letter', 'The', 'yesterday', 'written', 'was'], explanation: 'Passive with implied agent.', difficulty: 'easy' },
    ],
    medium: [
      { id: 'pa3', type: 'scramble', sentence: 'The project has been completed by the team.', correctAnswer: 'The project has been completed by the team.', words: ['project', 'The', 'completed', 'been', 'team', 'has', 'by', 'the'], explanation: 'Present perfect passive: has/have been + past participle.', difficulty: 'medium' },
      { id: 'pa4', type: 'scramble', sentence: 'The proposal was being discussed when I entered.', correctAnswer: 'The proposal was being discussed when I entered.', words: ['proposal', 'The', 'discussed', 'being', 'when', 'was', 'entered', 'I'], explanation: 'Past continuous passive: was/were being + past participle.', difficulty: 'medium' },
    ],
    hard: [
      { id: 'pa5', type: 'scramble', sentence: 'The bridge will have been constructed by next year.', correctAnswer: 'The bridge will have been constructed by next year.', words: ['bridge', 'The', 'constructed', 'been', 'year', 'will', 'next', 'by', 'have'], explanation: 'Future perfect passive: will have been + past participle.', difficulty: 'hard' },
    ],
  },
  reported: {
    easy: [
      { id: 'r1', type: 'scramble', sentence: 'She said that she was tired.', correctAnswer: 'She said that she was tired.', words: ['that', 'She', 'tired', 'was', 'she', 'said'], explanation: 'Reported speech: present becomes past.', difficulty: 'easy' },
      { id: 'r2', type: 'scramble', sentence: 'He told me that he liked coffee.', correctAnswer: 'He told me that he liked coffee.', words: ['me', 'He', 'coffee', 'he', 'that', 'told', 'liked'], explanation: '"Say" becomes "tell" with object pronoun.', difficulty: 'easy' },
    ],
    medium: [
      { id: 'r3', type: 'scramble', sentence: 'She asked me if I could help her.', correctAnswer: 'She asked me if I could help her.', words: ['me', 'She', 'help', 'if', 'could', 'I', 'her', 'asked'], explanation: 'Yes/no questions become "if" in reported speech.', difficulty: 'medium' },
      { id: 'r4', type: 'scramble', sentence: 'He told me not to forget the meeting.', correctAnswer: 'He told me not to forget the meeting.', words: ['me', 'He', 'forget', 'meeting', 'the', 'told', 'not', 'to'], explanation: 'Negative imperatives: told + object + not to + infinitive.', difficulty: 'medium' },
    ],
    hard: [
      { id: 'r5', type: 'scramble', sentence: 'He asked whether I had finished the assignment the previous day.', correctAnswer: 'He asked whether I had finished the assignment the previous day.', words: ['assignment', 'He', 'finished', 'previous', 'whether', 'I', 'day', 'had', 'the', 'asked', 'the'], explanation: '"Yesterday" becomes "the previous day" in reported speech.', difficulty: 'hard' },
    ],
  },
};

// Get random items from array
function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function generateGrammarQuestions(topic: string, difficulty: string, count: number, userLevel?: number): Promise<GrammarQuestion[]> {
  const seed = Date.now(); // Unique seed for each session
  const sessionPrompt = `Generate ${count} UNIQUE grammar exercise questions for English learners.

IMPORTANT: Each question must be completely original. Do NOT reuse common examples. Be creative with contexts and vocabulary.

Topic: ${topic}
Difficulty: ${difficulty}
${userLevel ? `User's level: ${userLevel} - adjust complexity accordingly` : ''}

For each question provide:
1. A scrambled sentence exercise (words in random order)
2. The correct sentence
3. An explanation of the grammar rule
4. The words as an array in SCRAMBLED order

Requirements:
- Create ORIGINAL, CREATIVE sentences (not textbook examples)
- Use varied contexts: business, travel, technology, education, daily life
- Vary sentence structures
- Include common names and modern vocabulary
- Make sentences ${difficulty === 'easy' ? '8-12 words' : difficulty === 'medium' ? '10-15 words' : '12-20 words'}

Session ID for uniqueness: ${seed}

Respond ONLY in this exact JSON format:
[
  {
    "id": "q1",
    "type": "scramble",
    "sentence": "The complete correct sentence with proper punctuation.",
    "correctAnswer": "The complete correct sentence with proper punctuation.",
    "words": ["each", "word", "in", "scrambled", "order"],
    "explanation": "Brief grammar rule explanation",
    "difficulty": "${difficulty}"
  }
]

Generate ${count} completely unique questions now.`;

  try {
    const response = await callGemini([{ role: 'user', parts: [{ text: sessionPrompt }] }]);
    const cleaned = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error('Failed to generate questions, using fallback:', err);
    return getFallbackQuestions(topic, difficulty, count);
  }
}

function getFallbackQuestions(topic: string, difficulty: string, count: number): GrammarQuestion[] {
  const topicQuestions = FALLBACK_QUESTIONS[topic] || FALLBACK_QUESTIONS.tenses;
  const difficultyQuestions = topicQuestions[difficulty] || topicQuestions.medium || [];
  const shuffled = [...difficultyQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Normalize string for comparison: strip punctuation, trim, collapse whitespace, lowercase
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!]/g, '') // Remove all punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .trim();
}

interface Props {
  onBack: () => void;
}

export default function GrammarDrillsPage({ onBack }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpEarnedSession, setXpEarnedSession] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const currentQuestion = questions[currentIndex];

  const startSession = async (topicId: string) => {
    setSelectedTopic(topicId);
    setLoading(true);
    setCurrentIndex(0);
    setScore(0);
    setSessionComplete(false);
    setIsCorrect(null);
    setShowHint(false);
    setXpEarnedSession(0);
    setAttempts(0);

    // Use user level if available
    const userLevel = profile?.level || 1;
    const generated = await generateGrammarQuestions(topicId, difficulty, 5, userLevel);
    setQuestions(generated);
    setLoading(false);
  };

  // Initialize words when question changes
  useEffect(() => {
    if (currentQuestion?.words) {
      // Shuffle words randomly each time
      const shuffled = [...currentQuestion.words].sort(() => Math.random() - 0.5);
      setAvailableWords(shuffled);
      setUserAnswer([]);
      setIsCorrect(null);
      setShowHint(false);
      setAttempts(0);
    }
  }, [currentQuestion]);

  const handleWordSelect = (word: string, index: number) => {
    setUserAnswer((prev) => [...prev, word]);
    setAvailableWords((prev) => prev.filter((_, i) => i !== index));
    setIsCorrect(null);
  };

  const handleWordRemove = (word: string, index: number) => {
    setAvailableWords((prev) => [...prev, word]);
    setUserAnswer((prev) => prev.filter((_, i) => i !== index));
    setIsCorrect(null);
  };

  const checkAnswer = async () => {
    // Build user's sentence
    const userSentence = userAnswer.join(' ');

    // Normalize both strings for comparison
    const normalizedUser = normalizeString(userSentence);
    const normalizedCorrect = normalizeString(currentQuestion.correctAnswer);

    // Check for match
    const correct = normalizedUser === normalizedCorrect;

    setIsCorrect(correct);
    setAttempts((prev) => prev + 1);

    if (correct) {
      setScore((prev) => prev + 1);
      const xp = difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5;
      setXpEarnedSession((prev) => prev + xp);
      setShowXpPopup(true);
      setTimeout(() => setShowXpPopup(false), 1500);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    setSessionComplete(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Award XP
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('xp, league_xp')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        await supabase
          .from('profiles')
          .update({
            xp: profileData.xp + xpEarnedSession,
            league_xp: profileData.league_xp + xpEarnedSession,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        refreshProfile();
      }
    }
  };

  const restartSession = () => {
    if (selectedTopic) {
      startSession(selectedTopic);
    }
  };

  const speakSentence = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  };

  // Topic selection screen
  if (!selectedTopic) {
    return (
      <div className="min-h-screen bg-[#090e1a] pt-14">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1 className="text-2xl font-black mb-2 flex items-center gap-3">
              <BookOpen size={28} className="text-rose-400" />
              Grammar Drills
            </h1>
            <p className="text-white/50">Master English grammar through interactive exercises</p>
          </motion.div>

          {/* Difficulty selector */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white/60 mb-3">Select Difficulty</h3>
            <div className="flex gap-3">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                    difficulty === d
                      ? d === 'easy'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : d === 'medium'
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        : 'bg-red-500/20 border border-red-500/40 text-red-300'
                      : 'bg-white/5 border border-white/10 text-white/50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Topic cards */}
          <h3 className="text-sm font-semibold text-white/60 mb-4">Choose a Topic</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GRAMMAR_TOPICS.map((topic, i) => (
              <motion.button
                key={topic.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startSession(topic.id)}
                disabled={loading}
                className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-left hover:border-rose-500/30 hover:bg-white/[0.05] transition-all group"
              >
                <div className="text-3xl mb-3">{topic.icon}</div>
                <div className="font-bold text-sm group-hover:text-rose-300 transition-colors">
                  {topic.name}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Session complete screen
  if (sessionComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-[#090e1a] pt-14 flex items-center justify-center">
        <Confetti trigger={showConfetti} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md px-4"
        >
          <div className="text-6xl mb-4">
            {percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : '💪'}
          </div>
          <h2 className="text-3xl font-black mb-2">Session Complete!</h2>
          <p className="text-white/60 mb-6">
            You scored {score} out of {questions.length} ({percentage}%)
          </p>

          <div className="flex gap-4 justify-center mb-6">
            <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Zap className="mx-auto text-amber-400 mb-2" size={24} />
              <div className="text-2xl font-bold text-amber-400">{xpEarnedSession}</div>
              <div className="text-xs text-white/40">XP Earned</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Trophy className="mx-auto text-blue-400 mb-2" size={24} />
              <div className="text-2xl font-bold text-blue-400">{percentage}%</div>
              <div className="text-xs text-white/40">Accuracy</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={restartSession}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl font-bold flex items-center gap-2"
            >
              <RefreshCw size={18} />
              New Questions
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTopic(null)}
              className="px-6 py-3 bg-white/10 rounded-xl font-bold"
            >
              New Topic
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Question screen
  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <Confetti trigger={showConfetti} />
      <XPPopup xp={difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5} visible={showXpPopup} message="Correct!" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedTopic(null)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-white/50" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-2xl">{GRAMMAR_TOPICS.find((t) => t.id === selectedTopic)?.icon}</span>
            <span className="font-bold">{GRAMMAR_TOPICS.find((t) => t.id === selectedTopic)?.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-400">{score}/{questions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + (isCorrect !== null ? 1 : 0)) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-2">
            <span>Question {currentIndex + 1}</span>
            <span>{questions.length - currentIndex - (isCorrect !== null ? 1 : 0)} remaining</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full mx-auto"
            />
            <p className="text-white/50 mt-4">Generating unique questions...</p>
          </div>
        ) : currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            {/* Instructions */}
            <div className="text-center">
              <h2 className="text-lg font-bold mb-2">Arrange the words to form a correct sentence</h2>
              <button
                onClick={() => setShowHint((v) => !v)}
                className="text-sm text-rose-400 flex items-center gap-1 mx-auto"
              >
                <Lightbulb size={14} />
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
              {showHint && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-white/60 text-sm mt-2"
                >
                  Think about: Subject + Verb + Object pattern
                </motion.p>
              )}
            </div>

            {/* Answer area (drop zone) */}
            <div
              className={`min-h-[80px] p-4 rounded-2xl border-2 border-dashed transition-colors ${
                isCorrect === true
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : isCorrect === false
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-white/20 bg-white/5'
              }`}
            >
              {userAnswer.length === 0 ? (
                <p className="text-center text-white/30 text-sm">Tap words below to build your sentence</p>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center">
                  <AnimatePresence>
                    {userAnswer.map((word, i) => (
                      <motion.button
                        key={`answer-${i}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleWordRemove(word, i)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                          isCorrect === true
                            ? 'bg-emerald-500 text-white'
                            : isCorrect === false
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30'
                        }`}
                      >
                        {word}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Word blocks */}
            <div className="flex flex-wrap gap-2 justify-center p-4 bg-white/[0.02] rounded-2xl min-h-[100px]">
              <AnimatePresence>
                {availableWords.map((word, i) => (
                  <motion.button
                    key={`word-${i}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleWordSelect(word, i)}
                    disabled={isCorrect !== null}
                    className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 hover:border-white/30 disabled:opacity-50 transition-colors"
                  >
                    {word}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Result feedback */}
            {isCorrect !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl ${
                  isCorrect
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={24} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrect ? 'Correct!' : 'Not quite right'}
                    </div>
                    {!isCorrect && (
                      <div className="mt-2">
                        <div className="text-xs text-white/40 mb-1">Correct answer:</div>
                        <div className="text-white font-medium">{currentQuestion.correctAnswer}</div>
                      </div>
                    )}
                    <div className="mt-2 text-sm text-white/60">{currentQuestion.explanation}</div>
                    <button
                      onClick={() => speakSentence(isCorrect ? userAnswer.join(' ') : currentQuestion.correctAnswer)}
                      className="mt-3 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                    >
                      <Volume2 size={16} />
                      Listen
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {isCorrect === null ? (
                <>
                  <button
                    onClick={() => {
                      setUserAnswer([]);
                      setAvailableWords([...currentQuestion.words].sort(() => Math.random() - 0.5));
                    }}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} />
                    Reset
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={checkAnswer}
                    disabled={userAnswer.length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl font-bold disabled:opacity-50"
                  >
                    Check Answer
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={nextQuestion}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl font-bold"
                >
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
