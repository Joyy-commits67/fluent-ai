export type NodeType = 'lesson' | 'chest' | 'checkpoint';

export interface LessonNode {
  key: string;            // "section-unit-index" e.g. "1-1-0"
  section: number;
  unit: number;
  index: number;
  type: NodeType;
  title: string;
  mode: string;           // grammar | vocablab | speaking | interview | listening
  xpReward: number;
  reviewXp: number;
}

export interface LessonUnit {
  section: number;
  unit: number;
  title: string;
  nodes: LessonNode[];
}

export interface LessonSection {
  section: number;
  title: string;
  units: LessonUnit[];
}

export interface ChestNode {
  key: string;
  section: number;
  unit: number;
  index: number;
  type: 'chest';
  xpBonus: number;
  title: string;
}

// --- Lesson content definition ---
const SECTIONS: LessonSection[] = [
  {
    section: 1,
    title: 'Basics',
    units: [
      {
        section: 1, unit: 1, title: 'Greet & Introduce Yourself',
        nodes: [
          { key: '1-1-0', section: 1, unit: 1, index: 0, type: 'lesson', title: 'Hello & Goodbye', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '1-1-1', section: 1, unit: 1, index: 1, type: 'lesson', title: 'Introduce Yourself', mode: 'speaking', xpReward: 20, reviewXp: 10 },
          { key: '1-1-2', section: 1, unit: 1, index: 2, type: 'lesson', title: 'Common Greetings', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '1-1-chest', section: 1, unit: 1, index: 3, type: 'chest', title: 'Bonus XP!', mode: 'chest', xpReward: 50, reviewXp: 0 },
        ],
      },
      {
        section: 1, unit: 2, title: 'Daily Routines',
        nodes: [
          { key: '1-2-0', section: 1, unit: 2, index: 0, type: 'lesson', title: 'Present Simple', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '1-2-1', section: 1, unit: 2, index: 1, type: 'lesson', title: 'Daily Routine Words', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '1-2-2', section: 1, unit: 2, index: 2, type: 'lesson', title: 'Talk About Your Day', mode: 'speaking', xpReward: 20, reviewXp: 10 },
        ],
      },
      {
        section: 1, unit: 3, title: 'Introduce Your Family',
        nodes: [
          { key: '1-3-0', section: 1, unit: 3, index: 0, type: 'lesson', title: 'Family Vocabulary', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '1-3-1', section: 1, unit: 3, index: 1, type: 'lesson', title: 'Possessive Pronouns', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '1-3-2', section: 1, unit: 3, index: 2, type: 'lesson', title: 'Describe Your Family', mode: 'speaking', xpReward: 20, reviewXp: 10 },
          { key: '1-3-chest', section: 1, unit: 3, index: 3, type: 'chest', title: 'Family Bonus!', mode: 'chest', xpReward: 75, reviewXp: 0 },
        ],
      },
    ],
  },
  {
    section: 2,
    title: 'Everyday English',
    units: [
      {
        section: 2, unit: 1, title: 'At the Restaurant',
        nodes: [
          { key: '2-1-0', section: 2, unit: 1, index: 0, type: 'lesson', title: 'Food Vocabulary', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '2-1-1', section: 2, unit: 1, index: 1, type: 'lesson', title: 'Countable & Uncountable', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '2-1-2', section: 2, unit: 1, index: 2, type: 'lesson', title: 'Order at a Restaurant', mode: 'speaking', xpReward: 20, reviewXp: 10 },
        ],
      },
      {
        section: 2, unit: 2, title: 'Shopping & Directions',
        nodes: [
          { key: '2-2-0', section: 2, unit: 2, index: 0, type: 'lesson', title: 'Prepositions of Place', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '2-2-1', section: 2, unit: 2, index: 1, type: 'lesson', title: 'Shopping Vocabulary', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '2-2-2', section: 2, unit: 2, index: 2, type: 'lesson', title: 'Ask for Directions', mode: 'listening', xpReward: 20, reviewXp: 10 },
          { key: '2-2-chest', section: 2, unit: 2, index: 3, type: 'chest', title: 'Explorer Bonus!', mode: 'chest', xpReward: 75, reviewXp: 0 },
        ],
      },
      {
        section: 2, unit: 3, title: 'Past Tense Basics',
        nodes: [
          { key: '2-3-0', section: 2, unit: 3, index: 0, type: 'lesson', title: 'Simple Past Regular', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '2-3-1', section: 2, unit: 3, index: 1, type: 'lesson', title: 'Simple Past Irregular', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '2-3-2', section: 2, unit: 3, index: 2, type: 'lesson', title: 'Tell a Past Story', mode: 'speaking', xpReward: 20, reviewXp: 10 },
          { key: '2-3-checkpoint', section: 2, unit: 3, index: 3, type: 'checkpoint', title: 'Section 2 Checkpoint', mode: 'grammar', xpReward: 30, reviewXp: 10 },
        ],
      },
    ],
  },
  {
    section: 3,
    title: 'Intermediate',
    units: [
      {
        section: 3, unit: 1, title: 'Work & Office',
        nodes: [
          { key: '3-1-0', section: 3, unit: 1, index: 0, type: 'lesson', title: 'Office Vocabulary', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '3-1-1', section: 3, unit: 1, index: 1, type: 'lesson', title: 'Present Continuous', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '3-1-2', section: 3, unit: 1, index: 2, type: 'lesson', title: 'Job Interview Basics', mode: 'interview', xpReward: 25, reviewXp: 10 },
          { key: '3-1-chest', section: 3, unit: 1, index: 3, type: 'chest', title: 'Career Bonus!', mode: 'chest', xpReward: 100, reviewXp: 0 },
        ],
      },
      {
        section: 3, unit: 2, title: 'Future Plans',
        nodes: [
          { key: '3-2-0', section: 3, unit: 2, index: 0, type: 'lesson', title: 'Going To & Will', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '3-2-1', section: 3, unit: 2, index: 1, type: 'lesson', title: 'Future Vocabulary', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '3-2-2', section: 3, unit: 2, index: 2, type: 'lesson', title: 'Discuss Future Plans', mode: 'speaking', xpReward: 20, reviewXp: 10 },
        ],
      },
      {
        section: 3, unit: 3, title: 'Comparisons & Opinions',
        nodes: [
          { key: '3-3-0', section: 3, unit: 3, index: 0, type: 'lesson', title: 'Comparative & Superlative', mode: 'grammar', xpReward: 15, reviewXp: 10 },
          { key: '3-3-1', section: 3, unit: 3, index: 1, type: 'lesson', title: 'Opinion Vocabulary', mode: 'vocablab', xpReward: 15, reviewXp: 10 },
          { key: '3-3-2', section: 3, unit: 3, index: 2, type: 'lesson', title: 'Express Your Opinion', mode: 'speaking', xpReward: 20, reviewXp: 10 },
          { key: '3-3-chest', section: 3, unit: 3, index: 3, type: 'chest', title: 'Thinker Bonus!', mode: 'chest', xpReward: 100, reviewXp: 0 },
        ],
      },
    ],
  },
  {
    section: 4,
    title: 'Advanced',
    units: [
      {
        section: 4, unit: 1, title: 'Conditionals',
        nodes: [
          { key: '4-1-0', section: 4, unit: 1, index: 0, type: 'lesson', title: 'Zero & First Conditional', mode: 'grammar', xpReward: 20, reviewXp: 10 },
          { key: '4-1-1', section: 4, unit: 1, index: 1, type: 'lesson', title: 'Second Conditional', mode: 'grammar', xpReward: 20, reviewXp: 10 },
          { key: '4-1-2', section: 4, unit: 1, index: 2, type: 'lesson', title: 'Hypothetical Situations', mode: 'speaking', xpReward: 25, reviewXp: 10 },
        ],
      },
      {
        section: 4, unit: 2, title: 'Professional Communication',
        nodes: [
          { key: '4-2-0', section: 4, unit: 2, index: 0, type: 'lesson', title: 'Passive Voice', mode: 'grammar', xpReward: 20, reviewXp: 10 },
          { key: '4-2-1', section: 4, unit: 2, index: 1, type: 'lesson', title: 'Reported Speech', mode: 'grammar', xpReward: 20, reviewXp: 10 },
          { key: '4-2-2', section: 4, unit: 2, index: 2, type: 'lesson', title: 'Corporate Interview', mode: 'interview', xpReward: 30, reviewXp: 10 },
          { key: '4-2-chest', section: 4, unit: 2, index: 3, type: 'chest', title: 'Professional Bonus!', mode: 'chest', xpReward: 125, reviewXp: 0 },
        ],
      },
      {
        section: 4, unit: 3, title: 'Complex Expression',
        nodes: [
          { key: '4-3-0', section: 4, unit: 3, index: 0, type: 'lesson', title: 'Relative Clauses', mode: 'grammar', xpReward: 20, reviewXp: 10 },
          { key: '4-3-1', section: 4, unit: 3, index: 1, type: 'lesson', title: 'Advanced Vocabulary', mode: 'vocablab', xpReward: 20, reviewXp: 10 },
          { key: '4-3-2', section: 4, unit: 3, index: 2, type: 'lesson', title: 'Debate & Argue', mode: 'speaking', xpReward: 25, reviewXp: 10 },
          { key: '4-3-checkpoint', section: 4, unit: 3, index: 3, type: 'checkpoint', title: 'Final Checkpoint', mode: 'grammar', xpReward: 50, reviewXp: 10 },
        ],
      },
    ],
  },
];

// Build a flat list of all nodes in order for sequential progression
export function getAllNodes(): LessonNode[] {
  const nodes: LessonNode[] = [];
  for (const section of SECTIONS) {
    for (const unit of section.units) {
      for (const node of unit.nodes) {
        nodes.push(node);
      }
    }
  }
  return nodes;
}

export function getSections(): LessonSection[] {
  return SECTIONS;
}

export function getNodeByKey(key: string): LessonNode | undefined {
  return getAllNodes().find(n => n.key === key);
}

export function getNextNodeKey(currentKey: string): string | null {
  const nodes = getAllNodes();
  const idx = nodes.findIndex(n => n.key === currentKey);
  if (idx < 0 || idx >= nodes.length - 1) return null;
  return nodes[idx + 1].key;
}

export function getUnitInfo(section: number, unit: number): LessonUnit | undefined {
  for (const s of SECTIONS) {
    if (s.section === section) {
      return s.units.find(u => u.unit === unit);
    }
  }
  return undefined;
}

export function getSectionInfo(section: number): LessonSection | undefined {
  return SECTIONS.find(s => s.section === section);
}

export function getModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    grammar: 'BookOpen',
    vocablab: 'Sparkles',
    speaking: 'Mic',
    interview: 'Briefcase',
    listening: 'Headphones',
    chest: 'Gift',
    checkpoint: 'Shield',
  };
  return icons[mode] || 'Star';
}
