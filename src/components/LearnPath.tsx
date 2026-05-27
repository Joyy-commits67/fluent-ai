import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles, Mic, Briefcase, Headphones, Gift, Shield,
  Star, Lock, CheckCircle2, RotateCcw, ChevronDown, Trophy, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getSections, getAllNodes, getNextNodeKey, getNodeByKey } from '../data/lessonData';
import type { LessonNode, LessonSection, LessonUnit } from '../data/lessonData';
import Confetti from './ui/Confetti';
import XPPopup from './ui/XPPopup';

interface UserProgress {
  current_section: number;
  current_unit: number;
  current_node: number;
  completed_steps: number;
  unlocked_nodes: string[];
  completed_nodes: string[];
  chests_claimed: string[];
  total_stars: number;
  node_stars: Record<string, number>;
}

interface Props {
  onStartLesson: (mode: string, isReview?: boolean) => void;
}

const MODE_ICONS: Record<string, typeof BookOpen> = {
  grammar: BookOpen,
  vocablab: Sparkles,
  speaking: Mic,
  interview: Briefcase,
  listening: Headphones,
  chest: Gift,
  checkpoint: Shield,
};

const MODE_COLORS: Record<string, string> = {
  grammar: 'from-rose-500 to-pink-500',
  vocablab: 'from-violet-500 to-purple-500',
  speaking: 'from-blue-500 to-cyan-500',
  interview: 'from-emerald-500 to-teal-500',
  listening: 'from-sky-500 to-blue-500',
  chest: 'from-amber-400 to-yellow-500',
  checkpoint: 'from-amber-500 to-orange-500',
};

const NODE_RING_COLORS: Record<string, string> = {
  grammar: 'stroke-rose-500',
  vocablab: 'stroke-violet-500',
  speaking: 'stroke-blue-500',
  interview: 'stroke-emerald-500',
  listening: 'stroke-sky-500',
  chest: 'stroke-amber-400',
  checkpoint: 'stroke-amber-500',
};

const emptyProgress = (): UserProgress => ({
  current_section: 1,
  current_unit: 1,
  current_node: 0,
  completed_steps: 0,
  unlocked_nodes: ['1-1-0'],
  completed_nodes: [],
  chests_claimed: [],
  total_stars: 0,
  node_stars: {},
});

export default function LearnPath({ onStartLesson }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress>(emptyProgress());
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpPopupAmount, setXpPopupAmount] = useState(0);
  const [xpPopupMsg, setXpPopupMsg] = useState('');
  const [reviewMenu, setReviewMenu] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number>(1);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('user_lessons')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProgress({
        current_section: data.current_section,
        current_unit: data.current_unit,
        current_node: data.current_node,
        completed_steps: data.completed_steps,
        unlocked_nodes: data.unlocked_nodes ?? ['1-1-0'],
        completed_nodes: data.completed_nodes ?? [],
        chests_claimed: data.chests_claimed ?? [],
        total_stars: data.total_stars ?? 0,
        node_stars: data.node_stars ?? {},
      });
      // Expand the section the user is currently on
      setExpandedSection(data.current_section);
    } else {
      // Create initial progress row
      const initial = emptyProgress();
      await supabase.from('user_lessons').insert({
        user_id: user.id,
        ...initial,
        unlocked_nodes: JSON.stringify(initial.unlocked_nodes),
        completed_nodes: JSON.stringify(initial.completed_nodes),
        chests_claimed: JSON.stringify(initial.chests_claimed),
        node_stars: JSON.stringify(initial.node_stars),
      });
      setProgress(initial);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const saveProgress = async (updated: UserProgress) => {
    if (!user) return;
    setProgress(updated);
    await supabase
      .from('user_lessons')
      .update({
        current_section: updated.current_section,
        current_unit: updated.current_unit,
        current_node: updated.current_node,
        completed_steps: updated.completed_steps,
        unlocked_nodes: JSON.stringify(updated.unlocked_nodes),
        completed_nodes: JSON.stringify(updated.completed_nodes),
        chests_claimed: JSON.stringify(updated.chests_claimed),
        total_stars: updated.total_stars,
        node_stars: JSON.stringify(updated.node_stars),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  };

  const isNodeUnlocked = (key: string) => progress.unlocked_nodes.includes(key);
  const isNodeCompleted = (key: string) => progress.completed_nodes.includes(key);
  const isChestClaimed = (key: string) => progress.chests_claimed.includes(key);
  const isCurrentNode = (node: LessonNode) =>
    node.section === progress.current_section &&
    node.unit === progress.current_unit &&
    node.index === progress.current_node;

  const handleNodeClick = (node: LessonNode) => {
    if (node.type === 'chest') {
      handleChestClaim(node);
      return;
    }

    if (!isNodeUnlocked(node.key)) return;

    if (isNodeCompleted(node.key)) {
      // Show review menu for completed nodes
      setReviewMenu(node.key);
      return;
    }

    // Start the lesson
    if (isCurrentNode(node)) {
      onStartLesson(node.mode);
    }
  };

  const handleChestClaim = async (node: LessonNode) => {
    if (isChestClaimed(node.key) || !isNodeUnlocked(node.key)) return;

    const updated = {
      ...progress,
      chests_claimed: [...progress.chests_claimed, node.key],
    };
    await saveProgress(updated);

    // Award bonus XP
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
            xp: profileData.xp + node.xpReward,
            league_xp: profileData.league_xp + node.xpReward,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
      refreshProfile();
    }

    setXpPopupAmount(node.xpReward);
    setXpPopupMsg('Chest Bonus!');
    setShowXpPopup(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(() => setShowXpPopup(false), 1500);
  };

  const handleStartReview = (node: LessonNode) => {
    setReviewMenu(null);
    onStartLesson(node.mode, true);
  };

  const handleCompleteNode = async (nodeKey: string, stars: number = 3) => {
    const node = getNodeByKey(nodeKey);
    if (!node) return;

    const updated = { ...progress };
    updated.completed_nodes = [...updated.completed_nodes, nodeKey];
    updated.node_stars = { ...updated.node_stars, [nodeKey]: stars };
    updated.total_stars = Object.values(updated.node_stars).reduce((a, b) => a + b, 0);
    updated.completed_steps += 1;

    // Unlock next node
    const nextKey = getNextNodeKey(nodeKey);
    if (nextKey && !updated.unlocked_nodes.includes(nextKey)) {
      updated.unlocked_nodes = [...updated.unlocked_nodes, nextKey];

      // Update current position
      const nextNode = getNodeByKey(nextKey);
      if (nextNode) {
        updated.current_section = nextNode.section;
        updated.current_unit = nextNode.unit;
        updated.current_node = nextNode.index;
      }
    }

    await saveProgress(updated);
  };

  // Expose handleCompleteNode so parent can call it
  useEffect(() => {
    // Store the function on window for parent to call
    (window as unknown as Record<string, unknown>).__completeLessonNode = handleCompleteNode;
  }, [progress]);

  const sections = getSections();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Confetti trigger={showConfetti} />
      <XPPopup xp={xpPopupAmount} visible={showXpPopup} message={xpPopupMsg} />

      {/* Review context menu */}
      <AnimatePresence>
        {reviewMenu && (() => {
          const node = getNodeByKey(reviewMenu);
          if (!node) return null;
          const stars = progress.node_stars[reviewMenu] ?? 0;
          return (
            <motion.div
              key="review-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setReviewMenu(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="w-full max-w-xs bg-[#111827] border border-white/10 rounded-3xl p-6 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-bold text-lg mb-1">{node.title}</h3>
                <p className="text-sm text-white/40 mb-3">
                  {node.section === 1 ? 'Basics' : node.section === 2 ? 'Everyday English' : node.section === 3 ? 'Intermediate' : 'Advanced'} - Unit {node.unit}
                </p>

                {/* Stars earned */}
                <div className="flex justify-center gap-1 mb-4">
                  {[1, 2, 3].map(s => (
                    <Star
                      key={s}
                      size={24}
                      className={s <= stars ? 'text-amber-400 fill-amber-400' : 'text-white/15'}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartReview(node)}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Review Lesson (+{node.reviewXp} XP)
                  </motion.button>

                  <button
                    onClick={() => setReviewMenu(null)}
                    className="w-full py-2.5 bg-white/5 rounded-xl text-sm text-white/50"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Path */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.section;
          const sectionHasCurrentNode = progress.current_section === section.section;
          const sectionCompleted = section.section < progress.current_section;

          return (
            <div key={section.section}>
              {/* Section header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? -1 : section.section)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                  sectionHasCurrentNode
                    ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20'
                    : sectionCompleted
                    ? 'bg-emerald-500/5 border border-emerald-500/15'
                    : 'bg-white/[0.03] border border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    sectionCompleted ? 'bg-emerald-500/20' :
                    sectionHasCurrentNode ? 'bg-blue-500/20' :
                    'bg-white/10'
                  }`}>
                    {sectionCompleted ? (
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                      <span className="font-black text-sm">{section.section}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">
                      Section {section.section}: {section.title}
                    </div>
                    <div className="text-xs text-white/30">
                      {sectionCompleted ? 'Completed' :
                       sectionHasCurrentNode ? `${progress.completed_nodes.filter(k => k.startsWith(`${section.section}-`)).length} lessons done` :
                       'Locked'}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded units and nodes */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 pl-4 space-y-4">
                      {section.units.map((unit) => (
                        <UnitPath
                          key={`${unit.section}-${unit.unit}`}
                          unit={unit}
                          progress={progress}
                          onNodeClick={handleNodeClick}
                          isCurrentUnit={
                            unit.section === progress.current_section &&
                            unit.unit === progress.current_unit
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Total progress summary */}
      <div className="mt-6 p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-white/60">Total Progress</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/40">{progress.total_stars} stars</span>
            <span className="text-white/40">{progress.completed_nodes.length} lessons</span>
          </div>
        </div>
        <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (progress.completed_nodes.length / getAllNodes().filter(n => n.type !== 'chest').length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Unit Path Sub-component ---
function UnitPath({
  unit,
  progress,
  onNodeClick,
  isCurrentUnit,
}: {
  unit: LessonUnit;
  progress: UserProgress;
  onNodeClick: (node: LessonNode) => void;
  isCurrentUnit: boolean;
}) {
  return (
    <div className="relative">
      {/* Unit title */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
          isCurrentUnit
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-white/5 text-white/40'
        }`}>
          Unit {unit.unit}
        </span>
        <span className="text-sm font-semibold text-white/70">{unit.title}</span>
      </div>

      {/* Node path - snake layout */}
      <div className="relative ml-4">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10" />

        <div className="space-y-3">
          {unit.nodes.map((node, i) => {
            const unlocked = progress.unlocked_nodes.includes(node.key);
            const completed = progress.completed_nodes.includes(node.key);
            const isCurrent =
              node.section === progress.current_section &&
              node.unit === progress.current_unit &&
              node.index === progress.current_node;
            const isChest = node.type === 'chest';
            const isCheckpoint = node.type === 'checkpoint';
            const chestClaimed = isChest && progress.chests_claimed.includes(node.key);
            const stars = progress.node_stars[node.key] ?? 0;

            // Alternate left/right for snake effect
            const isRight = i % 2 === 1;

            const IconComponent = MODE_ICONS[node.mode] || Star;
            const gradient = MODE_COLORS[node.mode] || 'from-blue-500 to-cyan-500';
            const ringColor = NODE_RING_COLORS[node.mode] || 'stroke-blue-500';

            return (
              <motion.div
                key={node.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative flex items-center ${isRight ? 'flex-row-reverse' : 'flex-row'} gap-4`}
              >
                {/* Node circle */}
                <button
                  onClick={() => onNodeClick(node)}
                  className={`relative z-10 shrink-0 ${
                    !unlocked ? 'cursor-not-allowed' :
                    isChest && chestClaimed ? 'cursor-default' :
                    'cursor-pointer'
                  }`}
                  disabled={!unlocked || (isChest && chestClaimed)}
                >
                  {/* Progress ring for current node */}
                  {isCurrent && !completed && !isChest && (
                    <motion.div
                      className="absolute inset-[-4px]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <svg className="w-[52px] h-[52px]" viewBox="0 0 52 52">
                        <circle
                          cx="26" cy="26" r="24"
                          fill="none"
                          className={ringColor}
                          strokeWidth="3"
                          strokeDasharray="150.8"
                          strokeDashoffset="50"
                          strokeLinecap="round"
                        />
                      </svg>
                    </motion.div>
                  )}

                  {/* Glow for current */}
                  {isCurrent && !completed && !isChest && (
                    <div className={`absolute inset-[-6px] bg-gradient-to-br ${gradient} rounded-full opacity-20 blur-md`} />
                  )}

                  {/* Main circle */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center relative ${
                    chestClaimed ? 'bg-white/10' :
                    completed ? `bg-gradient-to-br ${gradient}` :
                    isCurrent ? `bg-gradient-to-br ${gradient}` :
                    unlocked ? 'bg-white/10 border-2 border-white/20' :
                    'bg-white/5'
                  }`}>
                    {isChest ? (
                      chestClaimed ? (
                        <Gift size={20} className="text-white/20" />
                      ) : (
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Gift size={20} className="text-amber-400" />
                        </motion.div>
                      )
                    ) : isCheckpoint ? (
                      <Shield size={20} className={completed ? 'text-white' : unlocked ? 'text-amber-400' : 'text-white/20'} />
                    ) : completed ? (
                      <IconComponent size={20} className="text-white" />
                    ) : unlocked ? (
                      <IconComponent size={20} className={isCurrent ? 'text-white' : 'text-white/50'} />
                    ) : (
                      <Lock size={16} className="text-white/15" />
                    )}

                    {/* Star badges for completed */}
                    {completed && !isChest && stars > 0 && (
                      <div className="absolute -bottom-1 -right-1 flex">
                        {Array.from({ length: Math.min(stars, 3) }, (_, si) => (
                          <Star
                            key={si}
                            size={8}
                            className="text-amber-400 fill-amber-400"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>

                {/* Node info */}
                <div className={`flex-1 ${isRight ? 'text-right' : 'text-left'}`}>
                  <div className={`text-sm font-semibold ${
                    completed ? 'text-white/70' :
                    isCurrent ? 'text-white' :
                    unlocked ? 'text-white/50' :
                    'text-white/20'
                  }`}>
                    {node.title}
                  </div>
                  <div className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                    {completed && !isChest && (
                      <>
                        <Zap size={10} className="text-amber-400" />
                        <span>+{node.xpReward} XP</span>
                      </>
                    )}
                    {isChest && !chestClaimed && unlocked && (
                      <>
                        <Gift size={10} className="text-amber-400" />
                        <span>+{node.xpReward} XP bonus</span>
                      </>
                    )}
                    {isChest && chestClaimed && (
                      <span className="text-white/20">Claimed</span>
                    )}
                    {!unlocked && !isChest && (
                      <Lock size={10} className="text-white/15" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
