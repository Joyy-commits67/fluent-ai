const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Request queue to prevent API spam
let requestQueue: Array<() => Promise<void>> = [];
let isProcessing = false;
let requestCount = 0;
const REQUEST_LIMIT = 60;
const WINDOW_MS = 60000;

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  isProcessing = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    if (requestCount >= REQUEST_LIMIT) {
      await new Promise((r) => setTimeout(r, WINDOW_MS));
      requestCount = 0;
    }

    const task = requestQueue.shift();
    if (task) {
      requestCount++;
      await task();
    }
  }

  isProcessing = false;
}

function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
    processQueue();
  });
}

export async function callGemini(
  messages: GeminiMessage[],
  systemInstruction?: string,
  excludedItems: string[] = [] // 👈 Added optional array parameter for block-listed memory tracking
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return getFallbackResponse(messages);
  }

  return queueRequest(async () => {
    // Construct dynamic memory constraints
    let activeInstructions = systemInstruction || '';
    if (excludedItems.length > 0) {
      activeInstructions += `\n\nCRITICAL SYSTEM MEMORY RULE: Do NOT under any circumstances repeat, test, use, or bring up the following target words, vocabulary elements, or question scenarios, as the user has already mastered them: [${excludedItems.join(', ')}]. You MUST challenge the user with entirely fresh prompt configurations, alternative phrasing, and distinct contextual challenges.`;
    }

    const body: Record<string, unknown> = {
      contents: messages,
      generationConfig: {
        temperature: 0.85,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 600,
      },
    };

    if (activeInstructions) {
      body.systemInstruction = { parts: [{ text: activeInstructions }] };
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Gemini API error:', error);
        return getFallbackResponse(messages);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return getFallbackResponse(messages);
      return text;
    } catch (err) {
      console.error('Gemini call failed:', err);
      return getFallbackResponse(messages);
    }
  });
}

export async function analyzeGrammar(text: string): Promise<{
  hasError: boolean;
  corrected: string;
  explanation: string;
  errorType: string;
  suggestions?: string[];
} | null> {
  if (!GEMINI_API_KEY) return null;

  const prompt = `Analyze this English sentence for ALL types of errors: "${text}"

Check for:
- Grammar errors (verb tense, subject-verb agreement, articles, prepositions)
- Vocabulary errors (wrong word choice, collocation errors)
- Spelling errors
- Sentence structure issues
- Punctuation problems

Respond ONLY in this exact JSON format with NO extra text or markdown:
{"hasError":boolean,"corrected":"the corrected sentence","explanation":"brief explanation","errorType":"grammar|vocabulary|spelling|structure|none","suggestions":["alternative phrasing 1","alternative phrasing 2"]}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      hasError: parsed.hasError ?? false,
      corrected: parsed.corrected ?? text,
      explanation: parsed.explanation ?? '',
      errorType: parsed.errorType ?? 'none',
      suggestions: parsed.suggestions ?? [],
    };
  } catch {
    return null;
  }
}

export async function generateWordDefinition(word: string): Promise<{
  word: string;
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
} | null> {
  if (!GEMINI_API_KEY) return null;

  const prompt = `Define the English word "${word}" for ESL learners.

Respond ONLY in this exact JSON format:
{"word":"${word}","meaning":"clear definition","pronunciation":"phonetic spelling","partOfSpeech":"noun|verb|adj|adv|etc","example":"natural example sentence","synonyms":["syn1","syn2"],"antonyms":["ant1"]}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function generateInterviewReport(
  messages: GeminiMessage[],
  role: string,
  company: string
): Promise<{
  grammar_score: number;
  vocabulary_score: number;
  confidence_score: number;
  communication_score: number;
  speaking_score: number;
  fluency_score: number;
  overall_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}> {
  const conversation = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.parts[0].text)
    .join('\n');

  const prompt = `You are an expert interview coach. Analyze this candidate's responses for a ${role} position${company ? ` at ${company}` : ''}.

Candidate responses:
${conversation}

Score 0-100 on: grammar, vocabulary depth, confidence level, communication clarity, speaking naturalness, fluency.
Provide 2-3 strengths and 2-3 specific improvement areas.

Respond ONLY in exact JSON:
{"grammar_score":75,"vocabulary_score":80,"confidence_score":70,"communication_score":78,"speaking_score":72,"fluency_score":75,"overall_score":76,"feedback":"2-3 sentence summary","strengths":["s1","s2"],"improvements":["i1","i2"]}`;

  if (!GEMINI_API_KEY) {
    return getDefaultReport();
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return getDefaultReport();
  }
}

function getDefaultReport() {
  return {
    grammar_score: 75,
    vocabulary_score: 78,
    confidence_score: 72,
    communication_score: 76,
    speaking_score: 74,
    fluency_score: 73,
    overall_score: 75,
    feedback: 'Great effort! Keep practicing to improve your interview skills.',
    strengths: ['Good effort', 'Showed enthusiasm', 'Clear communication'],
    improvements: ['Practice more examples', 'Expand vocabulary', 'Build confidence'],
  };
}

function getFallbackResponse(messages: GeminiMessage[]): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const input = lastUserMsg?.parts[0]?.text?.toLowerCase() || '';

  if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
    return "Hello! I'm ready to help you practice. What would you like to talk about today?";
  }
  if (input.includes('?')) {
    return "That's a great question! What do you think about it? I'd love to hear your perspective.";
  }
  if (input.includes('thank')) {
    return "You're welcome! Is there anything else you'd like to practice or discuss?";
  }
  if (input.includes('name')) {
    return "I'm Aria, your AI English coach. It's wonderful to meet you! Tell me more about yourself.";
  }
  if (input.includes('work') || input.includes('job')) {
    return "That sounds interesting! What do you enjoy most about your work? What challenges do you face?";
  }
  if (input.includes('hobby') || input.includes('like')) {
    return "That's fascinating! How did you get interested in that? I'd love to hear more details.";
  }

  const responses = [
    "That's a thoughtful point! Could you elaborate on that?",
    "I understand. How does that make you feel about the topic?",
    "Interesting! What led you to think that way?",
    "Great example! Can you tell me more about your experience?",
    "I see what you mean. What would you say is the biggest challenge?",
    "That's a valuable perspective. Have you considered other approaches?",
    "Well said! How might you apply this in different situations?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function extractVocabularyWords(text: string): string[] {
  const words = text.match(/\b[a-zA-Z]{5,}\b/g) || [];
  const unique = [...new Set(words.map((w) => w.toLowerCase()))];
  return unique.filter((w) => !isCommonWord(w)).slice(0, 5);
}

function isCommonWord(word: string): boolean {
  const common = new Set([
    'about', 'after', 'again', 'because', 'before', 'being', 'between',
    'could', 'does', 'during', 'each', 'from', 'have', 'into', 'just',
    'more', 'most', 'other', 'over', 'should', 'some', 'such', 'than',
    'that', 'their', 'there', 'these', 'they', 'this', 'those', 'through',
    'under', 'until', 'very', 'what', 'when', 'where', 'which', 'while',
    'with', 'would', 'your', 'about', 'which', 'their', 'there', 'being',
  ]);
  return common.has(word);
}
