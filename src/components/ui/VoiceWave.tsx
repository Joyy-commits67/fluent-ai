import { motion } from 'framer-motion';

interface Props {
  active: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export default function VoiceWave({ active, size = 'md', color = '#3b82f6' }: Props) {
  const bars = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;
  const heights = [0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.45];
  const barWidth = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  const maxH = size === 'sm' ? 16 : size === 'lg' ? 40 : 28;

  return (
    <div className="flex items-center gap-0.5" style={{ height: maxH }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            width: barWidth,
            backgroundColor: color,
            borderRadius: 999,
            originY: 1,
          }}
          animate={
            active
              ? {
                  height: [maxH * 0.2, maxH * heights[i % heights.length], maxH * 0.3, maxH * heights[(i + 2) % heights.length], maxH * 0.2],
                }
              : { height: maxH * 0.15 }
          }
          transition={
            active
              ? {
                  duration: 0.8 + i * 0.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.08,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
