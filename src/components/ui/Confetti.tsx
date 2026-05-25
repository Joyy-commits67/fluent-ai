import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

export default function Confetti({ trigger }: { trigger: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [showing, setShowing] = useState(false);

  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    if (trigger && !showing) {
      setShowing(true);
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3,
        size: 6 + Math.random() * 6,
      }));
      setPieces(newPieces);

      setTimeout(() => {
        setPieces([]);
        setShowing(false);
      }, 3000);
    }
  }, [trigger, showing]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -20, x: `${p.x}vw`, rotate: 0, opacity: 1 }}
            animate={{
              y: '110vh',
              x: `${p.x + (Math.random() - 0.5) * 20}vw`,
              rotate: Math.random() * 720 - 360,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, delay: p.delay, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
