import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
  original: string;
  corrected: string;
  explanation: string;
}

export default function GrammarCard({ original, corrected, explanation }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <AlertCircle size={14} className="text-amber-400 shrink-0" />
        <span className="text-xs text-amber-300 font-medium flex-1">Grammar suggestion</span>
        {open ? <ChevronUp size={14} className="text-amber-400" /> : <ChevronDown size={14} className="text-amber-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-red-400 line-through mt-0.5 flex-1">{original}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-emerald-300 flex-1">{corrected}</span>
            </div>
            {explanation && (
              <p className="text-xs text-white/50 border-t border-white/10 pt-2">{explanation}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
