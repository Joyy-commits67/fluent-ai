import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Search, Star, Trash2, Volume2, RotateCcw, BookOpen, Sparkles, X,
  XCircle, CheckCircle2, ArrowLeft, ArrowRight, Grip
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateWordDefinition } from '../lib/gemini';
import { calculateNextReview, XP_PER_WORD_LEARNED } from '../lib/xp';
import Confetti from '../components/ui/Confetti';
import type { VocabularyWord } from '../types';

type ViewMode = 'library' | 'flashcards' | 'quiz';

interface FlashcardData extends VocabularyWord {
  mastered: boolean;
}

export default function VocabularyPage() {
  const { profile, refreshProfile } = useAuth();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'due'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('flashcards');
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [newWordInput, setNewWordInput] = useState('');
  const [addingWord, setAddingWord] = useState(false);

  // 3D Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cardsLearned, setCardsLearned] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Drag state for swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const fetchWords = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('vocabulary_words')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setWords(data as VocabularyWord[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Initialize flashcards when switching to flashcard mode
  useEffect(() => {
    if (viewMode === 'flashcards' && words.length > 0) {
      const dueWords = words.filter((w) => new Date(w.next_review_at) <= new Date());
      const cards: FlashcardData[] = (dueWords.length > 0 ? dueWords : words.slice(0, 10)).map((w) => ({
        ...w,
        mastered: false,
      }));
      setFlashcards(cards);
      setCardIndex(0);
      setIsFlipped(false);
      setSessionComplete(false);
      setCardsLearned(0);
    }
  }, [viewMode, words]);

  const filteredWords = words.filter((w) => {
    const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning.toLowerCase().includes(search.toLowerCase());
    if (filter === 'favorites') return matchesSearch && w.is_favorite;
    if (filter === 'due') return matchesSearch && new Date(w.next_review_at) <= new Date();
    return matchesSearch;
  });

  const dueCards = words.filter((w) => new Date(w.next_review_at) <= new Date());

  const handleSpeakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const toggleFavorite = async (word: VocabularyWord) => {
    await supabase
      .from('vocabulary_words')
      .update({ is_favorite: !word.is_favorite })
      .eq('id', word.id);
    setWords((prev) =>
      prev.map((w) => (w.id === word.id ? { ...w, is_favorite: !w.is_favorite } : w))
    );
  };

  const deleteWord = async (id: string) => {
    await supabase.from('vocabulary_words').delete().eq('id', id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const addWord = async () => {
    if (!profile || !newWordInput.trim()) return;
    setAddingWord(true);
    const wordText = newWordInput.trim().toLowerCase();

    const existing = words.find((w) => w.word.toLowerCase() === wordText);
    if (existing) {
      setSelectedWord(existing);
      setNewWordInput('');
      setAddingWord(false);
      return;
    }

    const def = await generateWordDefinition(newWordInput);

    const newWord: Partial<VocabularyWord> = {
      user_id: profile.id,
      word: wordText,
      meaning: def?.meaning || 'Definition not found',
      pronunciation: def?.pronunciation || wordText,
      part_of_speech: def?.partOfSpeech || '',
      example_sentence: def?.example || '',
      synonyms: def?.synonyms || [],
      antonyms: def?.antonyms || [],
      difficulty: 'intermediate',
      learned_at: new Date().toISOString(),
      next_review_at: calculateNextReview(0, true).toISOString(),
    };

    const { data } = await supabase
      .from('vocabulary_words')
      .insert(newWord)
      .select()
      .maybeSingle();

    if (data) {
      setWords((prev) => [data as VocabularyWord, ...prev]);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('xp, league_xp, total_words_learned')
        .eq('id', profile.id)
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
          .eq('id', profile.id);
      }
      refreshProfile();
    }

    setNewWordInput('');
    setAddingWord(false);
  };

  // 3D Flashcard handlers
  const flipCard = () => setIsFlipped((v) => !v);

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentCard = flashcards[cardIndex];
    if (!currentCard) return;

    const isCorrect = direction === 'right';

    // Update spaced repetition
    const newTimesReviewed = currentCard.times_reviewed + 1;
    const newCorrectCount = currentCard.correct_count + (isCorrect ? 1 : 0);
    const nextReview = calculateNextReview(newTimesReviewed, isCorrect);

    await supabase
      .from('vocabulary_words')
      .update({
        times_reviewed: newTimesReviewed,
        correct_count: newCorrectCount,
        next_review_at: nextReview.toISOString(),
      })
      .eq('id', currentCard.id);

    setWords((prev) =>
      prev.map((w) =>
        w.id === currentCard.id
          ? {
              ...w,
              times_reviewed: newTimesReviewed,
              correct_count: newCorrectCount,
              next_review_at: nextReview.toISOString(),
            }
          : w
      )
    );

    if (isCorrect) {
      setCardsLearned((prev) => prev + 1);
    }

    // Move to next card
    if (cardIndex < flashcards.length - 1) {
      setCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setSessionComplete(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // Reset drag position
    x.set(0);
  };

  const restartSession = () => {
    setCardIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setCardsLearned(0);
  };

  const currentCard = flashcards[cardIndex];

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <Confetti trigger={showConfetti} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-black mb-2 flex items-center gap-3">
            <BookOpen size={28} className="text-violet-400" />
            Vocabulary Builder
          </h1>
          <p className="text-white/50">{words.length} words in your collection</p>
        </motion.div>

        {/* Mode tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex bg-white/5 rounded-xl p-1">
            {(['flashcards', 'library'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                  viewMode === m ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/50'
                }`}
              >
                {m === 'flashcards' ? '🎓 Flashcards' : m}
              </button>
            ))}
          </div>

          {/* Add word button */}
          <button
            onClick={() => document.getElementById('addWordInput')?.focus()}
            className="ml-auto px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Sparkles size={16} />
            Add Word
          </button>
        </div>

        {/* Add word input */}
        <div className="flex gap-3 mb-8">
          <input
            id="addWordInput"
            value={newWordInput}
            onChange={(e) => setNewWordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Type a word to learn..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addWord}
            disabled={addingWord || !newWordInput.trim()}
            className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {addingWord ? 'Adding...' : 'Add'}
          </motion.button>
        </div>

        {/* 3D Flashcard View */}
        {viewMode === 'flashcards' && (
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="w-full max-w-sm h-80 bg-white/[0.03] rounded-3xl animate-pulse" />
            ) : flashcards.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen size={48} className="mx-auto mb-4 text-violet-400/50" />
                <h3 className="font-bold text-lg mb-2">No words yet!</h3>
                <p className="text-white/50">Add some words above to start learning with flashcards.</p>
              </div>
            ) : sessionComplete ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="font-bold text-2xl mb-2">Session Complete!</h3>
                <p className="text-white/60 mb-6">
                  You reviewed {flashcards.length} cards and mastered {cardsLearned} words!
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={restartSession}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold"
                >
                  <RotateCcw size={16} className="inline mr-2" />
                  Start New Session
                </motion.button>
              </motion.div>
            ) : currentCard ? (
              <>
                {/* Progress bar */}
                <div className="w-full max-w-sm mb-6">
                  <div className="flex justify-between text-xs text-white/50 mb-2">
                    <span>Card {cardIndex + 1} of {flashcards.length}</span>
                    <span className="text-emerald-400">{cardsLearned} mastered</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((cardIndex) / flashcards.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* 3D Flashcard */}
                <div className="perspective-1000 w-full max-w-sm mb-6" style={{ perspective: '1000px' }}>
                  <motion.div
                    ref={cardRef}
                    className="relative w-full aspect-[3/4] cursor-pointer preserve-3d"
                    style={{
                      rotateY: isFlipped ? 180 : 0,
                      transformStyle: 'preserve-3d',
                      transition: isFlipped ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      x,
                      rotate,
                      opacity,
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.7}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 100) {
                        handleSwipe('right');
                      } else if (info.offset.x < -100) {
                        handleSwipe('left');
                      }
                      x.set(0);
                    }}
                    onClick={flipCard}
                  >
                    {/* Front of card */}
                    <div
                      className="absolute inset-0 backface-hidden rounded-3xl p-8 flex flex-col items-center justify-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
                        border: '2px solid rgba(139, 92, 246, 0.3)',
                        boxShadow: '0 20px 60px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeakWord(currentCard.word);
                          }}
                          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                        >
                          <Volume2 size={20} className="text-violet-400" />
                        </button>
                      </div>

                      <div className="text-5xl font-black mb-4 text-white text-center">
                        {currentCard.word}
                      </div>

                      <div className="text-sm text-violet-300 px-3 py-1 bg-violet-500/20 rounded-full">
                        {currentCard.part_of_speech}
                      </div>

                      <div className="absolute bottom-6 text-white/40 text-xs flex items-center gap-2">
                        <Grip size={14} />
                        Drag or click to flip
                      </div>
                    </div>

                    {/* Back of card */}
                    <div
                      className="absolute inset-0 backface-hidden rounded-3xl p-8 flex flex-col"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.1) 100%)',
                        border: '2px solid rgba(16, 185, 129, 0.3)',
                        boxShadow: '0 20px 60px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex-1">
                        <div className="text-xs text-emerald-400 mb-1">Definition</div>
                        <div className="text-lg font-semibold mb-4">{currentCard.meaning}</div>

                        {currentCard.example_sentence && (
                          <>
                            <div className="text-xs text-white/40 mb-1">Example</div>
                            <div className="text-sm text-white/70 italic mb-4">"{currentCard.example_sentence}"</div>
                          </>
                        )}

                        {currentCard.synonyms.length > 0 && (
                          <>
                            <div className="text-xs text-white/40 mb-1">Synonyms</div>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {currentCard.synonyms.slice(0, 4).map((s) => (
                                <span key={s} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-white/40 flex items-center justify-center gap-2">
                        <Grip size={14} />
                        Swipe to continue
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Swipe buttons */}
                <div className="flex gap-6 items-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSwipe('left')}
                    className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center group hover:bg-red-500/30"
                  >
                    <XCircle size={28} className="text-red-400" />
                  </motion.button>

                  <div className="flex flex-col items-center gap-1 text-white/40 text-xs">
                    <ArrowLeft size={14} />
                    Review Again
                  </div>

                  <div className="w-16" />

                  <div className="flex flex-col items-center gap-1 text-white/40 text-xs">
                    Mastered
                    <ArrowRight size={14} />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSwipe('right')}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center group hover:bg-emerald-500/30"
                  >
                    <CheckCircle2 size={28} className="text-emerald-400" />
                  </motion.button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Library View */}
        {viewMode === 'library' && (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search words..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="flex bg-white/5 rounded-xl p-1">
                {(['all', 'favorites', 'due'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                      filter === f ? 'bg-white/10 text-white' : 'text-white/40'
                    }`}
                  >
                    {f === 'due' ? `Due (${dueCards.length})` : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Word cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 bg-white/[0.03] rounded-xl animate-pulse" />
                ))
              ) : filteredWords.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No words yet. Add your first word above!</p>
                </div>
              ) : (
                filteredWords.map((word, i) => (
                  <motion.div
                    key={word.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedWord(word)}
                    className="p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-violet-500/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-lg">{word.word}</div>
                        <div className="text-xs text-violet-400">{word.part_of_speech}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeakWord(word.word);
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg"
                        >
                          <Volume2 size={16} className="text-white/50" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(word);
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg"
                        >
                          <Star
                            size={16}
                            className={word.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-white/50'}
                          />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">{word.meaning}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-xs text-white/30">
                        Reviewed {word.times_reviewed}x
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        word.correct_count / Math.max(word.times_reviewed, 1) >= 0.8
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {Math.round((word.correct_count / Math.max(word.times_reviewed, 1)) * 100)}%
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {/* Word detail modal */}
        <AnimatePresence>
          {selectedWord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedWord(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0d1424] border border-white/15 rounded-3xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-black">{selectedWord.word}</h3>
                    <p className="text-violet-400 text-sm">{selectedWord.part_of_speech}</p>
                  </div>
                  <button onClick={() => setSelectedWord(null)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X size={18} className="text-white/50" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-white/40 mb-1">Pronunciation</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedWord.pronunciation}</span>
                      <button
                        onClick={() => handleSpeakWord(selectedWord.word)}
                        className="p-1.5 bg-violet-500/20 rounded-lg hover:bg-violet-500/30"
                      >
                        <Volume2 size={16} className="text-violet-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-white/40 mb-1">Definition</div>
                    <p className="text-white/70">{selectedWord.meaning}</p>
                  </div>

                  {selectedWord.example_sentence && (
                    <div>
                      <div className="text-xs text-white/40 mb-1">Example</div>
                      <p className="text-emerald-400/80 italic">"{selectedWord.example_sentence}"</p>
                    </div>
                  )}

                  {selectedWord.synonyms.length > 0 && (
                    <div>
                      <div className="text-xs text-white/40 mb-1">Synonyms</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedWord.synonyms.map((s) => (
                          <span key={s} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => toggleFavorite(selectedWord)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                        selectedWord.is_favorite
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      <Star size={16} fill={selectedWord.is_favorite ? 'currentColor' : 'none'} />
                      {selectedWord.is_favorite ? 'Favorited' : 'Favorite'}
                    </button>
                    <button
                      onClick={() => {
                        deleteWord(selectedWord.id);
                        setSelectedWord(null);
                      }}
                      className="py-2.5 px-4 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
