import { motion } from 'framer-motion';
import { Trophy, CheckCircle, TrendingUp, X } from 'lucide-react';
import ScoreCircle from './ui/ScoreCircle';
import type { InterviewReport } from '../types';

interface Props {
  report: InterviewReport;
  role: string;
  company: string;
  onClose: () => void;
}

export default function InterviewReportModal({ report, role, company, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-lg bg-[#0d1424] border border-white/15 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={22} className="text-amber-400" />
              <span className="font-black text-lg">Interview Report</span>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white rounded-lg">
              <X size={18} />
            </button>
          </div>
          <p className="text-white/60 text-sm">
            {role}{company ? ` at ${company}` : ''} • Session completed
          </p>
        </div>

        {/* Scores */}
        <div className="p-6">
          {/* Overall */}
          <div className="flex flex-col items-center mb-8">
            <div className="text-white/50 text-sm mb-3">Overall Score</div>
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className={`text-6xl font-black ${
                  report.overall_score >= 80 ? 'text-emerald-400' :
                  report.overall_score >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {report.overall_score}
              </motion.div>
              <div className="text-white/40 text-center text-sm">/100</div>
            </div>
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <ScoreCircle score={report.grammar_score} label="Grammar" />
            <ScoreCircle score={report.vocabulary_score} label="Vocabulary" />
            <ScoreCircle score={report.confidence_score} label="Confidence" />
            <ScoreCircle score={report.communication_score} label="Communication" />
          </div>

          {/* Feedback */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-5">
            <h3 className="font-bold text-sm mb-2 text-blue-300">Overall Feedback</h3>
            <p className="text-white/70 text-sm leading-relaxed">{report.feedback}</p>
          </div>

          {/* Strengths */}
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-emerald-400">
              <CheckCircle size={15} />
              Strengths
            </h3>
            <div className="space-y-2">
              {report.strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-2 text-sm text-white/70"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  {s}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-amber-400">
              <TrendingUp size={15} />
              Areas to Improve
            </h3>
            <div className="space-y-2">
              {report.improvements.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex items-start gap-2 text-sm text-white/70"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  {s}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-sm"
          >
            Back to Dashboard
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
