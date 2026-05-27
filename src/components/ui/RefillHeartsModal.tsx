import { motion } from 'framer-motion';
import { Heart, Zap, RotateCcw, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  hearts: number;
  maxHearts: number;
  xpRefillCost: number;
  isRefilling: boolean;
  onRefillWithXP: () => Promise<boolean>;
  onRefillByPractice: () => Promise<boolean>;
  onClose: () => void;
}

export default function RefillHeartsModal({
  hearts,
  maxHearts,
  xpRefillCost,
  isRefilling,
  onRefillWithXP,
  onRefillByPractice,
  onClose,
}: Props) {
  const { profile } = useAuth();
  const canAffordXP = (profile?.xp ?? 0) >= xpRefillCost;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm bg-[#111827] border border-white/10 rounded-3xl p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Broken hearts visual */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-block"
          >
            <Heart size={48} className="text-red-500/40" />
          </motion.div>
          <h2 className="text-xl font-black mt-3">No Hearts Left!</h2>
          <p className="text-sm text-white/50 mt-1">
            You need hearts to continue practicing
          </p>
        </div>

        {/* Current hearts */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: maxHearts }, (_, i) => (
            <Heart
              key={i}
              size={20}
              className={i < hearts ? 'text-red-500 fill-red-500' : 'text-white/15'}
            />
          ))}
        </div>

        {/* Refill options */}
        <div className="space-y-3">
          {/* Option 1: Practice to earn */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onRefillByPractice}
            disabled={isRefilling}
            className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <RotateCcw size={20} className="text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-sm text-emerald-300">Practice to Earn</div>
                <div className="text-xs text-white/40">Complete an easy review to restore 1 heart</div>
              </div>
            </div>
          </motion.button>

          {/* Option 2: Refill with XP */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onRefillWithXP}
            disabled={isRefilling || !canAffordXP}
            className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left hover:bg-amber-500/15 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-sm text-amber-300">
                  Refill with XP
                  {!canAffordXP && <span className="text-red-400 ml-2">(Not enough XP)</span>}
                </div>
                <div className="text-xs text-white/40">
                  Spend {xpRefillCost} XP to restore all {maxHearts} hearts
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-white/30">
              <Zap size={12} className="text-amber-400" />
              Your XP: {profile?.xp ?? 0}
            </div>
          </motion.button>
        </div>

        {/* Wait hint */}
        <p className="text-center text-xs text-white/25 mt-4">
          Hearts also refill naturally over time
        </p>
      </motion.div>
    </motion.div>
  );
}
