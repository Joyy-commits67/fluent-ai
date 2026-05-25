import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white/5 rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-blue-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
