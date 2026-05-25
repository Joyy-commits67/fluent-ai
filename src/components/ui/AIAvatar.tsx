import { motion } from 'framer-motion';

interface Props {
  speaking: boolean;
  size?: number;
}

export default function AIAvatar({ speaking, size = 56 }: Props) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer pulse ring */}
      {speaking && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400"
          animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Second ring */}
      {speaking && (
        <motion.div
          className="absolute inset-0 rounded-full border border-blue-300"
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
      )}
      {/* Avatar circle */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg"
        animate={speaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, repeat: speaking ? Infinity : 0 }}
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="11" r="5" fill="white" opacity="0.9" />
          <path
            d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </motion.div>
    </div>
  );
}
