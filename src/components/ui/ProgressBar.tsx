import { motion } from 'framer-motion';
import { xpProgressInLevel, LEAGUE_ICONS } from '../../lib/xp';
import type { League } from '../../lib/xp';

interface Props {
  xp: number;
  level: number;
  league?: League;
  dailyGoal?: number;
  dailyXp?: number;
  compact?: boolean;
  showDaily?: boolean;
}

export default function ProgressBar({
  xp,
  level,
  league,
  dailyGoal,
  dailyXp,
  compact = false,
  showDaily = false,
}: Props) {
  const { current, required, percent } = xpProgressInLevel(xp);
  const dailyPercent = dailyGoal && dailyXp ? Math.min(100, (dailyXp / dailyGoal) * 100) : 0;
  const dailyComplete = dailyGoal && dailyXp && dailyXp >= dailyGoal;

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {league && (
          <span className="text-sm">{LEAGUE_ICONS[league]}</span>
        )}
        <span className="text-xs font-bold text-amber-400 whitespace-nowrap">Lv.{level}</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-[40px]">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-white/40 whitespace-nowrap">{current}/{required}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Level XP bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            {league && <span className="text-lg">{LEAGUE_ICONS[league]}</span>}
            <span className="font-bold text-amber-400">Level {level}</span>
          </div>
          <span className="text-white/50">{current} / {required} XP</span>
        </div>
        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          {percent >= 50 && (
            <motion.div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-transparent to-white/20 rounded-full"
              style={{ width: `${100 - percent}%` }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Daily goal progress */}
      {showDaily && dailyGoal && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className={`font-medium ${dailyComplete ? 'text-emerald-400' : 'text-white/60'}`}>
              {dailyComplete ? 'Daily goal complete!' : 'Daily goal'}
            </span>
            <span className="text-white/40">{dailyXp ?? 0} / {dailyGoal} XP</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                dailyComplete
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : 'bg-gradient-to-r from-blue-400 to-cyan-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${dailyPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
