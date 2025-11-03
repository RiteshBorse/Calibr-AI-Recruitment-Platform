"use server";

import { buildQueue1Prompt, IDEAL_ANSWER_PROMPT } from "@/ai-engine/prompts/hrInterview";
import { Question, Queues, ensureIds, callGeminiAPI } from "@/utils/interview";

/**
 * HR Interview Question Generation Actions
 * Generates behavioral/HR questions with NO Q2 (depth questions)
 */

export interface JobData {
  title: string;
  position: string;
  department: string;
  seniority: string;
  techStack: string[];
  description?: string;
  requirements?: string;
}

export interface ResumeData {
  tagline?: string;
  summary?: string;
  workDetails?: any[];
  education?: any[];
  skills?: string;
  projects?: any[];
  certificates?: any[];
}

export async function generateQuestions(context: {
  jobData?: JobData;
  resumeData?: ResumeData;
}): Promise<{ success: boolean; queues?: Queues; error?: string }> {
  try {
    // Validate required context
    if (!context.jobData || !context.resumeData) {
      return { 
        success: false, 
        error: 'Job and resume data are required to generate personalized HR questions' 
      };
    }

    // Generate Queue 1 behavioral questions with job and resume context
    const q1Prompt = buildQueue1Prompt(context.jobData, context.resumeData);

    const q1Result = await callGeminiAPI(q1Prompt);
    let queue1: Question[] = [];

    if (q1Result) {
      try {
        const jsonMatch = q1Result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          queue1 = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('[HR Generation] Parse error:', e);
      }
    }

    queue1 = ensureIds(queue1);

    console.log(`[HR Generation] ✓ Generated ${queue1.length} behavioral Q1 questions`);

    // NO Q2 for HR interview (only Q1 questions)
    // Q3 followups generated dynamically based on dual thresholds (<20%, >80%)
    // NOTE: Evaluation criteria generated during chunk preprocessing

    return {
      success: true,
      queues: {
        queue1,
        queue2: [], // NO Q2 in HR interview
        queue3: []  // Q3 generated dynamically during interview
      }
    };

  } catch (error) {
    console.error('[HR Generation] Error generating questions:', error);
    return { success: false, error: 'Failed to generate HR questions' };
  }
}

/**
 * Preprocess HR question by generating evaluation criteria (not ideal answer)
 * HR questions are behavioral, so we generate criteria for assessment
 * For puzzles/riddles, this generates the actual ideal answer
 */
export async function preprocessQuestion(questionText: string): Promise<{
  success: boolean;
  answer?: string;
  source_urls?: string[];
  error?: string;
}> {
  try {
    console.log(`[HR Generation] Preprocessing question: "${questionText}"`);
    
    // For HR questions, use IDEAL_ANSWER_PROMPT to get evaluation criteria
    const prompt = IDEAL_ANSWER_PROMPT(questionText);
    const result = await callGeminiAPI(prompt);
    
    if (!result) {
      console.error('[HR Generation] No response from AI');
      return { success: false, error: 'Failed to generate evaluation criteria' };
    }

    console.log(`[HR Generation] Raw AI response: ${result.substring(0, 200)}...`);

    // Try to extract the first valid JSON object
    let jsonString = '';
    const firstCurly = result.indexOf('{');
    const lastCurly = result.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
      jsonString = result.slice(firstCurly, lastCurly + 1);
    } else {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];
    }

    if (!jsonString) {
      console.error('[HR Generation] No valid JSON object found in response');
      return { success: false, error: 'Invalid response format - no JSON found' };
    }

    console.log(`[HR Generation] Extracted JSON: ${jsonString.substring(0, 200)}...`);

    const parsed = JSON.parse(jsonString);
    
    if (!parsed.ideal_answer) {
      console.error('[HR Generation] Missing ideal_answer in parsed JSON');
      return { success: false, error: 'Invalid response format - missing ideal_answer' };
    }

    console.log(`[HR Generation] ✓ Successfully preprocessed question`);
    console.log(`[HR Generation] Answer: ${parsed.ideal_answer.substring(0, 100)}...`);
    
    return {
      success: true,
      answer: parsed.ideal_answer, // "EVALUATE_DIRECTLY: [criteria]" or actual answer for puzzles
      source_urls: parsed.source_urls || []
    };
  } catch (error) {
    console.error('[HR Generation] Error preprocessing question:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
