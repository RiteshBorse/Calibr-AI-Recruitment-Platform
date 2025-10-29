"use server";

import { buildFollowupPrompt, EVALUATE_ANSWER_PROMPT } from "@/ai-engine/prompts/hrInterview";
import { Question, Queues, callGeminiAPI } from "@/utils/interview";

/**
 * HR Interview Answer Analysis Actions
 * Handles answer evaluation with dual threshold logic for positive/negative followups
 * NO Q2 generation for HR interviews
 */

interface EvaluationResult {
  score: number;
  reason?: string;
  route_action: 'followup_negative' | 'normal_flow' | 'followup_positive';
}

export async function analyzeAnswer(
  question: string,
  evaluationCriteria: string, // "EVALUATE_DIRECTLY: [criteria]" or actual answer for puzzles
  userAnswer: string,
  currentQueues: Queues,
  currentQuestion: Question,
  interviewId?: string
): Promise<{ updatedQueues?: Queues; correctness?: number; evaluation?: EvaluationResult }> {
  try {
    console.log(`[HR Analysis] Analyzing answer for questionId: ${currentQuestion.id}`);
    
    // Edge case: If either evaluationCriteria or userAnswer is missing, skip
    if (!evaluationCriteria || evaluationCriteria.trim().length === 0 || !userAnswer || userAnswer.trim().length === 0) {
      console.warn('[HR Analysis] Missing evaluation criteria or userAnswer, skipping evaluation');
      return {};
    }

    // Evaluate answer using HR-specific prompt with evaluation criteria
    const prompt = EVALUATE_ANSWER_PROMPT(question, evaluationCriteria, userAnswer);
    const result = await callGeminiAPI(prompt);
    
    if (!result) {
      console.warn('[HR Analysis] No response from AI evaluation');
      return {};
    }

    // Parse evaluation result
    let evaluation: EvaluationResult | null = null;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        evaluation = {
          score: parsed.correctness || 0,
          reason: parsed.reason || '',
          route_action: parsed.route_action || 'normal_flow'
        };
      }
    } catch (parseError) {
      console.error('[HR Analysis] Failed to parse evaluation:', parseError);
      return {};
    }

    if (!evaluation) {
      console.warn('[HR Analysis] Evaluation parsing failed');
      return {};
    }

    const correctness = evaluation.score;

    // Only process Q3 logic if we have interviewId (to access database)
    if (!interviewId) {
      console.warn('[HR Analysis] No interviewId provided, skipping Q3 logic');
      return { correctness, evaluation };
    }

    // Load all asked questions from database
    const { getAskedQuestions, addAskedQuestion, updateAskedQuestion } = await import('./storage.actions');
    const questionsResult = await getAskedQuestions(interviewId);
    
    if (!questionsResult.success || !questionsResult.questions) {
      console.error('[HR Analysis] Failed to load asked questions from database');
      return { correctness, evaluation };
    }

    // CRITICAL: Only generate Q3 for Q1 or Q2 questions, NOT for existing Q3s
    // This prevents infinite followup-of-followup chains
    const isQ3Question = (currentQuestion as any).queueType === 'Q3';
    
    if (isQ3Question) {
      console.log('[HR Analysis] ⚠️ Current question is already a Q3 followup - will NOT generate another Q3 (prevents infinite chain)');
      return { correctness, evaluation };
    }
    
    // Determine if we should generate Q3 followup based on dual thresholds
    let shouldGenerateQ3 = false;
    let isPositiveFollowup = false;
    
    console.log(`[HR Analysis] Checking Q3 thresholds: correctness=${correctness}%, queueType=${(currentQuestion as any).queueType || 'Q1'}`);
    
    if (correctness < 20) {
      // < 20%: Generate negative/corrective followup
      shouldGenerateQ3 = true;
      isPositiveFollowup = false;
      console.log('[HR Analysis] ✅ Score < 20%, WILL generate NEGATIVE followup Q3');
    } else if (correctness > 80) {
      // > 80%: Generate positive/probing followup
      shouldGenerateQ3 = true;
      isPositiveFollowup = true;
      console.log('[HR Analysis] ✅ Score > 80%, WILL generate POSITIVE followup Q3');
    } else {
      // 20-80%: Normal flow, no followup
      console.log('[HR Analysis] Score 20-80%, continuing to next Q1 (normal flow) - NO Q3');
    }

    // Generate and add Q3 followup if needed
    if (shouldGenerateQ3) {
      console.log(`[HR Analysis] 🚀 Starting Q3 generation (${isPositiveFollowup ? 'POSITIVE' : 'NEGATIVE'})...`);
      try {
        const followupPrompt = buildFollowupPrompt(question, userAnswer, isPositiveFollowup);
        console.log(`[HR Analysis] Calling Gemini API for Q3 followup...`);
        const followupResult = await callGeminiAPI(followupPrompt);
        
        if (!followupResult) {
          console.warn('[HR Analysis] ❌ Failed to generate Q3 followup - no AI response');
          return { correctness, evaluation };
        }

        console.log(`[HR Analysis] ✓ Got Q3 response from AI: ${followupResult.substring(0, 100)}...`);

        // Parse Q3 question
        const jsonMatch = followupResult.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn('[HR Analysis] ❌ Invalid Q3 response format - no JSON found');
          console.warn(`[HR Analysis] Response was: ${followupResult}`);
          return { correctness, evaluation };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const q3QuestionText = parsed.question;
        
        if (!q3QuestionText) {
          console.warn('[HR Analysis] ❌ No question in Q3 response');
          console.warn(`[HR Analysis] Parsed object: ${JSON.stringify(parsed)}`);
          return { correctness, evaluation };
        }

        const q3Id = `${currentQuestion.id}_followup_${Date.now()}`;
        
        console.log(`[HR Analysis] ✓ Parsed Q3 question: "${q3QuestionText.substring(0, 80)}..."`);
        console.log(`[HR Analysis] Adding Q3 to database with ID: ${q3Id}`);
        
        // Add the Q3 question to database (unpreprocessed)
        const addResult = await addAskedQuestion(interviewId, {
          id: q3Id,
          question: q3QuestionText,
          category: 'non-technical' as const,
          queueType: 'Q3' as const,
          parentQuestionId: currentQuestion.id,
          askedAt: undefined,
          preprocessed: false,
          audioUrl: undefined,
          userAnswer: undefined,
        }, currentQuestion.id); // Insert AFTER the current question

        if (addResult.success) {
          console.log(`[HR Analysis] ✅ Successfully added Q3 question ${q3Id} to database after question ${currentQuestion.id}`);
          
          // Preprocess the Q3 question (generate evaluation criteria)
          console.log(`[HR Analysis] Preprocessing Q3 question ${q3Id}...`);
          const { preprocessQuestion } = await import('./question-generation.actions');
          
          const preprocessResult = await preprocessQuestion(q3QuestionText);
          
          if (preprocessResult.success) {
            console.log(`[HR Analysis] ✓ Preprocessed Q3 followup question - got ${preprocessResult.answer?.length || 0} chars of criteria`);
            
            // Update question with evaluation criteria (or empty if preprocessing failed)
            await updateAskedQuestion(interviewId, q3Id, {
              answer: preprocessResult.answer || "",
              source_urls: preprocessResult.source_urls || [],
              preprocessed: true,
            });
            
            console.log(`[HR Analysis] ✅ Q3 question ${q3Id} fully preprocessed and ready`);
          } else {
            console.warn(`[HR Analysis] ⚠️ Failed to preprocess Q3: ${preprocessResult.error}`);
            // Mark as preprocessed anyway so it doesn't block the flow
            await updateAskedQuestion(interviewId, q3Id, {
              answer: "",
              source_urls: [],
              preprocessed: true,
            });
          }
        } else {
          console.error(`[HR Analysis] ❌ Failed to add Q3 question to database:`, addResult.error);
        }
      } catch (q3Error) {
        console.error('[HR Analysis] ❌ Error generating Q3:', q3Error);
      }
    } else {
      console.log('[HR Analysis] Skipping Q3 generation (score in 20-80% range)');
    }

    return { correctness, evaluation };
  } catch (error) {
    console.error('[HR Analysis] Error:', error);
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
