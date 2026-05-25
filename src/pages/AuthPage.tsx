import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FloatingGradient from '../components/ui/FloatingGradient';

interface Props {
  onBack: () => void;
}

export default function AuthPage({ onBack }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, displayName, username);
        if (error) setError(error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090e1a] flex items-center justify-center px-4 relative">
      <FloatingGradient />

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Mic size={20} className="text-white" />
            </div>
            <div>
              <div className="font-black text-xl">FluentAI</div>
              <div className="text-white/40 text-xs">AI English Coach</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-8">
            {(['signin', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === tab ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                {tab === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'signup' ? -20 : 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="What should we call you?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Username *</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="unique_username"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/25"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/25"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/25"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-white/40 text-xs mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
