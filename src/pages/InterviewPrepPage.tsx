import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, ArrowLeft, StopCircle, Volume2, VolumeX,
  Loader2, Clock, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  User, Building2, Briefcase, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { callGemini, analyzeGrammar, GeminiMessage } from '../lib/gemini';
import { speechManager } from '../lib/speech';
import { XP_PER_MESSAGE, XP_PER_SESSION } from '../lib/xp';
import { getSpeedColor, getSpeedBg } from '../lib/xp';
import AIAvatar from '../components/ui/AIAvatar';
import VoiceWave from '../components/ui/VoiceWave';
import Confetti from '../components/ui/Confetti';
import XPPopup from '../components/ui/XPPopup';
import InterviewReportModal from '../components/InterviewReportModal';
import type { ChatMessage, InterviewReport } from '../types';

interface Props {
  role: string;
  company: string;
  difficulty: string;
  companyId?: string;
  onExit: () => void;
}

interface LiveMetrics {
  grammarScore: number;
  confidenceScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  fillerWords: number;
  wordsPerMinute: number;
  tone: 'formal' | 'casual' | 'nervous' | 'confident';
}

export default function InterviewPrepPage({ role, company, difficulty, companyId, onExit }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart] = useState(Date.now());
  const [interimText, setInterimText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  // Live metrics
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    grammarScore: 85,
    confidenceScore: 70,
    fluencyScore: 75,
    vocabularyScore: 80,
    fillerWords: 2,
    wordsPerMinute: 140,
    tone: 'confident',
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionInitialized = useRef(false);

  const companyPrompts: Record<string, string> = {
    tcs_nqt: `You are a TCS NQT (National Qualifier Test) interviewer conducting a rigorous screening interview for a ${role} position at Tata Consultancy Services. TCS NQT evaluates analytical ability, communication skills, and technical fundamentals.

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Give BRIEF feedback after each response, then proceed
3. Cover exactly 8 questions across these areas:
   - Q1: Tell me about yourself (focus on academic background)
   - Q2: TCS values - integrity, innovation, collaboration - which resonates most and why?
   - Q3: Analytical reasoning puzzle or logical question
   - Q4: Technical question on programming fundamentals (data structures, algorithms, OOP)
   - Q5: Scenario: How would you handle a tight deadline on a critical project?
   - Q6: What do you know about TCS's recent initiatives or projects?
   - Q7: Explain a technical concept simply (communication test)
   - Q8: Why should TCS hire you?
4. Be formal, methodical, and evaluate precision in answers
5. After the last question, say: "That concludes our TCS NQT interview. Thank you for your time. I'll now generate your performance report."

Maintain the formal, structured style typical of TCS NQT assessments.`,

    google: `You are a Google interviewer conducting a behavioral and technical interview for a ${role} position. Google interviews are known for being rigorous, focusing on "Googleyness", structured problem-solving, and technical depth.

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Give BRIEF feedback after each response
3. Cover exactly 8 questions following Google's format:
   - Q1: Tell me about yourself (Google looks for passion and impact)
   - Q2: Describe a time you solved a complex problem (structured problem-solving)
   - Q3: Google values: "Focus on the user" - give an example of user-centric thinking
   - Q4: Technical/analytical question: "How would you estimate X?" (Fermi problem style)
   - Q5: Behavioral: Tell me about a time you disagreed with a colleague
   - Q6: Technical depth: System design or algorithm question appropriate for the role
   - Q7: "Why Google?" - what excites you about our mission?
   - Q8: What is your biggest failure and what did you learn?
4. Probe deeper on responses with follow-up (within same turn)
5. After the last question, say: "That concludes our Google interview. Thank you. I'll now generate your performance report."

Be intellectually curious, push for depth, and evaluate structured thinking.`,

    amazon: `You are an Amazon interviewer conducting a leadership interview for a ${role} position. Amazon interviews are built around their 16 Leadership Principles, with intense focus on "Customer Obsession", "Ownership", and "Deliver Results".

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Probe deeply - use STAR method follow-ups (Situation, Task, Action, Result)
3. Cover exactly 8 questions based on Amazon Leadership Principles:
   - Q1: Tell me about a time you went above and beyond for a customer (Customer Obsession)
   - Q2: Describe a situation where you took ownership of a problem outside your scope (Ownership)
   - Q3: Tell me about a time you had to make a decision with incomplete data (Bias for Action)
   - Q4: How have you disagreed with a decision and pushed back? (Have Backbone)
   - Q5: Describe your most innovative solution to a problem (Invent and Simplify)
   - Q6: Tell me about delivering results under impossible constraints (Deliver Results)
   - Q7: How do you earn trust from team members? (Earn Trust)
   - Q8: Why Amazon? How does our mission connect to your goals?
4. Always push for METRICS and SPECIFIC RESULTS in answers
5. After the last question, say: "That concludes our Amazon interview. Thank you. I'll now generate your performance report."

Be direct, data-focused, and insist on specific examples with measurable outcomes.`,

    microsoft: `You are a Microsoft interviewer conducting a cultural and technical interview for a ${role} position. Microsoft values a "Growth Mindset", diversity & inclusion, and "One Microsoft" collaboration.

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Give encouraging feedback that reinforces growth mindset
3. Cover exactly 8 questions:
   - Q1: Tell me about yourself and what drives your growth mindset
   - Q2: Describe a time you learned from failure (Growth Mindset)
   - Q3: How do you approach collaboration across teams? (One Microsoft)
   - Q4: Technical: How would you design or improve [relevant system]?
   - Q5: How have you made something more inclusive or accessible?
   - Q6: Tell me about a time you had to adapt quickly to change
   - Q7: Why Microsoft? How does our mission empower you?
   - Q8: What would you build if given unlimited resources at Microsoft?
4. Be warm but thorough - Microsoft values both technical depth AND cultural alignment
5. After the last question, say: "That concludes our Microsoft interview. Thank you. I'll now generate your performance report."

Balance empathy with rigor. Evaluate both technical capability and growth potential.`,

    meta: `You are a Meta interviewer conducting a behavioral and problem-solving interview for a ${role} position. Meta interviews focus on "Move Fast", "Be Bold", and "Focus on Impact".

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Give concise feedback and move forward quickly
3. Cover exactly 8 questions:
   - Q1: Tell me about yourself and what impact you want to make
   - Q2: Describe a time you moved fast and delivered results (Move Fast)
   - Q3: Tell me about a bold decision you made (Be Bold)
   - Q4: Analytical: How would you measure success for [product/feature]?
   - Q5: Tell me about building something that scaled (Focus on Impact)
   - Q6: How do you handle ambiguity and incomplete requirements?
   - Q7: Why Meta? What product or feature excites you most?
   - Q8: Tell me about a time you gave or received difficult feedback
4. Expect concise, impactful answers - Meta values efficiency
5. After the last question, say: "That concludes our Meta interview. Thank you. I'll now generate your performance report."

Be fast-paced, direct, and evaluate for impact-oriented thinking.`,

    corporate_hr: `You are a Corporate HR Director conducting a formal screening interview for a ${role} position at a Fortune 500 company. This is a high-stakes HR round evaluating cultural fit, professionalism, and communication.

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Maintain formal, corporate tone throughout
3. Cover exactly 8 questions:
   - Q1: Walk me through your professional background
   - Q2: What interests you about this organization?
   - Q3: Describe your ideal work environment and management style
   - Q4: How do you handle workplace conflicts professionally?
   - Q5: Where do you see yourself in 3-5 years?
   - Q6: Tell me about a challenging professional situation you navigated
   - Q7: What questions do you have about the role or company culture?
   - Q8: Why should we select you over other candidates?
4. Evaluate: professionalism, clarity of communication, cultural alignment, stability
5. After the last question, say: "That concludes our HR screening. Thank you for your time. I'll now generate your performance report."

Be polished, observant, and assess for executive presence and professional maturity.`,

    consulting: `You are a McKinsey-style case interviewer conducting a consulting interview for a ${role} position. This interview follows the structured case interview format used at top consulting firms.

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Present a business case scenario and guide the candidate through it
3. Cover exactly 8 questions in a case format:
   - Q1: Tell me about yourself (brief - 30 seconds max)
   - Q2: Present the business case: "Our client, a [industry] company, is facing [problem]..."
   - Q3: How would you structure your approach to this problem? (Framework)
   - Q4: Let's look at market sizing - estimate the market for [product]
   - Q5: Given these data points, what's your hypothesis?
   - Q6: How would you test this hypothesis? What data would you need?
   - Q7: What are the risks and how would you mitigate them?
   - Q8: Give me your final recommendation in 30 seconds
4. Push for STRUCTURED THINKING: "MECE" (Mutually Exclusive, Collectively Exhaustive)
5. After the last question, say: "That concludes our case interview. Thank you. I'll now generate your performance report."

Be analytical, challenging, and evaluate structured problem-solving above all.`,

    startup: `You are a startup founder conducting a fast-paced, culture-first interview for a ${role} position at a Series B startup. Startup interviews are informal but intense, evaluating adaptability, hustle, and culture fit.

CRITICAL RULES:
1. Ask ONE question at a time, wait for response
2. Be casual but probe deeply - startup interviews are conversational but revealing
3. Cover exactly 8 questions:
   - Q1: So, what gets you fired up? (Passion check)
   - Q2: Tell me about something you built from scratch
   - Q3: How do you handle chaos and changing priorities? (Adaptability)
   - Q4: What's the hardest you've ever worked on something you believed in? (Hustle)
   - Q5: If you could fix one thing about [our industry], what would it be? (Vision)
   - Q6: Tell me about a time you wore many hats simultaneously
   - Q7: Why this startup? What about our mission excites you?
   - Q8: What would you do in your first 30 days here? (Initiative)
4. Evaluate for: self-motivation, resourcefulness, comfort with ambiguity, genuine enthusiasm
5. After the last question, say: "That's it! Thanks for chatting with us. I'll now generate your performance report."

Be energetic, authentic, and assess for founder-mentality and scrappiness.`,
  };

  const defaultPrompt = `You are a professional HR interviewer conducting a job interview for a ${role} position${company ? ` at ${company}` : ''}.

CRITICAL RULES:
1. Ask ONE interview question at a time
2. Wait for the candidate's response
3. After each response, give BRIEF positive feedback (1 sentence) then ask the NEXT question
4. Ask exactly 6-8 questions total covering: background, experience, strengths/weaknesses, situational scenarios, and technical/role-specific questions
5. After the last question, end by saying: "That concludes our interview. Thank you for your time. I'll now generate your performance report."

Question sequence:
- Q1: Introduction/Background
- Q2: Experience relevant to role
- Q3: Strengths and achievements
- Q4: Weaknesses and growth areas
- Q5: Situational/scenario question
- Q6: Role-specific technical question
- Q7: Why this company/role?
- Q8: Final - Questions for the interviewer

Be professional, encouraging, and realistic.`;

  const systemPrompt = (companyId && companyPrompts[companyId]) || defaultPrompt;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sessionEnded) {
        setElapsedTime((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionEnded]);

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
        mode: 'interview',
        topic: role,
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

    const opening = `Hello! Welcome to your interview for the ${role} position${company ? ` at ${company}` : ''}. I'm excited to learn more about you today. Let's begin — could you tell me a little about yourself and your background?`;

    const openingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: opening,
      timestamp: new Date(),
    };
    setMessages([openingMsg]);
    setGeminiHistory([{ role: 'model', parts: [{ text: opening }] }]);
    setQuestionCount(1);

    if (voiceEnabled && speechManager.synthSupported) {
      setIsAISpeaking(true);
      speechManager.speak(opening, {
        rate: profile?.speech_speed ?? 0.95,
        onEnd: () => {
          setIsAISpeaking(false);
          startListening();
        },
      });
    }

    return () => {
      speechManager.destroy();
    };
  }, [user, role, company, difficulty, voiceEnabled, profile?.speech_speed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = useCallback(() => {
    if (isAISpeaking || isThinking || sessionEnded) return;
    setInterimText('');
    setError(null);

    speechManager.startListening({
      onResult: (text, isFinal) => {
        if (isFinal && text.trim()) {
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
      },
    });
  }, [isAISpeaking, isThinking, sessionEnded]);

  function stopListening() {
    speechManager.stopListening();
    setIsListening(false);
    setInterimText('');
  }

  async function handleSendMessage(content: string) {
    if (!content.trim() || isThinking || sessionEnded) return;

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

    // Analyze and update metrics
    const wordCount = content.split(' ').length;
    const newWpm = Math.round((wordCount / Math.max(elapsedTime, 1)) * 60);
    const fillerCount = (content.toLowerCase().match(/\b(um|uh|like|you know|actually|basically)\b/g) || []).length;

    // Grammar analysis
    let grammarResult = null;
    try {
      grammarResult = await analyzeGrammar(content);
    } catch (err) {
      console.error('Grammar check failed:', err);
    }

    if (grammarResult?.hasError) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? {
                ...m,
                grammarCorrection: {
                  original: content,
                  corrected: grammarResult.corrected,
                  explanation: grammarResult.explanation,
                },
              }
            : m
        )
      );
    }

    // Update live metrics based on response quality
    setLiveMetrics((prev) => ({
      grammarScore: grammarResult?.hasError ? Math.max(prev.grammarScore - 5, 50) : Math.min(prev.grammarScore + 2, 98),
      confidenceScore: content.length > 50 ? Math.min(prev.confidenceScore + 3, 95) : prev.confidenceScore,
      fluencyScore: fillerCount < 2 ? Math.min(prev.fluencyScore + 2, 95) : Math.max(prev.fluencyScore - 3, 40),
      vocabularyScore: wordCount > 20 ? Math.min(prev.vocabularyScore + 1, 95) : prev.vocabularyScore,
      fillerWords: prev.fillerWords + fillerCount,
      wordsPerMinute: Math.round((prev.wordsPerMinute + newWpm) / 2),
      tone: content.includes('!') || content.length > 100 ? 'confident' : fillerCount > 2 ? 'nervous' : prev.tone,
    }));

    // Save message and award XP
    if (user && sessionId) {
      supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content,
        has_grammar_error: grammarResult?.hasError ?? false,
        corrected_content: grammarResult?.corrected ?? '',
        grammar_explanation: grammarResult?.explanation ?? '',
      });

      setLastXpEarned(XP_PER_MESSAGE);
      setShowXpPopup(true);
      setTimeout(() => setShowXpPopup(false), 1500);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('xp, league_xp, total_messages')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        await supabase
          .from('profiles')
          .update({
            xp: profileData.xp + XP_PER_MESSAGE,
            league_xp: profileData.league_xp + XP_PER_MESSAGE,
            total_messages: (profileData.total_messages ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // Build history and get AI response
    const newHistory: GeminiMessage[] = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: content }] },
    ];

    let aiText: string;
    try {
      aiText = await callGemini(newHistory, systemPrompt);
    } catch (err) {
      console.error('Gemini call failed:', err);
      setIsThinking(false);
      setError('Failed to get AI response.');
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

    // Track questions
    if (!aiText.toLowerCase().includes('concludes') && !aiText.toLowerCase().includes('thank you for your time')) {
      setQuestionCount((prev) => prev + 1);
    }

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
          // Check for interview end
          if (
            aiText.toLowerCase().includes('concludes our interview') ||
            aiText.toLowerCase().includes('concludes the interview') ||
            aiText.toLowerCase().includes('thank you for your time')
          ) {
            endInterviewSession(updatedHistory);
          } else if (!sessionEnded) {
            startListening();
          }
        },
      });
    } else if (
      aiText.toLowerCase().includes('concludes our interview') ||
      aiText.toLowerCase().includes('thank you for your time')
    ) {
      endInterviewSession(updatedHistory);
    }
  }

  async function endInterviewSession(history: GeminiMessage[]) {
    if (!user || !sessionId) return;
    setSessionEnded(true);
    speechManager.stopSpeaking();
    speechManager.stopListening();

    const generatedReport = await generateFullReport(history);
    setReport(generatedReport);

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        duration_seconds: elapsedTime,
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

    // Update profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp, league_xp, total_sessions, streak, longest_streak, last_streak_date')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = profileData.streak ?? 0;
      if (profileData.last_streak_date === yesterday) newStreak += 1;
      else if (profileData.last_streak_date !== today) newStreak = 1;

      await supabase
        .from('profiles')
        .update({
          xp: profileData.xp + XP_PER_SESSION,
          league_xp: profileData.league_xp + XP_PER_SESSION,
          total_sessions: (profileData.total_sessions ?? 0) + 1,
          streak: newStreak,
          longest_streak: Math.max(newStreak, profileData.longest_streak ?? 0),
          last_streak_date: today,
          last_session_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    refreshProfile();
    setShowReport(true);
  }

  async function generateFullReport(history: GeminiMessage[]): Promise<InterviewReport> {
    // Use live metrics to generate report
    const conversation = history
      .filter((m) => m.role === 'user')
      .map((m) => m.parts[0].text)
      .join('\n');

    return {
      grammar_score: Math.min(liveMetrics.grammarScore + Math.random() * 5, 95),
      vocabulary_score: Math.min(liveMetrics.vocabularyScore + Math.random() * 5, 95),
      confidence_score: Math.min(liveMetrics.confidenceScore + Math.random() * 5, 95),
      communication_score: Math.min((liveMetrics.grammarScore + liveMetrics.confidenceScore) / 2 + Math.random() * 5, 95),
      speaking_score: Math.min(liveMetrics.fluencyScore + Math.random() * 5, 95),
      fluency_score: Math.min(liveMetrics.fluencyScore + Math.random() * 5, 95),
      overall_score: Math.round((liveMetrics.grammarScore + liveMetrics.confidenceScore + liveMetrics.fluencyScore + liveMetrics.vocabularyScore) / 4),
      feedback: `You demonstrated strong ${liveMetrics.tone === 'confident' ? 'confidence' : 'professionalism'} throughout the interview. Your responses averaged ${liveMetrics.wordsPerMinute} WPM with ${liveMetrics.fillerWords} filler words.`,
      strengths: [
        'Clear and structured responses',
        'Good use of professional vocabulary',
        'Maintained positive tone throughout',
      ],
      improvements: [
        'Could provide more specific examples',
        'Consider reducing filler words',
        'Add more detail to technical answers',
      ],
    };
  }

  async function handleEndSession() {
    if (!user || !sessionId || sessionEnded) return;
    setSessionEnded(true);
    speechManager.stopSpeaking();
    speechManager.stopListening();

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        duration_seconds: elapsedTime,
        message_count: messages.length,
        xp_earned: XP_PER_SESSION,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    onExit();
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 bg-[#090e1a] flex flex-col">
      <XPPopup xp={lastXpEarned} visible={showXpPopup} message="Great answer!" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0d1424] border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndSession}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-emerald-400" />
            <span className="font-bold">{role}</span>
            {company && (
              <>
                <span className="text-white/30">@</span>
                <span className="text-emerald-400">{company}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
            <Clock size={16} className="text-white/50" />
            <span className="font-mono font-bold text-lg">{formatTime(elapsedTime)}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
            <span className="text-xs text-white/50">Q</span>
            <span className="font-bold text-blue-400">{questionCount}</span>
            <span className="text-xs text-white/30">/8</span>
          </div>

          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50"
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            onClick={handleEndSession}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
          >
            <StopCircle size={18} />
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Interviewer & Conversation */}
        <div className="w-1/2 flex flex-col border-r border-white/10 bg-[#0a0f1a]">
          {/* Interviewer Profile Card */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <AIAvatar speaking={isAISpeaking} size={56} />
              <div className="flex-1">
                <div className="font-bold text-lg">Alex Morgan</div>
                <div className="text-sm text-white/50">Senior HR Interviewer</div>
                <div className="flex items-center gap-2 mt-1">
                  {company && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <Building2 size={12} />
                      {company}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${isListening ? 'text-blue-400' : isAISpeaking ? 'text-emerald-400' : 'text-white/40'}`}>
                  {isListening ? 'Listening...' : isAISpeaking ? 'Speaking...' : isThinking ? 'Analyzing...' : 'Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                      <User size={14} />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500/20 text-white rounded-br-sm'
                      : 'bg-white/5 rounded-bl-sm text-white/90'
                  }`}>
                    {msg.content}
                    {msg.grammarCorrection && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                        <span className="text-red-400 line-through mr-2">{msg.grammarCorrection.original}</span>
                        <span className="text-emerald-400">{msg.grammarCorrection.corrected}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <User size={14} />
                </div>
                <div className="px-4 py-3 bg-white/5 rounded-2xl rounded-bl-sm">
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

          {/* Listening indicator */}
          <div className="p-4 border-t border-white/10">
            {isListening ? (
              <div className="flex items-center justify-center gap-3 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <VoiceWave active={true} color="#3b82f6" />
                <span className="text-blue-400 text-sm">Listening...</span>
                {interimText && <span className="text-white/50 text-sm truncate max-w-[200px]">{interimText}</span>}
              </div>
            ) : (
              <button
                onClick={startListening}
                disabled={isAISpeaking || isThinking || sessionEnded}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Mic size={18} />
                Tap to Speak
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Live Metrics Dashboard */}
        <div className="w-1/2 flex flex-col bg-[#090e1a] p-6 overflow-y-auto">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-violet-400" />
            Live Performance Metrics
          </h2>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="p-4 bg-white/[0.03] border border-white/10 rounded-xl"
            >
              <div className="text-xs text-white/40 mb-2">Grammar</div>
              <div className={`text-3xl font-black ${getScoreColor(liveMetrics.grammarScore)}`}>
                {Math.round(liveMetrics.grammarScore)}%
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className={`h-full ${getScoreBg(liveMetrics.grammarScore)}`}
                  animate={{ width: `${liveMetrics.grammarScore}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
              className="p-4 bg-white/[0.03] border border-white/10 rounded-xl"
            >
              <div className="text-xs text-white/40 mb-2">Confidence</div>
              <div className={`text-3xl font-black ${getScoreColor(liveMetrics.confidenceScore)}`}>
                {Math.round(liveMetrics.confidenceScore)}%
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className={`h-full ${getScoreBg(liveMetrics.confidenceScore)}`}
                  animate={{ width: `${liveMetrics.confidenceScore}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
              className="p-4 bg-white/[0.03] border border-white/10 rounded-xl"
            >
              <div className="text-xs text-white/40 mb-2">Fluency</div>
              <div className={`text-3xl font-black ${getScoreColor(liveMetrics.fluencyScore)}`}>
                {Math.round(liveMetrics.fluencyScore)}%
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className={`h-full ${getScoreBg(liveMetrics.fluencyScore)}`}
                  animate={{ width: `${liveMetrics.fluencyScore}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
              className="p-4 bg-white/[0.03] border border-white/10 rounded-xl"
            >
              <div className="text-xs text-white/40 mb-2">Vocabulary</div>
              <div className={`text-3xl font-black ${getScoreColor(liveMetrics.vocabularyScore)}`}>
                {Math.round(liveMetrics.vocabularyScore)}%
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className={`h-full ${getScoreBg(liveMetrics.vocabularyScore)}`}
                  animate={{ width: `${liveMetrics.vocabularyScore}%` }}
                />
              </div>
            </motion.div>
          </div>

          {/* Speaking Stats */}
          <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl mb-6">
            <h3 className="text-sm font-semibold mb-3 text-white/60">Speaking Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{liveMetrics.wordsPerMinute}</div>
                <div className="text-xs text-white/40">Words/Min</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{liveMetrics.fillerWords}</div>
                <div className="text-xs text-white/40">Filler Words</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${liveMetrics.tone === 'confident' ? 'text-emerald-400' : liveMetrics.tone === 'nervous' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {liveMetrics.tone === 'confident' ? 'A' : liveMetrics.tone === 'nervous' ? 'C' : 'B'}
                </div>
                <div className="text-xs text-white/40 capitalize">{liveMetrics.tone}</div>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="50" cy="50" r="45"
                  stroke={getScoreBg(Math.round((liveMetrics.grammarScore + liveMetrics.confidenceScore + liveMetrics.fluencyScore) / 3)).replace('bg-', '')}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${((liveMetrics.grammarScore + liveMetrics.confidenceScore + liveMetrics.fluencyScore) / 3) * 2.83} 283`}
                  animate={{ strokeDashoffset: [283, 283 - ((liveMetrics.grammarScore + liveMetrics.confidenceScore + liveMetrics.fluencyScore) / 3) * 2.83] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-4xl font-black ${getScoreColor(Math.round((liveMetrics.grammarScore + liveMetrics.confidenceScore + liveMetrics.fluencyScore) / 3))}`}>
                  {Math.round((liveMetrics.grammarScore + liveMetrics.confidenceScore + liveMetrics.fluencyScore) / 3)}%
                </div>
                <div className="text-xs text-white/40">Overall</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm">
              {liveMetrics.confidenceScore >= 75 ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <TrendingUp size={16} className="text-amber-400" />
              )}
              <span className="text-white/60">
                {liveMetrics.confidenceScore >= 75 ? 'Strong interview performance!' : 'Keep building confidence'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReport && report && (
        <InterviewReportModal report={report} role={role} company={company} onClose={onExit} />
      )}
    </div>
  );
}
