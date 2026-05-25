import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, ArrowLeft, StopCircle, Volume2, AlertTriangle,
  Clock, Award, CheckCircle2, Play, Pause, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { callGemini, GeminiMessage } from '../lib/gemini';
import { speechManager } from '../lib/speech';
import { XP_PER_SESSION } from '../lib/xp';
import AIAvatar from '../components/ui/AIAvatar';
import VoiceWave from '../components/ui/VoiceWave';
import Confetti from '../components/ui/Confetti';
import XPPopup from '../components/ui/XPPopup';
import type { ChatMessage, InterviewReport } from '../types';

type IELTSPart = 1 | 2 | 3;

interface IELTSPartData {
  number: IELTSPart;
  title: string;
  description: string;
  duration: number; // seconds
  instructions: string;
}

const IELTS_PARTS: Record<IELTSPart, IELTSPartData> = {
  1: {
    number: 1,
    title: 'Introduction & Interview',
    description: 'General questions about yourself, family, work, and interests',
    duration: 240, // 4-5 minutes
    instructions: 'Answer the examiner\'s questions about yourself. Speak naturally and give full answers.',
  },
  2: {
    number: 2,
    title: 'Individual Long Turn',
    description: 'Speak for 1-2 minutes on a given topic after 1 minute preparation',
    duration: 180, // 3-4 minutes including prep
    instructions: 'You will be given a topic card. Take 1 minute to prepare, then speak for 1-2 minutes.',
  },
  3: {
    number: 3,
    title: 'Two-way Discussion',
    description: 'Abstract discussion linked to Part 2 topic',
    duration: 300, // 4-5 minutes
    instructions: 'Discuss abstract ideas and give opinions on topics related to Part 2.',
  },
};

interface Props {
  onExit: () => void;
}

export default function IELTSPage({ onExit }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [currentPart, setCurrentPart] = useState<IELTSPart>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart] = useState(Date.now());
  const [interimText, setInterimText] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Part 2 specific
  const [preparationTime, setPreparationTime] = useState(60);
  const [isPreparing, setIsPreparing] = useState(false);
  const [cueCard, setCueCard] = useState<{topic: string; points: string[]} | null>(null);
  const [showCueCard, setShowCueCard] = useState(false);

  // Timers
  const [partTimeRemaining, setPartTimeRemaining] = useState(IELTS_PARTS[1].duration);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Completion
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);

  const partTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionInitialized = useRef(false);

  // System prompts for each part
  const getSystemPrompt = (part: IELTSPart) => {
    const prompts: Record<IELTSPart, string> = {
      1: `You are an IELTS Speaking Examiner conducting Part 1: Introduction & Interview.

RULES:
- Ask 3-4 questions about familiar topics (work/studies, hometown, hobbies, daily life)
- Be friendly but professional
- Ask follow-up questions naturally
- After 4-5 minutes, transition to Part 2 by saying: "Let's move on to Part 2. I'm going to give you a topic to talk about."

SAMPLE QUESTIONS:
- "Let's talk about your hometown. Where are you from?"
- "Do you work or are you a student?"
- "What do you enjoy doing in your free time?"
- "Tell me about your family."

Keep responses brief. Focus on asking questions.`,

      2: `You are an IELTS Speaking Examiner conducting Part 2: Individual Long Turn.

RULES:
- Provide a cue card topic (describe a person, place, object, event, or activity)
- The user has 1 minute to prepare
- User speaks for 1-2 minutes on the topic
- After their response, ask 1-2 follow-up questions then transition: "Let's move on to Part 3 where we'll discuss some more general questions related to this topic."

CUE CARD FORMAT:
"Describe [a person/place/event/activity] that..."
You should say:
- [point 1]
- [point 2]
- [point 3]
And explain why/how [aspect].

Generate relevant cue cards about: memorable experiences, important people, favorite places, future plans, hobbies, etc.`,

      3: `You are an IELTS Speaking Examiner conducting Part 3: Two-way Discussion.

RULES:
- Ask 4-5 abstract discussion questions related to Part 2 topic
- Questions should be more complex and require analysis/opinions
- Encourage detailed responses
- After 4-5 minutes, conclude: "That is the end of the speaking test. Thank you for your participation."

SAMPLE QUESTIONS (adapt to Part 2 topic):
- "In general, how has [topic] changed in recent years?"
- "What are the advantages and disadvantages of [topic]?"
- "Do you think [topic] will become more/less important in the future? Why?"
- "How does [topic] affect different generations?"

Be formal but engaging. Probe with follow-up questions.`,
    };
    return prompts[part];
  };

  // Timers
  useEffect(() => {
    if (!isPaused && !sessionEnded) {
      const interval = setInterval(() => {
        setTotalTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused, sessionEnded]);

  useEffect(() => {
    if (!isPaused && !isPreparing && !sessionEnded && partTimeRemaining > 0) {
      partTimerRef.current = setInterval(() => {
        setPartTimeRemaining((prev) => {
          if (prev <= 1) {
            // Move to next part
            if (currentPart < 3) {
              transitionToPart((currentPart + 1) as IELTSPart);
              return IELTS_PARTS[(currentPart + 1) as IELTSPart].duration;
            } else {
              endSession();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (partTimerRef.current) clearInterval(partTimerRef.current);
      };
    }
  }, [isPaused, isPreparing, sessionEnded, partTimeRemaining, currentPart]);

  // Part 2 preparation timer
  useEffect(() => {
    if (isPreparing && preparationTime > 0) {
      prepTimerRef.current = setInterval(() => {
        setPreparationTime((prev) => {
          if (prev <= 1) {
            setIsPreparing(false);
            // Start speaking prompt
            speakInstruction("Your preparation time is over. Please begin speaking about the topic now.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      };
    }
  }, [isPreparing, preparationTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize session
  useEffect(() => {
    if (!user || sessionInitialized.current) return;
    sessionInitialized.current = true;

    supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        mode: 'ielts',
        topic: 'IELTS Speaking Test',
        role: 'IELTS Examiner',
        company: '',
        difficulty: 'intermediate',
        status: 'active',
      })
      .select()
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSessionId(data.id);
      });

    // Start Part 1
    const opening = "Good morning/afternoon. My name is Alex. Can I have your full name, please? And what should I call you?";
    const openingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: opening,
      timestamp: new Date(),
    };
    setMessages([openingMsg]);
    setGeminiHistory([{ role: 'model', parts: [{ text: opening }] }]);

    // Speak opening
    setIsAISpeaking(true);
    speechManager.speak(opening, {
      rate: profile?.speech_speed ?? 0.9,
      onEnd: () => {
        setIsAISpeaking(false);
        startListening();
      },
    });

    return () => {
      speechManager.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakInstruction = (text: string, onEnd?: () => void) => {
    speechManager.speak(text, {
      rate: profile?.speech_speed ?? 0.9,
      onEnd: () => {
        if (onEnd) onEnd();
      },
    });
  };

  const startListening = useCallback(() => {
    if (isAISpeaking || isThinking || sessionEnded || isPreparing) return;
    setInterimText('');
    setError(null);

    speechManager.startListening({
      onResult: (text, isFinal) => {
        if (isFinal && text.trim()) {
          handleResponse(text);
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
      },
    });
  }, [isAISpeaking, isThinking, sessionEnded, isPreparing]);

  function stopListening() {
    speechManager.stopListening();
    setIsListening(false);
    setInterimText('');
  }

  async function handleResponse(content: string) {
    if (!content.trim() || isThinking || sessionEnded) return;

    speechManager.stopListening();
    setIsListening(false);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

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
    }

    // Get AI response
    const newHistory: GeminiMessage[] = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: content }] },
    ];

    let aiText: string;
    try {
      aiText = await callGemini(newHistory, getSystemPrompt(currentPart));
    } catch (err) {
      console.error('Gemini call failed:', err);
      setIsThinking(false);
      setError('Failed to get response.');
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

    // Check for part transitions
    if (aiText.toLowerCase().includes("let's move on to part 2") || aiText.toLowerCase().includes('move on to part 2')) {
      setGeminiHistory(updatedHistory);
      setTimeout(() => transitionToPart(2), 2000);
    } else if (aiText.toLowerCase().includes("let's move on to part 3") || aiText.toLowerCase().includes('move on to part 3')) {
      setGeminiHistory(updatedHistory);
      setTimeout(() => transitionToPart(3), 2000);
    } else if (aiText.toLowerCase().includes('end of the speaking test') || aiText.toLowerCase().includes('end of speaking test')) {
      endSession();
    } else {
      setGeminiHistory(updatedHistory);
      setIsAISpeaking(true);
      speechManager.speak(aiText, {
        rate: profile?.speech_speed ?? 0.9,
        onEnd: () => {
          setIsAISpeaking(false);
          // Check for cue card presentation (Part 2)
          if (aiText.toLowerCase().includes('cue card') || aiText.toLowerCase().includes('here is your topic')) {
            startPart2Preparation();
          } else if (!sessionEnded) {
            startListening();
          }
        },
      });
    }
  }

  function transitionToPart(part: IELTSPart) {
    setCurrentPart(part);
    setPartTimeRemaining(IELTS_PARTS[part].duration);
    setGeminiHistory([]); // Reset for new part context

    // Speak transition
    const transitionText = part === 2
      ? "Now let's move to Part 2. I'm going to give you a topic. You'll have one minute to prepare, then speak for one to two minutes."
      : part === 3
      ? "Now let's move to Part 3. I'll ask you some more general questions related to the topic from Part 2."
      : "";

    if (transitionText) {
      setIsAISpeaking(true);
      speechManager.speak(transitionText, {
        rate: profile?.speech_speed ?? 0.9,
        onEnd: () => {
          setIsAISpeaking(false);
          if (part === 2) {
            generateCueCard();
          } else {
            // Ask first Part 3 question
            askPartQuestion(part);
          }
        },
      });
    }
  }

  async function generateCueCard() {
    // Generate a cue card topic
    const prompt = `Generate an IELTS Part 2 cue card topic. Provide:
- A topic title (e.g., "Describe a memorable trip you have taken")
- Three bullet points for what to cover

Respond in JSON format:
{"topic": "Describe...", "points": ["point 1", "point 2", "point 3"]}`;

    try {
      const response = await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const card = JSON.parse(cleaned);
      setCueCard(card);
      setShowCueCard(true);
    } catch (err) {
      // Fallback cue card
      setCueCard({
        topic: 'Describe a memorable holiday you have had',
        points: ['Where you went', 'Who you went with', 'What you did during the holiday'],
      });
      setShowCueCard(true);
    }
  }

  function startPart2Preparation() {
    setIsPreparing(true);
    setPreparationTime(60);

    const instruction = "Here is your cue card. You have one minute to prepare. You may make notes if you wish.";
    setIsAISpeaking(true);
    speechManager.speak(instruction, {
      rate: profile?.speech_speed ?? 0.9,
      onEnd: () => {
        setIsAISpeaking(false);
        // Wait for preparation timer
      },
    });
  }

  async function askPartQuestion(part: IELTSPart) {
    const questionPrompt = part === 3
      ? "Ask the first Part 3 discussion question about the general topic from Part 2. Keep it to one sentence."
      : "Ask the next IELTS question naturally.";

    try {
      const question = await callGemini(
        [...geminiHistory, { role: 'user', parts: [{ text: questionPrompt }] }],
        getSystemPrompt(part)
      );

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setGeminiHistory((prev) => [...prev, { role: 'model', parts: [{ text: question }] }]);

      setIsAISpeaking(true);
      speechManager.speak(question, {
        rate: profile?.speech_speed ?? 0.9,
        onEnd: () => {
          setIsAISpeaking(false);
          startListening();
        },
      });
    } catch (err) {
      console.error('Failed to generate question:', err);
      startListening();
    }
  }

  async function endSession() {
    if (!user || !sessionId || sessionEnded) return;
    setSessionEnded(true);
    speechManager.stopSpeaking();
    speechManager.stopListening();

    // Generate report
    const mockReport: InterviewReport = {
      grammar_score: 78,
      vocabulary_score: 82,
      confidence_score: 75,
      communication_score: 80,
      speaking_score: 77,
      fluency_score: 79,
      overall_score: 78,
      feedback: 'Good performance across all three parts. Strong vocabulary usage and clear pronunciation.',
      strengths: ['Good vocabulary range', 'Clear pronunciation', 'Coherent responses'],
      improvements: ['More detailed examples in Part 2', 'Faster response time', 'More complex sentence structures'],
    };
    setReport(mockReport);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setShowReport(true);

    // Save session
    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        duration_seconds: totalTime,
        message_count: messages.length,
        xp_earned: XP_PER_SESSION,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Update profile with XP
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp, league_xp, total_sessions')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData) {
      await supabase
        .from('profiles')
        .update({
          xp: profileData.xp + XP_PER_SESSION,
          league_xp: profileData.league_xp + XP_PER_SESSION,
          total_sessions: (profileData.total_sessions ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    refreshProfile();
  }

  const handleExit = () => {
    speechManager.destroy();
    onExit();
  };

  const currentPartData = IELTS_PARTS[currentPart];

  return (
    <div className="fixed inset-0 bg-[#050810] flex flex-col">
      <Confetti trigger={showConfetti} />
      <XPPopup xp={XP_PER_SESSION} visible={showXpPopup} message="Test completed!" />

      {/* Header - IELTS Exam Style */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0a0f1a] border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleExit}
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Award size={20} className="text-amber-400" />
            <span className="font-bold">IELTS Speaking Test</span>
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-white/40" />
            <div className="flex flex-col items-end">
              <div className="font-mono font-bold text-xl">
                {formatTime(totalTime)}
              </div>
              <div className="text-xs text-white/40">Total</div>
            </div>
          </div>

          <button
            onClick={() => setIsPaused((p) => !p)}
            className={`p-2 rounded-lg ${isPaused ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/50'}`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>

          <button
            onClick={handleExit}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
          >
            <StopCircle size={18} />
          </button>
        </div>
      </div>

      {/* Part Navigation */}
      <div className="flex bg-[#080c15] border-b border-white/10">
        {([1, 2, 3] as IELTSPart[]).map((part) => (
          <button
            key={part}
            onClick={() => {
              if (part < currentPart) setCurrentPart(part);
            }}
            disabled={part > currentPart}
            className={`flex-1 py-4 px-6 text-left border-r border-white/10 last:border-r-0 transition-all ${
              part === currentPart
                ? 'bg-blue-500/10 border-b-2 border-b-blue-500'
                : part < currentPart
                ? 'bg-white/[0.02] text-white/50 cursor-pointer hover:bg-white/5'
                : 'text-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                part < currentPart
                  ? 'bg-emerald-500 text-white'
                  : part === currentPart
                  ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                  : 'bg-white/10 text-white/30'
              }`}>
                {part < currentPart ? <CheckCircle2 size={16} /> : part}
              </div>
              <div>
                <div className={`font-semibold text-sm ${part === currentPart ? 'text-white' : ''}`}>
                  Part {part}: {IELTS_PARTS[part].title.split(' ')[0]}
                </div>
                <div className="text-xs text-white/40">
                  {formatTime(IELTS_PARTS[part].duration)} min
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Current Part Info & Timer */}
        <div className="w-80 bg-[#080c15] border-r border-white/10 p-6 flex flex-col">
          {/* Part Info Card */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-blue-400">PART {currentPart}</span>
              <span className="text-xs text-white/40">{formatTime(partTimeRemaining)} remaining</span>
            </div>
            <div className="text-lg font-bold mb-2">{currentPartData.title}</div>
            <p className="text-sm text-white/60">{currentPartData.description}</p>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-white/[0.02] border border-white/10 rounded-xl">
            <div className="text-xs text-white/40 mb-2">INSTRUCTIONS</div>
            <p className="text-sm text-white/70">{currentPartData.instructions}</p>
          </div>

          {/* Part 2 Cue Card */}
          {currentPart === 2 && showCueCard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Award size={18} className="text-amber-400" />
                <span className="font-bold text-amber-400">CUE CARD</span>
              </div>
              <p className="font-semibold mb-3">{cueCard?.topic}</p>
              <p className="text-xs text-white/50 mb-2">You should say:</p>
              <ul className="space-y-1">
                {cueCard?.points.map((point, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    {point}
                  </li>
                ))}
              </ul>

              {/* Preparation Timer */}
              {isPreparing && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50">Preparation Time</span>
                    <span className={`font-mono font-bold ${preparationTime <= 10 ? 'text-red-400' : 'text-amber-400'}`}>
                      {formatTime(preparationTime)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500"
                      animate={{ width: `${(preparationTime / 60) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Speaking Status */}
          <div className="mt-auto p-4 bg-white/[0.02] border border-white/10 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <AIAvatar speaking={isAISpeaking} size={36} />
              <div>
                <div className="font-semibold">IELTS Examiner</div>
                <div className={`text-sm ${
                  isListening ? 'text-blue-400' :
                  isAISpeaking ? 'text-emerald-400' :
                  isThinking ? 'text-amber-400' :
                  isPreparing ? 'text-violet-400' : 'text-white/40'
                }`}>
                  {isListening ? 'Listening...' :
                   isAISpeaking ? 'Speaking...' :
                   isThinking ? 'Thinking...' :
                   isPreparing ? 'Prepare your answer' : 'Ready'}
                </div>
              </div>
            </div>

            {/* Mic Button */}
            {!isPreparing && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isListening ? stopListening : startListening}
                disabled={isAISpeaking || isThinking || sessionEnded}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  isListening
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-blue-500 text-white'
                } disabled:opacity-50`}
              >
                {isListening ? (
                  <>
                    <MicOff size={18} />
                    Stop Speaking
                  </>
                ) : (
                  <>
                    <Mic size={18} />
                    Speak Your Answer
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Right Side - Conversation History */}
        <div className="flex-1 flex flex-col bg-[#050810]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                      <Award size={16} />
                    </div>
                  )}
                  <div className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500/20 text-white'
                      : 'bg-white/5 text-white/90'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Award size={16} />
                </div>
                <div className="px-4 py-3 bg-white/5 rounded-xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Listening Wave */}
          {isListening && (
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-3 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <VoiceWave active={true} color="#3b82f6" />
                <span className="text-blue-400 text-sm">Listening... Speak your answer</span>
                {interimText && (
                  <span className="text-white/50 text-sm italic truncate max-w-[300px]">
                    "{interimText}"
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notice: Speech Only */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
              <Mic size={14} />
              This is a speech-only test. Use the microphone button to respond.
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReport && report && (
        <InterviewReportModal
          report={report}
          role="IELTS Candidate"
          company=""
          onClose={handleExit}
        />
      )}
    </div>
  );
}
