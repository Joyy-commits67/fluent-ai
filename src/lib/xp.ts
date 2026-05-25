export const XP_PER_MESSAGE = 5;
export const XP_PER_SESSION = 25;
export const XP_PER_GRAMMAR_CORRECT = 3;
export const XP_PER_WORD_LEARNED = 10;
export const XP_PER_LESSON = 15;
export const XP_PER_CHALLENGE = 20;

export const LEAGUES = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'] as const;
export type League = typeof LEAGUES[number];

export const LEAGUE_ICONS: Record<League, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
  master: '🏆',
  legend: '👑',
};

export const LEVEL_NAMES: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Fluent',
};

export function xpForLevel(level: number): number {
  if (level <= 1) return 100;
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let total = 0;
  while (total + xpForLevel(level) <= xp) {
    total += xpForLevel(level);
    level++;
  }
  return level;
}

export function xpProgressInLevel(xp: number): { current: number; required: number; percent: number; totalXpForNext: number } {
  let level = 1;
  let threshold = 0;
  while (xp >= threshold + xpForLevel(level)) {
    threshold += xpForLevel(level);
    level++;
  }
  const current = xp - threshold;
  const required = xpForLevel(level);
  return {
    current,
    required,
    percent: Math.min(100, Math.round((current / required) * 100)),
    totalXpForNext: required - current,
  };
}

export function getLeague(index: number): League {
  return LEAGUES[Math.min(index, LEAGUES.length - 1)] as League;
}

export function leagueFromXp(xp: number): League {
  const avgXpPerWeek = xp / 4; // Rough estimate
  if (avgXpPerWeek >= 1000) return 'legend';
  if (avgXpPerWeek >= 700) return 'master';
  if (avgXpPerWeek >= 500) return 'diamond';
  if (avgXpPerWeek >= 350) return 'platinum';
  if (avgXpPerWeek >= 200) return 'gold';
  if (avgXpPerWeek >= 100) return 'silver';
  return 'bronze';
}

export function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    speaking: 'Speaking Coach',
    interview: 'Interview Prep',
    casual: 'Casual Chat',
    ielts: 'IELTS Practice',
    debate: 'Debate Mode',
    story: 'Storytelling',
    pronunciation: 'Pronunciation',
    vocab: 'Vocabulary Builder',
    confidence: 'Confidence Builder',
    rapid: 'Rapid Speaking',
    shadow: 'Shadowing',
    grammar_challenge: 'Grammar Challenge',
    listening: 'Listening Practice',
  };
  return labels[mode] ?? mode;
}

export function getModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    speaking: '🎤',
    interview: '💼',
    casual: '💬',
    ielts: '📝',
    debate: '⚖️',
    story: '📖',
    pronunciation: '🗣️',
    vocab: '📚',
    confidence: '💪',
    rapid: '⚡',
    shadow: '🎭',
    grammar_challenge: '✏️',
    listening: '👂',
  };
  return icons[mode] ?? '🎯';
}

export function getModeDescription(mode: string): string {
  const descriptions: Record<string, string> = {
    speaking: 'Practice natural English conversation with instant feedback',
    interview: 'Realistic job interview simulation with detailed scoring',
    casual: 'Friendly chat on any topic in a relaxed setting',
    ielts: 'Prepare for IELTS speaking test Parts 1-3',
    debate: 'Build argumentation skills through structured debates',
    story: 'Improve narrative and storytelling abilities',
    pronunciation: 'Work on specific sounds and intonation patterns',
    vocab: 'Learn and practice new vocabulary in context',
    confidence: 'Build speaking confidence through encouragement',
    rapid: 'Quick-fire speaking challenges to build fluency',
    shadow: 'Repeat after the AI to improve accent and rhythm',
    grammar_challenge: 'Test your grammar with interactive exercises',
    listening: 'Improve listening comprehension skills',
  };
  return descriptions[mode] ?? 'Practice English speaking';
}

export function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export function scoreBg(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function scoreGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

export function getMotivationalMessage(streak: number): string {
  if (streak === 0) return "Start your streak today!";
  if (streak < 3) return "You're building momentum!";
  if (streak < 7) return "You're on fire! Keep it going!";
  if (streak < 14) return "Incredible dedication!";
  if (streak < 30) return "Unstoppable! You're a champion!";
  return "Legendary streak! You're inspiring others!";
}

export function getStreakEmoji(streak: number): string {
  if (streak === 0) return '💤';
  if (streak < 3) return '🔥';
  if (streak < 7) return '🔥🔥';
  if (streak < 14) return '🔥🔥🔥';
  if (streak < 30) return '⚡';
  return '👑';
}

export function calculateGrammarAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

// Spaced repetition algorithm
export function calculateNextReview(
  timesReviewed: number,
  wasCorrect: boolean
): Date {
  const intervals = [1, 2, 4, 7, 14, 30, 60, 120]; // days
  const interval = intervals[Math.min(timesReviewed, intervals.length - 1)];

  const next = new Date();
  next.setDate(next.getDate() + (wasCorrect ? interval : 1));
  return next;
}
