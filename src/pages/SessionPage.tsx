import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, ArrowLeft, StopCircle, Volume2, VolumeX,
  Loader2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { callGemini, analyzeGrammar, generateInterviewReport, GeminiMessage } from '../lib/gemini';
import { speechManager } from '../lib/speech';
import { useGamification } from '../hooks/useGamification';
import { getModeLabel, XP_PER_MESSAGE, XP_PER_SESSION } from '../lib/xp';
import AIAvatar from '../components/ui/AIAvatar';
import VoiceWave from '../components/ui/VoiceWave';
import TypingIndicator from '../components/ui/TypingIndicator';
import GrammarCard from '../components/ui/GrammarCard';
import InterviewReportModal from '../components/InterviewReportModal';
import XPPopup from '../components/ui/XPPopup';
import type { ChatMessage, SessionMode, InterviewReport } from '../types';

interface Props {
  mode: SessionMode;
  topic?: string;
  role?: string;
  company?: string;
  difficulty?: string;
  onExit: () => void;
}

function buildSystemPrompt(mode: SessionMode, role: string, company: string, difficulty: string): string {
  const difficultyGuide: Record<string, string> = {
    beginner: 'Use simple vocabulary and short sentences. Be very encouraging.',
    intermediate: 'Use natural conversational English. Offer gentle corrections.',
    advanced: 'Use sophisticated vocabulary. Challenge with complex questions.',
  };

  const prompts: Record<SessionMode, string> = {
    speaking: `You are Aria, an encouraging AI English speaking coach. ${difficultyGuide[difficulty] || ''} Have natural flowing conversations. Respond in 2-3 sentences. Ask follow-ups to keep talking. Be warm and supportive.`,

    interview: `You are a professional HR interviewer for a ${role} position${company ? ` at ${company}` : ''}. ${difficultyGuide[difficulty] || ''} Ask realistic interview questions one at a time. After each answer, provide brief feedback then ask the next question. After 6-8 questions, say "That concludes our interview. You can now view your performance report."`,

    casual: `You are Aria, a friendly AI conversation partner. ${difficultyGuide[difficulty] || ''} Have fun, witty conversations on any topic. Keep it light and engaging. React emotionally to what the user says.`,

    ielts: `You are an IELTS speaking examiner. Conduct a realistic IELTS speaking test. ${difficultyGuide[difficulty] || ''} Part 1: personal questions. Part 2: cue card topic. Part 3: abstract discussion. Use standard IELTS examiner language.`,

    debate: `You are a debate partner. Propose a topic, argue one side while the user argues the other. ${difficultyGuide[difficulty] || ''} Challenge their arguments respectfully. Present counter-arguments. Keep it engaging and educational.`,

    story: `You are a storytelling coach. ${difficultyGuide[difficulty] || ''} Help practice narrative skills. Start collaborative stories or ask user to narrate experiences. Give feedback on structure and vocabulary.`,

    pronunciation: `You are a pronunciation coach. ${difficultyGuide[difficulty] || ''} Give words/phrases to practice. Provide phonetic tips. Help with specific sounds. Celebrate improvements.`,

    vocab: `You are a vocabulary coach. ${difficultyGuide[difficulty] || ''} Introduce new words in context. Ask user to use them in sentences. Quiz on meanings. Make learning fun through storytelling.`,

    confidence: `You are a confidence-building coach. ${difficultyGuide[difficulty] || ''} Help overcome speaking anxiety through positive reinforcement. Use easy topics. Always celebrate attempts. Never criticize harshly.`,

    rapid: `You are running a rapid speaking challenge! Give a new topic every response. Keep energy HIGH. ${difficultyGuide[difficulty] || ''} React enthusiastically. Immediately give the next topic after their response.`,

    shadow: `You are a shadowing coach. Speak a phrase, then ask user to repeat it exactly. ${difficultyGuide[difficulty] || ''} Focus on rhythm, intonation, and pronunciation. Provide phrases to shadow.`,

    grammar_challenge: `You are a grammar drill instructor. ${difficultyGuide[difficulty] || ''} Give sentences with grammar errors for user to correct. Or provide fill-in-the-blank exercises. Explain rules after each answer.`,

    listening: `You are a listening comprehension coach. ${difficultyGuide[difficulty] || ''} Read short passages or describe scenarios. Ask comprehension questions. Help improve listening skills.`,
  };

  return prompts[mode] ?? prompts.speaking;
}

function getOpeningMessage(mode: SessionMode, role: string, company: string): string {
  const openings: Record<SessionMode, string> = {
    speaking: "Hi! I'm Aria, your AI English coach. I'm excited to practice with you! Let's start simple — what's on your mind today or what did you do recently?",
    interview: `Hello! I'm your interviewer today for the ${role} position${company ? ` at ${company}` : ''}. Let's begin. Could you tell me a little about yourself and your background?`,
    casual: "Hey there! I'm Aria, ready for a great chat. What's something interesting that happened to you recently?",
    ielts: "Good morning! Welcome to your IELTS speaking practice. I'll be your examiner today. Let's start with Part 1. Can you tell me about yourself — are you a student or do you work?",
    debate: "Welcome to debate mode! Today's motion: 'Social media does more harm than good.' I'll argue FOR this motion. Would you like to argue AGAINST it?",
    story: "Hello, storyteller! Let's practice narrative skills. Tell me about one of the most memorable moments in your life — any experience that really stands out to you.",
    pronunciation: "Hello! I'm your pronunciation coach. Let's work on making your English sound natural. Say this phrase slowly: 'The quick brown fox jumps over the lazy dog.'",
    vocab: "Hi! Ready for vocabulary building? I'll teach you some amazing new words. Our first word is 'serendipity' — it means a happy accident or pleasant surprise. Can you use it in a sentence?",
    confidence: "Welcome! I'm here to help you speak with confidence. There's no judgment here — only encouragement. Let's start gently: tell me one thing you're proud of about yourself.",
    rapid: "RAPID SPEAKING CHALLENGE! Here's the deal — I give you a topic, you speak about it for 30-60 seconds. Ready? GO! Your topic: Describe your favorite meal and why you love it. START SPEAKING!",
    shadow: "Welcome to shadowing practice! I'll say a phrase, then you repeat it exactly. Here's your first phrase: 'Practice makes perfect.' Repeat after me!",
    grammar_challenge: "Welcome to grammar drills! I'll give you sentences to correct. Here's the first one: Find and fix the error — 'She go to school yesterday.'",
    listening: "Hello! Let's practice listening comprehension. I'll read a short passage, then ask you questions about it. Ready to listen?",
  };
  return openings[mode] ?? openings.speaking;
}

export default function SessionPage({ mode, topic, role = '', company = '', difficulty = 'intermediate', onExit }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const { completeSession } = useGamification(user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(profile?.sound_enabled ?? true);
  const [autoListen, setAutoListen] = useState(profile?.auto_listen ?? true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart] = useState(Date.now());
  const [interimText, setInterimText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [lastXpMessage, setLastXpMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const systemPrompt = buildSystemPrompt(mode, role, company, difficulty);
  const sessionInitialized = useRef(false);

  // Initialize session
  useEffect(() => {
    if (!user || sessionInitialized.current) return;
    sessionInitialized.current = true;

    supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        mode,
        topic: topic || role || getModeLabel(mode),
        role,
        company,
        difficulty,
        status: 'active',
      })
      .select()
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSessionId(data.id);
      });

    const opening = getOpeningMessage(mode, role, company);
    const openingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: opening,
      timestamp: new Date(),
    };
    setMessages([openingMsg]);
    setGeminiHistory([{ role: 'model', parts: [{ text: opening }] }]);

    if (voiceEnabled && speechManager.synthSupported) {
      setIsAISpeaking(true);
      speechManager.speak(opening, {
        rate: profile?.speech_speed ?? 0.95,
        onEnd: () => {
          setIsAISpeaking(false);
          if (autoListen) startListening();
        },
      });
    }

    return () => {
      speechManager.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const startListening = useCallback(() => {
    if (isAISpeaking || isThinking || sessionEnded) return;
    setInterimText('');
    setError(null);

    speechManager.startListening({
      onResult: (text, isFinal) => {
        if (isFinal && text.trim()) {
          setInputText(text);
          handleSendMessage(text);
        }
      },
      onInterim: (text) => setInterimText(text),
      onStart: () => setIsListening(true),
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
      },
      onError: (err) => {
        setIsListening(false);
        setError(err);
        console.error('[Session] Speech error:', err);
      },
    });
  }, [isAISpeaking, isThinking, sessionEnded]);

  function stopListening() {
    speechManager.stopListening();
    setIsListening(false);
    setInterimText('');
  }

  async function handleSendMessage(text?: string) {
    const content = (text ?? inputText).trim();
    if (!content || isThinking || sessionEnded) return;

    setInputText('');
    speechManager.stopListening();
    setIsListening(false);
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Grammar check
    try {
      const grammarResult = await analyzeGrammar(content);
      if (grammarResult?.hasError && grammarResult.corrected !== content) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id
              ? {
                  ...m,
                  grammarCorrection: {
                    original: content,
                    corrected: grammarResult.corrected,
                    explanation: grammarResult.explanation,
                    errorType: grammarResult.errorType,
                  },
                }
              : m
          )
        );

        if (user && sessionId) {
          supabase.from('grammar_corrections').insert({
            user_id: user.id,
            session_id: sessionId,
            original: content,
            corrected: grammarResult.corrected,
            explanation: grammarResult.explanation,
            error_type: grammarResult.errorType || 'grammar',
          });
        }
      }
    } catch (err) {
      console.error('Grammar check failed:', err);
    }

    // Save user message
    if (user && sessionId) {
      supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content,
        has_grammar_error: false,
        corrected_content: '',
        grammar_explanation: '',
      });

      // Award XP
      setLastXpEarned(XP_PER_MESSAGE);
      setLastXpMessage('Great response!');
      setShowXpPopup(true);
      setTimeout(() => setShowXpPopup(false), 1500);

      await supabase.rpc('increment_messages', { p_user_id: user.id }).catch(() => {});
    }

    // Build history
    const newHistory: GeminiMessage[] = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: content }] },
    ];

    // Get AI response
    let aiText: string;
    try {
      aiText = await callGemini(newHistory, systemPrompt);
    } catch (err) {
      console.error('Gemini call failed:', err);
      setIsThinking(false);
      setError('Failed to get AI response. Please try again.');
      return;
    }

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: aiText,
      timestamp: new Date(),
    };

    const updatedHistory: GeminiMessage[] = [
      ...newHistory,
      { role: 'model', parts: [{ text: aiText }] },
    ];
    setGeminiHistory(updatedHistory);
    setMessages((prev) => [...prev, aiMsg]);
    setIsThinking(false);

    // Save AI message
    if (user && sessionId) {
      supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: aiText,
        has_grammar_error: false,
        corrected_content: '',
        grammar_explanation: '',
      });
    }

    // TTS
    if (voiceEnabled && speechManager.synthSupported) {
      setIsAISpeaking(true);
      speechManager.speak(aiText, {
        rate: profile?.speech_speed ?? 0.95,
        onEnd: () => {
          setIsAISpeaking(false);
          if (autoListen && !sessionEnded) startListening();
        },
      });
    }

    // Interview end detection
    if (
      mode === 'interview' &&
      (aiText.toLowerCase().includes('concludes our interview') ||
        aiText.toLowerCase().includes('concludes the interview') ||
        aiText.toLowerCase().includes('end of the interview') ||
        aiText.toLowerCase().includes('view your performance'))
    ) {
      await endInterviewSession(updatedHistory);
    }
  }

  async function endInterviewSession(history: GeminiMessage[]) {
    if (!user || !sessionId) return;
    setSessionEnded(true);
    speechManager.stopSpeaking();
    speechManager.stopListening();

    const generatedReport = await generateInterviewReport(history, role, company);
    setReport(generatedReport);

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        duration_seconds: Math.round((Date.now() - sessionStart) / 1000),
        message_count: messages.length,
        grammar_score: generatedReport.grammar_score,
        vocabulary_score: generatedReport.vocabulary_score,
        confidence_score: generatedReport.confidence_score,
        communication_score: generatedReport.communication_score,
        speaking_score: generatedReport.speaking_score,
        fluency_score: generatedReport.fluency_score,
        overall_score: generatedReport.overall_score,
        feedback: generatedReport.feedback,
        xp_earned: XP_PER_SESSION,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    await completeSession(sessionId, Math.round((Date.now() - sessionStart) / 1000));
    await refreshProfile();
    setShowReport(true);
  }

  async function handleEndSession() {
    if (!user || !sessionId || sessionEnded) return;
    setSessionEnded(true);
    speechManager.stopSpeaking();
    speechManager.stopListening();

    const duration = Math.round((Date.now() - sessionStart) / 1000);

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        duration_seconds: duration,
        message_count: messages.length,
        xp_earned: XP_PER_SESSION,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    await completeSession(sessionId, duration);
    await refreshProfile();

    setLastXpEarned(XP_PER_SESSION);
    setLastXpMessage('Session completed!');
    setShowXpPopup(true);
    setTimeout(() => onExit(), 1500);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#090e1a] flex flex-col">
      {/* XP popup animation */}
      <XPPopup xp={lastXpEarned} message={lastXpMessage} visible={showXpPopup} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#090e1a]/90 backdrop-blur-sm shrink-0">
        <button
          onClick={handleEndSession}
          className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <AIAvatar speaking={isAISpeaking} size={36} />
          <div>
            <div className="font-bold text-sm">{getModeLabel(mode)}</div>
            <div className="text-xs text-white/40">
              {isListening ? '🎤 Listening...' : isAISpeaking ? '🔊 Speaking...' : isThinking ? '💭 Thinking...' : 'AI Coach'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoListen((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              autoListen ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-white/40'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={handleEndSession}
            className="p-2 text-red-400/70 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <StopCircle size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' && <AIAvatar speaking={false} size={32} />}

              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/30 rounded-br-sm text-white'
                      : 'bg-white/5 border border-white/10 rounded-bl-sm text-white/90'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.grammarCorrection && (
                  <GrammarCard
                    original={msg.grammarCorrection.original}
                    corrected={msg.grammarCorrection.corrected}
                    explanation={msg.grammarCorrection.explanation}
                  />
                )}

                <span className="text-xs text-white/25 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isThinking && (
          <div className="flex gap-3">
            <AIAvatar speaking={false} size={32} />
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm"
        >
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">
            <ArrowLeft size={14} />
          </button>
        </motion.div>
      )}

      {/* Input bar */}
      <div className="px-4 py-4 border-t border-white/10 bg-[#090e1a]/90 backdrop-blur-sm shrink-0">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl"
          >
            <VoiceWave active={true} color="#3b82f6" />
            <span className="text-blue-300 text-sm">Listening...</span>
            {interimText && <span className="text-white/50 text-xs truncate max-w-[200px]">{interimText}</span>}
          </motion.div>
        )}

        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {speechManager.supported && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isListening ? stopListening : startListening}
              disabled={isAISpeaking || isThinking || sessionEnded}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                isListening
                  ? 'bg-red-500 shadow-lg shadow-red-500/30'
                  : 'bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30'
              } disabled:opacity-40`}
            >
              {isListening ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-blue-400" />}
            </motion.button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Type or use the microphone...'}
            disabled={isThinking || sessionEnded}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/25 disabled:opacity-50"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isThinking || sessionEnded}
            className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-blue-400 transition-colors"
          >
            {isThinking ? <Loader2 size={18} className="text-white animate-spin" /> : <Send size={18} className="text-white" />}
          </motion.button>
        </div>

        <p className="text-center text-white/20 text-xs mt-2">Powered by Gemini AI</p>
      </div>

      {/* Interview Report Modal */}
      {showReport && report && (
        <InterviewReportModal report={report} role={role} company={company} onClose={onExit} />
      )}
    </div>
  );
}
