import { motion } from 'framer-motion';
import { Mic, Brain, Trophy, Star, Zap, MessageSquare, BookOpen, Target, ChevronRight, Users, Award } from 'lucide-react';
import FloatingGradient from '../components/ui/FloatingGradient';

interface Props {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Mic,
    color: 'from-blue-500 to-cyan-500',
    title: 'AI Speaking Coach',
    desc: 'Real-time conversations with an emotionally intelligent AI that corrects your grammar instantly.',
  },
  {
    icon: Brain,
    color: 'from-emerald-500 to-teal-500',
    title: 'Interview Simulation',
    desc: 'Realistic HR interviews for any role and company. Get scored on grammar, confidence & communication.',
  },
  {
    icon: Trophy,
    color: 'from-amber-500 to-orange-500',
    title: 'Gamified Progress',
    desc: 'Earn XP, maintain streaks, unlock achievements and level up your English skills every day.',
  },
  {
    icon: Zap,
    color: 'from-rose-500 to-pink-500',
    title: '10 Learning Modes',
    desc: 'IELTS prep, debate practice, storytelling, rapid speaking challenges and more.',
  },
  {
    icon: MessageSquare,
    color: 'from-violet-500 to-purple-500',
    title: 'Grammar Analysis',
    desc: 'AI detects every mistake and explains corrections clearly so you actually learn.',
  },
  {
    icon: BookOpen,
    color: 'from-sky-500 to-blue-500',
    title: 'Vocabulary Builder',
    desc: 'Expand your vocabulary through natural conversation and targeted exercises.',
  },
];

const stats = [
  { value: '10+', label: 'Learning Modes' },
  { value: '100%', label: 'Free Forever' },
  { value: 'AI', label: 'Powered Coach' },
  { value: '∞', label: 'Practice Sessions' },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer',
    avatar: 'SC',
    text: "I landed my dream job after practicing interviews here for 2 weeks. The AI feedback is incredibly detailed and helped me fix speaking habits I didn't even know I had.",
  },
  {
    name: 'Mohammed Al-Rashid',
    role: 'MBA Student',
    avatar: 'MA',
    text: "My IELTS score went from 6.5 to 8.0. The AI speaking coach feels like talking to a real tutor — patient, encouraging, and brutally honest about grammar.",
  },
  {
    name: 'Priya Sharma',
    role: 'Marketing Manager',
    avatar: 'PS',
    text: "The debate mode is amazing! I practiced arguing both sides of topics and now I can speak confidently in any meeting. Game-changer for non-native speakers.",
  },
];

const modes = [
  { icon: '💼', title: 'Interview Prep', badge: 'Popular' },
  { icon: '🎤', title: 'Speaking Coach', badge: null },
  { icon: '📝', title: 'IELTS Practice', badge: 'New' },
  { icon: '⚖️', title: 'Debate Mode', badge: null },
  { icon: '📖', title: 'Storytelling', badge: null },
  { icon: '⚡', title: 'Rapid Speaking', badge: 'Hot' },
  { icon: '🗣️', title: 'Pronunciation', badge: null },
  { icon: '📚', title: 'Vocabulary', badge: null },
];

export default function LandingPage({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen bg-[#090e1a] text-white relative">
      <FloatingGradient />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Mic size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg">FluentAI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#modes" className="hover:text-white transition-colors">Modes</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
        </div>
        <button
          onClick={onGetStarted}
          className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get Started Free
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-16 pb-24 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/15 border border-blue-500/30 rounded-full text-sm text-blue-300 mb-8">
            <Zap size={14} />
            <span>100% Free — No credit card required</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Speak English
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Like a Native
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            The world's most advanced free AI English coach. Practice real conversations,
            crush job interviews, and improve your grammar — all powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-lg font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
            >
              <Mic size={20} />
              Start Speaking Now
              <ChevronRight size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/15 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              <Brain size={20} />
              Practice Interview
            </motion.button>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 mt-16"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-sm text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">Everything you need to</h2>
          <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            master English
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 bg-white/[0.04] border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/[0.07] transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Modes */}
      <section id="modes" className="relative z-10 px-6 py-20 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              8 Powerful Learning Modes
            </h2>
            <p className="text-white/55 text-lg">Each mode is specifically designed for a different learning goal.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modes.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.04 }}
                onClick={onGetStarted}
                className="relative p-5 bg-white/[0.04] border border-white/10 rounded-2xl cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-center"
              >
                {m.badge && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 rounded-full text-xs font-bold">
                    {m.badge}
                  </div>
                )}
                <div className="text-3xl mb-2">{m.icon}</div>
                <div className="text-sm font-semibold text-white/80">{m.title}</div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl font-bold text-lg"
            >
              Try All Modes Free
            </motion.button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">Real people, real results</h2>
          <div className="flex items-center justify-center gap-2 text-amber-400">
            {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="currentColor" />)}
            <span className="text-white/60 text-sm ml-2">Loved by thousands of learners</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-white/[0.04] border border-white/10 rounded-2xl"
            >
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400" fill="currentColor" />)}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-white/50 text-xs">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 rounded-3xl"
        >
          <div className="flex justify-center gap-4 mb-6">
            <Users size={32} className="text-blue-400" />
            <Target size={32} className="text-cyan-400" />
            <Award size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Start your journey today
          </h2>
          <p className="text-white/60 mb-8 text-lg">
            Join thousands of learners who are speaking confidently and acing interviews.
            It's completely free — no subscription, no hidden costs.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-xl font-bold shadow-xl shadow-blue-500/25"
          >
            Get Started — It's Free
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/10 text-center text-white/40 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Mic size={12} className="text-white" />
          </div>
          <span className="font-bold text-white/60">FluentAI</span>
        </div>
        <p>Built with AI for the world's English learners. 100% free.</p>
      </footer>
    </div>
  );
}
