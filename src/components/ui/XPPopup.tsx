import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  xp: number;
  message?: string;
  visible: boolean;
  onComplete?: () => void;
}

export default function XPPopup({ xp, message, visible, onComplete }: Props) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.5 }}
          transition={{ type: 'spring', damping: 12 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="flex flex-col items-center">
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, -5, 5, 0],
              }}
              transition={{ duration: 0.4 }}
              className="text-4xl font-black text-amber-400 drop-shadow-lg"
            >
              +{xp} XP
            </motion.div>
            {message && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-white/70 mt-1"
              >
                {message}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
