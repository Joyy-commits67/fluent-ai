import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, AlertCircle, CheckCircle, Info, Trash2, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface UserError {
  id: string;
  incorrect_text: string;
  correct_text: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'pronunciation';
  created_at: string;
}

interface Props {
  onBack: () => void;
}

export default function ErrorNotebookPage({ onBack }: Props) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<UserError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'grammar' | 'vocabulary' | 'pronunciation'>('all');

  useEffect(() => {
    if (!user) return;

    const fetchErrors = async () => {
      const { data, error } = await supabase
        .from('user_errors')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notebook data:', error.message);
      } else if (data) {
        setErrors(data as UserError[]);
      }
      setLoading(false);
    };

    fetchErrors();
  }, [user]);

  const deleteErrorItem = async (id: string) => {
    setErrors((prev) => prev.filter((item) => item.id !== id));
    await supabase.from('user_errors').delete().eq('id', id);
  };

  const filteredErrors = errors.filter(
    (item) => filter === 'all' || item.category === filter
  );

  return (
    <div className="min-h-screen bg-[#090e1a] text-white pt-24 px-4 pb-12">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                📓 Personal Error Notebook
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Review and master mistakes captured during real-time speech training
              </p>
            </div>
          </div>
          <div className="bg-yellow-500/10 text-yellow-200 border border-yellow-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <GraduationCap size={14} />
            <span>{errors.length} Items Logged</span>
          </div>
        </div>

        {/* Categories Tab Bar Filter */}
        <div className="flex gap-2 border-b border-white/5 pb-3 overflow-x-auto">
          {(['all', 'grammar', 'vocabulary', 'pronunciation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                filter === tab
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/10'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notebook Display Core Container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Querying logged database rows...</p>
          </div>
        ) : filteredErrors.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3 text-lg">
              🎯
            </div>
            <h3 className="font-bold text-sm">Notebook is perfectly clear!</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
              Any speech, grammar, or vocabulary anomalies flagged by the AI parser will register right here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filteredErrors.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-white/15 transition-all"
                >
                  {/* Category Type Accent Badge Line */}
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className={`text-[10px] tracking-wider uppercase font-extrabold px-2 py-0.5 rounded-md ${
                      item.category === 'grammar' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      item.category === 'vocabulary' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {item.category}
                    </span>
                    <button
                      onClick={() => deleteErrorItem(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 absolute top-4 right-4"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Context Block Row Comparison */}
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 text-sm">
                      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-gray-300">
                        <span className="text-xs text-gray-500 block uppercase font-bold tracking-tight mb-0.5">Your attempt</span>
                        "{item.incorrect_text}"
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-sm">
                      <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-gray-100 font-medium">
                        <span className="text-xs text-gray-500 block uppercase font-bold tracking-tight mb-0.5">Correction</span>
                        "{item.correct_text}"
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-2.5 text-xs text-gray-400 bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]">
                      <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-300 block mb-0.5">Grammar Explanation</span>
                        {item.explanation}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
