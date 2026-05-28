import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Volume2, CheckCircle2, XCircle, ArrowLeft, RotateCcw,
  Sparkles, Trophy, Zap, Star, Lightbulb, Keyboard, Target
} from 'lucide-react';

// --- CONSOLIDATED CONSTANTS ---
const XP_PER_WORD_LEARNED = 15; // 👈 Resolved missing constant to fix render crash

// --- STYLED SUB-COMPONENTS (CONSOLIDATED FOR RUNNABLE STABILITY) ---

// Beautiful, customized local particle explosion confetti
function Confetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, 
        y: -10, 
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)],
        size: Math.random() * 10 + 6,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.4,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: '-10vh', rotate: p.rotate, opacity: 1 }}
          animate={{
            y: '110vh',
            x: `${p.x + (Math.random() * 20 - 10)}vw`,
            rotate: p.rotate + 720,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: p.delay,
            ease: "easeOut"
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// XP Achievement Toast notifier
function XPPopup({ xp, visible, message }: { xp: number; visible: boolean; message: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 20, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-yellow-300"
        >
          <span>✨</span>
          <span>+{xp} XP</span>
          <span className="text-xs font-bold text-black/70">| {message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Lives visualizer
function HeartsBar({ hearts, maxHearts, size = "md", isPremium = false }: { hearts: number; maxHearts: number; size?: "sm" | "md"; isPremium?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl">
      {isPremium ? (
        <span className="text-rose-400 font-extrabold text-xs flex items-center gap-1">
          ❤️ <span className="text-[10px] uppercase tracking-wider text-white/70">Unlimited</span>
        </span>
      ) : (
        <div className="flex items-center gap-1">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <span
              key={i}
              className={`transition-all duration-300 ${size === 'sm' ? 'text-xs' : 'text-base'} ${
                i < hearts ? 'filter-none opacity-100 scale-100' : 'grayscale opacity-30 scale-90'
              }`}
            >
              ❤️
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Hearts shop refiller
function RefillHeartsModal({
  hearts,
  maxHearts,
  xpRefillCost,
  isRefilling,
  onRefillWithXP,
  onRefillByPractice,
  onClose
}: {
  hearts: number;
  maxHearts: number;
  xpRefillCost: number;
  isRefilling: boolean;
  onRefillWithXP: () => void;
  onRefillByPractice: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#0d1424] border border-white/10 rounded-3xl p-6 text-center space-y-6"
      >
        <div className="text-5xl">💔</div>
        <div>
          <h3 className="text-xl font-bold">Refill Your Hearts</h3>
          <p className="text-white/50 text-sm mt-1">Get more hearts to continue mastering new vocabulary challenges!</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRefillWithXP}
            disabled={isRefilling}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span>⚡ Buy with {xpRefillCost} XP</span>
          </button>
          <button
            onClick={onRefillByPractice}
            disabled={isRefilling}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm border border-white/10 transition-colors"
          >
            <span>🎯 Practice to Refill</span>
          </button>
        </div>

        <button onClick={onClose} className="text-xs text-white/40 hover:text-white transition-colors block mx-auto">
          Cancel & Exit
        </button>
      </motion.div>
    </div>
  );
}

// --- SECURE IN-MEMORY & LOCAL PERSISTENCE STORAGE CONTROLLERS ---

const getLearnedItemsLocal = (): string[] => {
  try {
    const data = localStorage.getItem('fluentai_vocabulary_library');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const addWordToLibraryLocal = (word: string) => {
  try {
    const items = getLearnedItemsLocal();
    const cleanWord = word.toLowerCase().trim();
    if (cleanWord && !items.includes(cleanWord)) {
      items.push(cleanWord);
      localStorage.setItem('fluentai_vocabulary_library', JSON.stringify(items));
    }
  } catch (e) {
    console.error(e);
  }
};

// --- GEMINI DIRECT CLIENT ENGINE (CSP & SANDBOX SAFE) ---

interface NewWordData {
  word: string;
  meaning: string;
  partOfSpeech: string;
  pronunciation: string;
  example: string;
  synonyms: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface Challenge {
  type: ChallengeType;
  instruction: string;
  options?: string[];
  correctAnswer: string;
  missingLetters?: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
}

interface Props {
  onBack: () => void;
}

// Low-latency API dynamic router
async function generateNewWord(userLevel: number, excludedWords: string[] = []): Promise<NewWordData> {
  const difficulty = userLevel < 5 ? 'beginner' : userLevel < 15 ? 'intermediate' : 'advanced';

  let exclusionConstraint = '';
  if (excludedWords.length > 0) {
    exclusionConstraint = `CRITICAL: Do NOT generate or use any of the following words under any circumstances: [${excludedWords.join(', ')}].`;
  }

  const prompt = `Generate a single NEW vocabulary word for an English learner.

Difficulty: ${difficulty}
User level: ${userLevel}
${exclusionConstraint}

Requirements:
- Word should be USEFUL and commonly used in ${difficulty} contexts
- DO NOT use common words everyone knows
- Choose words from topics: business, technology, travel, health, environment, culture
- Word must be at least 6 letters long

Respond ONLY in this exact JSON format:
{
  "word": "the_word",
  "meaning": "Clear, concise definition",
  "partOfSpeech": "noun/verb/adjective/adverb",
  "pronunciation": "phonetic-like spelling",
  "example": "A natural example sentence using the word",
  "synonyms": ["synonym1", "synonym2"],
  "difficulty": "${difficulty}"
}`;

  const apiKey = ""; // Runtime automatically injects valid credentials
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  let retries = 5;
  let delay = 1000;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                word: { type: "STRING" },
                meaning: { type: "STRING" },
                partOfSpeech: { type: "STRING" },
                pronunciation: { type: "STRING" },
                example: { type: "STRING" },
                synonyms: { type: "ARRAY", items: { type: "STRING" } },
                difficulty: { type: "STRING" }
              },
              required: ["word", "meaning", "partOfSpeech", "pronunciation", "example", "synonyms", "difficulty"]
            }
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.word && parsed.word.length >= 4 && !excludedWords.includes(parsed.word.toLowerCase().trim())) {
            return parsed;
          }
        }
      }
    } catch (err) {
      if (attempt === retries - 1) break;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }

  // Pure random fallback safety array
  const backupPool: NewWordData[] = [
    { word: 'eloquent', meaning: 'Fluent or persuasive in speaking or writing', partOfSpeech: 'adjective', pronunciation: 'eh-luh-kwent', example: 'His graduation speech was incredibly eloquent.', synonyms: ['articulate', 'fluent'], difficulty: 'intermediate' },
    { word: 'resilient', meaning: 'Able to withstand or recover quickly from difficult conditions', partOfSpeech: 'adjective', pronunciation: 'rih-zil-yunt', example: 'The local businesses proved resilient during the storm.', synonyms: ['tough', 'strong'], difficulty: 'intermediate' },
    { word: 'pragmatic', meaning: 'Dealing with things sensibly and realistically based on practical conditions', partOfSpeech: 'adjective', pronunciation: 'prag-mat-ik', example: 'We need to take a pragmatic approach to solving this bug.', synonyms: ['practical', 'logical'], difficulty: 'advanced' },
    { word: 'ubiquitous', meaning: 'Present, appearing, or found everywhere', partOfSpeech: 'adjective', pronunciation: 'yoo-bik-wih-tus', example: 'Smartphones have become completely ubiquitous in modern life.', synonyms: ['omnipresent', 'pervasive'], difficulty: 'advanced' }
  ];

  const safeSelection = backupPool.find(b => !excludedWords.includes(b.word.toLowerCase().trim())) || backupPool[0];
  return safeSelection;
}

async function generateChallenges(wordData: NewWordData): Promise<Challenge[]> {
  const challenges: Challenge[] = [];
  const word = wordData.word.toLowerCase().trim();

  challenges.push({
    type: 'type-word',
    instruction: `Type the word: "${wordData.word}"`,
    correctAnswer: word,
    hint: `It starts with "${word[0].toUpperCase()}" and has ${word.length} letters`,
  });

  challenges.push({
    type: 'pick-definition',
    instruction: 'Select the correct definition',
    options: [
      wordData.meaning,
      `A type of musical instrument used in classical music`,
      `The process of removing water from food products`,
      `A mathematical equation used in geometry`,
    ].sort(() => Math.random() - 0.5),
    correctAnswer: wordData.meaning,
  });

  const totalLength = word.length;
  const lettersToShow = Math.ceil(totalLength / 4);

  const prefix = word.substring(0, lettersToShow);
  const suffix = word.substring(totalLength - lettersToShow);
  const middle = word.substring(lettersToShow, totalLength - lettersToShow);

  const displayWord = prefix + '_'.repeat(middle.length) + suffix;

  challenges.push({
    type: 'fill-blanks',
    instruction: `Fill in the blanks: ${displayWord}`,
    correctAnswer: word,
    missingLetters: middle,
    prefix: prefix,
    suffix: suffix,
    hint: `Type the ${middle.length} missing letters. Definition: ${wordData.meaning}`,
  });

  return challenges;
}

// --- MAIN VOCABULARY LAB CONTROLLER VIEW ---

export default function App({ onBack = () => {} }: Props) {
  // Local active stats backed by storage
  const [xp, setXp] = useState(() => Number(localStorage.getItem('fluentai_xp') || '450'));
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('fluentai_streak') || '0'));
  const [wordsLearned, setWordsLearned] = useState(() => Number(localStorage.getItem('fluentai_words_count') || '0'));
  
  const [hearts, setHearts] = useState(5);
  const [maxHearts] = useState(5);
  const [isPremium] = useState(true); // Premium configuration provides infinite hearts simulation
  const [showRefillModal, setShowRefillModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [currentWord, setCurrentWord] = useState<NewWordData | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [phase, setPhase] = useState<'learn' | 'challenge' | 'complete'>('learn');
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [excludedWords, setExcludedWords] = useState<string[]>([]);

  // Pull history memory block indexes when workspace starts
  useEffect(() => {
    const items = getLearnedItemsLocal();
    setExcludedWords(items);
  }, []);

  const loadNewWord = useCallback(async (currentBlacklist: string[]) => {
    setLoading(true);
    setPhase('learn');
    setChallengeIndex(0);
    setUserInput('');
    setSelectedOption(null);
    setIsCorrect(null);
    setShowHint(false);

    const wordData = await generateNewWord(12, currentBlacklist);
    setCurrentWord(wordData);

    const generatedChallenges = await generateChallenges(wordData);
    setChallenges(generatedChallenges);

    setLoading(false);
  }, []);

  useEffect(() => {
    const items = getLearnedItemsLocal();
    loadNewWord(items);
  }, [loadNewWord]);

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const startChallenges = () => {
    setPhase('challenge');
    setChallengeIndex(0);
    setUserInput('');
    setSelectedOption(null);
    setIsCorrect(null);
    setShowHint(false);
  };

  const checkAnswer = async () => {
    const currentChallenge = challenges[challengeIndex];
    if (!currentChallenge) return;

    let correct = false;

    if (currentChallenge.type === 'pick-definition') {
      correct = (selectedOption || '') === currentChallenge.correctAnswer;
    } else if (currentChallenge.type === 'fill-blanks') {
      const userMissingLetters = userInput.trim().toLowerCase();
      const expectedMissingLetters = currentChallenge.missingLetters || '';

      if (userMissingLetters === expectedMissingLetters) {
        correct = true;
      } else {
        const prefix = currentChallenge.prefix || '';
        const suffix = currentChallenge.suffix || '';
        const reconstructedWord = (prefix + userMissingLetters + suffix).toLowerCase();
        correct = reconstructedWord === currentChallenge.correctAnswer.toLowerCase();
      }
    } else {
      correct = userInput.trim().toLowerCase() === currentChallenge.correctAnswer.toLowerCase();
    }

    setIsCorrect(correct);

    if (correct) {
      setStreak((prev) => {
        const next = prev + 1;
        localStorage.setItem('fluentai_streak', String(next));
        return next;
      });
    } else {
      setStreak(0);
      localStorage.setItem('fluentai_streak', '0');
      if (!isPremium) {
        setHearts((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const nextChallenge = () => {
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex((prev) => prev + 1);
      setUserInput('');
      setSelectedOption(null);
      setIsCorrect(null);
      setShowHint(false);
    } else {
      completeWord();
    }
  };

  const completeWord = async () => {
    setPhase('complete');
    
    const wordCount = wordsLearned + 1;
    setWordsLearned(wordCount);
    localStorage.setItem('fluentai_words_count', String(wordCount));

    const extraXp = xpEarned + XP_PER_WORD_LEARNED;
    setXpEarned(extraXp);

    const totalXp = xp + XP_PER_WORD_LEARNED;
    setXp(totalXp);
    localStorage.setItem('fluentai_xp', String(totalXp));

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setShowXpPopup(true);
    setTimeout(() => setShowXpPopup(false), 1500);

    if (currentWord) {
      const cleanTargetWord = currentWord.word.toLowerCase().trim();
      addWordToLibraryLocal(cleanTargetWord);
      setExcludedWords((prev) => [...prev, cleanTargetWord]);
    }
  };

  const learnNextWord = () => {
    const freshItems = getLearnedItemsLocal();
    loadNewWord(freshItems);
  };

  const endSession = () => {
    setSessionComplete(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const currentChallenge = challenges[challengeIndex];

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-[#090e1a] pt-14 flex items-center justify-center text-white">
        <Confetti trigger={showConfetti} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md px-4"
        >
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-3xl font-black mb-2">Lab Complete!</h2>
          <p className="text-white/60 mb-6">
            You learned <span className="text-violet-400 font-bold">{wordsLearned}</span> new words
          </p>

          <div className="flex gap-4 justify-center mb-6">
            <div className="text-center p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <Zap className="mx-auto text-violet-400 mb-2" size={24} />
              <div className="text-2xl font-bold text-violet-400">{xpEarned}</div>
              <div className="text-xs text-white/40">XP Earned</div>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <BookOpen className="mx-auto text-emerald-400 mb-2" size={24} />
              <div className="text-2xl font-bold text-emerald-400">{wordsLearned}</div>
              <div className="text-xs text-white/40">Words</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSessionComplete(false);
                const freshItems = getLearnedItemsLocal();
                loadNewWord(freshItems);
              }}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Continue Learning
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="px-6 py-3 bg-white/10 rounded-xl font-bold"
            >
              Exit Lab
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090e1a] text-white pt-14">
      <Confetti trigger={showConfetti} />
      <XPPopup xp={XP_PER_WORD_LEARNED} visible={showXpPopup} message="Word Mastered!" />

      {showRefillModal && (
        <RefillHeartsModal
          hearts={hearts}
          maxHearts={maxHearts}
          xpRefillCost={150}
          isRefilling={false}
          onRefillWithXP={() => {
            if (xp >= 150) {
              setXp(v => v - 150);
              setHearts(5);
              setShowRefillModal(false);
            }
          }}
          onRefillByPractice={() => setShowRefillModal(false)}
          onClose={() => setShowRefillModal(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-white/50" />
          </button>

          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-violet-400" />
            <span className="font-bold">Vocabulary Lab</span>
          </div>

          <div className="flex items-center gap-4">
            <HeartsBar hearts={hearts} maxHearts={maxHearts} size="sm" isPremium={isPremium} />
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-lg">
                <Star size={14} className="text-amber-400" fill="currentColor" />
                <span className="text-sm font-bold text-amber-400">{streak}</span>
              </div>
            )}
            <div className="text-sm font-bold text-violet-400">
              {wordsLearned} words
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {challenges.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < challengeIndex
                  ? 'bg-violet-500'
                  : i === challengeIndex && phase === 'challenge'
                  ? 'bg-violet-500/50 animate-pulse'
                  : 'bg-white/10'
              }`}
            ></div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full mx-auto"
            />
            <p className="text-white/50 mt-4">Finding a new word for you...</p>
          </div>
        ) : currentWord ? (
          <AnimatePresence mode="wait">
            {phase === 'learn' && (
              <motion.div
                key="learn"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="p-8 bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 rounded-3xl text-center">
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60">
                      {currentWord.partOfSpeech}
                    </span>
                  </div>

                  <motion.h2
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-black mb-4"
                  >
                    {currentWord.word}
                  </motion.h2>

                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-white/60">{currentWord.pronunciation}</span>
                    <button
                      onClick={() => speakWord(currentWord.word)}
                      className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <Volume2 size={20} className="text-violet-400" />
                    </button>
                  </div>

                  <p className="text-lg text-white/80 mb-4">{currentWord.meaning}</p>

                  <div className="p-4 bg-white/5 rounded-xl text-left mb-4">
                    <div className="text-xs text-white/40 mb-1">Example</div>
                    <p className="text-white/70 italic">"{currentWord.example}"</p>
                  </div>

                  {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentWord.synonyms.map((syn) => (
                        <span key={syn} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                          {syn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startChallenges}
                  className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                >
                  <Target size={20} />
                  Start Challenge to Learn
                </motion.button>
              </motion.div>
            )}

            {phase === 'challenge' && currentChallenge && (
              <motion.div
                key={`challenge-${challengeIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {currentChallenge.type === 'type-word' && <Keyboard size={20} className="text-violet-400" />}
                  {currentChallenge.type === 'pick-definition' && <BookOpen size={20} className="text-violet-400" />}
                  {currentChallenge.type === 'fill-blanks' && <Keyboard size={20} className="text-violet-400" />}
                  <span className="text-sm text-white/60 capitalize">
                    {currentChallenge.type.replace('-', ' ')}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-center">{currentChallenge.instruction}</h3>

                {showHint && currentChallenge.hint && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center"
                  >
                    <Lightbulb size={16} className="text-amber-400 inline mr-2" />
                    <span className="text-amber-300 text-sm">{currentChallenge.hint}</span>
                  </motion.div>
                )}

                {currentChallenge.type === 'pick-definition' ? (
                  <div className="space-y-3">
                    {currentChallenge.options?.map((option, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => !isCorrect && setSelectedOption(option)}
                        disabled={isCorrect !== null}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          selectedOption === option
                            ? isCorrect === true
                              ? 'bg-emerald-500/20 border-2 border-emerald-500'
                              : isCorrect === false && selectedOption !== currentChallenge.correctAnswer
                              ? 'bg-red-500/20 border-2 border-red-500'
                              : 'bg-violet-500/20 border-2 border-violet-500'
                            : isCorrect !== null && option === currentChallenge.correctAnswer
                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                            : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm">{option}</span>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                      placeholder={currentChallenge.type === 'fill-blanks' ? 'Type the missing letters...' : 'Type your answer...'}
                      disabled={isCorrect !== null}
                      autoFocus
                      className={`w-full px-6 py-4 bg-white/5 border-2 rounded-xl text-center text-lg font-semibold focus:outline-none transition-all ${
                        isCorrect === true
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : isCorrect === false
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-white/20 focus:border-violet-500'
                      }`}
                    />
                    {currentChallenge.type === 'fill-blanks' && (
                      <div className="text-center text-white/40 text-sm">
                        Type the <span className="text-amber-400 font-bold">{currentChallenge.missingLetters?.length}</span> missing letters
                      </div>
                    )}
                  </div>
                )}

                {isCorrect !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      isCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle2 size={20} className="text-emerald-400" />
                      ) : (
                        <XCircle size={20} className="text-red-400" />
                      )}
                      <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isCorrect ? 'Correct!' : 'Try again'}
                      </span>
                    </div>
                    {!isCorrect && (
                      <p className="text-sm text-white/60 mt-2">
                        {currentChallenge.type === 'fill-blanks' ? (
                          <>
                            The missing letters are: <span className="text-white font-semibold">{currentChallenge.missingLetters}</span>
                            <br />
                            Full word: <span className="text-violet-400 font-semibold">{currentChallenge.correctAnswer}</span>
                          </>
                        ) : (
                          <>
                            The correct answer is: <span className="text-white font-semibold">{currentChallenge.correctAnswer}</span>
                          </>
                        )}
                      </p>
                    )}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  {isCorrect === null ? (
                    <>
                      {!showHint && currentChallenge.hint && (
                        <button
                          onClick={() => setShowHint(true)}
                          className="py-3 px-4 bg-amber-500/20 text-amber-400 rounded-xl font-semibold"
                        >
                          <Lightbulb size={18} />
                        </button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={checkAnswer}
                        disabled={currentChallenge.type === 'pick-definition' ? !selectedOption : !userInput.trim()}
                        className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold disabled:opacity-50"
                      >
                        Check
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={isCorrect ? nextChallenge : () => { setIsCorrect(null); setUserInput(''); setSelectedOption(null); }}
                      className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold"
                    >
                      {isCorrect
                        ? challengeIndex < challenges.length - 1
                          ? 'Next Challenge'
                          : 'Complete Word'
                        : 'Try Again'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="text-6xl">🎉</div>

                <div>
                  <h2 className="text-2xl font-black mb-2">Word Unlocked!</h2>
                  <p className="text-white/60">
                    <span className="text-violet-400 font-bold">{currentWord.word}</span> has been added to your vocabulary library
                  </p>
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-3xl font-black text-violet-400 mb-2">{currentWord.word}</div>
                  <p className="text-white/70">{currentWord.meaning}</p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={learnNextWord}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold"
                  >
                    Learn Another Word
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={endSession}
                    className="py-3 px-4 bg-white/10 rounded-xl font-bold"
                  >
                    End Session
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
