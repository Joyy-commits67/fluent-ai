import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface Props {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakFlame({ streak, size = 'md' }: Props) {
  const sizes = {
    sm: { icon: 16, text: 'text-xs', gap: 'gap-1' },
    md: { icon: 24, text: 'text-sm', gap: 'gap-1.5' },
    lg: { icon: 32, text: 'text-base', gap: 'gap-2' },
  };

  const s = sizes[size];
  const hasStreak = streak > 0;
  const isHot = streak >= 7;
  const isOnFire = streak >= 30;

  return (
    <div className={`flex items-center ${s.gap}`}>
      <motion.div
        animate={
          hasStreak
            ? {
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }
            : {}
        }
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatDelay: 1,
        }}
      >
        <Flame
          size={s.icon}
          className={`${
            isOnFire
              ? 'text-yellow-400'
              : isHot
              ? 'text-orange-400'
              : hasStreak
              ? 'text-amber-400'
              : 'text-gray-500'
          }`}
          fill={hasStreak ? 'currentColor' : 'none'}
        />
      </motion.div>
      <span
        className={`font-bold ${s.text} ${
          isOnFire
            ? 'text-yellow-400'
            : isHot
            ? 'text-orange-400'
            : hasStreak
            ? 'text-amber-400'
            : 'text-gray-500'
        }`}
      >
        {streak}
      </span>
    </div>
  );
}
