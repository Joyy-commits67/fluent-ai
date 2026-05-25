import { motion } from 'framer-motion';

export default function FloatingGradient() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <motion.div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-20 w-80 h-80 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  );
}
