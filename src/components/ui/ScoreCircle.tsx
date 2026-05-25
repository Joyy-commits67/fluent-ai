import { motion } from 'framer-motion';

interface Props {
  score: number;
  label: string;
  size?: number;
}

export default function ScoreCircle({ score, label, size = 80 }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={6}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-xs text-white/60 text-center">{label}</span>
    </div>
  );
}
