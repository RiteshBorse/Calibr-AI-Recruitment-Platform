import { getGeminiResponse } from "@/ai-engine/ai-call/aiCall";

export interface Question {
  id: string;
  question: string;
  category: "technical" | "non-technical" | "followup";
  difficulty?: "medium" | "hard";
  answer?: string;
  parentQuestion?: string;
  topicId?: string;
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