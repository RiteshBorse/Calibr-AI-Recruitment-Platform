// Allow chunkActions.ts to use audioUrl on Question for chunk storage
declare module "@/utils/interview" {
  interface Question {
    audioUrl?: string;
  }
}
import { getGeminiResponse } from "@/ai-engine/ai-call/aiCall";
import { IDEAL_ANSWER_PROMPT, EVALUATE_ANSWER_PROMPT } from "@/ai-engine/prompts/technicalInterview";

export interface Question {
  id: string;
  question: string;
  category: "technical" | "non-technical" | "followup";
  difficulty?: "medium" | "hard";
  answer?: string;
  parentQuestion?: string;
  topicId?: string;
  source_urls?: string[];
}

export interface Queues {
  queue0?: {
    use_video_processing: boolean;
    violation_count: number;
    mood_state: string;
    logs: any[];
  };
  queue1: Question[];
  queue2: Question[];
  queue3: Question[];
}

/**
 * Generates a unique ID for questions
 */
export function generateId(): string {
  return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Generates a unique topic ID for tracking related questions
 */
export function generateTopicId(question: string): string {
  return 'topic_' + question.substring(0, 20).replace(/\s+/g, '_').toLowerCase() + '_' + Math.random().toString(36).slice(2, 6);
}

/**
 * Ensures all questions in an array have unique IDs and topic IDs
 */
export function ensureIds(questions: Question[]): Question[] {
  return questions.map(q => ({
    ...q,
    id: q.id || generateId(),
    topicId: q.topicId || (q.category === 'technical' ? generateTopicId(q.question) : undefined)
  }));
}

/**
 * Randomizes questions while preserving intro/outro positions
 * Ensures non-technical questions are <= 20% of total
 */
export function randomizeQueue1(questions: Question[]): Question[] {
  if (questions.length === 0) return [];

  const technical = questions.filter(q => q.category === 'technical');
  const nonTechnical = questions.filter(q => q.category === 'non-technical');

  // Ensure intro and outro
  let intro = nonTechnical.find(q => 
    q.question.toLowerCase().includes('tell me about yourself') ||
    q.question.toLowerCase().includes('introduce yourself')
  );
  
  let outro = nonTechnical.find(q => 
    q.question.toLowerCase().includes('any questions for') ||
    q.question.toLowerCase().includes('anything else')
  );

  // Create intro/outro if not present
  if (!intro && nonTechnical.length > 0) {
    intro = nonTechnical[0];
  } else if (!intro) {
    intro = {
      id: generateId(),
      question: "Tell me about yourself and your background.",
      category: 'non-technical',
      answer: ''
    };
  }

  if (!outro && nonTechnical.length > 1) {
    outro = nonTechnical[nonTechnical.length - 1];
  } else if (!outro) {
    outro = {
      id: generateId(),
      question: "Do you have any questions for us, or is there anything else you'd like to add?",
      category: 'non-technical',
      answer: ''
    };
  }

  // Remove intro/outro from pools
  const remainingNonTech = nonTechnical.filter(q => q.id !== intro?.id && q.id !== outro?.id);

  // Calculate 20% limit for non-technical (excluding intro/outro)
  const totalMiddle = technical.length + remainingNonTech.length;
  const maxNonTech = Math.floor(totalMiddle * 0.20);
  const limitedNonTech = remainingNonTech.slice(0, maxNonTech);

  // Shuffle middle section
  const middle = [...technical, ...limitedNonTech];
  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }

  // Combine: intro + shuffled middle + outro
  return [intro, ...middle, outro];
}

/**
 * Generic API call wrapper for Gemini AI
 */
export async function callGeminiAPI(prompt: string): Promise<string | null> {
  try {
    const result = await getGeminiResponse(prompt, false);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

/**
 * Evaluation result structure
 */
export interface EvaluationResult {
  score: number;
  route_action: 'next_difficulty' | 'normal_flow' | 'followup';
  sources: string[];
  ideal_answer: string;
  reason?: string;
}

/**
 * Generate ideal answer with source URLs for a question
 */
export async function generateIdealAnswer(question: string): Promise<{ ideal_answer: string; source_urls: string[] } | null> {
  const prompt = IDEAL_ANSWER_PROMPT(question);
  try {
    const result = await callGeminiAPI(prompt);
    if (!result) return null;

    // Try to extract the first valid JSON object
    let jsonString = '';
    const firstCurly = result.indexOf('{');
    const lastCurly = result.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
      jsonString = result.slice(firstCurly, lastCurly + 1);
    } else {
      // fallback: try regex
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];
    }
    if (!jsonString) {
      console.warn('[generateIdealAnswer] No JSON found in Gemini response, falling back to raw text');
      // Fallback: use the whole response as ideal answer (best-effort) if no JSON is provided
      const raw = result.trim();
      if (raw.length > 0) {
        return { ideal_answer: raw, source_urls: [] };
      }
      return null;
    }
    // Sanitize JSON string - remove control characters and escape special chars
    jsonString = jsonString.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control chars
    jsonString = jsonString.replace(/\n/g, '\\n'); // Escape newlines
    jsonString = jsonString.replace(/\r/g, '\\r'); // Escape carriage returns
    jsonString = jsonString.replace(/\t/g, '\\t'); // Escape tabs
    try {
      const parsed = JSON.parse(jsonString);
      return {
        ideal_answer: parsed.ideal_answer || '',
        source_urls: parsed.source_urls || []
      };
    } catch (err) {
      console.error('[generateIdealAnswer] JSON parse error:', err, '\nRaw:', jsonString);
      return null;
    }
  } catch (error) {
    console.error('Error generating ideal answer:', error);
    return null;
  }
}

/**
 * Evaluate user answer against ideal answer
 * Returns structured evaluation with score, routing action, sources, and ideal answer
 */
export async function evaluateAnswer(
  question: string,
  userAnswer: string,
  idealAnswer?: string,
  sourceUrls?: string[]
): Promise<EvaluationResult | null> {
  try {
    // Edge case: If userAnswer is missing or empty, skip evaluation
    if (!userAnswer || userAnswer.trim().length === 0) {
      console.warn('[evaluateAnswer] User answer is missing, skipping evaluation');
      return null;
    }

    // Generate ideal answer if not provided
    let finalIdealAnswer = idealAnswer;
    let finalSources = sourceUrls || [];

    if (!finalIdealAnswer) {
      const generated = await generateIdealAnswer(question);
      if (generated) {
        finalIdealAnswer = generated.ideal_answer;
        finalSources = generated.source_urls;
      } else {
        console.warn('[evaluateAnswer] Could not generate ideal answer, skipping evaluation');
        return null;
      }
    }

    // Evaluate correctness
    const analysisPrompt = EVALUATE_ANSWER_PROMPT(question, finalIdealAnswer, userAnswer);
    const analysisResult = await callGeminiAPI(analysisPrompt);
    if (!analysisResult) {
      return {
        score: 50,
        route_action: 'normal_flow',
        sources: finalSources,
        ideal_answer: finalIdealAnswer,
        reason: 'Unable to evaluate'
      };
    }

    const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        score: analysis.correctness || 50,
        route_action: analysis.route_action || 'normal_flow',
        sources: finalSources,
        ideal_answer: finalIdealAnswer,
        reason: analysis.reason
      };
    }

    return {
      score: 50,
      route_action: 'normal_flow',
      sources: finalSources,
      ideal_answer: finalIdealAnswer
    };

  } catch (error) {
    console.error('Error evaluating answer:', error);
    return null;
  }
}

/**
 * Format time from seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Audio Playback Utilities for Interview
 */

/**
 * Play audio from URL with automatic fallback to browser TTS
 */
export async function playInterviewAudio(
  audioUrl: string | undefined,
  questionText: string,
  onStart: () => void,
  onEnd: () => void,
  playBrowserTTSFallback: (text: string, onEnd: () => void) => void
): Promise<void> {
  onStart();

  // Try S3 audio first
  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);

      audio.onerror = () => {
        console.warn("[Audio] S3 audio failed, falling back to browser TTS");
        playBrowserTTSFallback(questionText, onEnd);
      };

      audio.onended = onEnd;

      await audio.play();
      return;
    } catch (error) {
      console.error("[Audio] Error with S3 audio:", error);
    }
  }

  // Fallback: Browser TTS
  console.log("[Audio] No S3 audio available, using browser TTS");
  playBrowserTTSFallback(questionText, onEnd);
}

/**
 * Chunk Management Utilities
 */

/**
 * Calculate chunk number from question index
 */
export function getChunkNumber(questionIndex: number, chunkSize: number = 5): number {
  return Math.floor(questionIndex / chunkSize);
}

/**
 * Check if next chunk should be preprocessed
 */
export function shouldPreprocessNextChunk(
  currentQuestionIndex: number,
  totalQuestions: number,
  preprocessedChunks: Set<number>,
  chunkSize: number = 5,
  lookahead: number = 2
): { shouldPreprocess: boolean; chunkNumber: number } {
  const currentChunk = getChunkNumber(currentQuestionIndex, chunkSize);
  const nextChunk = currentChunk + 1;
  const questionsUntilNextChunk = (nextChunk * chunkSize) - currentQuestionIndex;

  const shouldPreprocess =
    !preprocessedChunks.has(nextChunk) &&
    questionsUntilNextChunk <= lookahead &&
    (nextChunk * chunkSize) < totalQuestions;

  return { shouldPreprocess, chunkNumber: nextChunk };
}