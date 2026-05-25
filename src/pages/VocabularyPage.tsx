import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Trash2, Volume2, ChevronLeft, ChevronRight, RotateCcw, BookOpen, Filter, Sparkles, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateWordDefinition } from '../lib/gemini';
import { calculateNextReview } from '../lib/xp';
import type { VocabularyWord } from '../types';

type ViewMode = 'library' | 'flashcards' | 'quiz';

export default function VocabularyPage() {
  const { profile, refreshProfile } = useAuth();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'due'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [newWordInput, setNewWordInput] = useState('');
  const [addingWord, setAddingWord] = useState(false);

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [cardDirection, setCardDirection] = useState(0);

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

    // Check if already exists
    const existing = words.find((w) => w.word.toLowerCase() === wordText);
    if (existing) {
      setSelectedWord(existing);
      setNewWordInput('');
      setAddingWord(false);
      return;
    }

    // Get AI definition
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
      await supabase
        .from('profiles')
        .update({ total_words_learned: (profile.total_words_learned ?? 0) + 1 })
        .eq('id', profile.id);
      refreshProfile();
    }

    setNewWordInput('');
    setAddingWord(false);
  };

  const reviewCard = async (correct: boolean) => {
    if (!profile) return;
    const currentCard = dueCards[cardIndex];
    if (!currentCard) return;

    const newTimesReviewed = currentCard.times_reviewed + 1;
    const newCorrectCount = currentCard.correct_count + (correct ? 1 : 0);
    const nextReview = calculateNextReview(newTimesReviewed, correct);

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
          ? { ...w, times_reviewed: newTimesReviewed, correct_count: newCorrectCount, next_review_at: nextReview.toISOString() }
          : w
      )
    );

    setCardDirection(correct ? 1 : -1);
    setTimeout(() => {
      setCardIndex((prev) => Math.min(prev + 1, dueCards.length - 1));
      setShowingAnswer(false);
      setCardDirection(0);
    }, 300);
  };

  const resetCards = () => {
    setCardIndex(0);
    setShowingAnswer(false);
  };

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-black mb-2 flex items-center gap-3">
            <BookOpen size={28} className="text-violet-400" />
            My Vocabulary
          </h1>
          <p className="text-white/50">{words.length} words learned</p>
        </motion.div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white/[0.04] border border-white/10 rounded-xl text-center">
            <div className="text-2xl font-bold text-violet-400">{words.length}</div>
            <div className="text-xs text-white/40">Total Words</div>
          </div>
          <div className="p-4 bg-white/[0.04] border border-white/10 rounded-xl text-center">
            <div className="text-2xl font-bold text-amber-400">{dueCards.length}</div>
            <div className="text-xs text-white/40">Due for Review</div>
          </div>
          <div className="p-4 bg-white/[0.04] border border-white/10 rounded-xl text-center">
            <div className="text-2xl font-bold text-emerald-400">{words.filter((w) => w.is_favorite).length}</div>
            <div className="text-xs text-white/40">Favorites</div>
          </div>
        </div>

        {/* View mode toggle + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-white/5 rounded-xl p-1">
            {(['library', 'flashcards', 'quiz'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setViewMode(m);
                  resetCards();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
                  viewMode === m ? 'bg-violet-500/20 text-violet-300' : 'text-white/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {(['all', 'favorites', 'due'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                  filter === f ? 'bg-white/10 text-white' : 'text-white/40'
                }`}
              >
                {f === 'due' ? 'Due' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Add word input */}
        <div className="flex gap-3 mb-6">
          <input
            value={newWordInput}
            onChange={(e) => setNewWordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Add new word to learn..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addWord}
            disabled={addingWord || !newWordInput.trim()}
            className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {addingWord ? 'Adding...' : 'Add Word'}
          </motion.button>
        </div>

        {/* Library view */}
        {viewMode === 'library' && (
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
                      {Math.round((word.correct_count / Math.max(word.times_reviewed, 1)) * 100)}% correct
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Flashcards view */}
        {viewMode === 'flashcards' && (
          <div className="flex flex-col items-center">
            {dueCards.length === 0 ? (
              <div className="text-center py-16">
                <Sparkles size={48} className="mx-auto mb-4 text-violet-400/50" />
                <h3 className="font-bold text-lg mb-2">All caught up!</h3>
                <p className="text-white/50">No cards due for review right now.</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-white/50 mb-4">
                  Card {cardIndex + 1} of {dueCards.length}
                </div>

                <motion.div
                  key={cardIndex}
                  initial={{ x: cardDirection * 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="w-full max-w-md"
                >
                  <div
                    onClick={() => setShowingAnswer(!showingAnswer)}
                    className="min-h-[280px] bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 rounded-3xl p-8 cursor-pointer flex flex-col items-center justify-center text-center"
                  >
                    <div className="text-4xl font-black mb-4">{dueCards[cardIndex]?.word}</div>
                    {showingAnswer ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="text-lg text-white/70">{dueCards[cardIndex]?.meaning}</div>
                        {dueCards[cardIndex]?.example_sentence && (
                          <div className="text-sm text-violet-300 italic">"{dueCards[cardIndex]?.example_sentence}"</div>
                        )}
                        <div className="text-xs text-white/40">{dueCards[cardIndex]?.pronunciation}</div>
                      </motion.div>
                    ) : (
                      <div className="text-white/40">Tap to reveal</div>
                    )}
                  </div>
                </motion.div>

                {showingAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 mt-6"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => reviewCard(false)}
                      className="px-8 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold"
                    >
                      Again
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => reviewCard(true)}
                      className="px-8 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold"
                    >
                      Got it!
                    </motion.button>
                  </motion.div>
                )}
              </>
            )}
          </div>
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
