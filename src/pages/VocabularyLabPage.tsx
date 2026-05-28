import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Volume2, CheckCircle2, XCircle, ArrowLeft, RotateCcw,
  Sparkles, Trophy, Zap, Star, Lightbulb, Keyboard, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHearts } from '../hooks/useHearts';
import { supabase } from '../lib/supabase';
import { callGemini } from '../lib/gemini';
import { addWordToLibrary, getLearnedItems } from '../lib/library';
import Confetti from '../components/ui/Confetti';
import XPPopup from '../components/ui/XPPopup';
import HeartsBar from '../components/ui/HeartsBar';
import RefillHeartsModal from '../components/ui/RefillHeartsModal';
import { XP_PER_WORD_LEARNED } from '../lib/xp';

type ChallengeType = 'type-word' | 'pick-definition' | 'fill-blanks';

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

  try {
    const response = await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
    const cleaned = response.replace(/```json|
```/g, '').trim(); // 👈 FIXED: Unified the expression back onto a single line to kill the Vite parser crash
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.word || parsed.word.length < 4 || excludedWords.includes(parsed.word.toLowerCase().trim())) {
      throw new Error('Invalid or repeated word returned from engine');
    }
    return parsed;
  } catch (err) {
    console.error('Failed to generate dynamic word, routing variant options:', err);
    
    const backupPool: NewWordData[] = [
      { word: 'eloquent', meaning: 'Fluent or persuasive in speaking or writing', partOfSpeech: 'adjective', pronunciation: 'eh-luh-kwent', example: 'His graduation speech was incredibly eloquent.', synonyms: ['articulate', 'fluent'], difficulty: 'intermediate' },
      { word: 'resilient', meaning: 'Able to withstand or recover quickly from difficult conditions', partOfSpeech: 'adjective', pronunciation: 'rih-zil-yunt', example: 'The local businesses proved resilient during the storm.', synonyms: ['tough', 'strong'], difficulty: 'intermediate' },
      { word: 'pragmatic', meaning: 'Dealing with things sensibly and realistically based on practical conditions', partOfSpeech: 'adjective', pronunciation: 'prag-mat-ik', example: 'We need to take a pragmatic approach to solving this bug.', synonyms: ['practical', 'logical'], difficulty: 'advanced' },
      { word: 'ubiquitous', meaning: 'Present, appearing, or found everywhere', partOfSpeech: 'adjective', pronunciation: 'yoo-bik-wih-tus', example: 'Smartphones have become completely ubiquitous in modern life.', synonyms: ['omnipresent', 'pervasive'], difficulty: 'advanced' }
    ];

    const safeSelection = backupPool.find(b => !excludedWords.includes(b.word.toLowerCase().trim())) || backupPool[0];
    return safeSelection;
  }
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

export default function VocabularyLabPage({ onBack }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const {
    hearts, maxHearts, canPlay, showRefillModal, setShowRefillModal,
    loseHeart, refillWithXP, refillByPractice, isRefilling, xpRefillCost,
    isPremium,
  } = useHearts();
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
  const [wordsLearned, setWordsLearned] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [excludedWords, setExcludedWords] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      getLearnedItems(user.id, 'vocab').then((items) => {
        setExcludedWords(items.map(i => i.toLowerCase().trim()));
      });
    }
  }, [user]);

  const loadNewWord = useCallback(async (currentBlacklist: string[]) => {
    if (!user) return;
    setLoading(true);
    setPhase('learn');
    setChallengeIndex(0);
    setUserInput('');
    setSelectedOption(null);
    setIsCorrect(null);
    setShowHint(false);

    const userLevel = profile?.level || 1;
    const wordData = await generateNewWord(userLevel, currentBlacklist);
    setCurrentWord(wordData);

    const generatedChallenges = await generateChallenges(wordData);
    setChallenges(generatedChallenges);

    setLoading(false);
  }, [user, profile?.level]);

  useEffect(() => {
    if (user) {
      getLearnedItems(user.id, 'vocab').then((items) => {
        const cleanItems = items.map(i => i.toLowerCase().trim());
        setExcludedWords(cleanItems);
        loadNewWord(cleanItems);
      });
    }
  }, [user, loadNewWord]);

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
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
      await loseHeart();

      if (user && currentWord) {
        const userAnswerStr = currentChallenge.type === 'pick-definition' ? (selectedOption || '') : userInput.trim();

        const { data: existing } = await supabase
          .from('error_notebook')
          .select('id, times_wrong')
          .eq('user_id', user.id)
          .eq('word', currentWord.word)
          .eq('source', 'vocabulary')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('error_notebook')
            .update({
              times_wrong: existing.times_wrong + 1,
              last_wrong_at: new Date().toISOString(),
              user_answer: userAnswerStr,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('error_notebook').insert({
            user_id: user.id,
            source: 'vocabulary',
            question_type: currentChallenge.type,
            question_text: currentChallenge.instruction,
            correct_answer: currentChallenge.correctAnswer,
            user_answer: userAnswerStr,
            explanation: currentChallenge.hint || currentWord.meaning,
            word: currentWord.word,
            meaning: currentWord.meaning,
            times_wrong: 1,
          });
        }
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
    setWordsLearned((prev) => prev + 1);
    setXpEarned((prev) => prev + XP_PER_WORD_LEARNED);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setShowXpPopup(true);
    setTimeout(() => setShowXpPopup(false), 1500);

    if (user && currentWord) {
      const cleanTargetWord = currentWord.word.toLowerCase().trim();

      await addWordToLibrary(user.id, {
        wordOrPhrase: cleanTargetWord,
        contextSentence: currentWord.example,
        category: 'vocab'
      });

      setExcludedWords((prev) => [...prev, cleanTargetWord]);

      const { data: existing } = await supabase
        .from('vocabulary_words')
        .select('id')
        .eq('user_id', user.id)
        .eq('word', currentWord.word)
        .maybeSingle();

      if (!existing) {
        await supabase.from('vocabulary_words').insert({
          user_id: user.id,
          word: currentWord.word,
          meaning: currentWord.meaning,
          pronunciation: currentWord.pronunciation,
          part_of_speech: currentWord.partOfSpeech,
          example_sentence: currentWord.example,
          synonyms: currentWord.synonyms,
          antonyms: [],
          difficulty: currentWord.difficulty,
          learned_at: new Date().toISOString(),
          next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_favorite: false,
          times_reviewed: 1,
          correct_count: 1,
        });

        const { data: profileData } = await supabase
          .from('profiles')
          .select('xp, league_xp, total_words_learned')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          await supabase
            .from('profiles')
            .update({
              xp: profileData.xp + XP_PER_WORD_LEARNED,
              league_xp: profileData.league_xp + XP_PER_WORD_LEARNED,
              total_words_learned: (profileData.total_words_learned ?? 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }

        refreshProfile();
      }
    }
  };

  const learnNextWord = () => {
    loadNewWord([...excludedWords]);
  };

  const endSession = () => {
    setSessionComplete(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const currentChallenge = challenges[challengeIndex];

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-[#090e1a] pt-14 flex items-center justify-center">
        <Confetti trigger="{showConfetti}"/>
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
              <Zap className="mx-auto text-violet-400 mb-2" size="{24}"/>
              <div className="text-2xl font-bold text-violet-400">{xpEarned}</div>
              <div className="text-xs text-white/40">XP Earned</div>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <BookOpen className="mx-auto text-emerald-400 mb-2" size="{24}"/>
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
                loadNewWord([...excludedWords]);
              }}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold flex items-center gap-2"
            >
              <RotateCcw size="{18}"/>
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
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <Confetti trigger="{showConfetti}"/>
      <XPPopup xp="{XP_PER_WORD_LEARNED}" visible="{showXpPopup}" message="Word Mastered!"/>

      {showRefillModal && (
        <RefillHeartsModal hearts="{hearts}" maxHearts="{maxHearts}" xpRefillCost="{xpRefillCost}" isRefilling="{isRefilling}" onRefillWithXP="{refillWithXP}" onRefillByPractice="{refillByPractice}" onClose="{()"> setShowRefillModal(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size="{20}" className="text-white/50"/>
          </button>

          <div className="flex items-center gap-3">
            <Sparkles size="{20}" className="text-violet-400"/>
            <span className="font-bold">Vocabulary Lab</span>
          </div>

          <div className="flex items-center gap-4">
            <HeartsBar hearts="{hearts}" maxHearts="{maxHearts}" size="sm" isPremium="{isPremium}"/>
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-lg">
                <Star size="{14}" className="text-amber-400" fill="currentColor"/>
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
                      <Volume2 size="{20}" className="text-violet-400"/>
                    </button>
                  </div>

                  <p className="text-lg text-white/80 mb-4">{currentWord.meaning}</p>

                  <div className="p-4 bg-white/5 rounded-xl text-left mb-4">
                    <div className="text-xs text-white/40 mb-1">Example</div>
                    <p className="text-white/70 italic">"{currentWord.example}"</p>
                  </div>

                  {currentWord.synonyms.length > 0 && (
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
                  <Target size="{20}"/>
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
                  {currentChallenge.type === 'type-word' && <Keyboard size="{20}" className="text-violet-400"/>}
                  {currentChallenge.type === 'pick-definition' && <BookOpen size="{20}" className="text-violet-400"/>}
                  {currentChallenge.type === 'fill-blanks' && <Keyboard size="{20}" className="text-violet-400"/>}
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
                    <Lightbulb size="{16}" className="text-amber-400 inline mr-2"/>
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
                        <CheckCircle2 size="{20}" className="text-emerald-400"/>
                      ) : (
                        <XCircle size="{20}" className="text-red-400"/>
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
                          <Lightbulb size="{18}"/>
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
