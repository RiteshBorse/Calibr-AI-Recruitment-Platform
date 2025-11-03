"use server";

import { buildFollowupPrompt } from "@/ai-engine/prompts/technicalInterview";
import { Question, Queues, evaluateAnswer, EvaluationResult } from "@/utils/interview";
import { analyzeAnswerFlow } from "@/lib/interview/answerAnalysis";

/**
 * Answer Analysis Actions
 * Handles answer evaluation and queue routing logic for technical interviews
 */

export async function analyzeAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  currentQueues: Queues,
  currentQuestion: Question,
  interviewId?: string
): Promise<{ updatedQueues?: Queues; correctness?: number; evaluation?: EvaluationResult }> {
  try {
    console.log(`[analyzeAnswer] Called with interviewId: ${interviewId || 'MISSING'}, questionId: ${currentQuestion.id}`);
    
    // Edge case: If either idealAnswer or userAnswer is missing, skip evaluation and Q2/Q3 generation
    if (!correctAnswer || correctAnswer.trim().length === 0 || !userAnswer || userAnswer.trim().length === 0) {
      console.warn('[analyzeAnswer] Missing idealAnswer or userAnswer, skipping evaluation and Q2/Q3 generation');
      return {};
    }

    // Get source URLs from question if available
    const sourceUrls = (currentQuestion as any).source_urls || [];
    
    // Use the new evaluateAnswer function for comprehensive evaluation
    const evaluation = await evaluateAnswer(question, userAnswer, correctAnswer, sourceUrls);
    
    // If evaluation returns null (due to missing data), skip Q2/Q3 generation
    if (!evaluation) {
      console.warn('[analyzeAnswer] Evaluation failed, skipping Q2/Q3 generation');
      return {};
    }

    const correctness = evaluation.score;

    // CRITICAL: Only generate Q3 for Q1 or Q2 questions, NOT for existing Q3s
    // This prevents infinite followup-of-followup chains
    const isQ3Question = (currentQuestion as any).queueType === 'Q3';
    
    if (isQ3Question) {
      console.log('[Tech Analysis] ⚠️ Current question is already a Q3 followup - will NOT generate another Q3 (prevents infinite chain)');
      return { correctness, evaluation };
    }

    // Only process Q2/Q3 logic if we have interviewId (to access database)
    if (!interviewId) {
      console.warn('[analyzeAnswer] No interviewId provided, skipping Q2/Q3 logic');
      return { correctness, evaluation };
    }

    // Load all asked questions from database to determine Q2s in serial order
    const { getAskedQuestions, removeAskedQuestion, addAskedQuestion } = await import('./storage.actions');
    const questionsResult = await getAskedQuestions(interviewId);
    
    if (!questionsResult.success || !questionsResult.questions) {
      console.error('[analyzeAnswer] Failed to load asked questions from database');
      return { correctness, evaluation };
    }

    const allAskedQuestions = questionsResult.questions;

    // Use shared analysis logic
    const analysisResult = await analyzeAnswerFlow(
      correctness,
      currentQuestion.id,
      question,
      userAnswer,
      allAskedQuestions,
      buildFollowupPrompt
    );

    // Delete Q2 questions from database if needed
    if (analysisResult.shouldDeleteQ2 && analysisResult.q2IdsToDelete.length > 0) {
      console.log(`[analyzeAnswer] Deleting ${analysisResult.q2IdsToDelete.length} Q2 questions from database`);
      
      for (const q2Id of analysisResult.q2IdsToDelete) {
        console.log(`[analyzeAnswer] 🗑️ Deleting Q2 question ${q2Id}`);
        const deleteResult = await removeAskedQuestion(interviewId, q2Id);
        
        if (!deleteResult.success) {
          console.error(`[analyzeAnswer] Failed to delete Q2 ${q2Id}:`, deleteResult.error);
        } else {
          console.log(`[analyzeAnswer] ✓ Deleted Q2 ${q2Id}`);
        }
      }
    }

    // Add Q3 followup question to database if generated
    if (analysisResult.shouldGenerateQ3 && analysisResult.q3Question) {
      console.log(`[analyzeAnswer] Adding Q3 followup question immediately after current question`);
      
      // First add the question to database (unpreprocessed)
      const addResult = await addAskedQuestion(interviewId, {
        id: analysisResult.q3Question.id,
        question: analysisResult.q3Question.question,
        category: 'technical' as const,
        queueType: 'Q3' as const,
        parentQuestionId: analysisResult.q3Question.parentQuestionId,
        askedAt: undefined,
        preprocessed: false,
        audioUrl: undefined,
        userAnswer: undefined,
        correctness: undefined,
      }, currentQuestion.id); // Insert AFTER the current question

      if (addResult.success) {
        console.log(`[analyzeAnswer] ✓ Added Q3 question ${analysisResult.q3Question.id} after question ${currentQuestion.id}`);
        
        // Now preprocess the Q3 question (generate ideal answer + TTS audio)
        console.log(`[analyzeAnswer] Preprocessing Q3 question ${analysisResult.q3Question.id}...`);
        const { preprocessQuestion } = await import('./question-generation.actions');
        const { updateAskedQuestion } = await import('./storage.actions');
        
        try {
          // Generate ideal answer for Q3
          const preprocessResult = await preprocessQuestion(analysisResult.q3Question.question);
          
          if (preprocessResult.success && preprocessResult.answer) {
            console.log(`[analyzeAnswer] ✓ Generated ideal answer for Q3`);
            
            // Update question with ideal answer (mark as preprocessed but no TTS yet)
            await updateAskedQuestion(interviewId, analysisResult.q3Question.id, {
              answer: preprocessResult.answer,
              source_urls: preprocessResult.source_urls || [],
              preprocessed: true,
            });
            
            console.log(`[analyzeAnswer] ✓ Q3 question ${analysisResult.q3Question.id} preprocessed successfully`);
          } else {
            console.warn(`[analyzeAnswer] Failed to preprocess Q3: ${preprocessResult.error}`);
          }
        } catch (preprocessError) {
          console.error(`[analyzeAnswer] Error preprocessing Q3:`, preprocessError);
        }
      } else {
        console.error(`[analyzeAnswer] Failed to add Q3 question:`, addResult.error);
      }
    }

    return { correctness, evaluation };
  } catch (error) {
    console.error('[analyzeAnswer] Error:', error);
    return {};
  }
}

/**
 * Check video processing violations from localStorage/session
 * This should be called from client-side video processing component
 */
export async function checkVideoViolations(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _interviewId: string
) {
  // NOTE: This is a server action and cannot directly access client-side videoQueueIntegration
  // The video state should be passed from client or stored in a way accessible to server
  // For now, returning default values - actual implementation needs client-server bridge
  
  return {
    violation_count: 0,
    mood_state: 'neutral',
    mood_changed: false,
    current_violations: []
  };
}
