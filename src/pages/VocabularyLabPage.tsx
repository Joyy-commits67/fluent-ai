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
import { addWordToLibrary, getLearnedItems } from '../lib/library'; // Connected global memory cache functions
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

// Passed excludedWords down into the generation runtime loop
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
    const cleaned = response.replace(/
