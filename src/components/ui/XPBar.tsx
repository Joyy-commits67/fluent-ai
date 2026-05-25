import { motion } from 'framer-motion';
import { xpProgressInLevel } from '../../lib/xp';

interface Props {
  xp: number;
  level: number;
  compact?: boolean;
}

export default function XPBar({ xp, level, compact = false }: Props) {
  const { current, required, percent } = xpProgressInLevel(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold text-amber-400 whitespace-nowrap">Lv.{level}</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-white/50 whitespace-nowrap">{current}/{required}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/60">
        <span>Level {level}</span>
        <span>{current} / {required} XP</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
