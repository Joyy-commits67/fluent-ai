import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface Props {
  hearts: number;
  maxHearts: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function HeartsBar({ hearts, maxHearts, size = 'md' }: Props) {
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 22;
  const gap = size === 'sm' ? 'gap-1' : 'gap-1.5';

  return (
    <div className={`flex items-center ${gap}`}>
      <AnimatePresence mode="popLayout">
        {Array.from({ length: maxHearts }, (_, i) => (
          <motion.div
            key={i}
            layout
            initial={false}
            animate={{
              scale: i < hearts ? 1 : 0.85,
              opacity: i < hearts ? 1 : 0.25,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Heart
              size={iconSize}
              className={i < hearts ? 'text-red-500 fill-red-500' : 'text-white/20'}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
