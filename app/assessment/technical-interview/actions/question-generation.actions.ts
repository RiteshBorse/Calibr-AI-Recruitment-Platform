"use server";

import { buildQueue1Prompt, buildQueue2Prompt, buildFollowupPrompt } from "@/ai-engine/prompts/technicalInterview";
import { Question, Queues, generateId, ensureIds, callGeminiAPI, randomizeQueue1, generateIdealAnswer } from "@/utils/interview";
import type { JobData, ResumeData } from "../types";

/**
 * Question Generation Actions
 * Handles dynamic question generation for Queue 1, Queue 2, and follow-ups
 */

export async function generateQuestions(context: {
  jobData?: JobData;
  resumeData?: ResumeData;
}): Promise<{ success: boolean; queues?: Queues; error?: string }> {
  try {
    // Validate required context
    if (!context.jobData || !context.resumeData) {
      return { 
        success: false, 
        error: 'Job and resume data are required to generate personalized questions' 
      };
    }

    // Generate Queue 1 questions with job and resume context
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
        console.error('Parse error:', e);
      }
    }

    queue1 = ensureIds(queue1);

    // Randomize Queue 1 while maintaining intro/outro and 20% non-technical limit
    queue1 = randomizeQueue1(queue1);

    console.log(`[generateQuestions] ✓ Generated ${queue1.length} Q1 questions (basic structure only, no answers yet)`);

    // NOTE: Q2 generation happens dynamically during interview based on correctness scores
    // NOTE: Ideal answers, sources, and TTS audio are generated during chunk preprocessing

    return {
      success: true,
      queues: {
        queue1,
        queue2: [], // Q2 generated dynamically during interview
        queue3: []  // Q3 generated dynamically during interview
      }
    };

  } catch (error) {
    console.error('Error generating questions:', error);
    return { success: false, error: 'Failed to generate questions' };
  }
}

export async function generateQ2Questions(
  q1Question: string,
  q1Answer: string,
  topicId: string
): Promise<{ success: boolean; questions?: Question[]; error?: string }> {
  try {
    console.log(`[Server] Generating Q2 questions for topic (Q1 ID): ${topicId}`);
    
    const q2Prompt = buildQueue2Prompt(q1Question, q1Answer);
    const q2Result = await callGeminiAPI(q2Prompt);

    if (!q2Result) {
      return { success: false, error: 'No response from AI' };
    }

    const jsonMatch = q2Result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, error: 'Invalid Q2 response format' };
    }
    
    let q2Questions;
    try {
      // Sanitize control characters that might break JSON parsing
      const sanitizedJson = jsonMatch[0]
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, ' ')  // Replace control characters with space
        .replace(/\s+/g, ' ');  // Normalize whitespace
      
      q2Questions = JSON.parse(sanitizedJson);
    } catch (parseError) {
      console.error(`[Server] JSON parse error in Q2 generation:`, parseError);
      console.error(`[Server] Original response length: ${jsonMatch[0].length}`);
      return { success: false, error: `Failed to parse Q2 JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` };
    }
    
    console.log(`[Server] Generated ${q2Questions.length} Q2 questions`);
    
    // Process medium question
    const mediumQ = q2Questions.find((q: any) => q.difficulty === 'medium');
    if (mediumQ) {
      mediumQ.id = mediumQ.id || generateId();
      mediumQ.parentQuestionId = topicId; // Store Q1's ID, not the question text
      mediumQ.category = 'technical';
    }
    
    // Process hard question
    const hardQ = q2Questions.find((q: any) => q.difficulty === 'hard');
    if (hardQ) {
      hardQ.id = hardQ.id || generateId();
      hardQ.parentQuestionId = topicId; // Store Q1's ID, not the question text
      hardQ.category = 'technical';
    }
    
    const finalQuestions = [mediumQ, hardQ].filter((q): q is Question => q !== undefined);
    console.log(`[Server] ✓ Processed ${finalQuestions.length} Q2 questions with parentQuestionId links`);
    
    return { success: true, questions: finalQuestions };
  } catch (error) {
    console.error('[Server] Error generating Q2 questions:', error);
    return { 
      success: false, 
      error: `Failed to generate depth questions: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export async function generateFollowupQuestion(
  originalQuestion: string,
  userAnswer: string
): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const followupPrompt = buildFollowupPrompt(originalQuestion, userAnswer);
    const result = await callGeminiAPI(followupPrompt);

    if (!result) {
      return { success: false, error: 'No response from AI' };
    }

    const question: Question = {
      id: generateId(),
      question: result.trim(),
      category: 'followup',
      parentQuestion: originalQuestion
    };

    return { success: true, question };
  } catch (error) {
    console.error('Error generating followup question:', error);
    return { success: false, error: 'Failed to generate followup question' };
  }
}

export async function preprocessQuestion(questionText: string): Promise<{
  success: boolean;
  answer?: string;
  source_urls?: string[];
  error?: string;
}> {
  try {
    const result = await generateIdealAnswer(questionText);
    
    if (!result) {
      return { success: false, error: 'Failed to generate ideal answer' };
    }

    return {
      success: true,
      answer: result.ideal_answer,
      source_urls: result.source_urls || []
    };
  } catch (error) {
    console.error('[preprocessQuestion] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
